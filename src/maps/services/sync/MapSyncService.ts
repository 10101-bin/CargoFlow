import { networkService } from '../network/NetworkService';
import { offlineStorage } from '../storage/OfflineMapStorage';

export type SyncEventListener = (status: {
  isSyncing: boolean;
  syncedCount: number;
  lastSyncTime?: string;
}) => void;

export class MapSyncService {
  private isSyncing: boolean = false;
  private lastSyncTime: string | undefined;
  private listeners: Set<SyncEventListener> = new Set();

  constructor() {
    // Automatically trigger sync whenever network connects online
    networkService.subscribe((isOnline) => {
      if (isOnline) {
        this.triggerSync();
      }
    });
  }

  public async triggerSync(): Promise<{ syncedGpsLogs: number; syncedQueueItems: number }> {
    if (this.isSyncing) return { syncedGpsLogs: 0, syncedQueueItems: 0 };
    if (!networkService.isOnline()) return { syncedGpsLogs: 0, syncedQueueItems: 0 };

    this.isSyncing = true;
    this.notifyListeners(0);

    let syncedGpsCount = 0;
    let syncedQueueCount = 0;

    try {
      // 1. Sync GPS logs
      const unsyncedLogs = await offlineStorage.getUnsyncedGpsLogs();
      if (unsyncedLogs.length > 0) {
        const idsToMark = unsyncedLogs.map((log) => log.id);
        // Simulate sending payload batch to backend server/Firestore
        await new Promise((res) => setTimeout(res, 800));
        await offlineStorage.markGpsLogsSynced(idsToMark);
        syncedGpsCount = idsToMark.length;
      }

      // 2. Sync Pending Items Queue
      const queue = await offlineStorage.getSyncQueue();
      for (const item of queue) {
        await new Promise((res) => setTimeout(res, 200));
        await offlineStorage.removeSyncItem(item.id);
        syncedQueueCount++;
      }

      this.lastSyncTime = new Date().toISOString();
    } catch (err) {
      console.error('Error during auto-sync of offline map data:', err);
    } finally {
      this.isSyncing = false;
      this.notifyListeners(syncedGpsCount + syncedQueueCount);
    }

    return { syncedGpsLogs: syncedGpsCount, syncedQueueItems: syncedQueueCount };
  }

  public subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    listener({ isSyncing: this.isSyncing, syncedCount: 0, lastSyncTime: this.lastSyncTime });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(syncedCount: number): void {
    this.listeners.forEach((listener) => {
      try {
        listener({
          isSyncing: this.isSyncing,
          syncedCount,
          lastSyncTime: this.lastSyncTime,
        });
      } catch (err) {
        console.error('Error in SyncEventListener:', err);
      }
    });
  }
}

export const mapSyncService = new MapSyncService();
