import { useState } from 'react';
import { Truck, MapPin, Eye, MessageSquare, User } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile, Trip } from '../types';

interface ActivityProps {
  user: UserProfile;
  trips: Trip[];
  usersList?: UserProfile[];
  onNavigateToChat: (trip?: Trip) => void;
  onCancelTrip: (tripId: string) => void;
  onEditTrip?: (trip: Trip) => void;
  onResolveCounterOffer?: (tripId: string, accept: boolean) => void;
  onCompleteTrip?: (trip: Trip) => void;
  onOpenRating?: (trip: Trip) => void;
}

export default function Activity({ user, trips, usersList = [], onNavigateToChat, onCancelTrip, onEditTrip, onResolveCounterOffer, onCompleteTrip, onOpenRating }: ActivityProps) {
  const [filter, setFilter] = useState<'activos' | 'historial'>('activos');

  // Filter trips based on selection and user role permissions
  const filteredTrips = trips.filter((trip) => {
    // 1. Role-based visibility check
    if (user.role === 'conductor') {
      const isAssignedToMe = trip.conductorId === user.email;
      const isPending = trip.status === 'PENDIENTE';
      if (!isPending && !isAssignedToMe) return false;
    }
    // Admin sees everything, Client only gets their own trips from Firestore anyway.

    // 2. Tab filter check
    if (filter === 'activos') {
      return trip.status === 'EN CAMINO' || trip.status === 'PENDIENTE';
    } else {
      return trip.status === 'COMPLETADO';
    }
  });

  const renderAvatar = (photoURL?: string, name?: string, sizeClass = "w-10 h-10 text-xs") => {
    if (photoURL && photoURL.startsWith('http') && !photoURL.includes('unsplash')) {
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

  return (
    <div className="bg-background min-h-screen pt-20">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm flex items-center justify-between px-6 h-16">
        <button className="text-primary-container p-2 -ml-2 rounded-full hover:bg-surface-container transition-colors">
          <Truck size={24} fill="currentColor" />
        </button>
        <h1 className="text-xl font-black text-primary-container tracking-tight">CargoFlow</h1>
        <div className="w-9 h-9 rounded-full overflow-hidden border border-surface-container">
          <img
            alt="Profile Avatar"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbr_Tmwf_quiZEewMYi9pnva_unlJ7hkWZKvWCXD8j7F1nM2xZGJ_dWOqjzbyR_rtWI12sF26VSy8f6FzbS_9ULOdd7CePKg175BzGSIG9FlCqZYclEyZA2DYQ1N9NDTkg31_XYb8CZO6HaAyD3rmcH2God7g4E3lILm8rFgx16vGqWdy6k9xDM4RJt7sVRJSiuAcMdqR0u51DtO3MbLRQvMN8EyKPLHtXasdhdN-cRcOdjfI9ngSi"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between pt-4">
          <h2 className="text-2xl font-extrabold text-on-surface">Actividad</h2>
          <div className="flex space-x-2 bg-surface-container p-1 rounded-full border border-surface-container-high">
            <button
              onClick={() => setFilter('activos')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === 'activos'
                  ? 'bg-white text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFilter('historial')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === 'historial'
                  ? 'bg-white text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Historial
            </button>
          </div>
        </div>

        {/* Trips List */}
        <div className="flex flex-col gap-4">
          {filteredTrips.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-surface-container p-6">
              <Truck size={48} className="mx-auto text-outline-variant mb-4" strokeWidth={1.2} />
              <p className="text-sm font-bold text-on-surface">No hay despachos en esta sección</p>
              <p className="text-xs text-outline mt-1">
                Crea un nuevo despacho pulsando en la barra de búsqueda en el mapa.
              </p>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const isActive = trip.status === 'EN CAMINO' || trip.status === 'PENDIENTE';
              return (
                <motion.div
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.03)] p-5 border border-surface-container flex flex-col gap-4 transition-all ${
                    !isActive ? 'opacity-75 hover:opacity-90' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`inline-block font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-sm mb-2 uppercase ${
                          trip.status === 'EN CAMINO'
                            ? 'bg-blue-100 text-primary-container'
                            : trip.status === 'PENDIENTE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        {trip.status}
                      </span>
                      <p className="text-xs font-bold text-on-surface-variant">ID: {trip.id}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          trip.status === 'EN CAMINO' ? 'text-[#FF9800]' : 'text-on-surface'
                        }`}
                      >
                        ${trip.price.toLocaleString('es-CO')}
                      </p>
                      <p className="text-[11px] font-medium text-on-surface-variant">{trip.date}</p>
                    </div>
                  </div>

                  {/* Route Timeline */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-primary-container' : 'bg-outline'}`} />
                      <div className="w-0.5 h-10 bg-outline-variant" />
                      <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-[#FF9800]' : 'bg-outline'}`} />
                    </div>
                    <div className="flex-1 flex flex-col justify-between h-16 py-0.5">
                      <div>
                        <p className="text-sm font-bold text-on-surface leading-tight">{trip.origin}</p>
                        {trip.originDetail && (
                          <p className="text-[11px] text-on-surface-variant font-medium">{trip.originDetail}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface leading-tight">{trip.destination}</p>
                        {trip.destinationDetail && (
                          <p className="text-[11px] text-on-surface-variant font-medium">{trip.destinationDetail}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {trip.notes && (
                    <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                      <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider mb-1">Notas del cliente</p>
                      <p className="text-xs text-amber-800 font-medium">{trip.notes}</p>
                    </div>
                  )}

                  {/* Participant Info Section (Client or Driver Details) */}
                  {(() => {
                    const conductorUser = usersList.find(u => u.email === trip.conductorId);
                    const conductorPhoto = conductorUser?.photoURL || trip.conductorPhotoURL;
                    const conductorName = conductorUser?.name || trip.conductorName || 'Conductor CargoFlow';

                    const clienteUser = usersList.find(u => u.email === trip.clienteId);
                    const clientePhoto = clienteUser?.photoURL || trip.clientePhotoURL;
                    const clienteName = clienteUser?.name || trip.clienteName || 'Cliente CargoFlow';

                    // 1. Admin special double-column overview
                    if (user.role === 'admin') {
                      return (
                        <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Detalles de Participantes (Panel Admin)</p>
                          <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                            {/* Cliente column */}
                            <div className="flex items-center gap-2 min-w-0">
                              {renderAvatar(clientePhoto || undefined, clienteName, "w-8 h-8 text-xs")}
                              <div className="min-w-0">
                                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Cliente</p>
                                <p className="text-[11px] font-bold text-slate-700 truncate">{clienteName}</p>
                              </div>
                            </div>

                            {/* Conductor column */}
                            <div className="flex items-center gap-2 pl-3 min-w-0">
                              {trip.status === 'PENDIENTE' ? (
                                <div className="min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Conductor</p>
                                  <p className="text-[11px] text-slate-400 italic font-medium truncate">Buscando conductor...</p>
                                </div>
                              ) : (
                                <>
                                  {renderAvatar(conductorPhoto || undefined, conductorName, "w-8 h-8 text-xs")}
                                  <div className="min-w-0">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Conductor</p>
                                    <p className="text-[11px] font-bold text-slate-700 truncate">{conductorName}</p>
                                    {trip.conductorPlate && (
                                      <p className="text-[9px] text-slate-500 font-extrabold truncate">Placa: {trip.conductorPlate}</p>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // 2. Normal roles (only if not pending)
                    if (trip.status === 'PENDIENTE') return null;

                    return (
                      <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                        {user.email === trip.clienteId ? (
                          <>
                            {renderAvatar(conductorPhoto || (trip.conductorId === user.email ? user.photoURL : undefined), conductorName, "w-10 h-10 text-xs")}
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Conductor Asignado</p>
                              <p className="text-xs font-bold text-slate-700">{conductorName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {(trip.conductorPlate || user.plateNumber) && (
                                  <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    Placa: {trip.conductorPlate || user.plateNumber}
                                  </span>
                                )}
                                {trip.conductorVehicleType && <span className="text-[10px] text-slate-500 font-medium truncate">{trip.conductorVehicleType}</span>}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {renderAvatar(clientePhoto || (trip.clienteId === user.email ? user.photoURL : undefined), clienteName, "w-10 h-10 text-xs")}
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cliente Solicitante</p>
                              <p className="text-xs font-bold text-slate-700">{clienteName}</p>
                              {(trip.conductorPlate || user.plateNumber) && (
                                <div className="mt-1">
                                  <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    Placa Asignada: {trip.conductorPlate || user.plateNumber}
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Card Footer with details */}
                  <div className="pt-4 border-t border-surface-container-high flex justify-between items-center">
                    <div className="flex items-center gap-2 text-on-surface-variant font-medium text-xs flex-wrap">
                      <Truck size={14} className="text-outline" />
                      <span>{trip.vehicleType}</span>
                      {(trip.conductorPlate || user.plateNumber) && (
                        <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Placa: {trip.conductorPlate || user.plateNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {trip.tag && (
                        <span className="bg-surface-container-low text-on-surface-variant font-bold text-[9px] tracking-widest px-2.5 py-1 rounded-sm">
                          {trip.tag}
                        </span>
                      )}
                      {isActive ? (
                        <>
                          {(trip.status === 'PENDIENTE' && trip.clienteId === user.email) ? (
                            <div className="flex gap-2">
                              {onEditTrip && (
                                <button
                                  onClick={() => onEditTrip(trip)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                                >
                                  Editar
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (window.confirm('¿Estás seguro de que deseas cancelar esta solicitud?')) {
                                    onCancelTrip(trip.id);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-error bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            trip.status === 'EN CAMINO' && (
                              <div className="flex gap-2 items-center">
                                <button
                                  onClick={() => onNavigateToChat(trip)}
                                  className="w-9 h-9 rounded-xl border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Chatear"
                                >
                                  <MessageSquare size={18} />
                                </button>
                                {onCompleteTrip && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm('¿Deseas dar por finalizado este servicio de flete?')) {
                                        onCompleteTrip(trip);
                                      }
                                    }}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                  >
                                    ✓ Finalizar
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </>
                      ) : (
                        /* Completed Trip Rating Status */
                        (() => {
                          const isClient = user.email === trip.clienteId;
                          const needsRating = isClient ? !trip.ratedByCliente : !trip.ratedByConductor;
                          const myRating = isClient ? trip.clienteRating : trip.conductorRating;

                          return needsRating ? (
                            <button
                              onClick={() => onOpenRating && onOpenRating(trip)}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer animate-pulse"
                            >
                              ⭐ Calificar {isClient ? 'Conductor' : 'Cliente'}
                            </button>
                          ) : (
                            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                              ✓ Calificado ({myRating?.stars || 5}★)
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  {/* Counter Offer UI */}
                  {trip.status === 'PENDIENTE' && trip.counterOffer && user.role === 'cliente' && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="text-xs text-amber-800 font-medium mb-2">
                        El conductor <span className="font-bold">{trip.counterOffer.conductorName}</span> propone llevar tu carga por:
                      </div>
                      <div className="text-lg font-black text-amber-700 mb-3">
                        ${trip.counterOffer.price.toLocaleString('es-CO')} COP
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onResolveCounterOffer?.(trip.id, false)}
                          className="flex-1 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => onResolveCounterOffer?.(trip.id, true)}
                          className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 shadow-sm transition-colors"
                        >
                          Aceptar Oferta
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
          <div className="h-1" aria-hidden="true" />
        </div>
      </main>
    </div>
  );
}
