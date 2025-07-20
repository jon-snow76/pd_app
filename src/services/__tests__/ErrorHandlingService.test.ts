import { Alert } from 'react-native';
import ErrorHandlingService, { errorHandlingService } from '../ErrorHandlingService';

// Mock React Native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ErrorHandlingService();
  });

  describe('Error Handling', () => {
    it('should handle string errors', () => {
      const errorMessage = 'Test error message';
      
      service.handleError(errorMessage, 'Test Context');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Something went wrong'),
        [{ text: 'OK', style: 'default' }]
      );
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      
      service.handleError(error, 'Test Context');
      
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should store error reports', () => {
      const error = new Error('Test error');
      
      service.handleError(error, 'Test Context');
      
      const reports = service.getErrorReports();
      expect(reports).toHaveLength(1);
      expect(reports[0].message).toBe('Test error');
      expect(reports[0].context).toBe('Test Context');
      expect(reports[0].handled).toBe(true);
    });

    it('should not show alert when showAlert is false', () => {
      const error = new Error('Test error');
      
      service.handleError(error, 'Test Context', { showAlert: false });
      
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should use custom title and actions', () => {
      const error = new Error('Test error');
      const customActions = [
        { text: 'Retry', style: 'default' as const },
        { text: 'Cancel', style: 'cancel' as const },
      ];
      
      service.handleError(error, 'Test Context', {
        title: 'Custom Title',
        actions: customActions,
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Custom Title',
        expect.any(String),
        customActions
      );
    });
  });

  describe('Network Error Handling', () => {
    it('should handle offline errors', () => {
      const error = new Error('Network request failed');
      
      service.handleNetworkError(error, 'API Call');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Connection Issue',
        expect.stringContaining('offline'),
        expect.arrayContaining([
          { text: 'OK', style: 'default' },
          { text: 'Retry', style: 'default', onPress: expect.any(Function) },
        ])
      );
    });

    it('should handle general network errors', () => {
      const error = new Error('Server error');
      
      service.handleNetworkError(error, 'API Call');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.any(String),
        [{ text: 'OK', style: 'default' }]
      );
    });
  });

  describe('Storage Error Handling', () => {
    it('should handle storage errors with clear cache option', () => {
      const error = new Error('Storage full');
      
      service.handleStorageError(error, 'Data Save');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Storage Error',
        expect.stringContaining('Unable to save'),
        expect.arrayContaining([
          { text: 'OK', style: 'default' },
          { text: 'Clear Cache', style: 'destructive', onPress: expect.any(Function) },
        ])
      );
    });
  });

  describe('Permission Error Handling', () => {
    it('should handle notification permission errors', () => {
      service.handlePermissionError('notifications', 'Reminder Setup');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        expect.stringContaining('Notifications are disabled'),
        expect.arrayContaining([
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', style: 'default', onPress: expect.any(Function) },
        ])
      );
    });

    it('should handle unknown permission errors', () => {
      service.handlePermissionError('unknown', 'Feature Access');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        expect.stringContaining('unknown permission is required'),
        expect.any(Array)
      );
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle single validation error', () => {
      const errors = ['Field is required'];
      
      service.handleValidationError(errors, 'Form Validation');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Invalid Input',
        'Field is required',
        [{ text: 'OK' }]
      );
    });

    it('should handle multiple validation errors', () => {
      const errors = ['Field is required', 'Invalid format'];
      
      service.handleValidationError(errors, 'Form Validation');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Invalid Input',
        expect.stringContaining('Please fix the following issues:\n• Field is required\n• Invalid format'),
        [{ text: 'OK' }]
      );
    });
  });

  describe('Success and Warning Messages', () => {
    it('should show success message', () => {
      service.showSuccess('Operation completed successfully');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Operation completed successfully',
        [{ text: 'OK' }]
      );
    });

    it('should show warning message', () => {
      service.showWarning('This action cannot be undone');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Warning',
        'This action cannot be undone',
        [{ text: 'OK' }]
      );
    });

    it('should show warning with custom options', () => {
      const customActions = [
        { text: 'Continue', style: 'destructive' as const },
        { text: 'Cancel', style: 'cancel' as const },
      ];
      
      service.showWarning('This will delete all data', {
        title: 'Confirm Deletion',
        actions: customActions,
      });
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirm Deletion',
        'This will delete all data',
        customActions
      );
    });
  });

  describe('Error Reports Management', () => {
    it('should get error reports', () => {
      service.handleError('Error 1', 'Context 1');
      service.handleError('Error 2', 'Context 2');
      
      const reports = service.getErrorReports();
      expect(reports).toHaveLength(2);
      expect(reports[0].message).toBe('Error 1');
      expect(reports[1].message).toBe('Error 2');
    });

    it('should clear error reports', () => {
      service.handleError('Error 1', 'Context 1');
      service.clearErrorReports();
      
      const reports = service.getErrorReports();
      expect(reports).toHaveLength(0);
    });

    it('should limit number of stored reports', () => {
      // Add more than the max limit (50)
      for (let i = 0; i < 60; i++) {
        service.handleError(`Error ${i}`, 'Test Context');
      }
      
      const reports = service.getErrorReports();
      expect(reports).toHaveLength(50);
      expect(reports[0].message).toBe('Error 10'); // Should keep only the most recent 50
    });

    it('should get error statistics', () => {
      service.handleError('Error 1', 'Context A');
      service.handleError('Error 2', 'Context B');
      service.handleError('Error 3', 'Context A');
      
      const stats = service.getErrorStats();
      expect(stats.total).toBe(3);
      expect(stats.handled).toBe(3);
      expect(stats.unhandled).toBe(0);
      expect(stats.contexts).toEqual(['Context A', 'Context B']);
      expect(stats.mostRecentError?.message).toBe('Error 3');
    });
  });

  describe('User-Friendly Messages', () => {
    it('should map technical errors to user-friendly messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      service.handleError(new Error('Network request failed'), 'API');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Unable to connect to the server'),
        expect.any(Array)
      );
      
      consoleSpy.mockRestore();
    });

    it('should provide context-specific messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      service.handleError(new Error('Unknown error'), 'Timetable');
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Unable to manage your schedule'),
        expect.any(Array)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(errorHandlingService).toBeInstanceOf(ErrorHandlingService);
    });

    it('should return same instance on multiple imports', () => {
      const instance1 = errorHandlingService;
      const instance2 = errorHandlingService;
      
      expect(instance1).toBe(instance2);
    });
  });
});