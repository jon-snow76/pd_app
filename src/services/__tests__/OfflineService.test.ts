import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import OfflineService, { offlineService, QueuedOperation, AppBackup } from '../OfflineService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

describe('OfflineService', () => {
  let service: OfflineService;
  let mockNetInfoListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OfflineService();
    mockNetInfoListener = jest.fn();
    
    // Mock NetInfo
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockNetInfoListener);
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    
    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      
      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(NetInfo.fetch).toHaveBeenCalled();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@sync_queue');
    });

    it('should load existing sync queue on initialization', async () => {
      const mockQueue: QueuedOperation[] = [
        { type: 'CREATE_EVENT', data: { test: 'data' }, timestamp: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockQueue));
      
      await service.initialize();
      
      const queue = service.getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('CREATE_EVENT');
    });

    it('should handle initialization errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      await expect(service.initialize()).resolves.not.toThrow();
      expect(service.getSyncQueue()).toEqual([]);
    });
  });

  describe('Connection State Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return correct online status', () => {
      expect(service.getIsOnline()).toBe(true);
    });

    it('should add and remove connection listeners', () => {
      const listener = jest.fn();
      const unsubscribe = service.addConnectionListener(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Simulate connection change
      const netInfoCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      netInfoCallback({ isConnected: false });
      
      expect(listener).toHaveBeenCalledWith(false);
      
      // Unsubscribe
      unsubscribe();
      
      // Should not be called after unsubscribe
      netInfoCallback({ isConnected: true });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sync Queue Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should queue operations', async () => {
      const operation: QueuedOperation = {
        type: 'CREATE_EVENT',
        data: { title: 'Test Event' },
      };
      
      await service.queueOperation(operation);
      
      const queue = service.getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('CREATE_EVENT');
      expect(queue[0].id).toBeDefined();
      expect(queue[0].timestamp).toBeDefined();
    });

    it('should save sync queue to storage', async () => {
      const operation: QueuedOperation = {
        type: 'UPDATE_TASK',
        data: { id: '123', title: 'Updated Task' },
      };
      
      await service.queueOperation(operation);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@sync_queue',
        expect.stringContaining('UPDATE_TASK')
      );
    });

    it('should clear sync queue', async () => {
      await service.queueOperation({
        type: 'CREATE_EVENT',
        data: { test: 'data' },
      });
      
      expect(service.getSyncQueue()).toHaveLength(1);
      
      await service.clearSyncQueue();
      
      expect(service.getSyncQueue()).toHaveLength(0);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@sync_queue', '[]');
    });
  });

  describe('Sync Queue Processing', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should not process queue when offline', async () => {
      // Set offline
      const netInfoCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      netInfoCallback({ isConnected: false });
      
      await service.queueOperation({
        type: 'CREATE_EVENT',
        data: { test: 'data' },
      });
      
      await service.processSyncQueue();
      
      // Queue should still have items
      expect(service.getSyncQueue()).toHaveLength(1);
    });

    it('should process queue when online', async () => {
      await service.queueOperation({
        type: 'CREATE_EVENT',
        data: { test: 'data' },
      });
      
      expect(service.getSyncQueue()).toHaveLength(1);
      
      await service.processSyncQueue();
      
      // Queue should be empty after processing
      expect(service.getSyncQueue()).toHaveLength(0);
    });

    it('should handle processing errors gracefully', async () => {
      // Mock console methods
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await service.queueOperation({
        type: 'CREATE_EVENT',
        data: { test: 'data' },
      });
      
      // Mock a processing error by overriding the private method
      const originalExecuteOperation = (service as any).executeOperation;
      (service as any).executeOperation = jest.fn().mockRejectedValue(new Error('Sync error'));
      
      await service.processSyncQueue();
      
      // Operation should be re-queued on error
      expect(service.getSyncQueue()).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to process operation: CREATE_EVENT',
        expect.any(Error)
      );
      
      // Restore original method
      (service as any).executeOperation = originalExecuteOperation;
      consoleSpy.mockRestore();
    });
  });

  describe('Backup and Restore', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should create backup', async () => {
      const mockData = {
        '@timetable_events': [{ id: '1', title: 'Event 1' }],
        '@tasks': [{ id: '1', title: 'Task 1' }],
        '@medications': [{ id: '1', name: 'Med 1' }],
      };
      
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        return Promise.resolve(JSON.stringify(mockData[key as keyof typeof mockData] || null));
      });
      
      const backup = await service.createBackup();
      
      expect(backup.timestamp).toBeDefined();
      expect(backup.version).toBe('1.0.0');
      expect(backup.data.timetableEvents).toEqual(mockData['@timetable_events']);
      expect(backup.data.tasks).toEqual(mockData['@tasks']);
      expect(backup.data.medications).toEqual(mockData['@medications']);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_backup',
        expect.stringContaining('"version":"1.0.0"')
      );
    });

    it('should restore from backup', async () => {
      const backup: AppBackup = {
        timestamp: Date.now(),
        version: '1.0.0',
        data: {
          timetableEvents: [{ id: '1', title: 'Event 1' }],
          tasks: [{ id: '1', title: 'Task 1' }],
          medications: [{ id: '1', name: 'Med 1' }],
          userPreferences: { theme: 'light' },
          productivityLogs: [{ date: '2023-01-01', score: 85 }],
        },
      };
      
      await service.restoreFromBackup(backup);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@timetable_events',
        JSON.stringify(backup.data.timetableEvents)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@tasks',
        JSON.stringify(backup.data.tasks)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@medications',
        JSON.stringify(backup.data.medications)
      );
    });

    it('should get latest backup', async () => {
      const mockBackup: AppBackup = {
        timestamp: Date.now(),
        version: '1.0.0',
        data: {
          timetableEvents: [],
          tasks: [],
          medications: [],
          userPreferences: null,
          productivityLogs: null,
        },
      };
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockBackup));
      
      const backup = await service.getLatestBackup();
      
      expect(backup).toEqual(mockBackup);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_backup');
    });

    it('should return null when no backup exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const backup = await service.getLatestBackup();
      
      expect(backup).toBeNull();
    });

    it('should handle backup errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const backup = await service.getLatestBackup();
      
      expect(backup).toBeNull();
    });
  });

  describe('Connection State Changes', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should process sync queue when coming back online', async () => {
      // Start offline
      const netInfoCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      netInfoCallback({ isConnected: false });
      
      // Queue an operation while offline
      await service.queueOperation({
        type: 'CREATE_EVENT',
        data: { test: 'data' },
      });
      
      expect(service.getSyncQueue()).toHaveLength(1);
      
      // Come back online
      netInfoCallback({ isConnected: true });
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Queue should be processed
      expect(service.getSyncQueue()).toHaveLength(0);
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(offlineService).toBeInstanceOf(OfflineService);
    });

    it('should return same instance on multiple imports', () => {
      const instance1 = offlineService;
      const instance2 = offlineService;
      
      expect(instance1).toBe(instance2);
    });
  });
});