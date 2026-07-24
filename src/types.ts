export type UserRole = 'cliente' | 'conductor' | 'admin';

export interface Vehicle {
  id: string;
  plate: string;
  type: string;       // Furgón, Camión Sencillo, Turbo, etc.
  model?: string;
  soatExpiry?: string;
  soatPhoto?: string;
  tecnomecanicaExpiry?: string;
  tecnomecanicaPhoto?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
  rating: number;
  balance: number; // in COP
  photoURL?: string;
  plateNumber?: string;
  vehicleType?: string;
  isComplete?: boolean;
  isAvailable?: boolean;
  licenseExpiry?: string;
  licensePhoto?: string;
  vehicles?: Vehicle[];
  documentsUploaded?: {
    cedula: boolean;
    licencia: boolean;
    soat: boolean;
    propiedad: boolean;
  };
}

export interface Trip {
  id: string;
  status: 'EN CAMINO' | 'COMPLETADO' | 'PENDIENTE';
  price: number; // in COP
  date: string;
  origin: string;
  originDetail?: string;
  destination: string;
  destinationDetail?: string;
  vehicleType: string;
  tag?: string; // e.g. "REFRIGERADO", "FRÁGIL"
  notes?: string; // Additional details for the trip
  createdAt?: string;
  clienteId?: string;
  clienteName?: string;
  clientePhotoURL?: string;
  conductorId?: string;
  conductorName?: string;
  conductorPlate?: string;
  conductorVehicleType?: string;
  conductorPhotoURL?: string;
  counterOffer?: {
    price: number;
    conductorId: string;
    conductorName: string;
  };
  ratedByCliente?: boolean;
  ratedByConductor?: boolean;
  clienteRating?: { stars: number; comment?: string; tip?: number };
  conductorRating?: { stars: number; comment?: string };
}

export interface ChatMessage {
  id: string;
  sender: 'driver' | 'user' | 'system';
  senderName?: string;
  senderPhotoURL?: string;
  text: string;
  timestamp: string;
  attachmentUrl?: string;
  isRead?: boolean;
}
