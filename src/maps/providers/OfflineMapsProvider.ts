import L from 'leaflet';
import { LatLng, MapCamera, MapMarker, MapProviderType, PlaceSearchResult, RouteInfo, RouteStep } from '../models/mapTypes';
import { searchCatalogPlaces } from '../services/search/SearchCatalog';
import { offlineStorage } from '../services/storage/OfflineMapStorage';
import { IMapProvider } from './IMapProvider';

export class OfflineMapsProvider implements IMapProvider {
  public readonly type: MapProviderType = 'osm_offline';
  public readonly name: string = 'OpenStreetMap (Offline)';
  public readonly isOnlineOnly: boolean = false;

  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private markerInstances: Map<string, L.Marker> = new Map();
  private routePolyline: L.Polyline | null = null;
  private cameraChangeCallback: ((camera: MapCamera) => void) | null = null;
  private mapClickCallback: ((pos: LatLng) => void) | null = null;

  public async initialize(container: HTMLElement, initialCamera: MapCamera): Promise<void> {
    if (this.map) {
      this.destroy();
    }

    this.map = L.map(container, {
      center: [initialCamera.center.lat, initialCamera.center.lng],
      zoom: initialCamera.zoom,
      zoomControl: false,
    });

    // Custom Offline IndexedDB Tile Layer
    const OfflineTileLayer = L.TileLayer.extend({
      createTile: function (coords: L.Coords, done: L.DoneCallback) {
        const tile = document.createElement('img');
        tile.alt = '';
        tile.setAttribute('role', 'presentation');

        const key = `${coords.z}/${coords.x}/${coords.y}`;

        // Fetch tile from IndexedDB offline storage
        offlineStorage
          .getTile(key)
          .then((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob as Blob);
              tile.onload = () => {
                URL.revokeObjectURL(url);
                done(undefined, tile);
              };
              tile.onerror = () => {
                done(new Error('Tile image load failed'), tile);
              };
              tile.src = url;
            } else {
              // Tile not downloaded offline -> try fetching or show fallback grid
              tile.src = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
              tile.onload = () => done(undefined, tile);
              tile.onerror = () => {
                // Return SVG fallback placeholder tile when strictly offline
                tile.src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" style="background:%230c192d"><rect width="256" height="256" fill="%230f2442" stroke="%231e3b66" stroke-width="1"/><text x="50%" y="50%" fill="%2364748b" font-family="sans-serif" font-size="12" text-anchor="middle" dominant-baseline="middle">Mapa Sin Conexión</text></svg>';
                done(undefined, tile);
              };
            }
          })
          .catch(() => {
            tile.src = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
            tile.onload = () => done(undefined, tile);
            tile.onerror = () => done(undefined, tile);
          });

        return tile;
      },
    });

    this.tileLayer = new (OfflineTileLayer as any)('', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap Offline',
    }).addTo(this.map);

    this.map.on('moveend zoomend', () => {
      if (this.map && this.cameraChangeCallback) {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        this.cameraChangeCallback({
          center: { lat: center.lat, lng: center.lng },
          zoom,
        });
      }
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.mapClickCallback) {
        this.mapClickCallback({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 150);
  }

  public invalidateSize(): void {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  public destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markerInstances.clear();
    this.routePolyline = null;
    this.tileLayer = null;
  }

  public setCamera(camera: MapCamera, animated: boolean = true): void {
    if (!this.map) return;
    if (animated) {
      this.map.flyTo([camera.center.lat, camera.center.lng], camera.zoom, { duration: 0.8 });
    } else {
      this.map.setView([camera.center.lat, camera.center.lng], camera.zoom);
    }
    this.invalidateSize();
  }

  public getCamera(): MapCamera {
    if (!this.map) {
      return { center: { lat: 6.2442, lng: -75.5812 }, zoom: 13 };
    }
    const center = this.map.getCenter();
    return {
      center: { lat: center.lat, lng: center.lng },
      zoom: this.map.getZoom(),
    };
  }

  public setMarkers(markers: MapMarker[]): void {
    if (!this.map) return;

    const currentIds = new Set(markers.map((m) => m.id));
    for (const [id, markerInst] of this.markerInstances.entries()) {
      if (!currentIds.has(id)) {
        markerInst.remove();
        this.markerInstances.delete(id);
      }
    }

    markers.forEach((m) => {
      const existing = this.markerInstances.get(m.id);
      if (existing) {
        existing.setLatLng([m.position.lat, m.position.lng]);
      } else {
        const customIcon = this.createCustomIcon(m.type);
        const markerInst = L.marker([m.position.lat, m.position.lng], { icon: customIcon });
        markerInst.bindPopup(`<b>${m.title} (Offline)</b>${m.subtitle ? `<br/>${m.subtitle}` : ''}`);
        markerInst.addTo(this.map!);
        this.markerInstances.set(m.id, markerInst);
      }
    });
  }

  public setRoute(route: RouteInfo | null): void {
    if (!this.map) return;

    if (this.routePolyline) {
      this.routePolyline.remove();
      this.routePolyline = null;
    }

    if (route && route.points.length > 0) {
      const latLngs: L.LatLngExpression[] = route.points.map((p) => [p.lat, p.lng]);
      this.routePolyline = L.polyline(latLngs, {
        color: '#10B981', // Emerald green for offline route
        weight: 6,
        opacity: 0.9,
        dashArray: '10, 6',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(this.map);

      this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
    }
  }

  public setTrafficEnabled(_enabled: boolean): void {
    // Traffic not available offline
  }

  public async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    if (!query.trim()) return [];

    const localCatalog = searchCatalogPlaces(query);

    // Also check offline saved markers from IndexedDB
    try {
      const savedMarkers = await offlineStorage.getAllMarkers();
      const q = query.toLowerCase();
      savedMarkers.forEach((m) => {
        if (m.title.toLowerCase().includes(q) || (m.subtitle && m.subtitle.toLowerCase().includes(q))) {
          if (!localCatalog.some((c) => c.id === m.id)) {
            localCatalog.push({
              id: m.id,
              title: m.title,
              address: m.subtitle || 'Ubicación guardada localmente',
              position: m.position,
            });
          }
        }
      });
    } catch {
      // ignore
    }

    return localCatalog;
  }

  public async calculateRoute(origin: LatLng, destination: LatLng): Promise<RouteInfo> {
    const pointsCount = 25;
    const points: LatLng[] = [];

    for (let i = 0; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const curve = Math.sin(t * Math.PI) * 0.012;
      points.push({
        lat: origin.lat + (destination.lat - origin.lat) * t + curve,
        lng: origin.lng + (destination.lng - origin.lng) * t - curve,
      });
    }

    const radLat1 = (origin.lat * Math.PI) / 180;
    const radLat2 = (destination.lat * Math.PI) / 180;
    const deltaLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const deltaLng = ((destination.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.round(6371 * c * 10) / 10;
    const durationMin = Math.round((distanceKm / 45) * 60);

    const steps: RouteStep[] = [
      {
        instruction: 'Avanzar por vía principal offline',
        distanceKm: Math.round(distanceKm * 0.3 * 10) / 10,
        durationMin: Math.round(durationMin * 0.3),
        position: origin,
      },
      {
        instruction: 'Continuar por el corredor trazado',
        distanceKm: Math.round(distanceKm * 0.6 * 10) / 10,
        durationMin: Math.round(durationMin * 0.6),
        position: points[Math.floor(points.length / 2)],
      },
      {
        instruction: 'Llegada al destino final sin conexión',
        distanceKm: Math.round(distanceKm * 0.1 * 10) / 10,
        durationMin: Math.round(durationMin * 0.1),
        position: destination,
      },
    ];

    const route: RouteInfo = {
      id: `offline_route_${Date.now()}`,
      origin,
      destination,
      originName: 'Origen Offline',
      destinationName: 'Destino Offline',
      points,
      distanceKm,
      durationMin,
      steps,
      isOffline: true,
      createdAt: new Date().toISOString(),
    };

    await offlineStorage.saveRoute(route);

    return route;
  }

  public onCameraChange(callback: (camera: MapCamera) => void): void {
    this.cameraChangeCallback = callback;
  }

  public onMapClick(callback: (pos: LatLng) => void): void {
    this.mapClickCallback = callback;
  }

  private createCustomIcon(type: string): L.DivIcon {
    let bg = '#10B981';
    let iconSymbol = '📍';

    if (type === 'user' || type === 'driver') {
      bg = '#00E5A0';
      iconSymbol = '🚚';
    } else if (type === 'origin') {
      bg = '#059669';
      iconSymbol = '🟢';
    } else if (type === 'destination') {
      bg = '#DC2626';
      iconSymbol = '🏁';
    }

    const html = `
      <div style="
        background: ${bg};
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        border: 2px solid white;
        font-size: 18px;
        cursor: pointer;
      ">
        ${iconSymbol}
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-map-icon-offline',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  }
}
