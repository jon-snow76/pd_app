import NavigationService, { navigationService } from '../NavigationService';

// Mock navigation ref
const mockNavigationRef = {
  current: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    getCurrentRoute: jest.fn(),
    isReady: jest.fn(),
  },
};

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NavigationService();
    service.setNavigationRef(mockNavigationRef as any);
  });

  describe('Basic Navigation', () => {
    it('should navigate to a screen', () => {
      service.navigate('Timetable');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Timetable', undefined);
    });

    it('should navigate to a screen with params', () => {
      const params = { eventId: '123' };
      service.navigate('Timetable', params);
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Timetable', params);
    });

    it('should go back', () => {
      service.goBack();
      
      expect(mockNavigationRef.current.goBack).toHaveBeenCalled();
    });

    it('should reset navigation', () => {
      service.reset('Tasks');
      
      expect(mockNavigationRef.current.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Tasks' }],
      });
    });
  });

  describe('Deep Link Handling', () => {
    it('should handle timetable deep link', () => {
      service.handleDeepLink('productivityapp://timetable');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Timetable');
    });

    it('should handle tasks deep link', () => {
      service.handleDeepLink('productivityapp://tasks');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Tasks');
    });

    it('should handle medications deep link', () => {
      service.handleDeepLink('productivityapp://medications');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Medications');
    });

    it('should handle progress deep link', () => {
      service.handleDeepLink('productivityapp://progress');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Progress');
    });

    it('should handle deep link with event ID', () => {
      service.handleDeepLink('productivityapp://timetable?eventId=123');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Timetable', { eventId: '123' });
    });

    it('should handle deep link with task ID', () => {
      service.handleDeepLink('productivityapp://tasks?taskId=456');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Tasks', { taskId: '456' });
    });

    it('should handle deep link with medication ID', () => {
      service.handleDeepLink('productivityapp://medications?medicationId=789');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Medications', { medicationId: '789' });
    });

    it('should handle unknown deep link gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.handleDeepLink('productivityapp://unknown');
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown deep link path:', '/unknown');
      consoleSpy.mockRestore();
    });

    it('should handle invalid deep link gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      service.handleDeepLink('invalid-url');
      
      expect(consoleSpy).toHaveBeenCalledWith('Error handling deep link:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Specific Navigation Methods', () => {
    it('should navigate to event', () => {
      service.navigateToEvent('event123');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Timetable', { eventId: 'event123' });
    });

    it('should navigate to task', () => {
      service.navigateToTask('task456');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Tasks', { taskId: 'task456' });
    });

    it('should navigate to medication', () => {
      service.navigateToMedication('med789');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Medications', { medicationId: 'med789' });
    });
  });

  describe('Utility Methods', () => {
    it('should get current route name', () => {
      mockNavigationRef.current.getCurrentRoute.mockReturnValue({ name: 'Timetable' });
      
      const routeName = service.getCurrentRouteName();
      
      expect(routeName).toBe('Timetable');
    });

    it('should return undefined when no current route', () => {
      mockNavigationRef.current.getCurrentRoute.mockReturnValue(undefined);
      
      const routeName = service.getCurrentRouteName();
      
      expect(routeName).toBeUndefined();
    });

    it('should check if navigation is ready', () => {
      mockNavigationRef.current.isReady.mockReturnValue(true);
      
      const isReady = service.isReady();
      
      expect(isReady).toBe(true);
    });

    it('should return false when navigation is not ready', () => {
      mockNavigationRef.current.isReady.mockReturnValue(false);
      
      const isReady = service.isReady();
      
      expect(isReady).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation when ref is not set', () => {
      const serviceWithoutRef = new NavigationService();
      
      expect(() => serviceWithoutRef.navigate('Timetable')).not.toThrow();
      expect(() => serviceWithoutRef.goBack()).not.toThrow();
      expect(() => serviceWithoutRef.reset('Tasks')).not.toThrow();
    });

    it('should handle getCurrentRouteName when ref is not set', () => {
      const serviceWithoutRef = new NavigationService();
      
      const routeName = serviceWithoutRef.getCurrentRouteName();
      
      expect(routeName).toBeUndefined();
    });

    it('should handle isReady when ref is not set', () => {
      const serviceWithoutRef = new NavigationService();
      
      const isReady = serviceWithoutRef.isReady();
      
      expect(isReady).toBe(false);
    });
  });

  describe('Notification Navigation', () => {
    it('should handle notification navigation for events', () => {
      const notificationData = {
        type: 'event',
        id: '123',
      };
      
      const result = service.handleNotificationNavigation(notificationData);
      
      expect(result).toBe(true);
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Timetable', { eventId: '123' });
    });

    it('should handle notification navigation for tasks', () => {
      const notificationData = {
        type: 'task',
        id: '456',
      };
      
      const result = service.handleNotificationNavigation(notificationData);
      
      expect(result).toBe(true);
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Tasks', { taskId: '456' });
    });

    it('should handle notification navigation for medications', () => {
      const notificationData = {
        type: 'medication',
        id: '789',
      };
      
      const result = service.handleNotificationNavigation(notificationData);
      
      expect(result).toBe(true);
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Medications', { medicationId: '789' });
    });

    it('should reject invalid notification data', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = service.handleNotificationNavigation(null);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Notification navigation blocked:', 'No notification data provided');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Deep Link Validation', () => {
    it('should validate deep links before processing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      service.handleDeepLink('invalid-scheme://timetable');
      
      expect(consoleSpy).toHaveBeenCalledWith('Deep link blocked:', 'Invalid app scheme');
      expect(mockNavigationRef.current.navigate).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should process valid deep links', () => {
      service.handleDeepLink('productivityapp://timetable');
      
      expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Timetable');
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(navigationService).toBeInstanceOf(NavigationService);
    });

    it('should return same instance on multiple imports', () => {
      const instance1 = navigationService;
      const instance2 = navigationService;
      
      expect(instance1).toBe(instance2);
    });
  });
});