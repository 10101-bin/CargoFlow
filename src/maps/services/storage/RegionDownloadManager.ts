import { OfflineRegion, RegionStatus } from '../../models/mapTypes';
import { offlineStorage } from './OfflineMapStorage';

export interface StorageEstimateInfo {
  quotaMb: number;
  usageMb: number;
  availableMb: number;
}

export const DEFAULT_REGIONS: OfflineRegion[] = [
  {
    id: 'colombia_main',
    name: 'Colombia Nacional',
    description: 'Carreteras principales y red nacional de carga',
    country: 'Colombia',
    bounds: {
      south: 1.0,
      west: -77.5,
      north: 11.5,
      east: -71.0,
    },
    minZoom: 5,
    maxZoom: 8,
    totalTiles: 120,
    estimatedSizeMb: 12.5,
    downloadedTiles: 0,
    status: 'not_downloaded',
  },
  {
    id: 'antioquia',
    name: 'Antioquia',
    description: 'Corredores logísticos, Rionegro, Valle de Aburrá y ejes bananeros',
    country: 'Colombia',
    department: 'Antioquia',
    bounds: {
      south: 5.5,
      west: -76.5,
      north: 8.0,
      east: -74.5,
    },
    minZoom: 8,
    maxZoom: 13,
    totalTiles: 450,
    estimatedSizeMb: 35.0,
    downloadedTiles: 0,
    status: 'not_downloaded',
  },
  {
    id: 'medellin',
    name: 'Medellín & Área Metropolitana',
    description: 'Medellín, Envigado, Itagüí, Bello, Sabaneta, Barbosa',
    country: 'Colombia',
    department: 'Antioquia',
    bounds: {
      south: 6.1,
      west: -75.7,
      north: 6.4,
      east: -75.4,
    },
    minZoom: 11,
    maxZoom: 15,
    totalTiles: 380,
    estimatedSizeMb: 28.5,
    downloadedTiles: 0,
    status: 'not_downloaded',
  },
  {
    id: 'bogota',
    name: 'Bogotá D.C. & Cundinamarca',
    description: 'Capital, Sabana Centro, Soacha, Chía, Tocancipá, Funza',
    country: 'Colombia',
    department: 'Cundinamarca',
    bounds: {
      south: 4.4,
      west: -74.3,
      north: 4.9,
      east: -74.0,
    },
    minZoom: 11,
    maxZoom: 15,
    totalTiles: 420,
    estimatedSizeMb: 32.0,
    downloadedTiles: 0,
    status: 'not_downloaded',
  },
  {
    id: 'valle_cauca',
    name: 'Valle del Cauca & Puerto Buenaventura',
    description: 'Cali, Yumbo, Palmira, Buga, Tuluá y Corredor Marítimo',
    country: 'Colombia',
    department: 'Valle del Cauca',
    bounds: {
      south: 3.2,
      west: -77.2,
      north: 4.2,
      east: -75.8,
    },
    minZoom: 9,
    maxZoom: 14,
    totalTiles: 510,
    estimatedSizeMb: 39.5,
    downloadedTiles: 0,
    status: 'not_downloaded',
  },
];

export class RegionDownloadManager {
  private activeDownloads: Map<string, boolean> = new Map();

  // Convert lat/lng to tile (x, y) for a given zoom level
  private lon2tile(lon: number, zoom: number): number {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  }

  private lat2tile(lat: number, zoom: number): number {
    const latRad = (lat * Math.PI) / 180;
    return Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
    );
  }

  // Get list of tile coordinates for a region
  public getRegionTileCoords(region: OfflineRegion): { z: number; x: number; y: number }[] {
    const tiles: { z: number; x: number; y: number }[] = [];

    for (let z = region.minZoom; z <= region.maxZoom; z++) {
      const minX = this.lon2tile(region.bounds.west, z);
      const maxX = this.lon2tile(region.bounds.east, z);
      const minY = this.lat2tile(region.bounds.north, z);
      const maxY = this.lat2tile(region.bounds.south, z);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          tiles.push({ z, x, y });
        }
      }
    }

    return tiles;
  }

  public async getStorageEstimate(): Promise<StorageEstimateInfo> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const quota = (estimate.quota || 0) / (1024 * 1024);
      const usage = (estimate.usage || 0) / (1024 * 1024);
      return {
        quotaMb: Math.round(quota),
        usageMb: Math.round(usage * 10) / 10,
        availableMb: Math.round(Math.max(0, quota - usage)),
      };
    }
    return { quotaMb: 2000, usageMb: 50, availableMb: 1950 };
  }

  public async getRegions(): Promise<OfflineRegion[]> {
    const savedRegions = await offlineStorage.getAllRegions();
    const result: OfflineRegion[] = [];

    for (const defaultReg of DEFAULT_REGIONS) {
      const saved = savedRegions.find((r) => r.id === defaultReg.id);
      if (saved) {
        result.push(saved);
      } else {
        result.push(defaultReg);
      }
    }

    return result;
  }

  public async downloadRegion(
    regionId: string,
    onProgress: (region: OfflineRegion) => void
  ): Promise<OfflineRegion> {
    const regions = await this.getRegions();
    let region = regions.find((r) => r.id === regionId);
    if (!region) throw new Error(`Región no encontrada: ${regionId}`);

    if (this.activeDownloads.get(regionId)) {
      return region;
    }

    this.activeDownloads.set(regionId, true);
    const tileCoords = this.getRegionTileCoords(region);
    region.totalTiles = tileCoords.length;
    region.status = 'downloading';
    region.downloadedTiles = 0;

    await offlineStorage.saveRegionMeta(region);
    onProgress({ ...region });

    let downloadedCount = 0;

    for (const tile of tileCoords) {
      if (!this.activeDownloads.get(regionId)) {
        // Cancelled
        region.status = 'not_downloaded';
        await offlineStorage.saveRegionMeta(region);
        onProgress({ ...region });
        return region;
      }

      const tileKey = `${tile.z}/${tile.x}/${tile.y}`;
      const existingTile = await offlineStorage.getTile(tileKey);

      if (!existingTile) {
        try {
          // OpenStreetMap tile URL template
          const tileUrl = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
          const resp = await fetch(tileUrl, { mode: 'cors', cache: 'force-cache' });
          if (resp.ok) {
            const blob = await resp.blob();
            await offlineStorage.saveTile(tileKey, blob);
          }
        } catch {
          // If individual tile fetch fails (e.g. transient offline), continue
        }
      }

      downloadedCount++;
      region.downloadedTiles = downloadedCount;

      // Report progress periodically
      if (downloadedCount % 5 === 0 || downloadedCount === tileCoords.length) {
        await offlineStorage.saveRegionMeta(region);
        onProgress({ ...region });
      }
    }

    this.activeDownloads.delete(regionId);
    region.status = 'downloaded';
    region.lastUpdated = new Date().toISOString();
    await offlineStorage.saveRegionMeta(region);
    onProgress({ ...region });

    return region;
  }

  public cancelDownload(regionId: string): void {
    this.activeDownloads.set(regionId, false);
  }
}

export const regionDownloadManager = new RegionDownloadManager();
