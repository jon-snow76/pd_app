import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineService, OperationType } from '../services/OfflineService';

/**
 * Enhanced storage utilities with offline support
 */

/**
 * Save data with offline queue support
 */
export const saveWithOfflineSupport = async <T>(
  key: string,
  data: T,
  operationType: OperationType,
  itemId?: string
): Promise<void> => {
  try {
    // Always save locally first
    await AsyncStorage.setItem(key, JSON.stringify(data));

    // If offline, queue the operation for later sync
    if (!offlineService.getIsOnline()) {
      await offlineService.queueOperation({
        type: operationType,
        data: {
          key,
          data,
          itemId,
        },
      });
    }
  } catch (error) {
    console.error(`Failed to save data with offline support for key: ${key}`, error);
    throw error;
  }
};

/**
 * Load data with fallback to cached version
 */
export const loadWithOfflineSupport = async <T>(
  key: string,
  defaultValue: T
): Promise<T> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Failed to load data for key: ${key}`, error);
    return defaultValue;
  }
};

/**
 * Delete data with offline queue support
 */
export const deleteWithOfflineSupport = async (
  key: string,
  operationType: OperationType,
  itemId: string
): Promise<void> => {
  try {
    // Remove from local storage
    const existingData = await AsyncStorage.getItem(key);
    if (existingData) {
      const parsedData = JSON.parse(existingData);
      if (Array.isArray(parsedData)) {
        const filteredData = parsedData.filter((item: any) => item.id !== itemId);
        await AsyncStorage.setItem(key, JSON.stringify(filteredData));
      }
    }

    // If offline, queue the operation for later sync
    if (!offlineService.getIsOnline()) {
      await offlineService.queueOperation({
        type: operationType,
        data: {
          key,
          itemId,
        },
      });
    }
  } catch (error) {
    console.error(`Failed to delete data with offline support for key: ${key}`, error);
    throw error;
  }
};

/**
 * Update specific item in array with offline support
 */
export const updateItemWithOfflineSupport = async <T extends { id: string }>(
  key: string,
  itemId: string,
  updatedItem: T,
  operationType: OperationType
): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(key);
    let items: T[] = existingData ? JSON.parse(existingData) : [];
    
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex >= 0) {
      items[itemIndex] = updatedItem;
    } else {
      items.push(updatedItem);
    }

    await AsyncStorage.setItem(key, JSON.stringify(items));

    // If offline, queue the operation for later sync
    if (!offlineService.getIsOnline()) {
      await offlineService.queueOperation({
        type: operationType,
        data: {
          key,
          itemId,
          updatedItem,
        },
      });
    }
  } catch (error) {
    console.error(`Failed to update item with offline support for key: ${key}`, error);
    throw error;
  }
};

/**
 * Add item to array with offline support
 */
export const addItemWithOfflineSupport = async <T>(
  key: string,
  newItem: T,
  operationType: OperationType
): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(key);
    const items: T[] = existingData ? JSON.parse(existingData) : [];
    
    items.push(newItem);
    await AsyncStorage.setItem(key, JSON.stringify(items));

    // If offline, queue the operation for later sync
    if (!offlineService.getIsOnline()) {
      await offlineService.queueOperation({
        type: operationType,
        data: {
          key,
          newItem,
        },
      });
    }
  } catch (error) {
    console.error(`Failed to add item with offline support for key: ${key}`, error);
    throw error;
  }
};

/**
 * Batch operations with offline support
 */
export const batchOperationsWithOfflineSupport = async (
  operations: Array<{
    type: OperationType;
    key: string;
    data: any;
    itemId?: string;
  }>
): Promise<void> => {
  try {
    // Execute all operations locally first
    for (const operation of operations) {
      switch (operation.type) {
        case 'CREATE_EVENT':
        case 'CREATE_TASK':
          await addItemWithOfflineSupport(operation.key, operation.data, operation.type);
          break;
        case 'UPDATE_EVENT':
        case 'UPDATE_TASK':
        case 'UPDATE_MEDICATION':
          if (operation.itemId) {
            await updateItemWithOfflineSupport(
              operation.key,
              operation.itemId,
              operation.data,
              operation.type
            );
          }
          break;
        case 'DELETE_EVENT':
        case 'DELETE_TASK':
          if (operation.itemId) {
            await deleteWithOfflineSupport(operation.key, operation.type, operation.itemId);
          }
          break;
      }
    }

    // If offline, queue all operations
    if (!offlineService.getIsOnline()) {
      for (const operation of operations) {
        await offlineService.queueOperation({
          type: operation.type,
          data: operation.data,
        });
      }
    }
  } catch (error) {
    console.error('Failed to execute batch operations with offline support:', error);
    throw error;
  }
};

/**
 * Check if data exists locally (useful for offline scenarios)
 */
export const hasLocalData = async (key: string): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data !== null;
  } catch (error) {
    console.error(`Failed to check local data for key: ${key}`, error);
    return false;
  }
};

/**
 * Get data size for storage management
 */
export const getDataSize = async (key: string): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? new Blob([data]).size : 0;
  } catch (error) {
    console.error(`Failed to get data size for key: ${key}`, error);
    return 0;
  }
};

/**
 * Clear all cached data (useful for logout or reset)
 */
export const clearAllCachedData = async (): Promise<void> => {
  try {
    const keys = [
      '@timetable_events',
      '@tasks',
      '@medications',
      '@user_preferences',
      '@productivity_logs',
      '@sync_queue',
      '@app_backup',
    ];

    await AsyncStorage.multiRemove(keys);
    console.log('All cached data cleared');
  } catch (error) {
    console.error('Failed to clear cached data:', error);
    throw error;
  }
};