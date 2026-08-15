import { GpsLocationLog, MapMarker, OfflineRegion, RouteInfo, SyncPendingItem } from '../../models/mapTypes';

const DB_NAME = 'CargoFlowMapDB';
const DB_VERSION = 1;

export class OfflineMapStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB unavailable in current environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Tile cache store: keyPath is 'key' (format: `${z}/${x}/${y}`)
        if (!db.objectStoreNames.contains('tiles')) {
          db.createObjectStore('tiles', { keyPath: 'key' });
        }

        // GPS location logs
        if (!db.objectStoreNames.contains('gps_logs')) {
          const store = db.createObjectStore('gps_logs', { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Markers store
        if (!db.objectStoreNames.contains('markers')) {
          db.createObjectStore('markers', { keyPath: 'id' });
        }

        // Routes store
        if (!db.objectStoreNames.contains('routes')) {
          db.createObjectStore('routes', { keyPath: 'id' });
        }

        // Downloaded regions metadata store
        if (!db.objectStoreNames.contains('regions')) {
          db.createObjectStore('regions', { keyPath: 'id' });
        }

        // Sync Queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Tile Operations ---
  public async saveTile(key: string, blob: Blob | ArrayBuffer): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tiles', 'readwrite');
      const store = tx.objectStore('tiles');
      const request = store.put({ key, blob, updatedAt: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getTile(key: string): Promise<Blob | ArrayBuffer | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tiles', 'readonly');
      const store = tx.objectStore('tiles');
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ? request.result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getTilesCount(): Promise<number> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tiles', 'readonly');
      const store = tx.objectStore('tiles');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- GPS Logs Operations ---
  public async saveGpsLog(log: GpsLocationLog): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('gps_logs', 'readwrite');
      const store = tx.objectStore('gps_logs');
      store.put(log);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getUnsyncedGpsLogs(): Promise<GpsLocationLog[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('gps_logs', 'readonly');
      const store = tx.objectStore('gps_logs');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async markGpsLogsSynced(ids: string[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('gps_logs', 'readwrite');
    const store = tx.objectStore('gps_logs');
    for (const id of ids) {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          req.result.synced = true;
          store.put(req.result);
        }
      };
    }
  }

  // --- Region Metadata Operations ---
  public async saveRegionMeta(region: OfflineRegion): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('regions', 'readwrite');
      const store = tx.objectStore('regions');
      store.put(region);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAllRegions(): Promise<OfflineRegion[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Markers & Routes Storage ---
  public async saveMarker(marker: MapMarker): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('markers', 'readwrite');
      const store = tx.objectStore('markers');
      store.put(marker);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAllMarkers(): Promise<MapMarker[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('markers', 'readonly');
      const store = tx.objectStore('markers');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveRoute(route: RouteInfo): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routes', 'readwrite');
      const store = tx.objectStore('routes');
      store.put(route);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAllRoutes(): Promise<RouteInfo[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routes', 'readonly');
      const store = tx.objectStore('routes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Sync Queue Operations ---
  public async enqueueSyncItem(item: SyncPendingItem): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getSyncQueue(): Promise<SyncPendingItem[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async removeSyncItem(id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineStorage = new OfflineMapStorage();
