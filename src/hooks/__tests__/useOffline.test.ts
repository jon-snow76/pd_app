import { renderHook, act } from '@testing-library/react-hooks';
import { useOffline } from '../useOffline';
import { offlineService } from '../../services/OfflineService';

// Mock the offline service
jest.mock('../../services/OfflineService', () => ({
  offlineService: {
    initialize: jest.fn(),
    getIsOnline: jest.fn(),
    getSyncQueue: jest.fn(),
    addConnectionListener: jest.fn(),
    queueOperation: jest.fn(),
    processSyncQueue: jest.fn(),
    clearSyncQueue: jest.fn(),
    createBackup: jest.fn(),
    restoreFromBackup: jest.fn(),
    getLatestBackup: jest.fn(),
  },
}));

describe('useOffline', () => {
  const mockOfflineService = offlineService as jest.Mocked<typeof offlineService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockOfflineService.initialize.mockResolvedValue();
    mockOfflineService.getIsOnline.mockReturnValue(true);
    mockOfflineService.getSyncQueue.mockReturnValue([]);
    mockOfflineService.addConnectionListener.mockReturnValue(() => {});
    mockOfflineService.queueOperation.mockResolvedValue();
    mockOfflineService.processSyncQueue.mockResolvedValue();
    mockOfflineService.clearSyncQueue.mockResolvedValue();
    mockOfflineService.createBackup.mockResolvedValue({
      timestamp: Date.now(),
      version: '1.0.0',
      data: {
        timetableEvents: [],
        tasks: [],
        medications: [],
        userPreferences: null,
        productivityLogs: null,
      },
    });
    mockOfflineService.restoreFromBackup.mockResolvedValue();
    mockOfflineService.getLatestBackup.mockResolvedValue(null);
  });

  describe('Initialization', () => {
    it('should initialize offline service on mount', async () => {
      const { waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      expect(mockOfflineService.initialize).toHaveBeenCalled();
      expect(mockOfflineService.getIsOnline).toHaveBeenCalled();
      expect(mockOfflineService.getSyncQueue).toHaveBeenCalled();
      expect(mockOfflineService.addConnectionListener).toHaveBeenCalled();
    });

    it('should set initial state correctly', async () => {
      mockOfflineService.getIsOnline.mockReturnValue(false);
      mockOfflineService.getSyncQueue.mockReturnValue([
        { type: 'CREATE_EVENT', data: { test: 'data' }, timestamp: Date.now() },
      ]);
      
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      expect(result.current.isOnline).toBe(false);
      expect(result.current.syncQueue).toHaveLength(1);
      expect(result.current.hasPendingOperations).toBe(true);
      expect(result.current.isInitialized).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockOfflineService.initialize.mockRejectedValue(new Error('Init error'));
      
      const { result } = renderHook(() => useOffline());
      
      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize offline service:',
        expect.any(Error)
      );
      expect(result.current.isInitialized).toBe(false);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Connection State Updates', () => {
    it('should update state when connection changes', async () => {
      let connectionListener: (isOnline: boolean) => void = () => {};
      mockOfflineService.addConnectionListener.mockImplementation((listener) => {
        connectionListener = listener;
        return () => {};
      });
      
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      expect(result.current.isOnline).toBe(true);
      
      // Simulate connection change
      mockOfflineService.getIsOnline.mockReturnValue(false);
      mockOfflineService.getSyncQueue.mockReturnValue([
        { type: 'CREATE_EVENT', data: { test: 'data' }, timestamp: Date.now() },
      ]);
      
      act(() => {
        connectionListener(false);
      });
      
      expect(result.current.isOnline).toBe(false);
      expect(result.current.syncQueue).toHaveLength(1);
      expect(result.current.hasPendingOperations).toBe(true);
    });
  });

  describe('Queue Operations', () => {
    it('should queue operation successfully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      const operation = { type: 'CREATE_EVENT' as const, data: { test: 'data' } };
      
      await act(async () => {
        await result.current.queueOperation(operation);
      });
      
      expect(mockOfflineService.queueOperation).toHaveBeenCalledWith(operation);
      expect(mockOfflineService.getSyncQueue).toHaveBeenCalled();
    });

    it('should handle queue operation errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockOfflineService.queueOperation.mockRejectedValue(new Error('Queue error'));
      
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      const operation = { type: 'CREATE_EVENT' as const, data: { test: 'data' } };
      
      await act(async () => {
        await expect(result.current.queueOperation(operation)).rejects.toThrow('Queue error');
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to queue operation:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should process sync queue', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      await act(async () => {
        await result.current.processSyncQueue();
      });
      
      expect(mockOfflineService.processSyncQueue).toHaveBeenCalled();
      expect(mockOfflineService.getSyncQueue).toHaveBeenCalled();
    });

    it('should clear sync queue', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      await act(async () => {
        await result.current.clearSyncQueue();
      });
      
      expect(mockOfflineService.clearSyncQueue).toHaveBeenCalled();
    });
  });

  describe('Backup Operations', () => {
    it('should create backup', async () => {
      const mockBackup = {
        timestamp: Date.now(),
        version: '1.0.0',
        data: {
          timetableEvents: [{ id: '1', title: 'Event 1' }],
          tasks: [],
          medications: [],
          userPreferences: null,
          productivityLogs: null,
        },
      };
      mockOfflineService.createBackup.mockResolvedValue(mockBackup);
      
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      let backup;
      await act(async () => {
        backup = await result.current.createBackup();
      });
      
      expect(mockOfflineService.createBackup).toHaveBeenCalled();
      expect(backup).toEqual(mockBackup);
    });

    it('should restore from backup', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      const mockBackup = {
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
      
      await act(async () => {
        await result.current.restoreFromBackup(mockBackup);
      });
      
      expect(mockOfflineService.restoreFromBackup).toHaveBeenCalledWith(mockBackup);
    });

    it('should get latest backup', async () => {
      const mockBackup = {
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
      mockOfflineService.getLatestBackup.mockResolvedValue(mockBackup);
      
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      let backup;
      await act(async () => {
        backup = await result.current.getLatestBackup();
      });
      
      expect(mockOfflineService.getLatestBackup).toHaveBeenCalled();
      expect(backup).toEqual(mockBackup);
    });

    it('should handle backup operation errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockOfflineService.createBackup.mockRejectedValue(new Error('Backup error'));
      
      const { result, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      await act(async () => {
        await expect(result.current.createBackup()).rejects.toThrow('Backup error');
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create backup:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from connection listener on unmount', async () => {
      const unsubscribeMock = jest.fn();
      mockOfflineService.addConnectionListener.mockReturnValue(unsubscribeMock);
      
      const { unmount, waitForNextUpdate } = renderHook(() => useOffline());
      
      await waitForNextUpdate();
      
      unmount();
      
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});