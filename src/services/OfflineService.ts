import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service for handling offline functionality and data synchronization
 */
class OfflineService {
  private isOnline: boolean = true;
  private listeners: Array<(isOnline: boolean) => void> = [];
  private syncQueue: Array<QueuedOperation> = [];
  private isInitialized: boolean = false;

  /**
   * Initialize the offline service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load queued operations from storage
    await this.loadSyncQueue();

    // Set up network state listener
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Notify listeners of connection change
      this.notifyListeners();

      // If we just came back online, process sync queue
      if (!wasOnline && this.isOnline) {
        this.processSyncQueue();
      }
    });

    // Get initial network state
    const initialState = await NetInfo.fetch();
    this.isOnline = initialState.isConnected ?? false;
    
    this.isInitialized = true;
  }

  /**
   * Check if device is currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Add listener for connection state changes
   */
  addConnectionListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Queue an operation for when connection is restored
   */
  async queueOperation(operation: QueuedOperation): Promise<void> {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
      id: this.generateOperationId(),
    });

    await this.saveSyncQueue();
  }

  /**
   * Process all queued operations
   */
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.syncQueue.length} queued operations`);

    const operations = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        console.log(`Successfully processed operation: ${operation.type}`);
      } catch (error) {
        console.error(`Failed to process operation: ${operation.type}`, error);
        // Re-queue failed operations
        this.syncQueue.push(operation);
      }
    }

    await this.saveSyncQueue();
  }

  /**
   * Get the current sync queue
   */
  getSyncQueue(): QueuedOperation[] {
    return [...this.syncQueue];
  }

  /**
   * Clear the sync queue
   */
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  /**
   * Create a backup of all app data
   */
  async createBackup(): Promise<AppBackup> {
    const backup: AppBackup = {
      timestamp: Date.now(),
      version: '1.0.0',
      data: {
        timetableEvents: await this.getStorageData('@timetable_events'),
        tasks: await this.getStorageData('@tasks'),
        medications: await this.getStorageData('@medications'),
        userPreferences: await this.getStorageData('@user_preferences'),
        productivityLogs: await this.getStorageData('@productivity_logs'),
      },
    };

    // Save backup to storage
    await AsyncStorage.setItem('@app_backup', JSON.stringify(backup));
    
    return backup;
  }

  /**
   * Restore app data from backup
   */
  async restoreFromBackup(backup: AppBackup): Promise<void> {
    try {
      // Restore each data type
      for (const [key, data] of Object.entries(backup.data)) {
        if (data) {
          const storageKey = this.getStorageKeyFromDataType(key);
          await AsyncStorage.setItem(storageKey, JSON.stringify(data));
        }
      }

      console.log('Successfully restored from backup');
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Get the latest backup
   */
  async getLatestBackup(): Promise<AppBackup | null> {
    try {
      const backupData = await AsyncStorage.getItem('@app_backup');
      return backupData ? JSON.parse(backupData) : null;
    } catch (error) {
      console.error('Failed to get backup:', error);
      return null;
    }
  }

  /**
   * Private methods
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('@sync_queue');
      this.syncQueue = queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('@sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    // This would typically make API calls to sync data
    // For now, we'll just simulate the operation
    switch (operation.type) {
      case 'CREATE_EVENT':
      case 'UPDATE_EVENT':
      case 'DELETE_EVENT':
        // Simulate API call for timetable events
        await this.simulateApiCall(operation);
        break;
      case 'CREATE_TASK':
      case 'UPDATE_TASK':
      case 'DELETE_TASK':
        // Simulate API call for tasks
        await this.simulateApiCall(operation);
        break;
      case 'UPDATE_MEDICATION':
        // Simulate API call for medications
        await this.simulateApiCall(operation);
        break;
      default:
        console.warn(`Unknown operation type: ${operation.type}`);
    }
  }

  private async simulateApiCall(operation: QueuedOperation): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real app, this would make actual API calls
    console.log(`Simulated API call for operation: ${operation.type}`);
  }

  private async getStorageData(key: string): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to get storage data for key: ${key}`, error);
      return null;
    }
  }

  private getStorageKeyFromDataType(dataType: string): string {
    const keyMap: Record<string, string> = {
      timetableEvents: '@timetable_events',
      tasks: '@tasks',
      medications: '@medications',
      userPreferences: '@user_preferences',
      productivityLogs: '@productivity_logs',
    };
    
    return keyMap[dataType] || `@${dataType}`;
  }
}

// Types
export interface QueuedOperation {
  id?: string;
  type: OperationType;
  data: any;
  timestamp?: number;
  retryCount?: number;
}

export type OperationType = 
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'DELETE_EVENT'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'UPDATE_MEDICATION';

export interface AppBackup {
  timestamp: number;
  version: string;
  data: {
    timetableEvents: any;
    tasks: any;
    medications: any;
    userPreferences: any;
    productivityLogs: any;
  };
}

// Export singleton instance
export const offlineService = new OfflineService();
export default OfflineService;