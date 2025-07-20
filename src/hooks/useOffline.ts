import { useState, useEffect, useCallback } from 'react';
import { offlineService, QueuedOperation, AppBackup } from '../services/OfflineService';

/**
 * Hook for managing offline functionality
 */
export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState<QueuedOperation[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeOfflineService = async () => {
      try {
        await offlineService.initialize();
        setIsOnline(offlineService.getIsOnline());
        setSyncQueue(offlineService.getSyncQueue());
        setIsInitialized(true);

        // Subscribe to connection changes
        unsubscribe = offlineService.addConnectionListener((online) => {
          setIsOnline(online);
          setSyncQueue(offlineService.getSyncQueue());
        });
      } catch (error) {
        console.error('Failed to initialize offline service:', error);
      }
    };

    initializeOfflineService();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const queueOperation = useCallback(async (operation: Omit<QueuedOperation, 'id' | 'timestamp'>) => {
    try {
      await offlineService.queueOperation(operation);
      setSyncQueue(offlineService.getSyncQueue());
    } catch (error) {
      console.error('Failed to queue operation:', error);
      throw error;
    }
  }, []);

  const processSyncQueue = useCallback(async () => {
    try {
      await offlineService.processSyncQueue();
      setSyncQueue(offlineService.getSyncQueue());
    } catch (error) {
      console.error('Failed to process sync queue:', error);
      throw error;
    }
  }, []);

  const clearSyncQueue = useCallback(async () => {
    try {
      await offlineService.clearSyncQueue();
      setSyncQueue([]);
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
      throw error;
    }
  }, []);

  const createBackup = useCallback(async (): Promise<AppBackup> => {
    try {
      return await offlineService.createBackup();
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }, []);

  const restoreFromBackup = useCallback(async (backup: AppBackup) => {
    try {
      await offlineService.restoreFromBackup(backup);
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }, []);

  const getLatestBackup = useCallback(async (): Promise<AppBackup | null> => {
    try {
      return await offlineService.getLatestBackup();
    } catch (error) {
      console.error('Failed to get latest backup:', error);
      return null;
    }
  }, []);

  return {
    isOnline,
    syncQueue,
    isInitialized,
    queueOperation,
    processSyncQueue,
    clearSyncQueue,
    createBackup,
    restoreFromBackup,
    getLatestBackup,
    hasPendingOperations: syncQueue.length > 0,
  };
};

export default useOffline;