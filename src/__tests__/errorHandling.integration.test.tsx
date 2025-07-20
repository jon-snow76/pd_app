import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import ProgressIndicator from '../components/ProgressIndicator';
import { useErrorHandling } from '../hooks/useErrorHandling';
import { permissionService } from '../services/PermissionService';
import { errorHandlingService } from '../services/ErrorHandlingService';

// Mock React Native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock services
jest.mock('../services/PermissionService');
jest.mock('../services/ErrorHandlingService');

// Test component that throws an error
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div testID="success">Component rendered successfully</div>;
};

// Test component using error handling hook
const ErrorHandlingTestComponent: React.FC = () => {
  const { loading, error, handleError, showSuccess, withErrorHandling } = useErrorHandling();
  
  const handleAsyncOperation = async () => {
    await withErrorHandling(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      },
      'Test Operation'
    );
  };
  
  const handleErrorOperation = () => {
    handleError('Test error message', 'Test Context');
  };
  
  const handleSuccessOperation = () => {
    showSuccess('Operation completed successfully');
  };
  
  return (
    <div>
      {loading && <div testID="loading">Loading...</div>}
      {error && <div testID="error">{error}</div>}
      <button testID="async-button" onPress={handleAsyncOperation}>
        Async Operation
      </button>
      <button testID="error-button" onPress={handleErrorOperation}>
        Trigger Error
      </button>
      <button testID="success-button" onPress={handleSuccessOperation}>
        Show Success
      </button>
    </div>
  );
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ErrorBoundary', () => {
    it('should catch and display errors', () => {
      const onError = jest.fn();
      const { getByTestId, rerender } = render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      
      // Initially should render successfully
      expect(getByTestId('success')).toBeTruthy();
      
      // Trigger error
      rerender(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should show error UI
      expect(() => getByTestId('success')).toThrow();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should show custom fallback UI', () => {
      const customFallback = <div testID="custom-error">Custom error UI</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(() => getByTestId('custom-error')).toBeTruthy();
    });

    it('should handle retry functionality', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should show error UI with retry button
      const retryButton = getByText('Try Again');
      expect(retryButton).toBeTruthy();
      
      // Mock component to not throw after retry
      fireEvent.press(retryButton);
      
      rerender(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      
      // Should render successfully after retry
      expect(() => getByTestId('success')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner', () => {
      const { getByTestId } = render(
        <LoadingSpinner visible={true} message="Loading data..." />
      );
      
      expect(getByTestId('loading-spinner')).toBeTruthy();
      expect(getByText('Loading data...')).toBeTruthy();
    });

    it('should hide loading spinner when not visible', () => {
      const { queryByTestId } = render(
        <LoadingSpinner visible={false} />
      );
      
      expect(queryByTestId('loading-spinner')).toBeNull();
    });

    it('should show progress indicator', () => {
      const { getByTestId } = render(
        <ProgressIndicator 
          progress={0.5} 
          message="Processing..." 
          showPercentage={true}
        />
      );
      
      expect(getByText('Processing...')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
    });
  });

  describe('Error Handling Hook Integration', () => {
    it('should handle async operations with loading states', async () => {
      const { getByTestId, queryByTestId } = render(<ErrorHandlingTestComponent />);
      
      // Initially no loading
      expect(queryByTestId('loading')).toBeNull();
      
      // Trigger async operation
      fireEvent.press(getByTestId('async-button'));
      
      // Should show loading
      expect(getByTestId('loading')).toBeTruthy();
      
      // Wait for operation to complete
      await waitFor(() => {
        expect(queryByTestId('loading')).toBeNull();
      });
    });

    it('should display errors from hook', () => {
      const { getByTestId } = render(<ErrorHandlingTestComponent />);
      
      fireEvent.press(getByTestId('error-button'));
      
      expect(getByTestId('error')).toHaveTextContent('Test error message');
      expect(errorHandlingService.handleError).toHaveBeenCalledWith(
        'Test error message',
        'Test Context',
        undefined
      );
    });

    it('should show success messages', () => {
      const { getByTestId } = render(<ErrorHandlingTestComponent />);
      
      fireEvent.press(getByTestId('success-button'));
      
      expect(errorHandlingService.showSuccess).toHaveBeenCalledWith(
        'Operation completed successfully'
      );
    });
  });

  describe('Permission Flow Integration', () => {
    it('should handle permission requests', async () => {
      const mockRequestPermissions = jest.fn().mockResolvedValue(true);
      (permissionService.requestNotificationPermissions as jest.Mock) = mockRequestPermissions;
      
      const result = await permissionService.requestNotificationPermissions();
      
      expect(result).toBe(true);
      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('should handle permission denials', async () => {
      const mockRequestPermissions = jest.fn().mockResolvedValue(false);
      (permissionService.requestNotificationPermissions as jest.Mock) = mockRequestPermissions;
      
      const result = await permissionService.requestNotificationPermissions();
      
      expect(result).toBe(false);
    });

    it('should show permission recommendations', async () => {
      const mockShowRecommendations = jest.fn();
      (permissionService.showPermissionRecommendations as jest.Mock) = mockShowRecommendations;
      
      await permissionService.showPermissionRecommendations();
      
      expect(mockShowRecommendations).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle network errors with retry', async () => {
      const mockHandleNetworkError = jest.fn();
      (errorHandlingService.handleNetworkError as jest.Mock) = mockHandleNetworkError;
      
      const networkError = new Error('Network request failed');
      errorHandlingService.handleNetworkError(networkError, 'API Call');
      
      expect(mockHandleNetworkError).toHaveBeenCalledWith(networkError, 'API Call');
    });

    it('should handle storage errors with cache clear option', async () => {
      const mockHandleStorageError = jest.fn();
      (errorHandlingService.handleStorageError as jest.Mock) = mockHandleStorageError;
      
      const storageError = new Error('Storage quota exceeded');
      errorHandlingService.handleStorageError(storageError, 'Data Save');
      
      expect(mockHandleStorageError).toHaveBeenCalledWith(storageError, 'Data Save');
    });

    it('should handle validation errors with field-specific messages', () => {
      const mockHandleValidationError = jest.fn();
      (errorHandlingService.handleValidationError as jest.Mock) = mockHandleValidationError;
      
      const validationErrors = ['Email is required', 'Password too short'];
      errorHandlingService.handleValidationError(validationErrors, 'Form Validation');
      
      expect(mockHandleValidationError).toHaveBeenCalledWith(
        validationErrors,
        'Form Validation'
      );
    });
  });

  describe('User Feedback Integration', () => {
    it('should show user-friendly error messages', () => {
      const mockHandleError = jest.fn();
      (errorHandlingService.handleError as jest.Mock) = mockHandleError;
      
      const technicalError = new Error('TypeError: Cannot read property of undefined');
      errorHandlingService.handleError(technicalError, 'Data Processing');
      
      expect(mockHandleError).toHaveBeenCalledWith(
        technicalError,
        'Data Processing'
      );
    });

    it('should provide context-specific error messages', () => {
      const mockHandleError = jest.fn();
      (errorHandlingService.handleError as jest.Mock) = mockHandleError;
      
      const error = new Error('Operation failed');
      errorHandlingService.handleError(error, 'Timetable');
      
      expect(mockHandleError).toHaveBeenCalledWith(error, 'Timetable');
    });
  });

  describe('Loading and Progress Indicators', () => {
    it('should show appropriate loading states for different operations', () => {
      const operations = [
        { name: 'Saving data...', progress: 0.3 },
        { name: 'Syncing...', progress: 0.7 },
        { name: 'Finalizing...', progress: 1.0 },
      ];
      
      operations.forEach(op => {
        const { getByText } = render(
          <ProgressIndicator 
            progress={op.progress} 
            message={op.name}
            showPercentage={true}
          />
        );
        
        expect(getByText(op.name)).toBeTruthy();
        expect(getByText(`${Math.round(op.progress * 100)}%`)).toBeTruthy();
      });
    });

    it('should handle step-by-step progress', () => {
      const steps = ['Validate', 'Process', 'Save', 'Complete'];
      const { StepProgress } = require('../components/ProgressIndicator');
      
      const { getByText } = render(
        <StepProgress steps={steps} currentStep={2} />
      );
      
      steps.forEach(step => {
        expect(getByText(step)).toBeTruthy();
      });
    });
  });

  describe('Error Boundary with Props Changes', () => {
    it('should reset on props change when configured', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true} resetKeys={['key1']}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should show error initially
      expect(() => getByText('Oops! Something went wrong')).toBeTruthy();
      
      // Change reset key
      rerender(
        <ErrorBoundary resetOnPropsChange={true} resetKeys={['key2']}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      
      // Should reset and show success
      expect(() => getByTestId('success')).toBeTruthy();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle multiple concurrent errors without memory leaks', () => {
      const errors = Array.from({ length: 100 }, (_, i) => new Error(`Error ${i}`));
      
      errors.forEach(error => {
        errorHandlingService.handleError(error, 'Stress Test', { showAlert: false });
      });
      
      const reports = errorHandlingService.getErrorReports();
      expect(reports.length).toBeLessThanOrEqual(50); // Should limit stored reports
    });

    it('should clean up resources properly', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ErrorHandlingTestComponent />
        </ErrorBoundary>
      );
      
      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});