import { NavigationContainerRef } from '@react-navigation/native';
import { RootTabParamList } from '../../App';
import { validateDeepLink, navigateFromNotificationWithGuard } from '../utils/navigationGuards';

/**
 * Navigation service for handling deep links and programmatic navigation
 */
class NavigationService {
  private navigationRef: React.RefObject<NavigationContainerRef<RootTabParamList>> | null = null;

  /**
   * Set the navigation reference
   */
  setNavigationRef(ref: React.RefObject<NavigationContainerRef<RootTabParamList>>) {
    this.navigationRef = ref;
  }

  /**
   * Navigate to a specific screen
   */
  navigate(screenName: keyof RootTabParamList, params?: any) {
    if (this.navigationRef?.current) {
      this.navigationRef.current.navigate(screenName, params);
    }
  }

  /**
   * Go back to the previous screen
   */
  goBack() {
    if (this.navigationRef?.current) {
      this.navigationRef.current.goBack();
    }
  }

  /**
   * Reset navigation to a specific screen
   */
  reset(screenName: keyof RootTabParamList) {
    if (this.navigationRef?.current) {
      this.navigationRef.current.reset({
        index: 0,
        routes: [{ name: screenName }],
      });
    }
  }

  /**
   * Handle deep links from notifications with validation
   */
  handleDeepLink(url: string) {
    // Validate deep link before processing
    const guardResult = validateDeepLink(url);
    
    if (!guardResult.canNavigate) {
      console.warn('Deep link blocked:', guardResult.message);
      return;
    }

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      switch (path) {
        case '/timetable':
          this.navigate('Timetable');
          break;
        case '/tasks':
          this.navigate('Tasks');
          break;
        case '/medications':
          this.navigate('Medications');
          break;
        case '/progress':
          this.navigate('Progress');
          break;
        default:
          console.log('Unknown deep link path:', path);
      }

      // Handle query parameters for specific items
      const eventId = urlObj.searchParams.get('eventId');
      const taskId = urlObj.searchParams.get('taskId');
      const medicationId = urlObj.searchParams.get('medicationId');

      if (eventId) {
        this.navigate('Timetable', { eventId });
      } else if (taskId) {
        this.navigate('Tasks', { taskId });
      } else if (medicationId) {
        this.navigate('Medications', { medicationId });
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  /**
   * Navigate to timetable with specific event
   */
  navigateToEvent(eventId: string) {
    this.navigate('Timetable', { eventId });
  }

  /**
   * Navigate to tasks with specific task
   */
  navigateToTask(taskId: string) {
    this.navigate('Tasks', { taskId });
  }

  /**
   * Navigate to medications with specific medication
   */
  navigateToMedication(medicationId: string) {
    this.navigate('Medications', { medicationId });
  }

  /**
   * Get current route name
   */
  getCurrentRouteName(): string | undefined {
    if (this.navigationRef?.current) {
      return this.navigationRef.current.getCurrentRoute()?.name;
    }
    return undefined;
  }

  /**
   * Check if navigation is ready
   */
  isReady(): boolean {
    return this.navigationRef?.current?.isReady() || false;
  }

  /**
   * Handle navigation from notification with validation
   */
  handleNotificationNavigation(notificationData: any): boolean {
    return navigateFromNotificationWithGuard(notificationData);
  }
}

// Export singleton instance
export const navigationService = new NavigationService();
export default NavigationService;