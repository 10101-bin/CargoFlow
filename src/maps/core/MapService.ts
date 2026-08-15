import { LatLng, MapCamera, MapMarker, MapProviderType, PlaceSearchResult, RouteInfo } from '../models/mapTypes';
import { GoogleMapsProvider } from '../providers/GoogleMapsProvider';
import { IMapProvider } from '../providers/IMapProvider';
import { OfflineMapsProvider } from '../providers/OfflineMapsProvider';
import { GpsService, gpsService } from '../services/gps/GpsService';
import { NetworkService, networkService } from '../services/network/NetworkService';
import { MapSyncService, mapSyncService } from '../services/sync/MapSyncService';

export type MapStateListener = (state: {
  activeProvider: MapProviderType;
  providerName: string;
  isOnline: boolean;
  isAutoSwitch: boolean;
  userLocation: LatLng;
  currentCamera: MapCamera;
  activeRoute: RouteInfo | null;
  clickedLocation: LatLng | null;
  error: string | null;
}) => void;

export class MapService {
  private activeProvider: IMapProvider;
  private googleProvider: GoogleMapsProvider;
  private offlineProvider: OfflineMapsProvider;

  private network: NetworkService;
  private gps: GpsService;
  private sync: MapSyncService;

  private container: HTMLElement | null = null;
  private camera: MapCamera = {
    center: { lat: 6.2442, lng: -75.5812 },
    zoom: 13,
  };
  private markers: MapMarker[] = [];
  private activeRoute: RouteInfo | null = null;
  private clickedLocation: LatLng | null = null;
  private isAutoSwitchEnabled: boolean = true;

  private listeners: Set<MapStateListener> = new Set();
  private lastError: string | null = null;

  constructor(
    googleProvider = new GoogleMapsProvider(),
    offlineProvider = new OfflineMapsProvider(),
    net = networkService,
    gpsInst = gpsService,
    syncInst = mapSyncService
  ) {
    this.googleProvider = googleProvider;
    this.offlineProvider = offlineProvider;
    this.network = net;
    this.gps = gpsInst;
    this.sync = syncInst;

    // Default initial provider based on current network connectivity
    this.activeProvider = this.network.isOnline() ? this.googleProvider : this.offlineProvider;

    this.setupListeners();
  }

  private setupListeners(): void {
    // 1. Network status changes
    this.network.subscribe((isOnline) => {
      if (this.isAutoSwitchEnabled) {
        const targetType = isOnline ? 'google' : 'osm_offline';
        if (this.activeProvider.type !== targetType) {
          this.switchProvider(targetType);
        }
      }
      this.notifyState();
    });

    // 2. Real-time GPS location tracking updates
    this.gps.subscribe((userLoc) => {
      this.camera.center = userLoc;

      // Update or insert real-time user marker
      const existingUserIdx = this.markers.findIndex((m) => m.type === 'user');
      const userMarker: MapMarker = {
        id: 'user_live_marker',
        position: userLoc,
        title: 'Mi Ubicación GPS',
        subtitle: `Precisión: ${Math.round(userLoc.accuracy || 0)}m | Vel: ${Math.round(
          userLoc.speed || 0
        )} km/h`,
        type: 'user',
      };

      if (existingUserIdx >= 0) {
        this.markers[existingUserIdx] = userMarker;
      } else {
        this.markers.push(userMarker);
      }

      if (this.activeProvider) {
        this.activeProvider.setMarkers(this.markers);
      }

      this.notifyState();
    });
  }

  public async initialize(container: HTMLElement): Promise<void> {
    this.container = container;
    this.camera.center = this.gps.getCurrentLocation();

    await this.initActiveProvider();
  }

  private async initActiveProvider(): Promise<void> {
    if (!this.container) return;

    try {
      this.lastError = null;
      await this.activeProvider.initialize(this.container, this.camera);

      // Restore camera, markers, route, camera change hook, map click hook
      this.activeProvider.setCamera(this.camera, false);
      this.activeProvider.setMarkers(this.markers);
      this.activeProvider.setRoute(this.activeRoute);

      this.activeProvider.onCameraChange((cam) => {
        this.camera = cam;
      });

      this.activeProvider.onMapClick((pos) => {
        this.handleMapClick(pos);
      });
    } catch (err: any) {
      console.warn(`Error initializing provider ${this.activeProvider.name}:`, err);
      this.lastError = `Error con ${this.activeProvider.name}. Cambiando a proveedor offline.`;

      // Fallback to offline provider if Google Maps or primary provider fails
      if (this.activeProvider.type !== 'osm_offline') {
        this.activeProvider = this.offlineProvider;
        await this.initActiveProvider();
      }
    }

    this.notifyState();
  }

  private handleMapClick(pos: LatLng): void {
    this.clickedLocation = pos;

    // Add or update destination marker on map click
    const destMarker: MapMarker = {
      id: 'click_dest_marker',
      position: pos,
      title: 'Punto Seleccionado',
      subtitle: `Lat: ${pos.lat.toFixed(4)}, Lng: ${pos.lng.toFixed(4)}`,
      type: 'destination',
    };

    const originMarker: MapMarker = {
      id: 'click_origin_marker',
      position: this.gps.getCurrentLocation(),
      title: 'Origen GPS',
      type: 'origin',
    };

    this.setMarkers([
      ...this.markers.filter((m) => m.id !== 'click_dest_marker' && m.id !== 'click_origin_marker'),
      originMarker,
      destMarker,
    ]);

    // Automatically calculate route from user location to clicked location
    this.calculateRoute(this.gps.getCurrentLocation(), pos);
  }

  public invalidateSize(): void {
    if (this.activeProvider) {
      this.activeProvider.invalidateSize();
    }
  }

  public async switchProvider(type: MapProviderType): Promise<void> {
    if (this.activeProvider.type === type && this.container) return;

    // Save current camera position before switching
    if (this.activeProvider) {
      this.camera = this.activeProvider.getCamera();
      this.activeProvider.destroy();
    }

    if (type === 'google') {
      this.activeProvider = this.googleProvider;
    } else if (type === 'osm_offline') {
      this.activeProvider = this.offlineProvider;
    }

    await this.initActiveProvider();
  }

  public setAutoSwitch(enabled: boolean): void {
    this.isAutoSwitchEnabled = enabled;
    if (enabled) {
      const targetType = this.network.isOnline() ? 'google' : 'osm_offline';
      this.switchProvider(targetType);
    }
    this.notifyState();
  }

  public setCamera(camera: MapCamera, animated: boolean = true): void {
    this.camera = camera;
    if (this.activeProvider) {
      this.activeProvider.setCamera(camera, animated);
    }
  }

  public getCamera(): MapCamera {
    return this.camera;
  }

  public setMarkers(markers: MapMarker[]): void {
    this.markers = markers;
    if (this.activeProvider) {
      this.activeProvider.setMarkers(this.markers);
    }
  }

  public addMarker(marker: MapMarker): void {
    this.markers.push(marker);
    if (this.activeProvider) {
      this.activeProvider.setMarkers(this.markers);
    }
  }

  public async setRoute(route: RouteInfo | null): Promise<void> {
    this.activeRoute = route;
    if (this.activeProvider) {
      this.activeProvider.setRoute(route);
    }
    this.notifyState();
  }

  public async calculateRoute(origin: LatLng, destination: LatLng): Promise<RouteInfo> {
    const route = await this.activeProvider.calculateRoute(origin, destination);
    await this.setRoute(route);
    return route;
  }

  public async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    return this.activeProvider.searchPlaces(query);
  }

  public setTrafficEnabled(enabled: boolean): void {
    if (this.activeProvider) {
      this.activeProvider.setTrafficEnabled(enabled);
    }
  }

  public isOnline(): boolean {
    return this.network.isOnline();
  }

  public getActiveProvider(): IMapProvider {
    return this.activeProvider;
  }

  public subscribe(listener: MapStateListener): () => void {
    this.listeners.add(listener);
    this.notifyState();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyState(): void {
    const state = {
      activeProvider: this.activeProvider ? this.activeProvider.type : 'osm_offline',
      providerName: this.activeProvider ? this.activeProvider.name : 'OpenStreetMap Offline',
      isOnline: this.network.isOnline(),
      isAutoSwitch: this.isAutoSwitchEnabled,
      userLocation: this.gps.getCurrentLocation(),
      currentCamera: this.camera,
      activeRoute: this.activeRoute,
      clickedLocation: this.clickedLocation,
      error: this.lastError,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in MapStateListener:', err);
      }
    });
  }

  public destroy(): void {
    if (this.activeProvider) {
      this.activeProvider.destroy();
    }
    this.container = null;
  }
}

export const mapService = new MapService();
