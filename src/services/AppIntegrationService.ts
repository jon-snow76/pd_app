import { dateNavigationService } from './DateNavigationService';
import { recurringEventsService } from './RecurringEventsService';
import { offlineService } from './OfflineService';
import { errorHandlingService } from './ErrorHandlingService';
import { permissionService } from './PermissionService';
import { navigationService } from './NavigationService';

/**
 * Service for integrating all app components and managing app-wide state
 */
class AppIntegrationService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize all app services and components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing Daily Productivity Scheduler...');

      // Initialize core services in order
      await this.initializeCoreServices();
      
      // Initialize UI services
      await this.initializeUIServices();
      
      // Initialize data services
      await this.initializeDataServices();
      
      // Set up cross-service integrations
      await this.setupIntegrations();
      
      // Perform initial data sync
      await this.performInitialSync();
      
      this.isInitialized = true;
      console.log('✅ App initialization complete');
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      errorHandlingService.handleError(
        error as Error,
        'App Initialization',
        {
          title: 'Startup Error',
          actions: [
            { text: 'Retry', style: 'default', onPress: () => this.initialize() },
            { text: 'Continue', style: 'cancel' },
          ],
        }
      );
      throw error;
    }
  }

  private async initializeCoreServices(): Promise<void> {
    console.log('📱 Initializing core services...');
    
    // Initialize error handling first
    // (Already initialized as singleton)
    
    // Initialize offline service
    await offlineService.initialize();
    
    // Initialize permission service
    await permissionService.initialize();
    
    console.log('✅ Core services initialized');
  }

  private async initializeUIServices(): Promise<void> {
    console.log('🎨 Initializing UI services...');
    
    // Initialize date navigation
    dateNavigationService.initialize();
    
    // Initialize navigation service
    // (Will be initialized when navigation ref is set)
    
    console.log('✅ UI services initialized');
  }

  private async initializeDataServices(): Promise<void> {
    console.log('💾 Initializing data services...');
    
    // Recurring events service is stateless, no initialization needed
    // Storage services are initialized on first use
    
    console.log('✅ Data services initialized');
  }

  private async setupIntegrations(): Promise<void> {
    console.log('🔗 Setting up service integrations...');
    
    // Set up date navigation integration with offline service
    dateNavigationService.addDateChangeListener((date) => {
      // Trigger data refresh when date changes
      this.handleDateChange(date);
    });
    
    // Set up offline service integration with error handling
    offlineService.addConnectionListener((isOnline) => {
      this.handleConnectionChange(isOnline);
    });
    
    console.log('✅ Service integrations complete');
  }

  private async performInitialSync(): Promise<void> {
    console.log('🔄 Performing initial data sync...');
    
    try {
      // Check if we have pending offline operations
      if (offlineService.getIsOnline()) {
        await offlineService.processSyncQueue();
      }
      
      // Request permissions if needed
      await this.requestInitialPermissions();
      
    } catch (error) {
      console.warn('⚠️ Initial sync had issues:', error);
      // Don't fail initialization for sync issues
    }
    
    console.log('✅ Initial sync complete');
  }

  private async requestInitialPermissions(): Promise<void> {
    // Show permission recommendations on first launch
    setTimeout(async () => {
      await permissionService.showPermissionRecommendations();
    }, 2000); // Delay to let UI settle
  }

  private handleDateChange(date: Date): void {
    console.log('📅 Date changed to:', date.toDateString());
    
    // Trigger any date-dependent operations
    // This could include refreshing data, updating notifications, etc.
  }

  private handleConnectionChange(isOnline: boolean): void {
    console.log('🌐 Connection status changed:', isOnline ? 'Online' : 'Offline');
    
    if (isOnline) {
      // Process any queued operations
      offlineService.processSyncQueue().catch(error => {
        console.warn('Sync queue processing failed:', error);
      });
    }
  }

  /**
   * Get app health status
   */
  getHealthStatus(): AppHealthStatus {
    return {
      isInitialized: this.isInitialized,
      services: {
        offline: {
          status: offlineService.getIsOnline() ? 'online' : 'offline',
          pendingOperations: offlineService.getSyncQueue().length,
        },
        permissions: {
          notifications: permissionService.getPermissionStatus('notifications'),
        },
        dateNavigation: {
          currentDate: dateNavigationService.getCurrentDate(),
          isToday: dateNavigationService.isToday(),
        },
        errors: {
          totalErrors: errorHandlingService.getErrorStats().total,
          recentErrors: errorHandlingService.getErrorStats().unhandled,
        },
      },
      performance: this.getPerformanceMetrics(),
    };
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    // In a real app, you'd collect actual performance metrics
    return {
      memoryUsage: 'normal',
      responseTime: 'fast',
      errorRate: 'low',
      lastUpdated: new Date(),
    };
  }

  /**
   * Perform app-wide cleanup
   */
  cleanup(): void {
    console.log('🧹 Cleaning up app services...');
    
    try {
      dateNavigationService.cleanup();
      // Other services cleanup as needed
      
      this.isInitialized = false;
      this.initializationPromise = null;
      
      console.log('✅ App cleanup complete');
    } catch (error) {
      console.error('❌ App cleanup failed:', error);
    }
  }

  /**
   * Force refresh all app data
   */
  async refreshAllData(): Promise<void> {
    console.log('🔄 Refreshing all app data...');
    
    try {
      // Trigger data refresh in all contexts
      // This would typically emit events that contexts listen to
      
      // Process any pending sync operations
      if (offlineService.getIsOnline()) {
        await offlineService.processSyncQueue();
      }
      
      console.log('✅ Data refresh complete');
    } catch (error) {
      console.error('❌ Data refresh failed:', error);
      errorHandlingService.handleError(error as Error, 'Data Refresh');
    }
  }

  /**
   * Get app statistics for debugging
   */
  getAppStatistics(): AppStatistics {
    const errorStats = errorHandlingService.getErrorStats();
    const syncQueue = offlineService.getSyncQueue();
    
    return {
      uptime: Date.now() - (this.initializationPromise ? 0 : Date.now()),
      errors: {
        total: errorStats.total,
        handled: errorStats.handled,
        unhandled: errorStats.unhandled,
        contexts: errorStats.contexts,
      },
      sync: {
        pendingOperations: syncQueue.length,
        isOnline: offlineService.getIsOnline(),
      },
      permissions: {
        notifications: permissionService.getPermissionStatus('notifications'),
        recommendations: permissionService.getPermissionRecommendations().length,
      },
      navigation: {
        currentDate: dateNavigationService.getCurrentDate(),
        currentRoute: navigationService.getCurrentRouteName(),
      },
    };
  }

  /**
   * Export app data for backup
   */
  async exportAppData(): Promise<AppDataExport> {
    console.log('📤 Exporting app data...');
    
    try {
      const backup = await offlineService.createBackup();
      const healthStatus = this.getHealthStatus();
      const statistics = this.getAppStatistics();
      
      return {
        backup,
        healthStatus,
        statistics,
        exportDate: new Date(),
        version: '1.0.0',
      };
    } catch (error) {
      console.error('❌ App data export failed:', error);
      throw error;
    }
  }

  /**
   * Import app data from backup
   */
  async importAppData(exportData: AppDataExport): Promise<void> {
    console.log('📥 Importing app data...');
    
    try {
      await offlineService.restoreFromBackup(exportData.backup);
      
      // Refresh all data after import
      await this.refreshAllData();
      
      console.log('✅ App data import complete');
    } catch (error) {
      console.error('❌ App data import failed:', error);
      throw error;
    }
  }
}

// Types
export interface AppHealthStatus {
  isInitialized: boolean;
  services: {
    offline: {
      status: 'online' | 'offline';
      pendingOperations: number;
    };
    permissions: {
      notifications: 'granted' | 'denied' | 'unknown';
    };
    dateNavigation: {
      currentDate: Date;
      isToday: boolean;
    };
    errors: {
      totalErrors: number;
      recentErrors: number;
    };
  };
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  memoryUsage: 'low' | 'normal' | 'high';
  responseTime: 'fast' | 'normal' | 'slow';
  errorRate: 'low' | 'normal' | 'high';
  lastUpdated: Date;
}

export interface AppStatistics {
  uptime: number;
  errors: {
    total: number;
    handled: number;
    unhandled: number;
    contexts: string[];
  };
  sync: {
    pendingOperations: number;
    isOnline: boolean;
  };
  permissions: {
    notifications: 'granted' | 'denied' | 'unknown';
    recommendations: number;
  };
  navigation: {
    currentDate: Date;
    currentRoute?: string;
  };
}

export interface AppDataExport {
  backup: any;
  healthStatus: AppHealthStatus;
  statistics: AppStatistics;
  exportDate: Date;
  version: string;
}

// Export singleton instance
export const appIntegrationService = new AppIntegrationService();
export default AppIntegrationService;