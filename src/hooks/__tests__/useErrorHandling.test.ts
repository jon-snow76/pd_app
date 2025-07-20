import { renderHook, act } from '@testing-library/react-hooks';
import { useErrorHandling, useAsyncOperation, useFormErrorHandling } from '../useErrorHandling';
import { errorHandlingService } from '../../services/ErrorHandlingService';

// Mock the error handling service
jest.mock('../../services/ErrorHandlingService', () => ({
  errorHandlingService: {
    handleError: jest.fn(),
    handleNetworkError: jest.fn(),
    handleStorageError: jest.fn(),
    handleValidationError: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
  },
}));

describe('useErrorHandling', () => {
  const mockErrorHandlingService = errorHandlingService as jest.Mocked<typeof errorHandlingService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Error Handling', () => {
    it('should handle errors and update state', () => {
      const { result } = renderHook(() => useErrorHandling());
      
      act(() => {
        result.current.handleError('Test error', 'Test Context');
      });
      
      expect(result.current.error).toBe('Test error');
      expect(mockErrorHandlingService.handleError).toHaveBeenCalledWith(
        'Test error',
        'Test Context',
        undefined
      );
    });

    it('should handle Error objects', () => {
      const { result } = renderHook(() => useErrorHandling());
      const error = new Error('Test error');
      
      act(() => {
        result.current.handleError(error, 'Test Context');
      });
      
      expect(result.current.error).toBe('Test error');
      expect(mockErrorHandlingService.handleError).toHaveBeenCalledWith(
        error,
        'Test Context',
        undefined
      );
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => useErrorHandling());
      
      act(() => {
        result.current.handleError('Test error');
      });
      
      expect(result.current.error).toBe('Test error');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Specific Error Types', () => {
    it('should handle network errors', () => {
      const { result } = renderHook(() => useErrorHandling());
      const error = new Error('Network failed');
      
      act(() => {
        result.current.handleNetworkError(error, 'API Call');
      });
      
      expect(result.current.error).toBe('Network failed');
      expect(mockErrorHandlingService.handleNetworkError).toHaveBeenCalledWith(
        error,
        'API Call'
      );
    });

    it('should handle storage errors', () => {
      const { result } = renderHook(() => useErrorHandling());
      const error = new Error('Storage full');
      
      act(() => {
        result.current.handleStorageError(error, 'Data Save');
      });
      
      expect(result.current.error).toBe('Storage full');
      expect(mockErrorHandlingService.handleStorageError).toHaveBeenCalledWith(
        error,
        'Data Save'
      );
    });

    it('should handle validation errors', () => {
      const { result } = renderHook(() => useErrorHandling());
      const errors = ['Field required', 'Invalid format'];
      
      act(() => {
        result.current.handleValidationError(errors, 'Form Validation');
      });
      
      expect(result.current.error).toBe('Field required, Invalid format');
      expect(mockErrorHandlingService.handleValidationError).toHaveBeenCalledWith(
        errors,
        'Form Validation'
      );
    });
  });

  describe('Loading State Management', () => {
    it('should manage loading state', () => {
      const { result } = renderHook(() => useErrorHandling());
      
      expect(result.current.loading).toBe(false);
      
      act(() => {
        result.current.setLoadingState(true);
      });
      
      expect(result.current.loading).toBe(true);
      
      act(() => {
        result.current.setLoadingState(false);
      });
      
      expect(result.current.loading).toBe(false);
    });

    it('should manage loading state with keys', () => {
      const { result } = renderHook(() => useErrorHandling());
      
      act(() => {
        result.current.setLoadingState(true, 'operation1');
        result.current.setLoadingState(true, 'operation2');
      });
      
      expect(result.current.loading).toBe(true);
      
      act(() => {
        result.current.setLoadingState(false, 'operation1');
      });
      
      expect(result.current.loading).toBe(true); // Still loading operation2
      
      act(() => {
        result.current.setLoadingState(false, 'operation2');
      });
      
      expect(result.current.loading).toBe(false);
    });
  });

  describe('withErrorHandling', () => {
    it('should handle successful async operations', async () => {
      const { result } = renderHook(() => useErrorHandling());
      const mockAsyncFn = jest.fn().mockResolvedValue('success');
      
      let returnValue;
      await act(async () => {
        returnValue = await result.current.withErrorHandling(mockAsyncFn, 'Test Context');
      });
      
      expect(returnValue).toBe('success');
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should handle failed async operations', async () => {
      const { result } = renderHook(() => useErrorHandling());
      const error = new Error('Async error');
      const mockAsyncFn = jest.fn().mockRejectedValue(error);
      
      let returnValue;
      await act(async () => {
        returnValue = await result.current.withErrorHandling(mockAsyncFn, 'Test Context');
      });
      
      expect(returnValue).toBeNull();
      expect(result.current.error).toBe('Async error');
      expect(result.current.loading).toBe(false);
      expect(mockErrorHandlingService.handleError).toHaveBeenCalledWith(
        error,
        'Test Context'
      );
    });

    it('should manage loading state during async operations', async () => {
      const { result } = renderHook(() => useErrorHandling());
      const mockAsyncFn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );
      
      const promise = act(async () => {
        return result.current.withErrorHandling(mockAsyncFn, 'Test Context', 'testKey');
      });
      
      // Should be loading initially
      expect(result.current.loading).toBe(true);
      
      await promise;
      
      // Should not be loading after completion
      expect(result.current.loading).toBe(false);
    });
  });

  describe('withValidation', () => {
    it('should run validation before async operation', async () => {
      const { result } = renderHook(() => useErrorHandling());
      const mockAsyncFn = jest.fn().mockResolvedValue('success');
      const mockValidationFn = jest.fn().mockReturnValue(['Validation error']);
      
      let returnValue;
      await act(async () => {
        returnValue = await result.current.withValidation(
          mockAsyncFn,
          mockValidationFn,
          'Test Context'
        );
      });
      
      expect(returnValue).toBeNull();
      expect(mockAsyncFn).not.toHaveBeenCalled();
      expect(mockValidationFn).toHaveBeenCalled();
      expect(mockErrorHandlingService.handleValidationError).toHaveBeenCalledWith(
        ['Validation error'],
        'Test Context'
      );
    });

    it('should proceed with async operation if validation passes', async () => {
      const { result } = renderHook(() => useErrorHandling());
      const mockAsyncFn = jest.fn().mockResolvedValue('success');
      const mockValidationFn = jest.fn().mockReturnValue([]);
      
      let returnValue;
      await act(async () => {
        returnValue = await result.current.withValidation(
          mockAsyncFn,
          mockValidationFn,
          'Test Context'
        );
      });
      
      expect(returnValue).toBe('success');
      expect(mockAsyncFn).toHaveBeenCalled();
      expect(mockValidationFn).toHaveBeenCalled();
    });
  });

  describe('Success and Warning Messages', () => {
    it('should show success messages', () => {
      const { result } = renderHook(() => useErrorHandling());
      
      act(() => {
        result.current.showSuccess('Operation successful');
      });
      
      expect(result.current.error).toBeNull();
      expect(mockErrorHandlingService.showSuccess).toHaveBeenCalledWith(
        'Operation successful'
      );
    });

    it('should show warning messages', () => {
      const { result } = renderHook(() => useErrorHandling());
      
      act(() => {
        result.current.showWarning('Warning message');
      });
      
      expect(mockErrorHandlingService.showWarning).toHaveBeenCalledWith(
        'Warning message',
        undefined
      );
    });
  });
});

describe('useAsyncOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful async operations', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    const mockAsyncFn = jest.fn().mockResolvedValue('test data');
    
    await act(async () => {
      await result.current.execute(mockAsyncFn);
    });
    
    expect(result.current.data).toBe('test data');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle failed async operations', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const error = new Error('Async error');
    const mockAsyncFn = jest.fn().mockRejectedValue(error);
    
    await act(async () => {
      await result.current.execute(mockAsyncFn);
    });
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Async error');
  });

  it('should call success callback', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());
    const mockAsyncFn = jest.fn().mockResolvedValue('test data');
    const mockOnSuccess = jest.fn();
    
    await act(async () => {
      await result.current.execute(mockAsyncFn, {
        onSuccess: mockOnSuccess,
      });
    });
    
    expect(mockOnSuccess).toHaveBeenCalledWith('test data');
  });

  it('should call error callback', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const error = new Error('Async error');
    const mockAsyncFn = jest.fn().mockRejectedValue(error);
    const mockOnError = jest.fn();
    
    await act(async () => {
      await result.current.execute(mockAsyncFn, {
        onError: mockOnError,
      });
    });
    
    expect(mockOnError).toHaveBeenCalledWith(error);
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useAsyncOperation());
    
    // Set some state
    act(() => {
      result.current.execute(jest.fn().mockResolvedValue('data'));
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe('useFormErrorHandling', () => {
  it('should manage field errors', () => {
    const { result } = renderHook(() => useFormErrorHandling());
    
    act(() => {
      result.current.setFieldError('email', 'Invalid email');
    });
    
    expect(result.current.fieldErrors.email).toBe('Invalid email');
    expect(result.current.hasErrors).toBe(true);
    
    act(() => {
      result.current.clearFieldError('email');
    });
    
    expect(result.current.fieldErrors.email).toBeUndefined();
    expect(result.current.hasErrors).toBe(false);
  });

  it('should manage general form errors', () => {
    const { result } = renderHook(() => useFormErrorHandling());
    
    act(() => {
      result.current.setFormError('Form submission failed');
    });
    
    expect(result.current.generalError).toBe('Form submission failed');
    expect(result.current.hasErrors).toBe(true);
  });

  it('should validate individual fields', () => {
    const { result } = renderHook(() => useFormErrorHandling());
    const validators = [
      (value: string) => !value ? 'Field is required' : null,
      (value: string) => value.length < 3 ? 'Too short' : null,
    ];
    
    let isValid;
    act(() => {
      isValid = result.current.validateField('username', '', validators);
    });
    
    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.username).toBe('Field is required');
    
    act(() => {
      isValid = result.current.validateField('username', 'ab', validators);
    });
    
    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.username).toBe('Too short');
    
    act(() => {
      isValid = result.current.validateField('username', 'abc', validators);
    });
    
    expect(isValid).toBe(true);
    expect(result.current.fieldErrors.username).toBeUndefined();
  });

  it('should validate entire form', () => {
    const { result } = renderHook(() => useFormErrorHandling());
    const validationRules = {
      email: [(value: string) => !value ? 'Email is required' : null],
      password: [(value: string) => !value ? 'Password is required' : null],
    };
    
    let isValid;
    act(() => {
      isValid = result.current.validateForm(
        { email: '', password: 'test' },
        validationRules
      );
    });
    
    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.email).toBe('Email is required');
    expect(result.current.fieldErrors.password).toBeUndefined();
    
    act(() => {
      isValid = result.current.validateForm(
        { email: 'test@example.com', password: 'test' },
        validationRules
      );
    });
    
    expect(isValid).toBe(true);
    expect(result.current.fieldErrors.email).toBeUndefined();
  });

  it('should clear all errors', () => {
    const { result } = renderHook(() => useFormErrorHandling());
    
    act(() => {
      result.current.setFieldError('email', 'Invalid email');
      result.current.setFormError('Form error');
    });
    
    expect(result.current.hasErrors).toBe(true);
    
    act(() => {
      result.current.clearAllErrors();
    });
    
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.generalError).toBeNull();
  });
});