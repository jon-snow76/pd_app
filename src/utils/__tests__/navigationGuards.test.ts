import {
  canNavigateToScreen,
  validateDeepLink,
  validateNotificationNavigation,
  navigateWithGuard,
  navigateDeepLinkWithGuard,
  navigateFromNotificationWithGuard,
} from '../navigationGuards';
import { navigationService } from '../../services/NavigationService';

// Mock the navigation service
jest.mock('../../services/NavigationService', () => ({
  navigationService: {
    navigate: jest.fn(),
    handleDeepLink: jest.fn(),
    navigateToEvent: jest.fn(),
    navigateToTask: jest.fn(),
    navigateToMedication: jest.fn(),
  },
}));

describe('Navigation Guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canNavigateToScreen', () => {
    it('should allow navigation to valid screens', () => {
      expect(canNavigateToScreen('Timetable')).toEqual({ canNavigate: true });
      expect(canNavigateToScreen('Tasks')).toEqual({ canNavigate: true });
      expect(canNavigateToScreen('Medications')).toEqual({ canNavigate: true });
      expect(canNavigateToScreen('Progress')).toEqual({ canNavigate: true });
    });

    it('should block navigation to invalid screens', () => {
      // @ts-ignore - Testing invalid screen name
      const result = canNavigateToScreen('InvalidScreen');
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('Unknown screen');
    });
  });

  describe('validateDeepLink', () => {
    it('should validate correct deep links', () => {
      expect(validateDeepLink('productivityapp://timetable')).toEqual({ canNavigate: true });
      expect(validateDeepLink('productivityapp://tasks')).toEqual({ canNavigate: true });
      expect(validateDeepLink('productivityapp://medications')).toEqual({ canNavigate: true });
      expect(validateDeepLink('productivityapp://progress')).toEqual({ canNavigate: true });
    });

    it('should validate deep links with query parameters', () => {
      expect(validateDeepLink('productivityapp://timetable?eventId=123')).toEqual({ canNavigate: true });
      expect(validateDeepLink('productivityapp://tasks?taskId=456')).toEqual({ canNavigate: true });
      expect(validateDeepLink('productivityapp://medications?medicationId=789')).toEqual({ canNavigate: true });
    });

    it('should reject invalid app scheme', () => {
      const result = validateDeepLink('invalidapp://timetable');
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('Invalid app scheme');
    });

    it('should reject invalid paths', () => {
      const result = validateDeepLink('productivityapp://invalid');
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('Invalid navigation path');
    });

    it('should reject empty query parameters', () => {
      const result = validateDeepLink('productivityapp://timetable?eventId=');
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('Invalid event ID');
    });

    it('should reject malformed URLs', () => {
      const result = validateDeepLink('not-a-url');
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('Malformed URL');
    });
  });

  describe('validateNotificationNavigation', () => {
    it('should validate correct notification data', () => {
      const notificationData = {
        type: 'event',
        id: '123',
        screen: 'Timetable',
      };
      expect(validateNotificationNavigation(notificationData)).toEqual({ canNavigate: true });
    });

    it('should validate notification data without screen', () => {
      const notificationData = {
        type: 'task',
        id: '456',
      };
      expect(validateNotificationNavigation(notificationData)).toEqual({ canNavigate: true });
    });

    it('should reject null notification data', () => {
      const result = validateNotificationNavigation(null);
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('No notification data provided');
    });

    it('should reject invalid notification type', () => {
      const notificationData = {
        type: 'invalid',
        id: '123',
      };
      const result = validateNotificationNavigation(notificationData);
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('Invalid notification type');
    });

    it('should reject empty notification ID', () => {
      const notificationData = {
        type: 'event',
        id: '',
      };
      const result = validateNotificationNavigation(notificationData);
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('Invalid notification ID');
    });

    it('should reject invalid target screen', () => {
      const notificationData = {
        type: 'event',
        id: '123',
        screen: 'InvalidScreen',
      };
      const result = validateNotificationNavigation(notificationData);
      expect(result.canNavigate).toBe(false);
      expect(result.message).toBe('Invalid target screen');
    });
  });

  describe('navigateWithGuard', () => {
    it('should navigate when guard allows', () => {
      const result = navigateWithGuard('Timetable', { eventId: '123' });
      
      expect(result).toBe(true);
      expect(navigationService.navigate).toHaveBeenCalledWith('Timetable', { eventId: '123' });
    });

    it('should block navigation when guard denies', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // @ts-ignore - Testing invalid screen name
      const result = navigateWithGuard('InvalidScreen');
      
      expect(result).toBe(false);
      expect(navigationService.navigate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Navigation blocked:', 'Unknown screen');
      
      consoleSpy.mockRestore();
    });
  });

  describe('navigateDeepLinkWithGuard', () => {
    it('should navigate when deep link is valid', () => {
      const result = navigateDeepLinkWithGuard('productivityapp://timetable');
      
      expect(result).toBe(true);
      expect(navigationService.handleDeepLink).toHaveBeenCalledWith('productivityapp://timetable');
    });

    it('should block navigation when deep link is invalid', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = navigateDeepLinkWithGuard('invalid-url');
      
      expect(result).toBe(false);
      expect(navigationService.handleDeepLink).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Deep link navigation blocked:', 'Malformed URL');
      
      consoleSpy.mockRestore();
    });
  });

  describe('navigateFromNotificationWithGuard', () => {
    it('should navigate to event from notification', () => {
      const notificationData = {
        type: 'event',
        id: '123',
      };
      
      const result = navigateFromNotificationWithGuard(notificationData);
      
      expect(result).toBe(true);
      expect(navigationService.navigateToEvent).toHaveBeenCalledWith('123');
    });

    it('should navigate to task from notification', () => {
      const notificationData = {
        type: 'task',
        id: '456',
      };
      
      const result = navigateFromNotificationWithGuard(notificationData);
      
      expect(result).toBe(true);
      expect(navigationService.navigateToTask).toHaveBeenCalledWith('456');
    });

    it('should navigate to medication from notification', () => {
      const notificationData = {
        type: 'medication',
        id: '789',
      };
      
      const result = navigateFromNotificationWithGuard(notificationData);
      
      expect(result).toBe(true);
      expect(navigationService.navigateToMedication).toHaveBeenCalledWith('789');
    });

    it('should navigate to screen from notification', () => {
      const notificationData = {
        type: 'other',
        id: '123',
        screen: 'Progress',
      };
      
      const result = navigateFromNotificationWithGuard(notificationData);
      
      expect(result).toBe(true);
      expect(navigationService.navigate).toHaveBeenCalledWith('Progress');
    });

    it('should block navigation when notification data is invalid', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = navigateFromNotificationWithGuard(null);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Notification navigation blocked:', 'No notification data provided');
      
      consoleSpy.mockRestore();
    });
  });
});