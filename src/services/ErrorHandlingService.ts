import { Alert } from 'react-native';

/**
 * Service for handling errors and providing user feedback
 */
class ErrorHandlingService {
  private errorReports: ErrorReport[] = [];
  private maxReports = 50;

  /**
   * Handle and display user-friendly error messages
   */
  handleError(error: Error | string, context?: string, options?: ErrorHandlingOptions): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message: errorMessage,
      context: context || 'Unknown',
      timestamp: new Date(),
      stack: typeof error === 'object' ? error.stack : undefined,
      handled: false,
    };

    // Store error report
    this.addErrorReport(errorReport);

    // Log error for debugging
    console.error(`[${context}] Error:`, error);

    // Show user-friendly message
    const userMessage = this.getUserFriendlyMessage(errorMessage, context);
    
    if (options?.showAlert !== false) {
      this.showErrorAlert(userMessage, options);
    }

    // Mark as handled
    errorReport.handled = true;
  }

  /**
   * Handle network errors specifically
   */
  handleNetworkError(error: Error, context?: string): void {
    const isOffline = error.message.includes('Network request failed') || 
                     error.message.includes('fetch');
    
    if (isOffline) {
      this.handleError(
        'You appear to be offline. Please check your internet connection.',
        context || 'Network',
        {
          title: 'Connection Issue',
          actions: [
            { text: 'OK', style: 'default' },
            { text: 'Retry', style: 'default', onPress: () => window.location.reload() },
          ],
        }
      );
    } else {
      this.handleError(error, context || 'Network');
    }
  }

  /**
   * Handle storage errors
   */
  handleStorageError(error: Error, context?: string): void {
    const userMessage = 'Unable to save your data. Please try again or restart the app.';
    
    this.handleError(
      userMessage,
      context || 'Storage',
      {
        title: 'Storage Error',
        actions: [
          { text: 'OK', style: 'default' },
          { text: 'Clear Cache', style: 'destructive', onPress: this.clearAppCache },
        ],
      }
    );
  }

  /**
   * Handle permission errors
   */
  handlePermissionError(permission: string, context?: string): void {
    const messages: Record<string, string> = {
      notifications: 'Notifications are disabled. Enable them in Settings to receive reminders.',
      camera: 'Camera access is required for this feature. Please enable it in Settings.',
      storage: 'Storage access is required to save your data. Please enable it in Settings.',
    };

    const userMessage = messages[permission] || `${permission} permission is required for this feature.`;
    
    this.handleError(
      userMessage,
      context || 'Permissions',
      {
        title: 'Permission Required',
        actions: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', style: 'default', onPress: this.openAppSettings },
        ],
      }
    );
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors: string[], context?: string): void {
    const message = errors.length === 1 
      ? errors[0]
      : `Please fix the following issues:\n• ${errors.join('\n• ')}`;
    
    this.handleError(
      message,
      context || 'Validation',
      {
        title: 'Invalid Input',
        showAlert: true,
      }
    );
  }

  /**
   * Show success message
   */
  showSuccess(message: string, options?: { duration?: number }): void {
    // In a real app, you might use a toast library
    Alert.alert('Success', message, [{ text: 'OK' }]);
  }

  /**
   * Show warning message
   */
  showWarning(message: string, options?: ErrorHandlingOptions): void {
    Alert.alert(
      options?.title || 'Warning',
      message,
      options?.actions || [{ text: 'OK' }]
    );
  }

  /**
   * Get error reports for debugging
   */
  getErrorReports(): ErrorReport[] {
    return [...this.errorReports];
  }

  /**
   * Clear error reports
   */
  clearErrorReports(): void {
    this.errorReports = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const total = this.errorReports.length;
    const handled = this.errorReports.filter(r => r.handled).length;
    const contexts = [...new Set(this.errorReports.map(r => r.context))];
    
    return {
      total,
      handled,
      unhandled: total - handled,
      contexts,
      mostRecentError: this.errorReports[this.errorReports.length - 1],
    };
  }

  /**
   * Private methods
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addErrorReport(report: ErrorReport): void {
    this.errorReports.push(report);
    
    // Keep only the most recent reports
    if (this.errorReports.length > this.maxReports) {
      this.errorReports = this.errorReports.slice(-this.maxReports);
    }
  }

  private getUserFriendlyMessage(errorMessage: string, context?: string): string {
    // Map technical errors to user-friendly messages
    const errorMappings: Record<string, string> = {
      'Network request failed': 'Unable to connect to the server. Please check your internet connection.',
      'JSON.parse': 'Received invalid data from the server. Please try again.',
      'Cannot read property': 'Something went wrong while processing your request.',
      'TypeError': 'An unexpected error occurred. Please try again.',
      'ReferenceError': 'A required component is missing. Please restart the app.',
      'Storage quota exceeded': 'Your device is running low on storage space.',
      'Permission denied': 'Permission is required to complete this action.',
    };

    // Check for specific error patterns
    for (const [pattern, message] of Object.entries(errorMappings)) {
      if (errorMessage.includes(pattern)) {
        return message;
      }
    }

    // Context-specific messages
    if (context) {
      const contextMessages: Record<string, string> = {
        'Timetable': 'Unable to manage your schedule. Please try again.',
        'Tasks': 'Unable to manage your tasks. Please try again.',
        'Medications': 'Unable to manage your medications. Please try again.',
        'Notifications': 'Unable to send notifications. Please check your settings.',
        'Storage': 'Unable to save your data. Please try again.',
        'Sync': 'Unable to sync your data. Please check your connection.',
      };

      if (contextMessages[context]) {
        return contextMessages[context];
      }
    }

    // Default message
    return 'Something went wrong. Please try again or contact support if the problem persists.';
  }

  private showErrorAlert(message: string, options?: ErrorHandlingOptions): void {
    const title = options?.title || 'Error';
    const actions = options?.actions || [{ text: 'OK', style: 'default' }];

    Alert.alert(title, message, actions);
  }

  private clearAppCache = (): void => {
    // In a real app, you would clear the app cache
    Alert.alert('Cache Cleared', 'App cache has been cleared. Please restart the app.');
  };

  private openAppSettings = (): void => {
    // In a real app, you would open the device settings
    Alert.alert('Settings', 'Please open your device settings to enable permissions.');
  };
}

// Types
export interface ErrorReport {
  id: string;
  message: string;
  context: string;
  timestamp: Date;
  stack?: string;
  handled: boolean;
}

export interface ErrorHandlingOptions {
  title?: string;
  showAlert?: boolean;
  actions?: Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
  }>;
}

export interface ErrorStats {
  total: number;
  handled: number;
  unhandled: number;
  contexts: string[];
  mostRecentError?: ErrorReport;
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService();
export default ErrorHandlingService;