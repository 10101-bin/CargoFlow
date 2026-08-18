import { LatLng, RouteInfo } from '../../models/mapTypes';
import { mapService } from '../../core/MapService';
import { COLOMBIA_LOGISTICS_PLACES } from '../search/SearchCatalog';

interface SimulatedTruck {
  id: string;
  driverName: string;
  vehicle: string;
  plate: string;
  city: string;
  status: string;
  origin: LatLng;
  destination: LatLng;
  points: LatLng[];
  currentIndex: number;
  direction: 1 | -1;
  completedCycles: number;
}

const DRIVER_CATALOG = [
  { name: 'Carlos Rodríguez', vehicle: 'Kenworth T800', plate: 'WYZ-789', city: 'Medellín' },
  { name: 'Andrés López', vehicle: 'Chevrolet NPR', plate: 'SQR-456', city: 'Bogotá' },
  { name: 'Mauricio Gómez', vehicle: 'Foton Super', plate: 'KLO-123', city: 'Barranquilla' },
  { name: 'Javier Mendoza', vehicle: 'Hino 500 Sencillo', plate: 'TRX-889', city: 'Cali' },
  { name: 'Diana Morales', vehicle: 'JAC KR-10', plate: 'MNB-654', city: 'Bucaramanga' },
  { name: 'Jorge Vargas', vehicle: 'International Pro', plate: 'PLM-321', city: 'Pereira / Eje Cafetero' },
  { name: 'Hernán Castro', vehicle: 'Volvo FH16', plate: 'VBN-774', city: 'Cartagena' },
  { name: 'Mateo Ramírez', vehicle: 'Foton Turbo Light', plate: 'GHJ-902', city: 'Ibagué' },
  { name: 'Felipe Zapata', vehicle: 'Chevrolet FVR', plate: 'ZXC-512', city: 'Cúcuta' },
];

const STATUS_OPTIONS = [
  'En tránsito',
  'Cargando mercancía',
  'En ruta logistica',
  'Descargando en destino',
  'Esperando planilla de despacho',
];

class FleetSimulationService {
  private trucks: Map<string, SimulatedTruck> = new Map();
  private movementTimer: ReturnType<typeof setInterval> | null = null;
  private lifecycleTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start with 4-5 active trucks across different Colombian regions
    for (let i = 0; i < 4; i++) {
      await this.spawnTruck();
    }

    // Ticker 1: Step movement along OSRM street polylines (every 1.6s)
    this.movementTimer = setInterval(() => {
      this.stepFleet();
    }, 1600);

    // Ticker 2: Dynamic Lifecycle (every 35s - spawn/despawn drivers coming online/offline)
    this.lifecycleTimer = setInterval(() => {
      this.manageLifecycle();
    }, 35000);
  }

  private async spawnTruck(): Promise<void> {
    // Pick an inactive driver profile
    const availableDrivers = DRIVER_CATALOG.filter(
      d => !Array.from(this.trucks.values()).some(t => t.driverName === d.name)
    );

    if (availableDrivers.length === 0) return;

    const driverSpec = availableDrivers[Math.floor(Math.random() * availableDrivers.length)];
    const id = `truck-sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Pick 2 distinct logistics places in Colombia
    const place1 = COLOMBIA_LOGISTICS_PLACES[Math.floor(Math.random() * COLOMBIA_LOGISTICS_PLACES.length)];
    let place2 = COLOMBIA_LOGISTICS_PLACES[Math.floor(Math.random() * COLOMBIA_LOGISTICS_PLACES.length)];
    while (place2.id === place1.id) {
      place2 = COLOMBIA_LOGISTICS_PLACES[Math.floor(Math.random() * COLOMBIA_LOGISTICS_PLACES.length)];
    }

    const origin = place1.position;
    const destination = place2.position;
    const status = STATUS_OPTIONS[Math.floor(Math.random() * STATUS_OPTIONS.length)];

    let routePoints: LatLng[] = [];
    try {
      const route: RouteInfo = await mapService.calculateRoute(origin, destination);
      if (route.points && route.points.length > 0) {
        routePoints = route.points;
      }
    } catch (err) {
      console.warn(`Could not calculate OSRM route for ${id}:`, err);
    }

    // Fallback straight line if route calculation failed
    if (routePoints.length === 0) {
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        routePoints.push({
          lat: origin.lat + (destination.lat - origin.lat) * ratio,
          lng: origin.lng + (destination.lng - origin.lng) * ratio,
        });
      }
    }

    const truck: SimulatedTruck = {
      id,
      driverName: driverSpec.name,
      vehicle: driverSpec.vehicle,
      plate: driverSpec.plate,
      city: driverSpec.city,
      status,
      origin,
      destination,
      points: routePoints,
      currentIndex: 0,
      direction: 1,
      completedCycles: 0,
    };

    this.trucks.set(id, truck);

    // Add native Leaflet marker
    mapService.addMarker({
      id: truck.id,
      position: truck.points[0],
      title: `${truck.driverName} (${truck.plate})`,
      subtitle: `${truck.vehicle} • ${truck.city} (${truck.status})`,
      type: 'driver',
    });
  }

  private despawnTruck(id: string): void {
    const truck = this.trucks.get(id);
    if (!truck) return;

    // Remove Leaflet marker from map safely
    try {
      mapService.removeMarker(id);
    } catch (e) {
      console.warn('despawnTruck: could not remove marker', id, e);
    }
    this.trucks.delete(id);
  }

  private stepFleet(): void {
    for (const [id, truck] of this.trucks.entries()) {
      if (truck.points.length <= 1) continue;

      let nextIndex = truck.currentIndex + truck.direction;

      // Reverse direction at ends
      if (nextIndex >= truck.points.length) {
        truck.direction = -1;
        nextIndex = truck.points.length - 2;
        truck.completedCycles += 1;
      } else if (nextIndex < 0) {
        truck.direction = 1;
        nextIndex = 1;
        truck.completedCycles += 1;
      }

      truck.currentIndex = nextIndex;
      const currentPos = truck.points[nextIndex];

      // Update Leaflet marker on map
      try {
        mapService.addMarker({
          id: truck.id,
          position: currentPos,
          title: `${truck.driverName} (${truck.plate})`,
          subtitle: `${truck.vehicle} • ${truck.city} (${truck.status})`,
          type: 'driver',
        });
      } catch (e) {
        console.warn('stepFleet: could not update marker', truck.id, e);
      }
    }
  }

  private manageLifecycle(): void {
    // 1. Remove trucks that completed full round trips (simulating going offline / ending shift)
    for (const [id, truck] of Array.from(this.trucks.entries())) {
      if (truck.completedCycles >= 1 && this.trucks.size > 3) {
        this.despawnTruck(id);
        break; // Despawn 1 truck at a time
      }
    }

    // 2. Spawn a new truck if total is below desired target (e.g. 5 active drivers)
    if (this.trucks.size < 6) {
      this.spawnTruck();
    }
  }

  public stop(): void {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
      this.movementTimer = null;
    }
    if (this.lifecycleTimer) {
      clearInterval(this.lifecycleTimer);
      this.lifecycleTimer = null;
    }

    // Clean up all simulation markers on map safely
    for (const id of this.trucks.keys()) {
      try {
        mapService.removeMarker(id);
      } catch (e) {
        console.warn('stop: could not remove marker', id, e);
      }
    }
    this.trucks.clear();
    this.isRunning = false;
  }
}

export const fleetSimulationService = new FleetSimulationService();
