import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getLoggingService } from './loggingService';
import { supabase } from './supabase';

export interface OfflineAction<T = unknown> {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: T;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineCacheItem<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // Time to live in ms
}

class OfflineService {
  private static instance: OfflineService;
  private pendingActions: OfflineAction<unknown>[] = [];
  private isOnline = true;
  private syncInProgress = false;
  private unsubscribeNetInfo?: () => void;

  private readonly STORAGE_KEYS = {
    PENDING_ACTIONS: 'offline_pending_actions',
    CACHE_PREFIX: 'offline_cache_',
    LAST_SYNC: 'offline_last_sync',
  };

  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 horas
  private readonly MAX_RETRY_COUNT = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 segundos

  private constructor() {
    this.initializeOfflineService();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private async initializeOfflineService() {
    await this.loadPendingActions();
    this.setupNetworkMonitoring();
    this.setupAutoSync();
    getLoggingService().info('Offline service initialized', 'OfflineService');
  }

  private async loadPendingActions() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PENDING_ACTIONS);
      if (stored) {
        this.pendingActions = JSON.parse(stored);
        getLoggingService().info(
          `Loaded ${this.pendingActions.length} pending actions`,
          'OfflineService'
        );
      }
    } catch (error) {
      getLoggingService().error('Failed to load pending actions', 'OfflineService', error);
    }
  }

  private async savePendingActions() {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PENDING_ACTIONS,
        JSON.stringify(this.pendingActions)
      );
    } catch (error) {
      getLoggingService().error('Failed to save pending actions', 'OfflineService', error);
    }
  }

  private setupNetworkMonitoring() {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      getLoggingService().info(
        `Network status changed: ${this.isOnline ? 'online' : 'offline'}`,
        'OfflineService'
      );

      if (wasOffline && this.isOnline) {
        this.syncPendingActions();
      }
    });
  }

  private setupAutoSync() {
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.pendingActions.length > 0) {
        this.syncPendingActions();
      }
    }, this.SYNC_INTERVAL);
  }

  async cacheData<T>(key: string, data: T, ttl?: number): Promise<void> {
    const cacheItem: OfflineCacheItem<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.DEFAULT_TTL,
    };

    try {
      await AsyncStorage.setItem(
        `${this.STORAGE_KEYS.CACHE_PREFIX}${key}`,
        JSON.stringify(cacheItem)
      );
      getLoggingService().debug(`Data cached: ${key}`, 'OfflineService');
    } catch (error) {
      getLoggingService().error(`Failed to cache data: ${key}`, 'OfflineService', error);
    }
  }

  async getCachedData<T = unknown>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEYS.CACHE_PREFIX}${key}`);
      if (!stored) return null;

      const cacheItem: OfflineCacheItem<T> = JSON.parse(stored);

      if (Date.now() > cacheItem.timestamp + cacheItem.ttl) {
        await this.removeCachedData(key);
        return null;
      }

      return cacheItem.data as T;
    } catch (error) {
      getLoggingService().error(`Failed to get cached data: ${key}`, 'OfflineService', error);
      return null;
    }
  }

  async removeCachedData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.STORAGE_KEYS.CACHE_PREFIX}${key}`);
    } catch (error) {
      getLoggingService().error(`Failed to remove cached data: ${key}`, 'OfflineService', error);
    }
  }

  async clearExpiredCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.STORAGE_KEYS.CACHE_PREFIX));

      const expiredKeys = [];
      for (const key of cacheKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const cacheItem: OfflineCacheItem<unknown> = JSON.parse(stored);
          if (Date.now() > cacheItem.timestamp + cacheItem.ttl) {
            expiredKeys.push(key);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        getLoggingService().info(
          `Cleared ${expiredKeys.length} expired cache entries`,
          'OfflineService'
        );
      }
    } catch (error) {
      getLoggingService().error('Failed to clear expired cache', 'OfflineService', error);
    }
  }

  async addPendingAction<T>(
    type: OfflineAction['type'],
    table: string,
    data: T,
    maxRetries = this.MAX_RETRY_COUNT
  ): Promise<void> {
    const action: OfflineAction<T> = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.pendingActions.push(action);
    await this.savePendingActions();

    getLoggingService().info(`Added pending action: ${type} on ${table}`, 'OfflineService', {
      actionId: action.id,
    });

    if (this.isOnline) {
      this.syncPendingActions();
    }
  }

  async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.pendingActions.length === 0) {
      return;
    }

    this.syncInProgress = true;
    getLoggingService().info(
      `Starting sync of ${this.pendingActions.length} actions`,
      'OfflineService'
    );

    const actionsToRetry: OfflineAction<unknown>[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const action of this.pendingActions) {
      try {
        await this.executeAction(action);
        successCount++;
        getLoggingService().debug(`Synced action: ${action.id}`, 'OfflineService');
      } catch (error) {
        action.retryCount++;
        if (action.retryCount < action.maxRetries) {
          actionsToRetry.push(action);
        } else {
          failureCount++;
          getLoggingService().error(
            `Action failed permanently: ${action.id}`,
            'OfflineService',
            error
          );
        }
      }
    }

    this.pendingActions = actionsToRetry;
    await this.savePendingActions();

    if (successCount > 0) {
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    }

    this.syncInProgress = false;

    getLoggingService().info(
      `Sync completed: ${successCount} success, ${failureCount} permanent failures, ${actionsToRetry.length} to retry`,
      'OfflineService'
    );
  }

  private async executeAction(action: OfflineAction<unknown>): Promise<void> {
    const { type, table, data } = action;

    const dataAsObject = data as { id?: string; [key: string]: unknown };

    switch (type) {
      case 'INSERT':
        await supabase.from(table).insert(data);
        break;

      case 'UPDATE':
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...updateData } = dataAsObject;
        await supabase.from(table).update(updateData).eq('id', id);
        break;

      case 'DELETE':
        await supabase.from(table).delete().eq('id', dataAsObject.id);
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  getPendingActionsCount(): number {
    return this.pendingActions.length;
  }

  async getLastSyncTime(): Promise<number | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      // CORRIGIDO: Variável de erro removida, pois não é utilizada.
      return null;
    }
  }

  async clearAllOfflineData(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const offlineKeys = allKeys.filter(
        key =>
          key.startsWith(this.STORAGE_KEYS.CACHE_PREFIX) ||
          key === this.STORAGE_KEYS.PENDING_ACTIONS ||
          key === this.STORAGE_KEYS.LAST_SYNC
      );

      await AsyncStorage.multiRemove(offlineKeys);
      this.pendingActions = [];

      getLoggingService().info('All offline data cleared', 'OfflineService');
    } catch (error) {
      getLoggingService().error('Failed to clear offline data', 'OfflineService', error);
    }
  }

  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
    getLoggingService().info('Offline service destroyed', 'OfflineService');
  }
}

export function useOfflineService() {
  const offlineService = OfflineService.getInstance();

  return {
    cacheData: offlineService.cacheData.bind(offlineService),
    getCachedData: offlineService.getCachedData.bind(offlineService),
    addPendingAction: offlineService.addPendingAction.bind(offlineService),
    syncPendingActions: offlineService.syncPendingActions.bind(offlineService),
    getNetworkStatus: offlineService.getNetworkStatus.bind(offlineService),
    getPendingActionsCount: offlineService.getPendingActionsCount.bind(offlineService),
    getLastSyncTime: offlineService.getLastSyncTime.bind(offlineService),
    clearAllOfflineData: offlineService.clearAllOfflineData.bind(offlineService),
  };
}

export default OfflineService.getInstance();
