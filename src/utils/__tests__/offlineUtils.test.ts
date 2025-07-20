import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  networkManager,
  queueManager,
  syncManager,
  offlineStatusManager,
  executeWithOfflineSupport,
  isOffline,
  getSyncStatus,
  triggerSync,
  initializeOfflineSupport,
  getOfflineStats,
  clearOfflineData,
  OfflineOperation,
} from '../offlineUtils';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('Offline Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
    mockNetInfo.addEventListener.mockReturnValue(() => {});
  });

  describe('NetworkManager', () => {
    it('should initialize with network state', async () => {
      mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(networkManager.getConnectionStatus()).toBe(true);
    });

    it('should handle network state changes', async () => {
      const listener = jest.fn();
      const unsubscribe = networkManager.addConnectionListener(listener);
      
      // Simulate network change
      const networkListener = mockNetInfo.addEventListener.mock.calls[0][0];
      networkListener({ isConnected: false } as any);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(listener).toHaveBeenCalledWith(false);
      
      unsubscribe();
    });
  });

  describe('OfflineQueueManager', () => {
    it('should load empty queue initially', async () => {
      await queueManager.loadQueue();
      const operations = await queueManager.getOperations();
      
      expect(operations).toEqual([]);
    });

    it('should add operations to queue', async () => {
      const operation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      await queueManager.addOperation(operation);
      const operations = await queueManager.getOperations();
      
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('create');
      expect(operations[0].entity).toBe('task');
      expect(operations[0].data).toEqual({ title: 'Test Task' });
    });

    it('should remove operations from queue', async () => {
      const operation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      await queueManager.addOperation(operation);
      const operations = await queueManager.getOperations();
      const operationId = operations[0].id;
      
      await queueManager.removeOperation(operationId);
      const updatedOperations = await queueManager.getOperations();
      
      expect(updatedOperations).toHaveLength(0);
    });

    it('should increment retry count', async () => {
      const operation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      await queueManager.addOperation(operation);
      const operations = await queueManager.getOperations();
      const operationId = operations[0].id;
      
      await queueManager.incrementRetryCount(operationId);
      const updatedOperations = await queueManager.getOperations();
      
      expect(updatedOperations[0].retryCount).toBe(1);
    });

    it('should get queue size', async () => {
      const operation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      await queueManager.addOperation(operation);
      const size = await queueManager.getQueueSize();
      
      expect(size).toBe(1);
    });

    it('should clear queue', async () => {
      const operation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      await queueManager.addOperation(operation);
      await queueManager.clearQueue();
      const size = await queueManager.getQueueSize();
      
      expect(size).toBe(0);
    });
  });

  describe('SyncManager', () => {
    it('should not sync when offline', async () => {
      // Mock offline state
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(false);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await syncManager.syncPendingOperations();
      
      expect(consoleSpy).toHaveBeenCalledWith('Cannot sync: offline');
      
      consoleSpy.mockRestore();
    });

    it('should not sync when already in progress', async () => {
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(true);
      jest.spyOn(syncManager, 'isSyncInProgress').mockReturnValue(true);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await syncManager.syncPendingOperations();
      
      expect(consoleSpy).toHaveBeenCalledWith('Sync already in progress');
      
      consoleSpy.mockRestore();
    });

    it('should process operations when online', async () => {
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(true);
      
      const operation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      await queueManager.addOperation(operation);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await syncManager.syncPendingOperations();
      
      expect(consoleSpy).toHaveBeenCalledWith('Syncing 1 pending operations');
      
      consoleSpy.mockRestore();
    });

    it('should get last sync time', async () => {
      const testDate = new Date().toISOString();
      mockAsyncStorage.getItem.mockResolvedValue(testDate);
      
      const lastSyncTime = await syncManager.getLastSyncTime();
      
      expect(lastSyncTime).toEqual(new Date(testDate));
    });

    it('should return null when no last sync time', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const lastSyncTime = await syncManager.getLastSyncTime();
      
      expect(lastSyncTime).toBeNull();
    });
  });

  describe('executeWithOfflineSupport', () => {
    it('should execute operation when online', async () => {
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(true);
      
      const mockOperation = jest.fn().mockResolvedValue('success');
      const offlineOperation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      const result = await executeWithOfflineSupport(mockOperation, offlineOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should queue operation when offline', async () => {
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(false);
      
      const mockOperation = jest.fn().mockResolvedValue('success');
      const offlineOperation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      await expect(
        executeWithOfflineSupport(mockOperation, offlineOperation)
      ).rejects.toThrow('Operation queued for sync when online');
      
      expect(mockOperation).not.toHaveBeenCalled();
      
      const queueSize = await queueManager.getQueueSize();
      expect(queueSize).toBe(1);
    });

    it('should queue operation when online operation fails', async () => {
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(true);
      
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      const offlineOperation = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'Test Task' },
      };
      
      await expect(
        executeWithOfflineSupport(mockOperation, offlineOperation)
      ).rejects.toThrow('Network error');
      
      const queueSize = await queueManager.getQueueSize();
      expect(queueSize).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    it('should check if offline', () => {
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(false);
      
      expect(isOffline()).toBe(true);
    });

    it('should get sync status', async () => {
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(true);
      jest.spyOn(syncManager, 'getLastSyncTime').mockResolvedValue(new Date());
      jest.spyOn(queueManager, 'getQueueSize').mockResolvedValue(2);
      jest.spyOn(syncManager, 'isSyncInProgress').mockReturnValue(false);
      
      const status = await getSyncStatus();
      
      expect(status.isOnline).toBe(true);
      expect(status.pendingOperations).toBe(2);
      expect(status.syncInProgress).toBe(false);
      expect(status.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should trigger sync', async () => {
      const syncSpy = jest.spyOn(syncManager, 'forcSync').mockResolvedValue();
      
      await triggerSync();
      
      expect(syncSpy).toHaveBeenCalled();
    });

    it('should initialize offline support', async () => {
      const loadQueueSpy = jest.spyOn(queueManager, 'loadQueue').mockResolvedValue();
      const syncSpy = jest.spyOn(syncManager, 'syncPendingOperations').mockResolvedValue();
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(true);
      
      await initializeOfflineSupport();
      
      expect(loadQueueSpy).toHaveBeenCalled();
      expect(syncSpy).toHaveBeenCalled();
    });

    it('should get offline stats', async () => {
      jest.spyOn(queueManager, 'getQueueSize').mockResolvedValue(3);
      jest.spyOn(syncManager, 'getLastSyncTime').mockResolvedValue(new Date());
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(true);
      
      const stats = await getOfflineStats();
      
      expect(stats.queueSize).toBe(3);
      expect(stats.lastSyncTime).toBeInstanceOf(Date);
      expect(stats.isOnline).toBe(true);
    });

    it('should clear offline data', async () => {
      const clearQueueSpy = jest.spyOn(queueManager, 'clearQueue').mockResolvedValue();
      
      await clearOfflineData();
      
      expect(clearQueueSpy).toHaveBeenCalled();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await queueManager.loadQueue();
      
      expect(consoleSpy).toHaveBeenCalledWith('Error loading offline queue:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle sync errors gracefully', async () => {
      jest.spyOn(networkManager, 'getConnectionStatus').mockReturnValue(true);
      jest.spyOn(queueManager, 'getOperations').mockRejectedValue(new Error('Queue error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await syncManager.syncPendingOperations();
      
      expect(consoleSpy).toHaveBeenCalledWith('Error during sync:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});