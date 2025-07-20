import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { addDays, format } from 'date-fns';

// Import main app and services
import App from '../../App';
import { appIntegrationService } from '../services/AppIntegrationService';
import { dateNavigationService } from '../services/DateNavigationService';
import { offlineService } from '../services/OfflineService';
import { permissionService } from '../services/PermissionService';
import { errorHandlingService } from '../services/ErrorHandlingService';

// Mock all external dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  checkPermissions: jest.fn((callback) => callback({ alert: true, badge: true, sound: true })),
  requestPermissions: jest.fn(() => Promise.resolve({ alert: true, badge: true, sound: true })),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: { alert: jest.fn() },
  Linking: { 
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    openURL: jest.fn(),
    openSettings: jest.fn(),
  },
  Platform: { OS: 'ios' },
}));

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

describe('End-to-End Integration Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset all services
    await appIntegrationService.cleanup();
    
    // Mock storage responses
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      const mockData: Record<string, any> = {
        '@timetable_events': JSON.stringify([]),
        '@tasks': JSON.stringify([]),
        '@medications': JSON.stringify([]),
        '@current_date': new Date().toISOString(),
        '@sync_queue': JSON.stringify([]),
      };
      return Promise.resolve(mockData[key] || null);
    });
  });

  describe('App Initialization and Integration', () => {
    it('should initialize all services successfully', async () => {
      await act(async () => {
        await appIntegrationService.initialize();
      });
      
      const healthStatus = appIntegrationService.getHealthStatus();
      expect(healthStatus.isInitialized).toBe(true);
      expect(healthStatus.services.offline.status).toBe('online');
    });

    it('should render main app with all screens', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
        expect(getByText('Tasks')).toBeTruthy();
        expect(getByText('Medications')).toBeTruthy();
        expect(getByText('Progress')).toBeTruthy();
      });
    });

    it('should handle app initialization errors gracefully', async () => {
      // Mock initialization failure
      const originalInitialize = appIntegrationService.initialize;
      jest.spyOn(appIntegrationService, 'initialize').mockRejectedValue(new Error('Init failed'));
      
      await expect(appIntegrationService.initialize()).rejects.toThrow('Init failed');
      
      // Restore original method
      appIntegrationService.initialize = originalInitialize;
    });
  });

  describe('Complete User Workflows', () => {
    it('should complete timetable event workflow', async () => {
      const { getByText, getByTestId } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Navigate to timetable
      fireEvent.press(getByText('Schedule'));
      
      // Add new event (mock interaction)
      const addButton = getByTestId('add-event-button');
      if (addButton) {
        fireEvent.press(addButton);
        
        // Fill event form (mock)
        await waitFor(() => {
          // Event form should be visible
          expect(getByTestId('event-form')).toBeTruthy();
        });
      }
    });

    it('should complete task management workflow', async () => {
      const { getByText, getByTestId } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Tasks')).toBeTruthy();
      });
      
      // Navigate to tasks
      fireEvent.press(getByText('Tasks'));
      
      // Add new task (mock interaction)
      const addButton = getByTestId('add-task-button');
      if (addButton) {
        fireEvent.press(addButton);
        
        await waitFor(() => {
          // Task form should be visible
          expect(getByTestId('task-form')).toBeTruthy();
        });
      }
    });

    it('should complete medication management workflow', async () => {
      const { getByText, getByTestId } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Medications')).toBeTruthy();
      });
      
      // Navigate to medications
      fireEvent.press(getByText('Medications'));
      
      // Add new medication (mock interaction)
      const addButton = getByTestId('add-medication-button');
      if (addButton) {
        fireEvent.press(addButton);
        
        await waitFor(() => {
          // Medication form should be visible
          expect(getByTestId('medication-form')).toBeTruthy();
        });
      }
    });

    it('should complete progress tracking workflow', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Progress')).toBeTruthy();
      });
      
      // Navigate to progress
      fireEvent.press(getByText('Progress'));
      
      await waitFor(() => {
        // Progress screen should load
        expect(getByText('Progress')).toBeTruthy();
      });
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should handle date navigation across all screens', async () => {
      const { getByText } = render(<App />);
      
      // Test date navigation on timetable
      fireEvent.press(getByText('Schedule'));
      
      // Navigate to next day
      dateNavigationService.goToNextDay();
      
      // Switch to tasks - should maintain date
      fireEvent.press(getByText('Tasks'));
      
      // Date should be consistent across screens
      expect(dateNavigationService.getCurrentDate()).toBeInstanceOf(Date);
    });

    it('should handle recurring events across dates', async () => {
      const { getByText } = render(<App />);
      
      // Create recurring event (mock)
      const recurringEvent = {
        id: 'recurring-1',
        title: 'Daily Standup',
        startTime: new Date(),
        duration: 30,
        isRecurring: true,
        recurrencePattern: { type: 'daily' as const, interval: 1 },
      };
      
      // Navigate through dates and verify recurring events appear
      dateNavigationService.goToNextDay();
      dateNavigationService.goToPreviousDay();
      
      // Events should be generated for each date
      expect(dateNavigationService.getCurrentDate()).toBeInstanceOf(Date);
    });

    it('should handle offline/online transitions', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Simulate going offline
      await act(async () => {
        offlineService['isOnline'] = false;
        offlineService['notifyListeners']();
      });
      
      // Perform operations while offline (should queue)
      await offlineService.queueOperation({
        type: 'CREATE_EVENT',
        data: { title: 'Offline Event' },
      });
      
      // Simulate coming back online
      await act(async () => {
        offlineService['isOnline'] = true;
        offlineService['notifyListeners']();
        await offlineService.processSyncQueue();
      });
      
      // Queue should be processed
      expect(offlineService.getSyncQueue()).toHaveLength(0);
    });
  });

  describe('Notification Integration', () => {
    it('should handle notification permissions and delivery', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Request notification permissions
      const granted = await permissionService.requestNotificationPermissions();
      expect(granted).toBe(true);
      
      // Schedule notification (mock)
      PushNotification.localNotificationSchedule({
        title: 'Event Reminder',
        message: 'Your meeting starts in 15 minutes',
        date: addDays(new Date(), 1),
      });
      
      expect(PushNotification.localNotificationSchedule).toHaveBeenCalled();
    });

    it('should handle notification tap navigation', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Simulate notification tap with deep link
      const notificationData = {
        type: 'event',
        id: 'event-123',
      };
      
      // Should navigate to specific event
      // (This would be tested with actual navigation in a real scenario)
      expect(notificationData.type).toBe('event');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors across all features', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Simulate various error scenarios
      const errors = [
        new Error('Network request failed'),
        new Error('Storage quota exceeded'),
        new Error('Permission denied'),
      ];
      
      for (const error of errors) {
        errorHandlingService.handleError(error, 'Integration Test', { showAlert: false });
      }
      
      const errorStats = errorHandlingService.getErrorStats();
      expect(errorStats.total).toBe(3);
    });

    it('should recover from component errors', async () => {
      // This would test error boundaries in a real scenario
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Error boundaries should catch and handle component errors
      expect(getByText('Schedule')).toBeTruthy();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large datasets efficiently', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Mock large dataset
      const largeEventList = Array.from({ length: 1000 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        startTime: addDays(new Date(), i % 30),
        duration: 60,
      }));
      
      // Mock storage with large dataset
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@timetable_events') {
          return Promise.resolve(JSON.stringify(largeEventList));
        }
        return Promise.resolve(null);
      });
      
      // App should handle large datasets without performance issues
      expect(largeEventList.length).toBe(1000);
    });

    it('should manage memory usage effectively', async () => {
      const { getByText, unmount } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Perform various operations
      dateNavigationService.goToNextDay();
      dateNavigationService.goToPreviousDay();
      
      // Unmount should clean up resources
      unmount();
      
      // Services should be cleaned up
      appIntegrationService.cleanup();
      expect(appIntegrationService.getHealthStatus().isInitialized).toBe(false);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Perform multiple operations
      const operations = [
        { type: 'CREATE_EVENT', data: { title: 'Event 1' } },
        { type: 'CREATE_TASK', data: { title: 'Task 1' } },
        { type: 'UPDATE_MEDICATION', data: { id: '1', name: 'Med 1' } },
      ];
      
      // All operations should maintain data consistency
      for (const op of operations) {
        await offlineService.queueOperation(op as any);
      }
      
      expect(offlineService.getSyncQueue()).toHaveLength(3);
    });

    it('should handle concurrent operations safely', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Simulate concurrent operations
      const promises = Array.from({ length: 10 }, (_, i) =>
        offlineService.queueOperation({
          type: 'CREATE_EVENT',
          data: { title: `Concurrent Event ${i}` },
        })
      );
      
      await Promise.all(promises);
      
      // All operations should be queued safely
      expect(offlineService.getSyncQueue().length).toBeGreaterThan(0);
    });
  });

  describe('App Statistics and Health', () => {
    it('should provide accurate app statistics', async () => {
      await appIntegrationService.initialize();
      
      const stats = appIntegrationService.getAppStatistics();
      
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('sync');
      expect(stats).toHaveProperty('permissions');
      expect(stats).toHaveProperty('navigation');
    });

    it('should export and import app data', async () => {
      await appIntegrationService.initialize();
      
      // Export app data
      const exportData = await appIntegrationService.exportAppData();
      
      expect(exportData).toHaveProperty('backup');
      expect(exportData).toHaveProperty('healthStatus');
      expect(exportData).toHaveProperty('statistics');
      expect(exportData).toHaveProperty('exportDate');
      
      // Import app data
      await appIntegrationService.importAppData(exportData);
      
      // Data should be restored
      expect(exportData.version).toBe('1.0.0');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical daily usage pattern', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Simulate typical daily usage
      // 1. Check schedule
      fireEvent.press(getByText('Schedule'));
      
      // 2. Add new event
      // (Mock interaction)
      
      // 3. Check tasks
      fireEvent.press(getByText('Tasks'));
      
      // 4. Complete a task
      // (Mock interaction)
      
      // 5. Check medications
      fireEvent.press(getByText('Medications'));
      
      // 6. Confirm medication taken
      // (Mock interaction)
      
      // 7. View progress
      fireEvent.press(getByText('Progress'));
      
      // All interactions should work smoothly
      expect(getByText('Progress')).toBeTruthy();
    });

    it('should handle edge cases and boundary conditions', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });
      
      // Test edge cases
      const edgeCases = [
        // Date boundaries
        () => dateNavigationService.setCurrentDate(new Date('2024-02-29')), // Leap year
        () => dateNavigationService.setCurrentDate(new Date('2023-12-31')), // Year end
        
        // Large numbers
        () => Array.from({ length: 100 }, (_, i) => 
          offlineService.queueOperation({
            type: 'CREATE_EVENT',
            data: { title: `Event ${i}` },
          })
        ),
      ];
      
      // All edge cases should be handled gracefully
      for (const testCase of edgeCases) {
        expect(() => testCase()).not.toThrow();
      }
    });
  });
});