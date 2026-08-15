import L from 'leaflet';
import { LatLng, MapCamera, MapMarker, MapProviderType, PlaceSearchResult, RouteInfo, RouteStep } from '../models/mapTypes';
import { searchCatalogPlaces } from '../services/search/SearchCatalog';
import { IMapProvider } from './IMapProvider';

export class GoogleMapsProvider implements IMapProvider {
  public readonly type: MapProviderType = 'google';
  public readonly name: string = 'Google Maps (Online)';
  public readonly isOnlineOnly: boolean = true;

  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private trafficLayer: L.TileLayer | null = null;
  private markerInstances: Map<string, L.Marker> = new Map();
  private routePolyline: L.Polyline | null = null;
  private cameraChangeCallback: ((camera: MapCamera) => void) | null = null;
  private mapClickCallback: ((pos: LatLng) => void) | null = null;
  private isTrafficEnabled: boolean = false;

  public async initialize(container: HTMLElement, initialCamera: MapCamera): Promise<void> {
    if (this.map) {
      this.destroy();
    }

    this.map = L.map(container, {
      center: [initialCamera.center.lat, initialCamera.center.lng],
      zoom: initialCamera.zoom,
      zoomControl: false,
    });

    // Google Maps Online Vector/Raster Tiles
    this.tileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: '&copy; Google Maps',
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

    if (this.isTrafficEnabled) {
      this.setTrafficEnabled(true);
    }

    // Recalculate container bounds after mount to fix grey/blank Leaflet tiles
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
    this.trafficLayer = null;
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

    // Clear removed markers
    const currentIds = new Set(markers.map((m) => m.id));
    for (const [id, markerInst] of this.markerInstances.entries()) {
      if (!currentIds.has(id)) {
        markerInst.remove();
        this.markerInstances.delete(id);
      }
    }

    // Add or update markers
    markers.forEach((m) => {
      const existing = this.markerInstances.get(m.id);
      if (existing) {
        existing.setLatLng([m.position.lat, m.position.lng]);
      } else {
        const customIcon = this.createCustomIcon(m.type);
        const markerInst = L.marker([m.position.lat, m.position.lng], { icon: customIcon });
        markerInst.bindPopup(`<b>${m.title}</b>${m.subtitle ? `<br/>${m.subtitle}` : ''}`);
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
        color: '#1E5EFF',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(this.map);

      this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
    }
  }

  public setTrafficEnabled(enabled: boolean): void {
    this.isTrafficEnabled = enabled;
    if (!this.map) return;

    if (enabled && !this.trafficLayer) {
      this.trafficLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        opacity: 0.7,
        maxZoom: 20,
      }).addTo(this.map);
    } else if (!enabled && this.trafficLayer) {
      this.trafficLayer.remove();
      this.trafficLayer = null;
    }
  }

  public async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    if (!query.trim()) return [];

    // 1. Search local catalog first for instant results
    const localResults = searchCatalogPlaces(query);

    try {
      // 2. Query Nominatim for online autocomplete
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=co&limit=5`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const onlineResults: PlaceSearchResult[] = data.map((item: any) => ({
          id: `nom_${item.place_id}`,
          title: item.display_name.split(',')[0],
          address: item.display_name,
          position: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
        }));

        // Merge online and local results without duplicates
        const combined = [...localResults];
        onlineResults.forEach((onRes) => {
          if (!combined.some((c) => c.title.toLowerCase() === onRes.title.toLowerCase())) {
            combined.push(onRes);
          }
        });
        return combined;
      }
    } catch {
      // Return local catalog if network fetch fails
    }

    return localResults;
  }

  public async calculateRoute(origin: LatLng, destination: LatLng): Promise<RouteInfo> {
    try {
      // OSRM Online Directions Engine
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const routeData = data.routes[0];
          const coordinates: [number, number][] = routeData.geometry.coordinates;

          const points: LatLng[] = coordinates.map((c) => ({ lat: c[1], lng: c[0] }));
          const distanceKm = Math.round((routeData.distance / 1000) * 10) / 10;
          const durationMin = Math.round(routeData.duration / 60);

          const steps: RouteStep[] = routeData.legs[0].steps.map((s: any) => ({
            instruction: s.maneuver.type + (s.name ? ` en ${s.name}` : ''),
            distanceKm: Math.round((s.distance / 1000) * 10) / 10,
            durationMin: Math.round(s.duration / 60),
            position: { lat: s.maneuver.location[1], lng: s.maneuver.location[0] },
          }));

          return {
            id: `route_${Date.now()}`,
            origin,
            destination,
            originName: 'Origen',
            destinationName: 'Destino',
            points,
            distanceKm,
            durationMin,
            steps,
            isOffline: false,
            createdAt: new Date().toISOString(),
          };
        }
      }
    } catch {
      // Fallback
    }

    return this.createInterpolatedRoute(origin, destination);
  }

  private createInterpolatedRoute(origin: LatLng, destination: LatLng): RouteInfo {
    const pointsCount = 25;
    const points: LatLng[] = [];

    for (let i = 0; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const curve = Math.sin(t * Math.PI) * 0.015;
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
    const durationMin = Math.round((distanceKm / 55) * 60);

    return {
      id: `route_fallback_${Date.now()}`,
      origin,
      destination,
      originName: 'Origen',
      destinationName: 'Destino',
      points,
      distanceKm,
      durationMin,
      steps: [
        {
          instruction: 'Salir hacia la vía principal',
          distanceKm: Math.round(distanceKm * 0.2 * 10) / 10,
          durationMin: Math.round(durationMin * 0.2),
          position: origin,
        },
        {
          instruction: 'Continuar por el corredor logístico',
          distanceKm: Math.round(distanceKm * 0.7 * 10) / 10,
          durationMin: Math.round(durationMin * 0.7),
          position: points[Math.floor(points.length / 2)],
        },
        {
          instruction: 'Llegar al destino especificado',
          distanceKm: Math.round(distanceKm * 0.1 * 10) / 10,
          durationMin: Math.round(durationMin * 0.1),
          position: destination,
        },
      ],
      isOffline: false,
      createdAt: new Date().toISOString(),
    };
  }

  public onCameraChange(callback: (camera: MapCamera) => void): void {
    this.cameraChangeCallback = callback;
  }

  public onMapClick(callback: (pos: LatLng) => void): void {
    this.mapClickCallback = callback;
  }

  private createCustomIcon(type: string): L.DivIcon {
    let bg = '#1E5EFF';
    let iconSymbol = '📍';

    if (type === 'user' || type === 'driver') {
      bg = '#00E5A0';
      iconSymbol = '🚚';
    } else if (type === 'origin') {
      bg = '#10B981';
      iconSymbol = '🟢';
    } else if (type === 'destination') {
      bg = '#EF4444';
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
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        border: 2px solid white;
        font-size: 18px;
        cursor: pointer;
      ">
        ${iconSymbol}
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-map-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  }
}
