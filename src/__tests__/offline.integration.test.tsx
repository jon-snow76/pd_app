import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { offlineService } from '../services/OfflineService';
import { useOffline } from '../hooks/useOffline';
import OfflineIndicator from '../components/OfflineIndicator';
import BackupRestore from '../components/BackupRestore';
import {
  saveWithOfflineSupport,
  loadWithOfflineSupport,
  deleteWithOfflineSupport,
} from '../utils/offlineStorage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

// Test component that uses offline functionality
const TestOfflineComponent: React.FC = () => {
  const { isOnline, hasPendingOperations, processSyncQueue } = useOffline();
  
  return (
    <>
      <OfflineIndicator onSyncPress={processSyncQueue} />
      {isOnline ? (
        <div testID="online-status">Online</div>
      ) : (
        <div testID="offline-status">Offline</div>
      )}
      {hasPendingOperations && (
        <div testID="pending-operations">Has pending operations</div>
      )}
    </>
  );
};

describe('Offline Integration Tests', () => {
  let mockNetInfoListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockNetInfoListener = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockNetInfoListener);
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Offline Detection and UI', () => {
    it('should show offline indicator when offline', async () => {
      // Start online
      const { queryByTestId, rerender } = render(<TestOfflineComponent />);
      
      await waitFor(() => {
        expect(queryByTestId('online-status')).toBeTruthy();
      });
      
      // Simulate going offline
      const netInfoCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      netInfoCallback({ isConnected: false });
      
      rerender(<TestOfflineComponent />);
      
      await waitFor(() => {
        expect(queryByTestId('offline-status')).toBeTruthy();
      });
    });

    it('should show pending operations indicator', async () => {
      // Mock sync queue with pending operations
      jest.spyOn(offlineService, 'getSyncQueue').mockReturnValue([
        { type: 'CREATE_EVENT', data: { test: 'data' }, timestamp: Date.now() },
      ]);
      
      const { queryByTestId } = render(<TestOfflineComponent />);
      
      await waitFor(() => {
        expect(queryByTestId('pending-operations')).toBeTruthy();
      });
    });
  });

  describe('Data Operations While Offline', () => {
    beforeEach(async () => {
      // Initialize offline service
      await offlineService.initialize();
      
      // Set offline state
      const netInfoCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      netInfoCallback({ isConnected: false });
    });

    it('should save data locally and queue operation when offline', async () => {
      const testData = { id: '1', title: 'Test Event' };
      
      await saveWithOfflineSupport('@test_events', testData, 'CREATE_EVENT', '1');
      
      // Should save locally
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_events',
        JSON.stringify(testData)
      );
      
      // Should queue operation
      const syncQueue = offlineService.getSyncQueue();
      expect(syncQueue).toHaveLength(1);
      expect(syncQueue[0].type).toBe('CREATE_EVENT');
    });

    it('should load data from local storage when offline', async () => {
      const testData = [{ id: '1', title: 'Test Event' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(testData));
      
      const result = await loadWithOfflineSupport('@test_events', []);
      
      expect(result).toEqual(testData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@test_events');
    });

    it('should delete data locally and queue operation when offline', async () => {
      const existingData = [
        { id: '1', title: 'Event 1' },
        { id: '2', title: 'Event 2' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
      
      await deleteWithOfflineSupport('@test_events', 'DELETE_EVENT', '1');
      
      // Should update local storage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_events',
        JSON.stringify([{ id: '2', title: 'Event 2' }])
      );
      
      // Should queue operation
      const syncQueue = offlineService.getSyncQueue();
      expect(syncQueue).toHaveLength(1);
      expect(syncQueue[0].type).toBe('DELETE_EVENT');
    });
  });

  describe('Sync Queue Processing', () => {
    it('should process sync queue when coming back online', async () => {
      await offlineService.initialize();
      
      // Start offline and queue operations
      const netInfoCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      netInfoCallback({ isConnected: false });
      
      await offlineService.queueOperation({
        type: 'CREATE_EVENT',
        data: { id: '1', title: 'Test Event' },
      });
      
      expect(offlineService.getSyncQueue()).toHaveLength(1);
      
      // Come back online
      netInfoCallback({ isConnected: true });
      
      // Wait for async processing
      await waitFor(() => {
        expect(offlineService.getSyncQueue()).toHaveLength(0);
      });
    });

    it('should handle sync errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await offlineService.initialize();
      
      // Mock a sync error
      const originalExecuteOperation = (offlineService as any).executeOperation;
      (offlineService as any).executeOperation = jest.fn().mockRejectedValue(new Error('Sync error'));
      
      await offlineService.queueOperation({
        type: 'CREATE_EVENT',
        data: { id: '1', title: 'Test Event' },
      });
      
      await offlineService.processSyncQueue();
      
      // Operation should be re-queued on error
      expect(offlineService.getSyncQueue()).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to process operation: CREATE_EVENT',
        expect.any(Error)
      );
      
      // Restore original method
      (offlineService as any).executeOperation = originalExecuteOperation;
      consoleSpy.mockRestore();
    });
  });

  describe('Backup and Restore Integration', () => {
    it('should create and restore backup', async () => {
      const mockData = {
        '@timetable_events': [{ id: '1', title: 'Event 1' }],
        '@tasks': [{ id: '1', title: 'Task 1' }],
      };
      
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(JSON.stringify(mockData[key as keyof typeof mockData] || null));
      });
      
      // Create backup
      const backup = await offlineService.createBackup();
      
      expect(backup.data.timetableEvents).toEqual(mockData['@timetable_events']);
      expect(backup.data.tasks).toEqual(mockData['@tasks']);
      
      // Restore backup
      await offlineService.restoreFromBackup(backup);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@timetable_events',
        JSON.stringify(mockData['@timetable_events'])
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@tasks',
        JSON.stringify(mockData['@tasks'])
      );
    });

    it('should render backup restore component', async () => {
      const { getByText } = render(<BackupRestore />);
      
      await waitFor(() => {
        expect(getByText('Backup & Restore')).toBeTruthy();
        expect(getByText('Create Backup')).toBeTruthy();
      });
    });

    it('should handle backup creation in UI', async () => {
      const mockBackup = {
        timestamp: Date.now(),
        version: '1.0.0',
        data: {
          timetableEvents: [],
          tasks: [],
          medications: [],
          userPreferences: null,
          productivityLogs: null,
        },
      };
      
      jest.spyOn(offlineService, 'createBackup').mockResolvedValue(mockBackup);
      
      const { getByText } = render(<BackupRestore />);
      
      await waitFor(() => {
        expect(getByText('Create Backup')).toBeTruthy();
      });
      
      fireEvent.press(getByText('Create Backup'));
      
      await waitFor(() => {
        expect(offlineService.createBackup).toHaveBeenCalled();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle storage errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));
      
      await expect(
        saveWithOfflineSupport('@test_key', { test: 'data' }, 'CREATE_EVENT')
      ).rejects.toThrow('Storage full');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save data with offline support for key: @test_key',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle network state errors gracefully', async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      // Should not throw during initialization
      await expect(offlineService.initialize()).resolves.not.toThrow();
    });

    it('should handle backup errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const backup = await offlineService.getLatestBackup();
      
      expect(backup).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to get backup:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large sync queues efficiently', async () => {
      await offlineService.initialize();
      
      // Queue many operations
      const operations = Array.from({ length: 100 }, (_, i) => ({
        type: 'CREATE_EVENT' as const,
        data: { id: `${i}`, title: `Event ${i}` },
      }));
      
      for (const operation of operations) {
        await offlineService.queueOperation(operation);
      }
      
      expect(offlineService.getSyncQueue()).toHaveLength(100);
      
      // Process all operations
      await offlineService.processSyncQueue();
      
      expect(offlineService.getSyncQueue()).toHaveLength(0);
    });

    it('should clean up listeners properly', async () => {
      await offlineService.initialize();
      
      const listener = jest.fn();
      const unsubscribe = offlineService.addConnectionListener(listener);
      
      // Should call listener on connection change
      const netInfoCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      netInfoCallback({ isConnected: false });
      
      expect(listener).toHaveBeenCalledWith(false);
      
      // Unsubscribe
      unsubscribe();
      
      // Should not call listener after unsubscribe
      netInfoCallback({ isConnected: true });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});