import { LatLng, MapCamera, MapMarker, MapProviderType, PlaceSearchResult, RouteInfo } from '../models/mapTypes';

export interface IMapProvider {
  type: MapProviderType;
  name: string;
  isOnlineOnly: boolean;

  /**
   * Initializes the map engine inside the specified DOM container.
   */
  initialize(container: HTMLElement, initialCamera: MapCamera): Promise<void>;

  /**
   * Cleans up map resources and unbinds event listeners.
   */
  destroy(): void;

  /**
   * Forces recalculation of container size (fixes Leaflet grey/broken tiles).
   */
  invalidateSize(): void;

  /**
   * Updates camera target (center, zoom).
   */
  setCamera(camera: MapCamera, animated?: boolean): void;

  /**
   * Returns current camera state (center, zoom).
   */
  getCamera(): MapCamera;

  /**
   * Renders the provided markers on the map.
   */
  setMarkers(markers: MapMarker[]): void;

  /**
   * Renders or clears an active route polyline.
   */
  setRoute(route: RouteInfo | null): void;

  /**
   * Toggles real-time traffic layer (if supported).
   */
  setTrafficEnabled(enabled: boolean): void;

  /**
   * Geocodes or searches places by text query.
   */
  searchPlaces(query: string): Promise<PlaceSearchResult[]>;

  /**
   * Calculates route path, distance, and duration between origin and destination.
   */
  calculateRoute(origin: LatLng, destination: LatLng): Promise<RouteInfo>;

  /**
   * Subscribes to map camera drag/pan/zoom movements to keep camera state synced.
   */
  onCameraChange(callback: (camera: MapCamera) => void): void;

  /**
   * Subscribes to map click events (user tapping/clicking coordinates on the map).
   */
  onMapClick(callback: (pos: LatLng) => void): void;
}
