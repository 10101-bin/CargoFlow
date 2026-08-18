import { LatLng, RouteInfo } from '../../models/mapTypes';
import { mapService } from '../../core/MapService';
import { COLOMBIA_LOGISTICS_PLACES } from '../search/SearchCatalog';

interface SimulatedTruck {
  id: string;
  driverName: string;
  vehicle: string;
  plate: string;
  status: string;
  origin: LatLng;
  destination: LatLng;
  points: LatLng[];
  currentIndex: number;
  direction: 1 | -1;
}

class FleetSimulationService {
  private trucks: SimulatedTruck[] = [];
  private timerId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Define initial fleet simulation routes using real logistics catalog coordinates
    const initialSpecs = [
      {
        id: 'truck-sim-1',
        driverName: 'Carlos Rodríguez',
        vehicle: 'Kenworth T800',
        plate: 'WYZ-789',
        status: 'Cargando mercancía',
        origin: COLOMBIA_LOGISTICS_PLACES[0]?.position || { lat: 6.2730, lng: -75.5680 }, // Medellín Terminal Norte
        destination: COLOMBIA_LOGISTICS_PLACES[3]?.position || { lat: 6.1550, lng: -75.4240 }, // Rionegro Airport
      },
      {
        id: 'truck-sim-2',
        driverName: 'Andrés López',
        vehicle: 'Chevrolet NPR',
        plate: 'SQR-456',
        status: 'En tránsito',
        origin: COLOMBIA_LOGISTICS_PLACES[1]?.position || { lat: 4.6530, lng: -74.1100 }, // Bogotá Fontibón
        destination: COLOMBIA_LOGISTICS_PLACES[4]?.position || { lat: 3.5200, lng: -76.4800 }, // Cali Yumbo
      },
      {
        id: 'truck-sim-3',
        driverName: 'Mauricio Gómez',
        vehicle: 'Foton Super',
        plate: 'KLO-123',
        status: 'Esperando documentos',
        origin: COLOMBIA_LOGISTICS_PLACES[2]?.position || { lat: 10.9700, lng: -74.7900 }, // Barranquilla Port
        destination: COLOMBIA_LOGISTICS_PLACES[0]?.position || { lat: 6.2730, lng: -75.5680 }, // Medellín Terminal Norte
      },
    ];

    this.trucks = [];

    // Calculate real street OSRM polylines for each truck
    for (const spec of initialSpecs) {
      let routePoints: LatLng[] = [];
      try {
        const route: RouteInfo = await mapService.calculateRoute(spec.origin, spec.destination);
        if (route.points && route.points.length > 0) {
          routePoints = route.points;
        }
      } catch (err) {
        console.warn(`Could not calculate OSRM route for ${spec.id}:`, err);
      }

      // Fallback linear interpolation points if route calculation failed
      if (routePoints.length === 0) {
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          routePoints.push({
            lat: spec.origin.lat + (spec.destination.lat - spec.origin.lat) * ratio,
            lng: spec.origin.lng + (spec.destination.lng - spec.origin.lng) * ratio,
          });
        }
      }

      const truck: SimulatedTruck = {
        ...spec,
        points: routePoints,
        currentIndex: 0,
        direction: 1,
      };

      this.trucks.push(truck);

      // Add initial Leaflet marker on the map
      mapService.addMarker({
        id: truck.id,
        position: truck.points[0],
        title: `${truck.driverName} (${truck.plate})`,
        subtitle: `${truck.vehicle} • ${truck.status}`,
        type: 'driver',
      });
    }

    // Start interval to smoothly animate markers along road polyline points
    this.timerId = setInterval(() => {
      this.stepFleet();
    }, 1800);
  }

  private stepFleet(): void {
    for (const truck of this.trucks) {
      if (truck.points.length <= 1) continue;

      let nextIndex = truck.currentIndex + truck.direction;

      // Reverse direction at polyline ends
      if (nextIndex >= truck.points.length) {
        truck.direction = -1;
        nextIndex = truck.points.length - 2;
      } else if (nextIndex < 0) {
        truck.direction = 1;
        nextIndex = 1;
      }

      truck.currentIndex = nextIndex;
      const currentPos = truck.points[nextIndex];

      // Update native Leaflet marker on map
      mapService.addMarker({
        id: truck.id,
        position: currentPos,
        title: `${truck.driverName} (${truck.plate})`,
        subtitle: `${truck.vehicle} • ${truck.status}`,
        type: 'driver',
      });
    }
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }
}

export const fleetSimulationService = new FleetSimulationService();
