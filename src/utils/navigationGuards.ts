import { navigationService } from '../services/NavigationService';

/**
 * Navigation guards for handling navigation restrictions and validations
 */

export interface NavigationGuardResult {
  canNavigate: boolean;
  redirectTo?: keyof import('../../App').RootTabParamList;
  message?: string;
}

/**
 * Check if user can navigate to a specific screen
 */
export const canNavigateToScreen = (
  screenName: keyof import('../../App').RootTabParamList,
  context?: any
): NavigationGuardResult => {
  // Basic navigation guard - can be extended with more complex logic
  switch (screenName) {
    case 'Timetable':
      return { canNavigate: true };
    
    case 'Tasks':
      return { canNavigate: true };
    
    case 'Medications':
      return { canNavigate: true };
    
    case 'Progress':
      return { canNavigate: true };
    
    default:
      return {
        canNavigate: false,
        message: 'Unknown screen',
      };
  }
};

/**
 * Navigation guard for deep links
 */
export const validateDeepLink = (url: string): NavigationGuardResult => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Validate URL format
    if (!url.startsWith('productivityapp://')) {
      return {
        canNavigate: false,
        message: 'Invalid app scheme',
      };
    }
    
    // Validate path
    const validPaths = ['/timetable', '/tasks', '/medications', '/progress'];
    if (!validPaths.includes(path)) {
      return {
        canNavigate: false,
        message: 'Invalid navigation path',
      };
    }
    
    // Validate query parameters
    const eventId = urlObj.searchParams.get('eventId');
    const taskId = urlObj.searchParams.get('taskId');
    const medicationId = urlObj.searchParams.get('medicationId');
    
    // Basic validation for IDs (should be non-empty strings)
    if (eventId && (!eventId || eventId.trim() === '')) {
      return {
        canNavigate: false,
        message: 'Invalid event ID',
      };
    }
    
    if (taskId && (!taskId || taskId.trim() === '')) {
      return {
        canNavigate: false,
        message: 'Invalid task ID',
      };
    }
    
    if (medicationId && (!medicationId || medicationId.trim() === '')) {
      return {
        canNavigate: false,
        message: 'Invalid medication ID',
      };
    }
    
    return { canNavigate: true };
  } catch (error) {
    return {
      canNavigate: false,
      message: 'Malformed URL',
    };
  }
};

/**
 * Navigation guard for notification-triggered navigation
 */
export const validateNotificationNavigation = (
  notificationData: any
): NavigationGuardResult => {
  if (!notificationData) {
    return {
      canNavigate: false,
      message: 'No notification data provided',
    };
  }
  
  const { type, id, screen } = notificationData;
  
  // Validate notification type
  const validTypes = ['event', 'task', 'medication'];
  if (!validTypes.includes(type)) {
    return {
      canNavigate: false,
      message: 'Invalid notification type',
    };
  }
  
  // Validate ID
  if (!id || id.trim() === '') {
    return {
      canNavigate: false,
      message: 'Invalid notification ID',
    };
  }
  
  // Validate target screen
  const validScreens = ['Timetable', 'Tasks', 'Medications', 'Progress'];
  if (screen && !validScreens.includes(screen)) {
    return {
      canNavigate: false,
      message: 'Invalid target screen',
    };
  }
  
  return { canNavigate: true };
};

/**
 * Execute navigation with guard validation
 */
export const navigateWithGuard = (
  screenName: keyof import('../../App').RootTabParamList,
  params?: any,
  context?: any
): boolean => {
  const guardResult = canNavigateToScreen(screenName, context);
  
  if (!guardResult.canNavigate) {
    console.warn('Navigation blocked:', guardResult.message);
    
    // If there's a redirect, navigate there instead
    if (guardResult.redirectTo) {
      navigationService.navigate(guardResult.redirectTo);
    }
    
    return false;
  }
  
  // Navigation is allowed
  navigationService.navigate(screenName, params);
  return true;
};

/**
 * Execute deep link navigation with validation
 */
export const navigateDeepLinkWithGuard = (url: string): boolean => {
  const guardResult = validateDeepLink(url);
  
  if (!guardResult.canNavigate) {
    console.warn('Deep link navigation blocked:', guardResult.message);
    return false;
  }
  
  // Deep link is valid, proceed with navigation
  navigationService.handleDeepLink(url);
  return true;
};

/**
 * Execute notification navigation with validation
 */
export const navigateFromNotificationWithGuard = (
  notificationData: any
): boolean => {
  const guardResult = validateNotificationNavigation(notificationData);
  
  if (!guardResult.canNavigate) {
    console.warn('Notification navigation blocked:', guardResult.message);
    return false;
  }
  
  const { type, id, screen } = notificationData;
  
  // Navigate based on notification type
  switch (type) {
    case 'event':
      navigationService.navigateToEvent(id);
      break;
    case 'task':
      navigationService.navigateToTask(id);
      break;
    case 'medication':
      navigationService.navigateToMedication(id);
      break;
    default:
      if (screen) {
        navigationService.navigate(screen as keyof import('../../App').RootTabParamList);
      }
  }
  
  return true;
};