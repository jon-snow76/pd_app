import { Alert, Linking, Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import PermissionService, { permissionService } from '../PermissionService';

// Mock React Native modules
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
    openSettings: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock PushNotification
jest.mock('react-native-push-notification', () => ({
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
}));

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionService();
    
    // Default mock implementations
    (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
      callback({ alert: true, badge: true, sound: true });
    });
    (PushNotification.requestPermissions as jest.Mock).mockResolvedValue({
      alert: true,
      badge: true,
      sound: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize and check permissions', async () => {
      await service.initialize();
      
      expect(PushNotification.checkPermissions).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (PushNotification.checkPermissions as jest.Mock).mockImplementation(() => {
        throw new Error('Permission check failed');
      });
      
      await service.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize permission service:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Notification Permissions', () => {
    it('should return true if permissions already granted', async () => {
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: true, badge: true, sound: true });
      });
      
      const result = await service.requestNotificationPermissions();
      
      expect(result).toBe(true);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should show explanation dialog before requesting permissions', async () => {
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: false, badge: false, sound: false });
      });
      
      // Mock user declining explanation
      (Alert.alert as jest.Mock).mockImplementation((title, message, actions) => {
        if (title === 'Enable Notifications') {
          actions[0].onPress(); // "Not Now"
        }
      });
      
      const result = await service.requestNotificationPermissions();
      
      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Enable Notifications',
        expect.stringContaining('This app uses notifications'),
        expect.any(Array)
      );
    });

    it('should request permissions after user accepts explanation', async () => {
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: false, badge: false, sound: false });
      });
      
      // Mock user accepting explanation
      (Alert.alert as jest.Mock).mockImplementation((title, message, actions) => {
        if (title === 'Enable Notifications') {
          actions[1].onPress(); // "Enable"
        }
      });
      
      const result = await service.requestNotificationPermissions();
      
      expect(result).toBe(true);
      expect(PushNotification.requestPermissions).toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: false, badge: false, sound: false });
      });
      (PushNotification.requestPermissions as jest.Mock).mockResolvedValue({
        alert: false,
        badge: false,
        sound: false,
      });
      
      // Mock user accepting explanation
      (Alert.alert as jest.Mock).mockImplementation((title, message, actions) => {
        if (title === 'Enable Notifications') {
          actions[1].onPress(); // "Enable"
        }
      });
      
      const result = await service.requestNotificationPermissions();
      
      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Notifications Disabled',
        expect.stringContaining('You won\'t receive reminders'),
        expect.any(Array)
      );
    });

    it('should handle Android permissions correctly', async () => {
      (Platform as any).OS = 'android';
      
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: true }); // Android only needs alert
      });
      
      const status = await service.checkNotificationPermissions();
      
      expect(status).toBe('granted');
    });

    it('should handle iOS permissions correctly', async () => {
      (Platform as any).OS = 'ios';
      
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: true, badge: true, sound: true });
      });
      
      const status = await service.checkNotificationPermissions();
      
      expect(status).toBe('granted');
    });

    it('should handle partial iOS permissions as denied', async () => {
      (Platform as any).OS = 'ios';
      
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: true, badge: false, sound: true }); // Missing badge
      });
      
      const status = await service.checkNotificationPermissions();
      
      expect(status).toBe('denied');
    });
  });

  describe('Permission Status', () => {
    it('should get permission status', () => {
      const status = service.getPermissionStatus('notifications');
      expect(['granted', 'denied', 'unknown']).toContain(status);
    });

    it('should return unknown for untracked permissions', () => {
      const status = service.getPermissionStatus('camera');
      expect(status).toBe('unknown');
    });
  });

  describe('Permission Recommendations', () => {
    it('should provide recommendations for missing permissions', () => {
      // Mock notifications as not granted
      service['permissionStatus'] = { notifications: 'denied' };
      
      const recommendations = service.getPermissionRecommendations();
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].permission).toBe('notifications');
      expect(recommendations[0].importance).toBe('high');
    });

    it('should not provide recommendations for granted permissions', () => {
      // Mock notifications as granted
      service['permissionStatus'] = { notifications: 'granted' };
      
      const recommendations = service.getPermissionRecommendations();
      
      expect(recommendations).toHaveLength(0);
    });

    it('should show permission recommendations to user', async () => {
      // Mock notifications as not granted
      service['permissionStatus'] = { notifications: 'denied' };
      
      await service.showPermissionRecommendations();
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Improve Your Experience',
        expect.stringContaining('Enable Notifications'),
        expect.any(Array)
      );
    });

    it('should not show recommendations if none exist', async () => {
      // Mock all permissions as granted
      service['permissionStatus'] = { notifications: 'granted' };
      
      await service.showPermissionRecommendations();
      
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('Critical Permissions', () => {
    it('should identify critical permissions', () => {
      expect(service.isPermissionCritical('notifications')).toBe(true);
      expect(service.isPermissionCritical('camera')).toBe(false);
    });
  });

  describe('Settings Navigation', () => {
    it('should open iOS settings', () => {
      (Platform as any).OS = 'ios';
      
      service['openAppSettings']();
      
      expect(Linking.openURL).toHaveBeenCalledWith('app-settings:');
    });

    it('should open Android settings', () => {
      (Platform as any).OS = 'android';
      
      service['openAppSettings']();
      
      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle permission request errors', async () => {
      (PushNotification.checkPermissions as jest.Mock).mockImplementation((callback) => {
        callback({ alert: false, badge: false, sound: false });
      });
      (PushNotification.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('Permission request failed')
      );
      
      // Mock user accepting explanation
      (Alert.alert as jest.Mock).mockImplementation((title, message, actions) => {
        if (title === 'Enable Notifications') {
          actions[1].onPress(); // "Enable"
        }
      });
      
      const result = await service.requestNotificationPermissions();
      
      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Error',
        expect.any(String),
        expect.arrayContaining([
          { text: 'OK', style: 'default' },
          { text: 'Try Again', style: 'default', onPress: expect.any(Function) },
        ])
      );
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(permissionService).toBeInstanceOf(PermissionService);
    });

    it('should return same instance on multiple imports', () => {
      const instance1 = permissionService;
      const instance2 = permissionService;
      
      expect(instance1).toBe(instance2);
    });
  });
});