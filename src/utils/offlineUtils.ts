import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline functionality and data synchronization utilities
 */

// Storage keys for offline operations
const OFFLINE_QUEUE_KEY = '@offline_queue';
const LAST_SYNC_KEY = '@last_sync';
const OFFLINE_STATUS_KEY = '@offline_status';

// Types for offline operations
export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'timetable_event' | 'task' | 'medication' | 'productivity_log';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  syncInProgress: boolean;
}

/**
 * Network connectivity manager
 */
class NetworkManager {
  private isOnline: boolean = true;
  private listeners: ((isOnline: boolean) => void)[] = [];

  constructor() {
    this.initializeNetworkListener();
  }

  private async initializeNetworkListener() {
    // Get initial network state
    const netInfoState = await NetInfo.fetch();
    this.isOnline = netInfoState.isConnected ?? false;

    // Listen for network changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
        
        if (this.isOnline) {
          // Trigger sync when coming back online
          this.handleOnlineReconnection();
        }
      }
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  private async handleOnlineReconnection() {
    console.log('Network reconnected, triggering sync...');
    try {
      await syncManager.syncPendingOperations();
    } catch (error) {
      console.error('Error syncing after reconnection:', error);
    }
  }

  public getConnectionStatus(): boolean {
    return this.isOnline;
  }

  public addConnectionListener(listener: (isOnline: boolean) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

/**
 * Offline operations queue manager
 */
class OfflineQueueManager {
  private queue: OfflineOperation[] = [];
  private isLoaded: boolean = false;

  async loadQueue(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
      this.isLoaded = true;
    }
  }

  async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  async addOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    await this.loadQueue();

    const newOperation: OfflineOperation = {
      ...operation,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(newOperation);
    await this.saveQueue();
  }

  async getOperations(): Promise<OfflineOperation[]> {
    await this.loadQueue();
    return [...this.queue];
  }

  async removeOperation(operationId: string): Promise<void> {
    await this.loadQueue();
    this.queue = this.queue.filter(op => op.id !== operationId);
    await this.saveQueue();
  }

  async incrementRetryCount(operationId: string): Promise<void> {
    await this.loadQueue();
    const operation = this.queue.find(op => op.id === operationId);
    if (operation) {
      operation.retryCount++;
      await this.saveQueue();
    }
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  async getQueueSize(): Promise<number> {
    await this.loadQueue();
    return this.queue.length;
  }
}

/**
 * Data synchronization manager
 */
class SyncManager {
  private syncInProgress: boolean = false;
  private maxRetries: number = 3;

  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    if (!networkManager.getConnectionStatus()) {
      console.log('Cannot sync: offline');
      return;
    }

    this.syncInProgress = true;

    try {
      const operations = await queueManager.getOperations();
      console.log(`Syncing ${operations.length} pending operations`);

      for (const operation of operations) {
        try {
          await this.processOperation(operation);
          await queueManager.removeOperation(operation.id);
        } catch (error) {
          console.error(`Error processing operation ${operation.id}:`, error);
          
          if (operation.retryCount < this.maxRetries) {
            await queueManager.incrementRetryCount(operation.id);
          } else {
            console.error(`Max retries reached for operation ${operation.id}, removing from queue`);
            await queueManager.removeOperation(operation.id);
          }
        }
      }

      // Update last sync time
      await this.updateLastSyncTime();
      
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processOperation(operation: OfflineOperation): Promise<void> {
    // In a real app, this would make API calls to sync with a backend
    // For now, we'll just simulate the sync process
    console.log(`Processing ${operation.type} operation for ${operation.entity}:`, operation.data);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Simulated sync failure');
    }
  }

  private async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const lastSyncString = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return lastSyncString ? new Date(lastSyncString) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  async forcSync(): Promise<void> {
    await this.syncPendingOperations();
  }
}

/**
 * Offline status manager
 */
class OfflineStatusManager {
  async getSyncStatus(): Promise<SyncStatus> {
    const isOnline = networkManager.getConnectionStatus();
    const lastSyncTime = await syncManager.getLastSyncTime();
    const pendingOperations = await queueManager.getQueueSize();
    const syncInProgress = syncManager.isSyncInProgress();

    return {
      isOnline,
      lastSyncTime,
      pendingOperations,
      syncInProgress,
    };
  }

  async saveOfflineStatus(status: Partial<SyncStatus>): Promise<void> {
    try {
      const currentStatus = await this.getSyncStatus();
      const updatedStatus = { ...currentStatus, ...status };
      await AsyncStorage.setItem(OFFLINE_STATUS_KEY, JSON.stringify(updatedStatus));
    } catch (error) {
      console.error('Error saving offline status:', error);
    }
  }
}

// Create singleton instances
export const networkManager = new NetworkManager();
export const queueManager = new OfflineQueueManager();
export const syncManager = new SyncManager();
export const offlineStatusManager = new OfflineStatusManager();

/**
 * High-level offline utilities
 */

/**
 * Execute an operation with offline support
 */
export async function executeWithOfflineSupport<T>(
  operation: () => Promise<T>,
  offlineOperation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>
): Promise<T> {
  if (networkManager.getConnectionStatus()) {
    try {
      return await operation();
    } catch (error) {
      // If online operation fails, queue for later
      console.log('Online operation failed, queuing for offline sync');
      await queueManager.addOperation(offlineOperation);
      throw error;
    }
  } else {
    // Queue operation for when we're back online
    await queueManager.addOperation(offlineOperation);
    throw new Error('Operation queued for sync when online');
  }
}

/**
 * Check if the app is currently offline
 */
export function isOffline(): boolean {
  return !networkManager.getConnectionStatus();
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  return await offlineStatusManager.getSyncStatus();
}

/**
 * Manually trigger sync
 */
export async function triggerSync(): Promise<void> {
  await syncManager.forcSync();
}

/**
 * Add network status listener
 */
export function addNetworkListener(listener: (isOnline: boolean) => void): () => void {
  return networkManager.addConnectionListener(listener);
}

/**
 * Initialize offline functionality
 */
export async function initializeOfflineSupport(): Promise<void> {
  try {
    await queueManager.loadQueue();
    
    // Try to sync any pending operations
    if (networkManager.getConnectionStatus()) {
      await syncManager.syncPendingOperations();
    }
    
    console.log('Offline support initialized');
  } catch (error) {
    console.error('Error initializing offline support:', error);
  }
}

/**
 * Get offline queue statistics
 */
export async function getOfflineStats(): Promise<{
  queueSize: number;
  lastSyncTime: Date | null;
  isOnline: boolean;
}> {
  const queueSize = await queueManager.getQueueSize();
  const lastSyncTime = await syncManager.getLastSyncTime();
  const isOnline = networkManager.getConnectionStatus();

  return {
    queueSize,
    lastSyncTime,
    isOnline,
  };
}

/**
 * Clear all offline data (use with caution)
 */
export async function clearOfflineData(): Promise<void> {
  await queueManager.clearQueue();
  await AsyncStorage.removeItem(LAST_SYNC_KEY);
  await AsyncStorage.removeItem(OFFLINE_STATUS_KEY);
  console.log('Offline data cleared');
}