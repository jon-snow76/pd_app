import { useState, useCallback, useRef } from 'react';
import { errorHandlingService, ErrorHandlingOptions } from '../services/ErrorHandlingService';

/**
 * Hook for handling errors and loading states
 */
export const useErrorHandling = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef<Record<string, boolean>>({});

  const handleError = useCallback((
    error: Error | string,
    context?: string,
    options?: ErrorHandlingOptions
  ) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    setError(errorMessage);
    errorHandlingService.handleError(error, context, options);
  }, []);

  const handleNetworkError = useCallback((error: Error, context?: string) => {
    setError(error.message);
    errorHandlingService.handleNetworkError(error, context);
  }, []);

  const handleStorageError = useCallback((error: Error, context?: string) => {
    setError(error.message);
    errorHandlingService.handleStorageError(error, context);
  }, []);

  const handleValidationError = useCallback((errors: string[], context?: string) => {
    const errorMessage = errors.join(', ');
    setError(errorMessage);
    errorHandlingService.handleValidationError(errors, context);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setLoadingState = useCallback((isLoading: boolean, key?: string) => {
    if (key) {
      loadingRef.current[key] = isLoading;
      const hasAnyLoading = Object.values(loadingRef.current).some(Boolean);
      setLoading(hasAnyLoading);
    } else {
      setLoading(isLoading);
    }
  }, []);

  const withErrorHandling = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    loadingKey?: string
  ): Promise<T | null> => {
    try {
      setLoadingState(true, loadingKey);
      clearError();
      
      const result = await asyncFn();
      return result;
    } catch (error) {
      handleError(error as Error, context);
      return null;
    } finally {
      setLoadingState(false, loadingKey);
    }
  }, [handleError, clearError, setLoadingState]);

  const withValidation = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    validationFn: () => string[],
    context?: string,
    loadingKey?: string
  ): Promise<T | null> => {
    try {
      setLoadingState(true, loadingKey);
      clearError();
      
      // Run validation first
      const validationErrors = validationFn();
      if (validationErrors.length > 0) {
        handleValidationError(validationErrors, context);
        return null;
      }
      
      const result = await asyncFn();
      return result;
    } catch (error) {
      handleError(error as Error, context);
      return null;
    } finally {
      setLoadingState(false, loadingKey);
    }
  }, [handleError, handleValidationError, clearError, setLoadingState]);

  const showSuccess = useCallback((message: string) => {
    clearError();
    errorHandlingService.showSuccess(message);
  }, [clearError]);

  const showWarning = useCallback((message: string, options?: ErrorHandlingOptions) => {
    errorHandlingService.showWarning(message, options);
  }, []);

  return {
    loading,
    error,
    handleError,
    handleNetworkError,
    handleStorageError,
    handleValidationError,
    clearError,
    setLoadingState,
    withErrorHandling,
    withValidation,
    showSuccess,
    showWarning,
  };
};

/**
 * Hook for managing async operations with error handling
 */
export const useAsyncOperation = <T = any>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    asyncFn: () => Promise<T>,
    options?: {
      context?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      showSuccessMessage?: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await asyncFn();
      setData(result);
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      if (options?.showSuccessMessage) {
        errorHandlingService.showSuccess(options.showSuccessMessage);
      }
      
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      
      if (options?.onError) {
        options.onError(error);
      } else {
        errorHandlingService.handleError(error, options?.context);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

/**
 * Hook for form error handling
 */
export const useFormErrorHandling = () => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setGeneralError(null);
  }, []);

  const setFormError = useCallback((error: string) => {
    setGeneralError(error);
  }, []);

  const validateField = useCallback((
    field: string,
    value: any,
    validators: Array<(value: any) => string | null>
  ): boolean => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        setFieldError(field, error);
        return false;
      }
    }
    clearFieldError(field);
    return true;
  }, [setFieldError, clearFieldError]);

  const validateForm = useCallback((
    values: Record<string, any>,
    validationRules: Record<string, Array<(value: any) => string | null>>
  ): boolean => {
    let isValid = true;
    
    for (const [field, validators] of Object.entries(validationRules)) {
      const fieldValid = validateField(field, values[field], validators);
      if (!fieldValid) {
        isValid = false;
      }
    }
    
    return isValid;
  }, [validateField]);

  const hasErrors = Object.keys(fieldErrors).length > 0 || generalError !== null;

  return {
    fieldErrors,
    generalError,
    hasErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    setFormError,
    validateField,
    validateForm,
  };
};

export default useErrorHandling;