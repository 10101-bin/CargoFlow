export interface LatLng {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
}

export interface MapCamera {
  center: LatLng;
  zoom: number;
  heading?: number;
  pitch?: number;
}

export interface MapMarker {
  id: string;
  position: LatLng;
  title: string;
  subtitle?: string;
  type: 'user' | 'driver' | 'origin' | 'destination' | 'waypoint' | 'custom';
  iconUrl?: string;
  draggable?: boolean;
}

export interface RouteStep {
  instruction: string;
  distanceKm: number;
  durationMin: number;
  position: LatLng;
}

export interface RouteInfo {
  id: string;
  origin: LatLng;
  destination: LatLng;
  originName: string;
  destinationName: string;
  points: LatLng[];
  distanceKm: number;
  durationMin: number;
  steps: RouteStep[];
  isOffline?: boolean;
  createdAt: string;
}

export type RegionStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'update_available';

export interface OfflineRegion {
  id: string;
  name: string;
  description: string;
  country: string;
  department?: string;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  minZoom: number;
  maxZoom: number;
  totalTiles: number;
  estimatedSizeMb: number;
  downloadedTiles: number;
  status: RegionStatus;
  lastUpdated?: string;
}

export interface GpsLocationLog {
  id: string;
  lat: number;
  lng: number;
  speed: number | null;
  accuracy: number | null;
  heading: number | null;
  timestamp: number;
  dateIso: string;
  synced: boolean;
}

export interface SyncPendingItem {
  id: string;
  type: 'gps_log' | 'route' | 'marker';
  payload: any;
  createdAt: string;
  syncAttempts: number;
}

export type MapProviderType = 'google' | 'osm_offline' | 'here' | 'mapbox' | 'tomtom' | 'arcgis';

export interface PlaceSearchResult {
  id: string;
  title: string;
  address: string;
  position: LatLng;
}
