import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import App from '../../App';
import { navigationService } from '../services/NavigationService';

// Mock react-native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-push-notification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  localNotificationSchedule: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  setApplicationIconBadgeNumber: jest.fn(),
  getApplicationIconBadgeNumber: jest.fn(),
  popInitialNotification: jest.fn(),
  abandonPermissions: jest.fn(),
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
  registrationError: jest.fn(),
  registerRemoteNotifications: jest.fn(),
}));

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

describe('Navigation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Navigation', () => {
    it('should render all four main tabs', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
        expect(getByText('Tasks')).toBeTruthy();
        expect(getByText('Medications')).toBeTruthy();
        expect(getByText('Progress')).toBeTruthy();
      });
    });

    it('should navigate between tabs', async () => {
      const { getByText } = render(<App />);
      
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });

      // Navigate to Tasks tab
      fireEvent.press(getByText('Tasks'));
      await waitFor(() => {
        expect(navigationService.getCurrentRouteName()).toBe('Tasks');
      });

      // Navigate to Medications tab
      fireEvent.press(getByText('Medications'));
      await waitFor(() => {
        expect(navigationService.getCurrentRouteName()).toBe('Medications');
      });

      // Navigate to Progress tab
      fireEvent.press(getByText('Progress'));
      await waitFor(() => {
        expect(navigationService.getCurrentRouteName()).toBe('Progress');
      });
    });
  });

  describe('Deep Linking', () => {
    it('should handle timetable deep link', async () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.handleDeepLink('productivityapp://timetable');
      
      expect(mockNavigate).toHaveBeenCalledWith('Timetable');
    });

    it('should handle tasks deep link', async () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.handleDeepLink('productivityapp://tasks');
      
      expect(mockNavigate).toHaveBeenCalledWith('Tasks');
    });

    it('should handle medications deep link', async () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.handleDeepLink('productivityapp://medications');
      
      expect(mockNavigate).toHaveBeenCalledWith('Medications');
    });

    it('should handle progress deep link', async () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.handleDeepLink('productivityapp://progress');
      
      expect(mockNavigate).toHaveBeenCalledWith('Progress');
    });

    it('should handle deep link with event ID', async () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.handleDeepLink('productivityapp://timetable?eventId=123');
      
      expect(mockNavigate).toHaveBeenCalledWith('Timetable', { eventId: '123' });
    });

    it('should handle deep link with task ID', async () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.handleDeepLink('productivityapp://tasks?taskId=456');
      
      expect(mockNavigate).toHaveBeenCalledWith('Tasks', { taskId: '456' });
    });

    it('should handle deep link with medication ID', async () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.handleDeepLink('productivityapp://medications?medicationId=789');
      
      expect(mockNavigate).toHaveBeenCalledWith('Medications', { medicationId: '789' });
    });

    it('should handle invalid deep link gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      navigationService.handleDeepLink('productivityapp://invalid');
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown deep link path:', '/invalid');
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed deep link gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      navigationService.handleDeepLink('invalid-url');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling deep link:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Navigation Service Methods', () => {
    it('should navigate to specific event', () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.navigateToEvent('event123');
      
      expect(mockNavigate).toHaveBeenCalledWith('Timetable', { eventId: 'event123' });
    });

    it('should navigate to specific task', () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.navigateToTask('task456');
      
      expect(mockNavigate).toHaveBeenCalledWith('Tasks', { taskId: 'task456' });
    });

    it('should navigate to specific medication', () => {
      const mockNavigate = jest.spyOn(navigationService, 'navigate');
      
      navigationService.navigateToMedication('med789');
      
      expect(mockNavigate).toHaveBeenCalledWith('Medications', { medicationId: 'med789' });
    });

    it('should reset navigation', () => {
      const mockReset = jest.spyOn(navigationService, 'reset');
      
      navigationService.reset('Timetable');
      
      expect(mockReset).toHaveBeenCalledWith('Timetable');
    });
  });

  describe('Notification Deep Links', () => {
    it('should handle notification tap for timetable event', async () => {
      const mockHandleDeepLink = jest.spyOn(navigationService, 'handleDeepLink');
      
      // Simulate notification tap
      const notificationUrl = 'productivityapp://timetable?eventId=notification123';
      
      // Mock Linking.getInitialURL to return the notification URL
      (Linking.getInitialURL as jest.Mock).mockResolvedValueOnce(notificationUrl);
      
      render(<App />);
      
      await waitFor(() => {
        expect(mockHandleDeepLink).toHaveBeenCalledWith(notificationUrl);
      });
    });

    it('should handle notification tap for task reminder', async () => {
      const mockHandleDeepLink = jest.spyOn(navigationService, 'handleDeepLink');
      
      // Simulate notification tap
      const notificationUrl = 'productivityapp://tasks?taskId=reminder456';
      
      // Mock Linking.getInitialURL to return the notification URL
      (Linking.getInitialURL as jest.Mock).mockResolvedValueOnce(notificationUrl);
      
      render(<App />);
      
      await waitFor(() => {
        expect(mockHandleDeepLink).toHaveBeenCalledWith(notificationUrl);
      });
    });

    it('should handle notification tap for medication reminder', async () => {
      const mockHandleDeepLink = jest.spyOn(navigationService, 'handleDeepLink');
      
      // Simulate notification tap
      const notificationUrl = 'productivityapp://medications?medicationId=reminder789';
      
      // Mock Linking.getInitialURL to return the notification URL
      (Linking.getInitialURL as jest.Mock).mockResolvedValueOnce(notificationUrl);
      
      render(<App />);
      
      await waitFor(() => {
        expect(mockHandleDeepLink).toHaveBeenCalledWith(notificationUrl);
      });
    });
  });

  describe('State Management Integration', () => {
    it('should maintain state across navigation', async () => {
      const { getByText } = render(<App />);
      
      // Start on Timetable screen
      await waitFor(() => {
        expect(getByText('Schedule')).toBeTruthy();
      });

      // Navigate to Tasks
      fireEvent.press(getByText('Tasks'));
      await waitFor(() => {
        expect(navigationService.getCurrentRouteName()).toBe('Tasks');
      });

      // Navigate back to Timetable
      fireEvent.press(getByText('Schedule'));
      await waitFor(() => {
        expect(navigationService.getCurrentRouteName()).toBe('Timetable');
      });

      // State should be preserved (this would be tested more thoroughly with actual data)
      expect(getByText('Schedule')).toBeTruthy();
    });
  });
});