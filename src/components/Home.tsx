import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, History, Menu, Truck, Star, Info, X, Navigation, RefreshCw, CheckCircle2, Navigation2, Phone, Flag, PackageCheck, MapPinned, Compass, Map, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip, UserProfile } from '../types';
import { HybridMapContainer } from '../maps/components/HybridMapContainer';
import { COLOMBIA_LOGISTICS_PLACES } from '../maps/services/search/SearchCatalog';

interface HomeProps {
  user: UserProfile;
  trips?: Trip[];
  usersList?: UserProfile[];
  pendingTrip?: Trip;
  editingTrip?: Trip | null;
  onCloseEditing?: () => void;
  onCreateShipment: (trip: Trip) => void;
  onEditShipment?: (trip: Trip) => void;
  onAcceptTrip?: (tripId: string, assignedPlate?: string, assignedType?: string) => void;
  onCounterOfferTrip?: (tripId: string, price: number, assignedPlate?: string, assignedType?: string) => void;
  onNavigateToView: (view: 'home' | 'activity' | 'chat' | 'dashboard' | 'profile' | 'settings') => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
  onLogout: () => void;
}

export default function Home({ 
  user, 
  trips = [],
  usersList = [],
  pendingTrip, 
  editingTrip,
  onCloseEditing,
  onCreateShipment, 
  onEditShipment,
  onAcceptTrip,
  onCounterOfferTrip,
  onNavigateToView, 
  onUpdateProfile, 
  onLogout 
}: HomeProps) {
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  // ── Navigation Mode state ────────────────────────────────────────
  const [showAcceptAnimation, setShowAcceptAnimation] = useState(false);
  const [acceptedTripData, setAcceptedTripData] = useState<Trip | null>(null);
  const [tripPhase, setTripPhase] = useState<'cargue' | 'descargue'>('cargue');
  const [showRatingReminder, setShowRatingReminder] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect active trip (EN CAMINO) for this conductor
  const activeTrip = user.role === 'conductor'
    ? (trips || []).find(t => t.conductorId === user.email && t.status === 'EN CAMINO') ?? null
    : null;

  // Reset phase when active trip changes
  useEffect(() => {
    if (activeTrip) setTripPhase('cargue');
  }, [activeTrip?.id]);

  // Cleanup animation timer on unmount
  useEffect(() => () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); }, []);

  const renderAvatar = (photoURL?: string, name?: string, sizeClass = "w-7 h-7 text-[10px]") => {
    if (photoURL && typeof photoURL === 'string' && photoURL.startsWith('http') && photoURL.length > 10) {
      return (
        <img
          src={photoURL}
          alt={name || 'Usuario'}
          className={`${sizeClass} rounded-full object-cover border border-white shadow-xs flex-shrink-0`}
        />
      );
    }
    const initials = (name || 'Usuario').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600 text-white font-extrabold flex items-center justify-center border border-white shadow-xs flex-shrink-0 uppercase`}>
        {initials}
      </div>
    );
  };

  const [selectedTruck, setSelectedTruck] = useState<{
    driverName: string;
    vehicle: string;
    plate: string;
    location: string;
    status: string;
  } | null>(null);

  // Form State for creating a custom shipment
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [showOriginCatalog, setShowOriginCatalog] = useState(false);
  const [showDestCatalog, setShowDestCatalog] = useState(false);

  const handleGetGpsOrigin = () => {
    if ('geolocation' in navigator) {
      setIsLocatingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocatingGps(false);
          setOrigin(`Ubicación GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        },
        () => {
          setIsLocatingGps(false);
          setOrigin('Mi Ubicación GPS (Medellín, Antioquia)');
        },
        { timeout: 5000 }
      );
    } else {
      setOrigin('Mi Ubicación GPS (Medellín, Antioquia)');
    }
  };
  const [cargoType, setCargoType] = useState('General');
  const [tag, setTag] = useState<string>('');
  const [vehicle, setVehicle] = useState('Camión Sencillo');
  const [notes, setNotes] = useState('');
  const [customPrice, setCustomPrice] = useState(1250000);
  const [isCounterOffering, setIsCounterOffering] = useState(false);
  const [counterOfferPrice, setCounterOfferPrice] = useState(pendingTrip?.price || 1250000);

  // Vehicle Selector state (for transport companies / multi-vehicle assignment)
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [actionToPerform, setActionToPerform] = useState<{ type: 'accept' | 'counter'; tripId: string; price?: number } | null>(null);

  // When editingTrip changes, load it into the form
  React.useEffect(() => {
    if (editingTrip) {
      setOrigin(editingTrip.origin);
      setDestination(editingTrip.destination);
      setVehicle(editingTrip.vehicleType);
      setTag(editingTrip.tag || '');
      setNotes(editingTrip.notes || '');
      setCustomPrice(editingTrip.price);
      setShowShipmentModal(true);
    }
  }, [editingTrip]);

  // Pre-configured trucks to interact with on the map
  const trucksOnMap = [
    {
      id: 'truck-1',
      driverName: 'Carlos Rodríguez',
      vehicle: 'Kenworth T800',
      plate: 'WYZ-789',
      location: 'Suba, Bogotá',
      status: 'Cargando mercancía',
      top: '35%',
      left: '20%',
    },
    {
      id: 'truck-2',
      driverName: 'Andrés López',
      vehicle: 'Chevrolet NPR',
      plate: 'SQR-456',
      location: 'Usaquén, Bogotá',
      status: 'En tránsito a Medellín',
      top: '52%',
      left: '65%',
    },
    {
      id: 'truck-3',
      driverName: 'Mauricio Gómez',
      vehicle: 'Foton Super',
      plate: 'KLO-123',
      location: 'Barrios Unidos, Bogotá',
      status: 'Esperando documentos',
      top: '68%',
      left: '48%',
    },
  ];

  const handleCreateShipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;

    if (editingTrip && onEditShipment) {
      const updatedTrip: Trip = {
        ...editingTrip,
        price: customPrice,
        origin,
        destination,
        vehicleType: vehicle,
        ...(tag ? { tag } : {}),
        ...(notes ? { notes } : {}),
      };
      onEditShipment(updatedTrip);
      if (onCloseEditing) onCloseEditing();
    } else {
      const newTrip: Trip = {
        id: `#CF-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'PENDIENTE',
        price: customPrice,
        date: 'Hoy, ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        origin,
        originDetail: 'Terminal de Carga Principal',
        destination,
        destinationDetail: 'Entrega en Centro Ciudad',
        vehicleType: vehicle,
        ...(tag ? { tag } : {}),
        ...(notes ? { notes } : {}),
      };
      onCreateShipment(newTrip);
    }

    setShowShipmentModal(false);
    onNavigateToView('activity'); // go to activity screen to see it
  };

  const handleQuickReorder = () => {
    // Quick reorder for Bogotá to Medellín
    const quickTrip: Trip = {
      id: `#CF-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'PENDIENTE',
      price: 1250000,
      date: 'Hoy, 14:30',
      origin: 'Bogotá, D.C.',
      originDetail: 'Centro Logístico Fontibón',
      destination: 'Medellín, ANT',
      destinationDetail: 'Zona Industrial Guayabal',
      vehicleType: 'Tractomula',
      tag: 'REFRIGERADO',
    };

    onCreateShipment(quickTrip);
    onNavigateToView('activity');
  };

  // ── Real conductor stats ──────────────────────────────────────────
  const todayStr = new Date().toDateString();
  const driverCompletedTrips = trips.filter(t => t.conductorId === user.email && t.status === 'COMPLETADO');
  const todayEarnings = driverCompletedTrips
    .filter(t => t.completedAt && new Date(t.completedAt).toDateString() === todayStr)
    .reduce((s, t) => s + (t.price || 0) + ((t.clienteRating?.tip) || 0), 0);
  const totalDriverCompleted = driverCompletedTrips.length;
  const driverRating = user.rating > 0 ? user.rating.toFixed(1) : totalDriverCompleted > 0 ? '5.0' : '—';
  const activePlate = (user.vehicles && user.vehicles.length > 0)
    ? user.vehicles[0].plate
    : (user.plateNumber || '—');
  const isAvailable = user.isAvailable ?? true;

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Drawer Sidebar Menu */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="absolute inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute top-0 bottom-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col p-6"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <Truck className="text-primary-container" size={28} fill="currentColor" />
                  <span className="text-xl font-black text-primary-container">CargoFlow</span>
                </div>
                <button onClick={() => setShowDrawer(false)} className="p-1 hover:bg-surface-container rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl mb-6">
                <img
                  src={user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"}
                  alt={user.name || 'Usuario'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white flex-shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-on-surface text-sm truncate">{user.name || 'Usuario CargoFlow'}</h3>
                  <p className="text-xs text-on-surface-variant truncate font-medium">{user.email || 'cliente@cargoflow.co'}</p>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full block w-fit mt-0.5">
                    {user.role === 'conductor' ? 'CONDUCTOR' : 'CLIENTE'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    onNavigateToView('home');
                  }}
                  className="flex items-center gap-3 p-3 text-left hover:bg-surface-container rounded-xl font-semibold text-sm text-primary-container bg-blue-50/50"
                >
                  <Navigation size={18} />
                  <span>Mapa de Carga</span>
                </button>
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    onNavigateToView('activity');
                  }}
                  className="flex items-center gap-3 p-3 text-left hover:bg-surface-container rounded-xl font-semibold text-sm text-on-surface-variant"
                >
                  <History size={18} />
                  <span>Mis Despachos</span>
                </button>
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    onNavigateToView('chat');
                  }}
                  className="flex items-center gap-3 p-3 text-left hover:bg-surface-container rounded-xl font-semibold text-sm text-on-surface-variant"
                >
                  <Truck size={18} />
                  <span>Soporte / Chat</span>
                </button>
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    onNavigateToView('profile');
                  }}
                  className="flex items-center gap-3 p-3 text-left hover:bg-surface-container rounded-xl font-semibold text-sm text-on-surface-variant"
                >
                  <Star size={18} />
                  <span>Mi Perfil</span>
                </button>
              </div>

              <div className="mt-auto pt-6 border-t border-surface-container-high">
                <button
                  onClick={onLogout}
                  className="w-full py-3 bg-red-50 text-error hover:bg-red-100 rounded-xl font-bold text-sm transition-all"
                >
                  Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TopAppBar */}
      <header className="absolute top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md shadow-sm flex items-center justify-between px-6 h-16">
        <button
          onClick={() => setShowDrawer(true)}
          className="text-on-surface-variant hover:opacity-80 active:scale-95 transition-transform flex items-center justify-center p-2 rounded-full focus:outline-none"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-black text-primary-container tracking-tight">CargoFlow</h1>
        <button
          onClick={() => onNavigateToView('profile')}
          className="hover:opacity-80 active:scale-95 transition-transform rounded-full overflow-hidden w-9 h-9 border-2 border-primary-container/20 focus:outline-none"
        >
          <img
            alt={user.name || 'User Profile'}
            className="w-full h-full object-cover"
            src={user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"}
          />
        </button>
      </header>

      {/* Floating Availability Toggle for Conductors */}
      {user.role === 'conductor' && (
        <div className="absolute top-20 right-4 z-20 flex flex-col items-end animate-fade-in-up">
          <button
            onClick={() => {
              const newStatus = !(user.isAvailable ?? true);
              if (onUpdateProfile) {
                onUpdateProfile({ isAvailable: newStatus });
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border backdrop-blur-md transition-all active:scale-95 ${
              (user.isAvailable ?? true) 
                ? 'bg-emerald-500/90 text-white border-emerald-400 shadow-emerald-500/20' 
                : 'bg-white/90 text-slate-500 border-slate-200 shadow-black/10'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${
              (user.isAvailable ?? true) ? 'bg-white animate-pulse' : 'bg-slate-400'
            }`} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {(user.isAvailable ?? true) ? 'Activo' : 'Inactivo'}
            </span>
          </button>
        </div>
      )}

      {/* Left-Aligned Compact Status Badge for Conductors when no pending trip */}
      {user.role === 'conductor' && !pendingTrip && (
        <div className="absolute top-20 left-4 z-20 max-w-[240px] pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-2.5 px-3 border border-slate-200/80 animate-pulse flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-primary-container flex items-center justify-center flex-shrink-0 font-bold shadow-xs">
              <Search size={14} />
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="font-extrabold text-xs text-slate-800 leading-tight truncate">Buscando cargas...</h4>
              <p className="text-[10px] text-slate-500 font-medium leading-tight truncate">Sin fletes cercanos ahora.</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Layer Container */}
      <div className="absolute inset-0 z-0">
        <HybridMapContainer className="w-full h-full rounded-none border-none shadow-none" initialHeight="h-full" />

        {/* Interactive Vehicle Markers */}
        {trucksOnMap.map((trk) => (
          <div
            key={trk.id}
            style={{ top: trk.top, left: trk.left }}
            className="absolute z-10"
          >
            <button
              onClick={() => setSelectedTruck(trk)}
              className="relative group focus:outline-none"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="w-10 h-10 bg-white rounded-full shadow-[0px_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center border-2 border-primary-container hover:scale-110 active:scale-95 transition-all">
                <Truck size={18} className="text-primary-container" fill="currentColor" />
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Interactive Map Marker details sheet */}
      <AnimatePresence>
        {selectedTruck && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-64 left-4 right-4 z-20"
          >
            <div className="bg-white rounded-2xl shadow-[0px_8px_30px_rgba(0,0,0,0.15)] p-4 border border-surface-container relative">
              <button
                onClick={() => setSelectedTruck(null)}
                className="absolute top-3 right-3 p-1 hover:bg-surface-container rounded-full text-on-surface-variant"
              >
                <X size={16} />
              </button>

              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-primary-container flex-shrink-0">
                  <Truck size={24} fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-on-surface">{selectedTruck.driverName}</h4>
                  <p className="text-xs text-on-surface-variant font-medium">
                    {selectedTruck.vehicle} • <span className="font-bold">{selectedTruck.plate}</span>
                  </p>
                  <p className="text-[11px] text-[#FF9800] bg-[#FF9800]/10 px-2 py-0.5 rounded-full inline-block mt-1.5 font-bold">
                    ● {selectedTruck.status}
                  </p>
                  <div className="flex gap-1 items-center mt-2 text-[10px] text-outline font-medium">
                    <MapPin size={12} />
                    <span>Última ubicación: {selectedTruck.location}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTruck(null);
                  onNavigateToView('chat');
                }}
                className="w-full mt-3 py-2 bg-primary-container hover:bg-primary text-white rounded-xl text-xs font-bold transition-all"
              >
                Escribir al Conductor
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Header Card - Custom for Role */}
      <div className="absolute top-20 left-4 right-4 z-20">
        {user.role === 'conductor' ? (
          /* DRIVER TOP CARD: SLEEK FLOATING BAR (UBER / RAPPI STYLE) */
          <div className="w-full bg-[#09152b]/90 backdrop-blur-md text-white rounded-full p-2 px-3 shadow-[0px_10px_30px_rgba(0,0,0,0.3)] border border-slate-700/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              <span className={`text-[11px] font-black uppercase truncate ${isAvailable ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isAvailable ? 'CONECTADO' : 'INACTIVO'} • <span className="text-white font-extrabold">{activePlate}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 text-xs font-black">
              <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px]">
                {todayEarnings > 0 ? '$' + todayEarnings.toLocaleString('es-CO') : '$0'}
              </span>
              <span className="text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2 py-1 rounded-full text-[11px] flex items-center gap-0.5">
                ★ {driverRating}
              </span>
            </div>
          </div>
        ) : (
          /* CLIENT TOP CARD */
          <button
            onClick={() => setShowShipmentModal(true)}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white rounded-2xl shadow-[0px_10px_35px_rgba(16,185,129,0.3)] flex items-center justify-between p-4 cursor-pointer hover:opacity-95 transition-all border border-emerald-400/40 group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-inner">
                <Truck size={22} fill="currentColor" />
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-[11px] font-black text-emerald-200 uppercase tracking-widest">
                  PANEL CLIENTE • CREAR FLETE
                </span>
                <span className="text-sm font-extrabold text-white truncate">
                  ¿A dónde enviamos tu carga hoy?
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-white text-emerald-700 rounded-xl font-black text-xs shadow-md flex-shrink-0 group-hover:bg-slate-100 anim-float-bounce">
              Solicitar Flete
            </div>
          </button>
        )}
      </div>

      {/* Bottom Floating Content - Custom for Role */}
      <div className="absolute bottom-20 left-4 right-4 z-20">
        {user.role === 'conductor' ? (
          /* DRIVER BOTTOM CARD: OFERTA DE CARGA DISPONIBLE */
          pendingTrip ? (
            <div className="bg-white rounded-2xl shadow-[0px_12px_40px_rgba(0,0,0,0.15)] p-5 border border-surface-container animate-fade-in-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  OFERTA DE CARGA DISPONIBLE
                </span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  ${pendingTrip.price.toLocaleString('es-CO')} COP
                </span>
              </div>

              {/* Client Requester Info */}
              <div className="flex items-center gap-2.5 mb-3 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                {pendingTrip.clientePhotoURL && pendingTrip.clientePhotoURL.startsWith('http') && !pendingTrip.clientePhotoURL.includes('unsplash') ? (
                  <img src={pendingTrip.clientePhotoURL} alt={pendingTrip.clienteName || 'Cliente'} className="w-8 h-8 rounded-full object-cover border border-white shadow-xs" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600 text-white font-extrabold flex items-center justify-center border border-white shadow-xs text-[10px] uppercase">
                    {(pendingTrip.clienteName || 'Cliente').split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cliente Solicitante</span>
                  <span className="text-xs font-bold text-slate-700">{pendingTrip.clienteName || 'Cliente CargoFlow'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="w-0.5 h-7 bg-slate-300 my-1" />
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                </div>
                <div className="flex flex-col justify-between h-14">
                  <span className="text-sm text-on-surface font-extrabold leading-tight">{pendingTrip.origin}</span>
                  <span className="text-sm text-on-surface font-extrabold leading-tight">{pendingTrip.destination}</span>
                </div>
              </div>

              {/* Tag & Notes inside Driver Card */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-medium text-[11px]">
                    <Truck size={12} className="text-outline" />
                    <span>{pendingTrip.vehicleType}</span>
                  </div>
                  {pendingTrip.tag && (
                    <span className="bg-surface-container-low text-on-surface-variant font-bold text-[9px] tracking-widest px-2 py-0.5 rounded-sm">
                      {pendingTrip.tag}
                    </span>
                  )}
                </div>
                {pendingTrip.notes && (
                  <div className="p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <p className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider mb-0.5">Notas</p>
                    <p className="text-[11px] text-amber-800 font-medium leading-tight">{pendingTrip.notes}</p>
                  </div>
                )}
              </div>

              {isCounterOffering ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">$</span>
                    <input 
                      type="number"
                      value={counterOfferPrice}
                      onChange={(e) => setCounterOfferPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-black text-slate-800 text-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCounterOffering(false)}
                      className="flex-1 h-[45px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs flex items-center justify-center transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        if (onCounterOfferTrip && pendingTrip) {
                          if (user.vehicles && user.vehicles.length > 1) {
                            setActionToPerform({ type: 'counter', tripId: pendingTrip.id, price: counterOfferPrice });
                            setShowVehicleSelector(true);
                          } else {
                            const plate = user.plateNumber || (user.vehicles?.[0]?.plate) || '';
                            const vtype = user.vehicleType || (user.vehicles?.[0]?.type) || '';
                            onCounterOfferTrip(pendingTrip.id, counterOfferPrice, plate, vtype);
                            alert('¡Tu contraoferta ha sido enviada al cliente!');
                            setIsCounterOffering(false);
                            onNavigateToView('activity');
                          }
                        }
                      }}
                      className="flex-1 h-[45px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center shadow-lg transition-all"
                    >
                      Enviar Oferta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (onAcceptTrip && pendingTrip) {
                        if (user.vehicles && user.vehicles.length > 1) {
                          setActionToPerform({ type: 'accept', tripId: pendingTrip.id });
                          setShowVehicleSelector(true);
                        } else {
                          const plate = user.plateNumber || (user.vehicles?.[0]?.plate) || '';
                          const vtype = user.vehicleType || (user.vehicles?.[0]?.type) || '';
                          // Show acceptance animation instead of alert
                          setAcceptedTripData(pendingTrip);
                          setShowAcceptAnimation(true);
                          onAcceptTrip(pendingTrip.id, plate, vtype);
                          animTimerRef.current = setTimeout(() => setShowAcceptAnimation(false), 2200);
                        }
                      }
                    }}
                    className="w-full h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Truck size={18} fill="currentColor" />
                    Aceptar Carga & Tomar Flete
                  </button>
                  
                  {!pendingTrip.counterOffer && (
                    <button
                      onClick={() => setIsCounterOffering(true)}
                      className="w-full h-[40px] rounded-xl bg-white border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-bold text-xs flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Proponer otro valor
                    </button>
                  )}
                  {pendingTrip.counterOffer && pendingTrip.counterOffer.conductorId === user.email && (
                    <div className="text-center text-xs font-bold text-amber-600 mt-1 bg-amber-50 p-2 rounded-lg">
                      Esperando respuesta del cliente a tu oferta de ${pendingTrip.counterOffer.price.toLocaleString('es-CO')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null
        ) : (
          /* CLIENT BOTTOM CARD: RASTREO DE ENVÍO EN CURSO */
          (() => {
            const clientActiveTrip = (trips || []).find(t => t.clienteId === user.email && (t.status === 'EN CAMINO' || t.status === 'PENDIENTE'));

            if (!clientActiveTrip) {
              return null;
            }

            return (
              <div className="bg-white rounded-2xl shadow-[0px_12px_40px_rgba(0,0,0,0.12)] p-5 border border-surface-container">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-primary-container uppercase tracking-widest flex items-center gap-1.5">
                    <History className="text-primary-container" size={16} />
                    MI ENVÍO EN CURSO (#{clientActiveTrip.id})
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    clientActiveTrip.status === 'EN CAMINO' ? 'text-blue-700 bg-blue-100' : 'text-amber-700 bg-amber-100'
                  }`}>
                    ● {clientActiveTrip.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <div className="w-0.5 h-7 bg-slate-300 my-1" />
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  </div>
                  <div className="flex flex-col justify-between h-14 min-w-0 flex-1">
                    <span className="text-sm text-on-surface font-extrabold leading-tight truncate">Origen: {clientActiveTrip.origin}</span>
                    <span className="text-sm text-on-surface font-extrabold leading-tight truncate">Destino: {clientActiveTrip.destination}</span>
                  </div>
                </div>

                 {clientActiveTrip.conductorName && (() => {
                  const conductorUser = usersList.find(u => u.email === clientActiveTrip.conductorId);
                  const displayPhoto = conductorUser?.photoURL || clientActiveTrip.conductorPhotoURL;
                  const displayName = conductorUser?.name || clientActiveTrip.conductorName;

                  return (
                    <div className="mb-3 p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                      {renderAvatar(displayPhoto, displayName, "w-8 h-8 text-[10px]")}
                      <div className="flex flex-col text-xs min-w-0 flex-1">
                        <span className="font-bold text-slate-700 truncate">{displayName}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{clientActiveTrip.conductorVehicleType || clientActiveTrip.vehicleType} • {clientActiveTrip.conductorPlate || 'Placa asignada'}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onNavigateToView('activity')}
                    className="h-[46px] rounded-xl border-2 border-primary-container text-primary-container hover:bg-blue-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={15} />
                    Ver Detalle
                  </button>
                  <button
                    onClick={() => onNavigateToView('chat')}
                    className="h-[46px] rounded-xl bg-primary-container text-white hover:bg-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    <Truck size={15} fill="currentColor" />
                    Contactar Conductor
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* CREATE SHIPMENT MODAL / VIEW */}
      <AnimatePresence>
        {showShipmentModal && (
          <div 
            className="fixed inset-0 z-[300] backdrop-blur-md bg-black/60 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 overflow-y-auto"
            onClick={() => setShowShipmentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar border border-slate-200 my-auto relative z-10"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingTrip ? 'Editar Flete' : 'Nuevo Despacho'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Publicar solicitud de carga</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShipmentModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateShipmentSubmit} className="flex flex-col gap-5">
                {/* ── ORIGEN ────────────────────────────────────────── */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-600" />
                      Origen de la Carga
                    </label>
                    <button
                      type="button"
                      onClick={handleGetGpsOrigin}
                      disabled={isLocatingGps}
                      className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <Crosshair size={12} className={isLocatingGps ? 'animate-spin' : ''} />
                      <span>{isLocatingGps ? 'Ubicando...' : '🎯 Usar GPS'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribe o selecciona dirección de origen"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full h-12 pl-4 pr-10 bg-slate-50 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white font-bold text-slate-800 transition-all shadow-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowOriginCatalog(!showOriginCatalog);
                        setShowDestCatalog(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                      title="Ver puntos logísticos de origen"
                    >
                      <Map size={18} />
                    </button>
                  </div>

                  {/* Quick Chips for Origen */}
                  <div className="flex gap-1.5 flex-wrap">
                    {['Medellín, ANT', 'Bogotá, D.C.', 'Rionegro, ANT', 'Itagüí, ANT'].map((loc) => (
                      <button
                        key={`orig-${loc}`}
                        type="button"
                        onClick={() => setOrigin(loc)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          origin === loc 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        📍 {loc}
                      </button>
                    ))}
                  </div>

                  {/* Origin Logistics Catalog Dropdown */}
                  <AnimatePresence>
                    {showOriginCatalog && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-700 shadow-xl overflow-hidden flex flex-col gap-1 mt-1"
                      >
                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider mb-1">Puntos Logísticos de Carga (Catálogo)</p>
                        <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1">
                          {COLOMBIA_LOGISTICS_PLACES.map((place) => (
                            <button
                              key={`orig-cat-${place.id}`}
                              type="button"
                              onClick={() => {
                                setOrigin(place.title);
                                setShowOriginCatalog(false);
                              }}
                              className="w-full text-left p-2 hover:bg-slate-800 rounded-xl transition-colors flex flex-col cursor-pointer"
                            >
                              <span className="text-xs font-bold text-white">{place.title}</span>
                              <span className="text-[10px] text-slate-400 truncate">{place.address}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── DESTINO ────────────────────────────────────────── */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={14} className="text-blue-600" />
                      Destino de la Carga
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDestCatalog(!showDestCatalog);
                        setShowOriginCatalog(false);
                      }}
                      className="text-[11px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <Map size={12} />
                      <span>🗺️ Puntos Entrega</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribe o selecciona dirección de destino"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full h-12 pl-4 pr-10 bg-slate-50 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white font-bold text-slate-800 transition-all shadow-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowDestCatalog(!showDestCatalog);
                        setShowOriginCatalog(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Ver puntos logísticos de destino"
                    >
                      <Map size={18} />
                    </button>
                  </div>

                  {/* Quick Chips for Destino */}
                  <div className="flex gap-1.5 flex-wrap">
                    {['Medellín, ANT', 'Bogotá, D.C.', 'Cali, VAL', 'Barranquilla, ATL', 'Bucaramanga, SAN'].map((loc) => (
                      <button
                        key={`dest-${loc}`}
                        type="button"
                        onClick={() => setDestination(loc)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          destination === loc 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        🏁 {loc}
                      </button>
                    ))}
                  </div>

                  {/* Destination Logistics Catalog Dropdown */}
                  <AnimatePresence>
                    {showDestCatalog && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-700 shadow-xl overflow-hidden flex flex-col gap-1 mt-1"
                      >
                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-wider mb-1">Puntos Logísticos de Entrega (Catálogo)</p>
                        <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1">
                          {COLOMBIA_LOGISTICS_PLACES.map((place) => (
                            <button
                              key={`dest-cat-${place.id}`}
                              type="button"
                              onClick={() => {
                                setDestination(place.title);
                                setShowDestCatalog(false);
                              }}
                              className="w-full text-left p-2 hover:bg-slate-800 rounded-xl transition-colors flex flex-col cursor-pointer"
                            >
                              <span className="text-xs font-bold text-white">{place.title}</span>
                              <span className="text-[10px] text-slate-400 truncate">{place.address}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tipo de Carga */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Tipo de Mercancía</label>
                  <select
                    value={cargoType}
                    onChange={(e) => setCargoType(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm focus:outline-none focus:border-primary-container font-semibold"
                  >
                    <option value="Alimentos">Alimentos / Perecederos</option>
                    <option value="Tecnología">Electrónicos / Tecnología</option>
                    <option value="Medicinas">Medicamentos / Salud</option>
                    <option value="Materiales">Materiales de Construcción</option>
                    <option value="General">Carga General / Enseres</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Vehiculo */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Vehículo</label>
                    <select
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm focus:outline-none focus:border-primary-container font-semibold"
                    >
                      <option value="Tractomula">Tractomula</option>
                      <option value="Camión Sencillo">Camión Sencillo</option>
                      <option value="Furgón Mediano">Furgón Mediano</option>
                      <option value="Doble Troque">Doble Troque</option>
                      <option value="Cuatro Manos">Cuatro Manos</option>
                      <option value="Minimula">Minimula</option>
                      <option value="Refrigerado">Refrigerado</option>
                      <option value="Cama Baja">Cama Baja</option>
                      <option value="Grúa Planchón">Grúa Planchón</option>
                      <option value="Niñera">Niñera</option>
                      <option value="Motocarguera">Motocarguera</option>
                      <option value="Volqueta">Volqueta</option>
                      <option value="Jaula">Jaula</option>
                      <option value="Camioneta">Camioneta (Pick-up)</option>
                      <option value="Moto con coche">Moto con coche</option>
                    </select>
                  </div>

                  {/* Especialidades */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Especialidad</label>
                    <select
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm focus:outline-none focus:border-primary-container font-semibold"
                    >
                      <option value="">Ninguna</option>
                      <option value="REFRIGERADO">REFRIGERADO</option>
                      <option value="FRÁGIL">FRÁGIL</option>
                      <option value="LÍQUIDOS">LÍQUIDOS</option>
                      <option value="QUÍMICOS">QUÍMICOS</option>
                      <option value="SOBREDIMENSIONADA">SOBREDIMENSIONADA</option>
                      <option value="ANIMALES VIVOS">ANIMALES VIVOS</option>
                      <option value="VALORES">VALORES</option>
                    </select>
                  </div>
                </div>

                {/* Notas / Observaciones */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Notas / Observaciones (Opcional)</label>
                  <textarea
                    placeholder="Ej. Entregar en la puerta 3, cuidado con el perro..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-20 p-3 bg-surface rounded-xl border border-outline-variant text-sm focus:outline-none focus:border-primary-container font-semibold resize-none"
                  />
                </div>

                {/* Precio Deseado */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Flete Ofrecido (COP)</label>
                    <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
                      <span className="text-sm font-extrabold text-primary-container pl-2">$</span>
                      <input 
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(Number(e.target.value))}
                        className="w-24 bg-transparent text-sm font-extrabold text-primary-container outline-none focus:ring-0"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="5000000"
                    step="50000"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary-container mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-outline font-medium mt-1">
                    <span>$100k</span>
                    <span>Medio</span>
                    <span>$5M</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 bg-primary-container hover:bg-primary text-white font-bold rounded-xl mt-4 flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {editingTrip ? (
                    <>Guardar Cambios</>
                  ) : (
                    <>
                      <Truck size={18} fill="currentColor" />
                      Publicar Despacho
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VEHICLE SELECTION MODAL FOR TRIP ASSIGNMENT */}
      <AnimatePresence>
        {showVehicleSelector && actionToPerform && (
          <div className="fixed inset-0 bg-black/60 z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-[#0b224d]">Asignar Vehículo</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Selecciona el camión para este viaje</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setShowVehicleSelector(false);
                    setActionToPerform(null);
                  }} 
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
                {(user.vehicles || []).map((vh) => (
                  <button
                    key={vh.id}
                    type="button"
                    onClick={() => {
                      if (actionToPerform.type === 'accept') {
                        if (onAcceptTrip) {
                          onAcceptTrip(actionToPerform.tripId, vh.plate, vh.type);
                        }
                        if (pendingTrip) {
                          setAcceptedTripData(pendingTrip);
                          setShowAcceptAnimation(true);
                          animTimerRef.current = setTimeout(() => setShowAcceptAnimation(false), 2200);
                        }
                      } else {
                        if (onCounterOfferTrip && actionToPerform.price) {
                          onCounterOfferTrip(actionToPerform.tripId, actionToPerform.price, vh.plate, vh.type);
                        }
                      }
                      setShowVehicleSelector(false);
                      setActionToPerform(null);
                    }}
                    className="w-full p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 hover:border-[#0b224d]/30 text-left transition-all flex justify-between items-center group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0b224d]/5 text-[#0b224d] rounded-lg group-hover:bg-[#0b224d] group-hover:text-white transition-colors">
                        <Truck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-on-surface">{vh.type}</p>
                        {vh.model && <p className="text-[9px] text-slate-400 font-bold">Mod. {vh.model}</p>}
                      </div>
                    </div>
                    <span className="text-xs font-black bg-white px-2.5 py-1 border border-slate-200 rounded-md tracking-wider text-[#0b224d] group-hover:bg-[#0b224d] group-hover:text-white group-hover:border-transparent transition-all">
                      {vh.plate}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowVehicleSelector(false);
                  setActionToPerform(null);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ACCEPTANCE ANIMATION OVERLAY ───────────────────────────── */}
      <AnimatePresence>
        {showAcceptAnimation && acceptedTripData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#09152b] via-[#0b224d] to-[#041029] select-none"
          >
            {/* Scanlines */}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]" />

            {/* Ambient glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />

            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 0.1 }}
              className="flex flex-col items-center gap-5 relative z-10"
            >
              {/* Truck icon with check */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center">
                  <Truck size={48} className="text-white" fill="currentColor" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', damping: 15 }}
                  className="absolute -bottom-1 -right-1 w-9 h-9 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg"
                >
                  <CheckCircle2 size={20} className="text-white" />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.3em] mb-1">¡Servicio Aceptado!</p>
                <h2 className="text-white text-2xl font-black tracking-tight">${acceptedTripData.price.toLocaleString('es-CO')}</h2>
                <p className="text-slate-400 text-xs font-semibold mt-2">
                  {acceptedTripData.origin} → {acceptedTripData.destination}
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: 0.8, duration: 1.2, repeat: Infinity }}
                className="text-slate-400 text-[11px] font-bold uppercase tracking-widest"
              >
                Calculando ruta...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE NAVIGATION MODE (conductor with EN CAMINO trip) ─── */}
      <AnimatePresence>
        {activeTrip && !showAcceptAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-[#09152b]"
          >
            {/* Map fullscreen */}
            <div className="absolute inset-0 z-0">
              <HybridMapContainer className="!rounded-none" initialHeight="h-full" />
            </div>

            {/* Top minimal header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe pt-3 pb-3 bg-gradient-to-b from-[#09152b]/90 to-transparent">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-white" fill="currentColor" />
                <span className="text-white font-black text-sm tracking-tight">CargoFlow</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Rate reminder badge */}
                {showRatingReminder && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => onNavigateToView('activity')}
                    className="flex items-center gap-1.5 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg cursor-pointer"
                  >
                    <Star size={11} fill="currentColor" />
                    Calificar viaje
                  </motion.button>
                )}
                <button
                  onClick={() => onNavigateToView('chat')}
                  className="w-9 h-9 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/20 cursor-pointer"
                >
                  <Phone size={16} />
                </button>
              </div>
            </div>

            {/* Trip info card — top floating */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute top-16 left-3 right-3 z-10"
            >
              <div className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-md ${
                tripPhase === 'cargue'
                  ? 'bg-[#09152b]/95 border-blue-500/30'
                  : 'bg-emerald-900/95 border-emerald-400/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tripPhase === 'cargue' ? 'bg-blue-500/20' : 'bg-emerald-500/20'
                  }`}>
                    {tripPhase === 'cargue'
                      ? <MapPinned size={20} className="text-blue-300" />
                      : <Flag size={20} className="text-emerald-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                      tripPhase === 'cargue' ? 'text-blue-400' : 'text-emerald-400'
                    }`}>
                      {tripPhase === 'cargue' ? '📦 FASE 1 — IR AL CARGUE' : '🏁 FASE 2 — ENTREGAR'}
                    </p>
                    <p className="text-white font-black text-sm truncate">
                      {tripPhase === 'cargue' ? activeTrip.origin : activeTrip.destination}
                    </p>
                    <p className="text-slate-400 text-[11px] font-medium truncate">
                      #{activeTrip.id} • {activeTrip.vehicleType}
                      {activeTrip.tag && ` • ${activeTrip.tag}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-black text-sm">${activeTrip.price.toLocaleString('es-CO')}</p>
                    <p className="text-slate-400 text-[10px] font-semibold">COP</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bottom action bar */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#09152b] via-[#09152b]/95 to-transparent px-4 pt-8 pb-8"
            >
              {/* Route info row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Navigation2 size={14} className="text-blue-400" />
                  <span className="text-xs font-bold">Calculando ruta automáticamente...</span>
                </div>
              </div>

              {/* Phase action buttons */}
              {tripPhase === 'cargue' ? (
                <button
                  onClick={() => setTripPhase('descargue')}
                  className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <PackageCheck size={22} />
                  He llegado al punto de Cargue ✓
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Complete the trip
                    onNavigateToView('activity');
                    setShowRatingReminder(true);
                    setTimeout(() => setShowRatingReminder(false), 30000);
                  }}
                  className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Flag size={22} />
                  Entregar y Finalizar Servicio 🏁
                </button>
              )}

              {/* Cancel/View detail small link */}
              <button
                onClick={() => onNavigateToView('activity')}
                className="w-full mt-3 text-slate-500 text-xs font-bold text-center py-1 cursor-pointer hover:text-slate-300 transition-colors"
              >
                Ver detalle del viaje
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
