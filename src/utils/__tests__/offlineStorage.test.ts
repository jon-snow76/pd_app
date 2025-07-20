import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineService } from '../../services/OfflineService';
import {
  saveWithOfflineSupport,
  loadWithOfflineSupport,
  deleteWithOfflineSupport,
  updateItemWithOfflineSupport,
  addItemWithOfflineSupport,
  batchOperationsWithOfflineSupport,
  hasLocalData,
  getDataSize,
  clearAllCachedData,
} from '../offlineStorage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../services/OfflineService', () => ({
  offlineService: {
    getIsOnline: jest.fn(),
    queueOperation: jest.fn(),
  },
}));

describe('Offline Storage Utilities', () => {
  const mockOfflineService = offlineService as jest.Mocked<typeof offlineService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockOfflineService.getIsOnline.mockReturnValue(true);
    mockOfflineService.queueOperation.mockResolvedValue();
    
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
  });

  describe('saveWithOfflineSupport', () => {
    it('should save data locally when online', async () => {
      const testData = { id: '1', title: 'Test Event' };
      
      await saveWithOfflineSupport('@test_key', testData, 'CREATE_EVENT', '1');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_key',
        JSON.stringify(testData)
      );
      expect(mockOfflineService.queueOperation).not.toHaveBeenCalled();
    });

    it('should save data locally and queue operation when offline', async () => {
      mockOfflineService.getIsOnline.mockReturnValue(false);
      const testData = { id: '1', title: 'Test Event' };
      
      await saveWithOfflineSupport('@test_key', testData, 'CREATE_EVENT', '1');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_key',
        JSON.stringify(testData)
      );
      expect(mockOfflineService.queueOperation).toHaveBeenCalledWith({
        type: 'CREATE_EVENT',
        data: {
          key: '@test_key',
          data: testData,
          itemId: '1',
        },
      });
    });

    it('should handle save errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      await expect(
        saveWithOfflineSupport('@test_key', { test: 'data' }, 'CREATE_EVENT')
      ).rejects.toThrow('Storage error');
    });
  });

  describe('loadWithOfflineSupport', () => {
    it('should load data from storage', async () => {
      const testData = [{ id: '1', title: 'Test Event' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(testData));
      
      const result = await loadWithOfflineSupport('@test_key', []);
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@test_key');
      expect(result).toEqual(testData);
    });

    it('should return default value when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const result = await loadWithOfflineSupport('@test_key', []);
      
      expect(result).toEqual([]);
    });

    it('should return default value on load error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const result = await loadWithOfflineSupport('@test_key', []);
      
      expect(result).toEqual([]);
    });
  });

  describe('deleteWithOfflineSupport', () => {
    it('should delete item from array when online', async () => {
      const existingData = [
        { id: '1', title: 'Event 1' },
        { id: '2', title: 'Event 2' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
      
      await deleteWithOfflineSupport('@test_key', 'DELETE_EVENT', '1');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_key',
        JSON.stringify([{ id: '2', title: 'Event 2' }])
      );
      expect(mockOfflineService.queueOperation).not.toHaveBeenCalled();
    });

    it('should delete item and queue operation when offline', async () => {
      mockOfflineService.getIsOnline.mockReturnValue(false);
      const existingData = [
        { id: '1', title: 'Event 1' },
        { id: '2', title: 'Event 2' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
      
      await deleteWithOfflineSupport('@test_key', 'DELETE_EVENT', '1');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_key',
        JSON.stringify([{ id: '2', title: 'Event 2' }])
      );
      expect(mockOfflineService.queueOperation).toHaveBeenCalledWith({
        type: 'DELETE_EVENT',
        data: {
          key: '@test_key',
          itemId: '1',
        },
      });
    });
  });

  describe('updateItemWithOfflineSupport', () => {
    it('should update existing item', async () => {
      const existingData = [
        { id: '1', title: 'Event 1' },
        { id: '2', title: 'Event 2' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
      
      const updatedItem = { id: '1', title: 'Updated Event 1' };
      
      await updateItemWithOfflineSupport('@test_key', '1', updatedItem, 'UPDATE_EVENT');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_key',
        JSON.stringify([
          { id: '1', title: 'Updated Event 1' },
          { id: '2', title: 'Event 2' },
        ])
      );
    });

    it('should add new item if not found', async () => {
      const existingData = [{ id: '2', title: 'Event 2' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
      
      const newItem = { id: '1', title: 'New Event 1' };
      
      await updateItemWithOfflineSupport('@test_key', '1', newItem, 'UPDATE_EVENT');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_key',
        JSON.stringify([
          { id: '2', title: 'Event 2' },
          { id: '1', title: 'New Event 1' },
        ])
      );
    });

    it('should queue operation when offline', async () => {
      mockOfflineService.getIsOnline.mockReturnValue(false);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      
      const updatedItem = { id: '1', title: 'Updated Event' };
      
      await updateItemWithOfflineSupport('@test_key', '1', updatedItem, 'UPDATE_EVENT');
      
      expect(mockOfflineService.queueOperation).toHaveBeenCalledWith({
        type: 'UPDATE_EVENT',
        data: {
          key: '@test_key',
          itemId: '1',
          updatedItem,
        },
      });
    });
  });

  describe('addItemWithOfflineSupport', () => {
    it('should add item to array', async () => {
      const existingData = [{ id: '1', title: 'Event 1' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
      
      const newItem = { id: '2', title: 'Event 2' };
      
      await addItemWithOfflineSupport('@test_key', newItem, 'CREATE_EVENT');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_key',
        JSON.stringify([
          { id: '1', title: 'Event 1' },
          { id: '2', title: 'Event 2' },
        ])
      );
    });

    it('should create new array if none exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const newItem = { id: '1', title: 'Event 1' };
      
      await addItemWithOfflineSupport('@test_key', newItem, 'CREATE_EVENT');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@test_key',
        JSON.stringify([newItem])
      );
    });
  });

  describe('batchOperationsWithOfflineSupport', () => {
    it('should execute multiple operations', async () => {
      const operations = [
        {
          type: 'CREATE_EVENT' as const,
          key: '@events',
          data: { id: '1', title: 'Event 1' },
        },
        {
          type: 'UPDATE_TASK' as const,
          key: '@tasks',
          data: { id: '2', title: 'Updated Task' },
          itemId: '2',
        },
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      
      await batchOperationsWithOfflineSupport(operations);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should queue all operations when offline', async () => {
      mockOfflineService.getIsOnline.mockReturnValue(false);
      
      const operations = [
        {
          type: 'CREATE_EVENT' as const,
          key: '@events',
          data: { id: '1', title: 'Event 1' },
        },
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      
      await batchOperationsWithOfflineSupport(operations);
      
      expect(mockOfflineService.queueOperation).toHaveBeenCalledWith({
        type: 'CREATE_EVENT',
        data: { id: '1', title: 'Event 1' },
      });
    });
  });

  describe('hasLocalData', () => {
    it('should return true when data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{"test": "data"}');
      
      const result = await hasLocalData('@test_key');
      
      expect(result).toBe(true);
    });

    it('should return false when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const result = await hasLocalData('@test_key');
      
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const result = await hasLocalData('@test_key');
      
      expect(result).toBe(false);
    });
  });

  describe('getDataSize', () => {
    it('should return data size', async () => {
      const testData = '{"test": "data"}';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(testData);
      
      // Mock Blob constructor
      global.Blob = jest.fn().mockImplementation((data) => ({
        size: data[0].length,
      })) as any;
      
      const result = await getDataSize('@test_key');
      
      expect(result).toBe(testData.length);
    });

    it('should return 0 when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const result = await getDataSize('@test_key');
      
      expect(result).toBe(0);
    });
  });

  describe('clearAllCachedData', () => {
    it('should clear all cached data', async () => {
      await clearAllCachedData();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@timetable_events',
        '@tasks',
        '@medications',
        '@user_preferences',
        '@productivity_logs',
        '@sync_queue',
        '@app_backup',
      ]);
    });

    it('should handle clear errors', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockRejectedValue(new Error('Clear error'));
      
      await expect(clearAllCachedData()).rejects.toThrow('Clear error');
    });
  });
});