import { Alert, Linking, Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { errorHandlingService } from './ErrorHandlingService';

/**
 * Service for managing app permissions
 */
class PermissionService {
  private permissionStatus: Record<string, PermissionStatus> = {};

  /**
   * Initialize permission service
   */
  async initialize(): Promise<void> {
    try {
      // Check initial notification permissions
      await this.checkNotificationPermissions();
    } catch (error) {
      console.error('Failed to initialize permission service:', error);
    }
  }

  /**
   * Request notification permissions with user-friendly flow
   */
  async requestNotificationPermissions(): Promise<boolean> {
    try {
      // Check if already granted
      const currentStatus = await this.checkNotificationPermissions();
      if (currentStatus === 'granted') {
        return true;
      }

      // Show explanation dialog first
      const shouldRequest = await this.showPermissionExplanation('notifications');
      if (!shouldRequest) {
        return false;
      }

      // Request permissions
      const granted = await this.requestNotificationPermissionsNative();
      
      if (granted) {
        this.permissionStatus.notifications = 'granted';
        this.showPermissionGrantedFeedback('notifications');
        return true;
      } else {
        this.permissionStatus.notifications = 'denied';
        this.handlePermissionDenied('notifications');
        return false;
      }
    } catch (error) {
      errorHandlingService.handleError(
        error as Error,
        'Permission Request',
        {
          title: 'Permission Error',
          actions: [
            { text: 'OK', style: 'default' },
            { text: 'Try Again', style: 'default', onPress: () => this.requestNotificationPermissions() },
          ],
        }
      );
      return false;
    }
  }

  /**
   * Check current notification permissions
   */
  async checkNotificationPermissions(): Promise<PermissionStatus> {
    return new Promise((resolve) => {
      PushNotification.checkPermissions((permissions) => {
        const hasPermission = Platform.OS === 'ios' 
          ? permissions.alert && permissions.badge && permissions.sound
          : permissions.alert;

        const status: PermissionStatus = hasPermission ? 'granted' : 'denied';
        this.permissionStatus.notifications = status;
        resolve(status);
      });
    });
  }

  /**
   * Get permission status
   */
  getPermissionStatus(permission: string): PermissionStatus {
    return this.permissionStatus[permission] || 'unknown';
  }

  /**
   * Handle permission denied scenarios
   */
  private handlePermissionDenied(permission: string): void {
    const messages: Record<string, PermissionDeniedInfo> = {
      notifications: {
        title: 'Notifications Disabled',
        message: 'You won\'t receive reminders for your events, tasks, and medications. You can enable notifications anytime in Settings.',
        canOpenSettings: true,
        importance: 'high',
      },
    };

    const info = messages[permission];
    if (!info) return;

    const actions = [
      { text: 'Continue Without', style: 'cancel' as const },
    ];

    if (info.canOpenSettings) {
      actions.push({
        text: 'Open Settings',
        style: 'default' as const,
        onPress: this.openAppSettings,
      });
    }

    Alert.alert(info.title, info.message, actions);
  }

  /**
   * Show permission explanation dialog
   */
  private showPermissionExplanation(permission: string): Promise<boolean> {
    return new Promise((resolve) => {
      const explanations: Record<string, PermissionExplanation> = {
        notifications: {
          title: 'Enable Notifications',
          message: 'This app uses notifications to remind you about:\n\n• Upcoming events and meetings\n• Task deadlines\n• Medication times\n\nYou can customize these reminders in Settings.',
          benefits: [
            'Never miss important events',
            'Stay on top of your tasks',
            'Remember to take medications',
          ],
        },
      };

      const explanation = explanations[permission];
      if (!explanation) {
        resolve(false);
        return;
      }

      Alert.alert(
        explanation.title,
        explanation.message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable',
            style: 'default',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  /**
   * Request notification permissions from the system
   */
  private requestNotificationPermissionsNative(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.requestPermissions()
        .then((permissions) => {
          const granted = Platform.OS === 'ios'
            ? permissions.alert && permissions.badge && permissions.sound
            : permissions.alert;
          resolve(granted);
        })
        .catch((error) => {
          console.error('Failed to request notification permissions:', error);
          resolve(false);
        });
    });
  }

  /**
   * Show feedback when permission is granted
   */
  private showPermissionGrantedFeedback(permission: string): void {
    const messages: Record<string, string> = {
      notifications: 'Great! You\'ll now receive helpful reminders for your events, tasks, and medications.',
    };

    const message = messages[permission];
    if (message) {
      errorHandlingService.showSuccess(message);
    }
  }

  /**
   * Open app settings
   */
  private openAppSettings = (): void => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  /**
   * Check if permission is critical for app functionality
   */
  isPermissionCritical(permission: string): boolean {
    const criticalPermissions = ['notifications'];
    return criticalPermissions.includes(permission);
  }

  /**
   * Get permission recommendations
   */
  getPermissionRecommendations(): PermissionRecommendation[] {
    const recommendations: PermissionRecommendation[] = [];

    if (this.getPermissionStatus('notifications') !== 'granted') {
      recommendations.push({
        permission: 'notifications',
        title: 'Enable Notifications',
        description: 'Get reminders for events, tasks, and medications',
        importance: 'high',
        action: () => this.requestNotificationPermissions(),
      });
    }

    return recommendations;
  }

  /**
   * Show permission recommendations to user
   */
  async showPermissionRecommendations(): Promise<void> {
    const recommendations = this.getPermissionRecommendations();
    
    if (recommendations.length === 0) {
      return;
    }

    const highPriorityRecommendations = recommendations.filter(r => r.importance === 'high');
    
    if (highPriorityRecommendations.length > 0) {
      const recommendation = highPriorityRecommendations[0];
      
      Alert.alert(
        'Improve Your Experience',
        `${recommendation.title}\n\n${recommendation.description}`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Enable', style: 'default', onPress: recommendation.action },
        ]
      );
    }
  }
}

// Types
export type PermissionStatus = 'granted' | 'denied' | 'unknown';

export interface PermissionDeniedInfo {
  title: string;
  message: string;
  canOpenSettings: boolean;
  importance: 'low' | 'medium' | 'high';
}

export interface PermissionExplanation {
  title: string;
  message: string;
  benefits: string[];
}

export interface PermissionRecommendation {
  permission: string;
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
  action: () => void;
}

// Export singleton instance
export const permissionService = new PermissionService();
export default PermissionService;