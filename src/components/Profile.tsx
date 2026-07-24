import React, { useState, useEffect } from 'react';
import { 
  Edit2, Star, Plus, CreditCard, HelpCircle, Settings, LogOut, 
  Check, X, Truck, FileText, Camera, Calendar, AlertCircle, 
  Trash2, CheckCircle2, Eye, Image, UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Vehicle, Trip } from '../types';

interface ProfileProps {
  user: UserProfile;
  trips: Trip[];
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onDeposit: (amount: number) => void;
  onLogout: () => void;
  onNavigateToSettings: () => void;
}

// Client-side image compression helper (zero cost, saves directly to Firestore as Base64)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        // Limit coordinates to 800px for optimal Firestore size footprint
        const maxCoord = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxCoord || h > maxCoord) {
          if (w > h) {
            h = Math.round((h * maxCoord) / w);
            w = maxCoord;
          } else {
            w = Math.round((w * maxCoord) / h);
            h = maxCoord;
          }
        }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.60);
        resolve(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// Document validity helper
const getDocValidity = (expiryDate?: string, photo?: string) => {
  if (!expiryDate || !photo) {
    return {
      label: 'Pendiente',
      bgColor: 'bg-red-50 text-red-700 border-red-100',
      dotColor: 'bg-red-500',
      isValid: false
    };
  }
  const today = new Date();
  today.setHours(0,0,0,0);
  const exp = new Date(expiryDate);
  exp.setHours(0,0,0,0);

  if (exp < today) {
    return {
      label: 'Vencido',
      bgColor: 'bg-red-50 text-red-700 border-red-100',
      dotColor: 'bg-red-500',
      isValid: false
    };
  }

  // Check if expiring in next 30 days
  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) {
    return {
      label: `Vence en ${diffDays} d.`,
      bgColor: 'bg-amber-50 text-amber-700 border-amber-100',
      dotColor: 'bg-amber-500',
      isValid: true
    };
  }

  return {
    label: 'Vigente',
    bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    dotColor: 'bg-emerald-500',
    isValid: true
  };
};

export default function Profile({ user, trips, onUpdateProfile, onDeposit, onLogout, onNavigateToSettings }: ProfileProps) {
  // Calculate rating statistics
  const getRatingStats = () => {
    let ratedTrips = [];
    if (user.role === 'conductor') {
      ratedTrips = trips.filter(t => t.conductorId === user.email && t.ratedByCliente && t.clienteRating);
      const totalStars = ratedTrips.reduce((acc, t) => acc + (t.clienteRating?.stars || 0), 0);
      return { count: ratedTrips.length, totalStars };
    } else if (user.role === 'cliente') {
      ratedTrips = trips.filter(t => t.clienteId === user.email && t.ratedByConductor && t.conductorRating);
      const totalStars = ratedTrips.reduce((acc, t) => acc + (t.conductorRating?.stars || 0), 0);
      return { count: ratedTrips.length, totalStars };
    }
    return { count: 0, totalStars: 0 };
  };

  const ratingStats = getRatingStats();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('200000');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [editCedula, setEditCedula] = useState(user.cedulaNumber || '');

  // Keep edit state synced with user updates
  useEffect(() => {
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditCedula(user.cedulaNumber || '');
  }, [user]);

  // Google avatar load error helper
  const [photoError, setPhotoError] = useState(false);

  // Document photo viewer modal state
  const [viewDocPhoto, setViewDocPhoto] = useState<string | null>(null);
  const [viewDocTitle, setViewDocTitle] = useState<string>('');

  // Personal ID Card (Cédula) Modal State
  const [showCedulaModal, setShowCedulaModal] = useState(false);
  const [cedulaNumber, setCedulaNumber] = useState(user.cedulaNumber || '');
  const [cedulaPhoto, setCedulaPhoto] = useState<string | null>(user.cedulaPhoto || null);
  const [uploadingCedula, setUploadingCedula] = useState(false);

  // Driver License Update Modal State
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseExpiry, setLicenseExpiry] = useState(user.licenseExpiry || '');
  const [licensePhoto, setLicensePhoto] = useState<string | null>(user.licensePhoto || null);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  // Add Vehicle Modal State
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState('Furgón');
  const [newModel, setNewModel] = useState('');
  const [newSoatExpiry, setNewSoatExpiry] = useState('');
  const [newSoatPhoto, setNewSoatPhoto] = useState<string | null>(null);
  const [newTecnoExpiry, setNewTecnoExpiry] = useState('');
  const [newTecnoPhoto, setNewTecnoPhoto] = useState<string | null>(null);
  const [newPropiedadNumber, setNewPropiedadNumber] = useState('');
  const [newPropiedadPhoto, setNewPropiedadPhoto] = useState<string | null>(null);
  const [uploadingSoat, setUploadingSoat] = useState(false);
  const [uploadingTecno, setUploadingTecno] = useState(false);
  const [uploadingPropiedad, setUploadingPropiedad] = useState(false);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (!isNaN(amt) && amt > 0) {
      onDeposit(amt);
      setShowDepositModal(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim()) {
      onUpdateProfile({
        name: editName,
        phone: editPhone,
        cedulaNumber: editCedula,
      });
      setShowEditModal(false);
    }
  };

  // Upload/Compress Cédula
  const handleCedulaPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingCedula(true);
      try {
        const base64 = await compressImage(file);
        setCedulaPhoto(base64);
      } catch (err) {
        console.error('Cedula upload compression error:', err);
      } finally {
        setUploadingCedula(false);
      }
    }
  };

  const handleCedulaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      cedulaNumber,
      cedulaPhoto: cedulaPhoto || undefined
    });
    setShowCedulaModal(false);
  };

  // Upload/Compress License File
  const handleLicensePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingLicense(true);
      try {
        const base64 = await compressImage(file);
        setLicensePhoto(base64);
      } catch (err) {
        console.error('License upload compression error:', err);
      } finally {
        setUploadingLicense(false);
      }
    }
  };

  const handleLicenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      licenseExpiry,
      licensePhoto: licensePhoto || undefined
    });
    setShowLicenseModal(false);
  };

  // Upload/Compress SOAT File
  const handleSoatPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingSoat(true);
      try {
        const base64 = await compressImage(file);
        setNewSoatPhoto(base64);
      } catch (err) {
        console.error('SOAT upload compression error:', err);
      } finally {
        setUploadingSoat(false);
      }
    }
  };

  // Upload/Compress Tecno File
  const handleTecnoPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingTecno(true);
      try {
        const base64 = await compressImage(file);
        setNewTecnoPhoto(base64);
      } catch (err) {
        console.error('Tecno upload compression error:', err);
      } finally {
        setUploadingTecno(false);
      }
    }
  };

  // Upload/Compress Tarjeta de Propiedad File
  const handlePropiedadPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingPropiedad(true);
      try {
        const base64 = await compressImage(file);
        setNewPropiedadPhoto(base64);
      } catch (err) {
        console.error('Propiedad upload compression error:', err);
      } finally {
        setUploadingPropiedad(false);
      }
    }
  };

  // Create new Vehicle item
  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) return;

    const formattedPlate = newPlate.toUpperCase().trim();
    const newVehicleItem: Vehicle = {
      id: `vh-${Date.now()}`,
      plate: formattedPlate,
      type: newType,
      model: newModel || undefined,
      soatExpiry: newSoatExpiry || undefined,
      soatPhoto: newSoatPhoto || undefined,
      tecnomecanicaExpiry: newTecnoExpiry || undefined,
      tecnomecanicaPhoto: newTecnoPhoto || undefined,
      propiedadPhoto: newPropiedadPhoto || undefined,
      propiedadNumber: newPropiedadNumber || undefined,
    };

    const currentVehicles = user.vehicles || [];
    const isFirst = currentVehicles.length === 0;

    onUpdateProfile({
      vehicles: [...currentVehicles, newVehicleItem],
      // If it's the first vehicle, set it as default in profile values
      plateNumber: isFirst ? formattedPlate : user.plateNumber,
      vehicleType: isFirst ? newType : user.vehicleType
    });

    // Reset Form state
    setNewPlate('');
    setNewType('Furgón');
    setNewModel('');
    setNewSoatExpiry('');
    setNewSoatPhoto(null);
    setNewTecnoExpiry('');
    setNewTecnoPhoto(null);
    setNewPropiedadNumber('');
    setNewPropiedadPhoto(null);
    setShowAddVehicleModal(false);
  };

  return (
    <div className="bg-background min-h-screen pt-20 font-sans antialiased">
      <main className="px-6 max-w-lg mx-auto flex flex-col gap-6">
        
        {/* Profile Header Section */}
        <section className="flex flex-col items-center justify-center pt-6 pb-4">
          <div className="relative">
            {user.photoURL && !photoError ? (
              <img
                className="w-24 h-24 rounded-full object-cover shadow-[0px_4px_20px_rgba(0,0,0,0.08)] ring-4 ring-white"
                alt=""
                src={user.photoURL}
                onError={() => setPhotoError(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md ring-4 ring-white uppercase">
                {(user.name || 'Usuario').split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
            )}
            <button 
              onClick={() => setShowEditModal(true)}
              className="absolute bottom-0 right-0 bg-primary-container text-white rounded-full p-2 shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              <Edit2 size={12} strokeWidth={2.5} />
            </button>
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-on-surface tracking-tight text-center">{user.name}</h1>
          
          <div className="flex items-center gap-2 mt-1.5 px-3 py-1 bg-surface-container-high rounded-full border border-surface-container-highest">
            <span className="text-xs font-bold text-on-surface-variant capitalize">
              {user.role === 'admin' ? 'Administrador' : user.role === 'conductor' ? 'Conductor Verificado' : 'Cliente VIP'}
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <Star size={12} className="text-amber-500" fill="currentColor" />
            <span className="text-xs font-bold text-on-surface">
              {ratingStats.totalStars || (user.rating ? Math.round(user.rating * (ratingStats.count || 1)) : 5)}★ en {ratingStats.count || 1} { (ratingStats.count || 1) === 1 ? 'viaje' : 'viajes' }
            </span>
          </div>

          <button 
            onClick={() => setShowEditModal(true)}
            className="mt-5 px-6 py-2.5 rounded-xl border-2 border-primary-container text-primary-container hover:bg-primary-container hover:text-white font-bold text-xs active:scale-95 transition-all w-full sm:w-auto cursor-pointer flex items-center justify-center gap-1.5"
          >
            Editar Perfil
          </button>
        </section>

        {/* Wallet / Billetera Bento Card */}
        <section className="mb-2">
          <div className="bg-primary-container text-white rounded-2xl p-6 shadow-[0px_8px_30px_rgba(30,94,255,0.12)] relative overflow-hidden">
            {/* Decorative blurs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="text-[11px] font-bold text-blue-100 uppercase tracking-wider mb-1">
                  Saldo Disponible
                </p>
                <p className="text-3xl font-black tracking-tight">
                  $ {user.balance.toLocaleString('es-CO')} <span className="text-sm font-semibold text-blue-100 opacity-90 ml-1">COP</span>
                </p>
              </div>
              <button 
                onClick={() => setShowDepositModal(true)}
                className="bg-white text-primary-container rounded-full p-2.5 hover:bg-surface-container-low transition-colors shadow-sm focus:outline-none active:scale-95 cursor-pointer"
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </section>

        {/* DOCUMENTACIÓN PERSONAL SECTION (Cédula & Licencia) */}
        <section className="bg-white rounded-2xl p-5 border border-surface-container shadow-[0px_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-4">
          <h3 className="text-xs font-bold text-outline uppercase tracking-wider">Documentación Personal</h3>
          
          <div className="flex flex-col gap-3">
            {/* 1. Cédula Card */}
            <div className="flex flex-col gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-[#0b224d]/10 text-[#0b224d] p-2 rounded-lg">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-on-surface">Cédula de Ciudadanía</p>
                    <p className="text-[11px] text-outline font-bold">
                      {user.cedulaNumber ? `C.C. ${user.cedulaNumber}` : 'Sin registrar número'}
                    </p>
                  </div>
                </div>

                {/* State Tag */}
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                  user.cedulaNumber && user.cedulaPhoto
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    user.cedulaNumber && user.cedulaPhoto ? 'bg-emerald-500' : 'bg-red-500'
                  }`}></span>
                  {user.cedulaNumber && user.cedulaPhoto ? 'Registrada' : 'Pendiente'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-1.5 pt-2 border-t border-slate-200/50">
                {user.cedulaPhoto && (
                  <button
                    onClick={() => {
                      setViewDocPhoto(user.cedulaPhoto!);
                      setViewDocTitle('Cédula de Ciudadanía');
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/50"
                  >
                    <Eye size={14} />
                    Ver Cédula
                  </button>
                )}
                <button
                  onClick={() => {
                    setCedulaNumber(user.cedulaNumber || '');
                    setCedulaPhoto(user.cedulaPhoto || null);
                    setShowCedulaModal(true);
                  }}
                  className="flex-1 py-2 bg-primary-container text-white hover:opacity-90 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera size={14} />
                  {user.cedulaPhoto ? 'Actualizar' : 'Subir Cédula'}
                </button>
              </div>
            </div>

            {/* 2. Licencia Card (Only for Conductores) */}
            {user.role === 'conductor' && (
              <div className="flex flex-col gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#0b224d]/10 text-[#0b224d] p-2 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-on-surface">Licencia de Conducción</p>
                      <p className="text-[11px] text-outline">
                        {user.licenseExpiry ? `Vence: ${user.licenseExpiry}` : 'Sin registrar fecha'}
                      </p>
                    </div>
                  </div>
                  
                  {/* State Tag */}
                  {(() => {
                    const val = getDocValidity(user.licenseExpiry, user.licensePhoto);
                    return (
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${val.bgColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${val.dotColor}`}></span>
                        {val.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-1.5 pt-2 border-t border-slate-200/50">
                  {user.licensePhoto && (
                    <button
                      onClick={() => {
                        setViewDocPhoto(user.licensePhoto!);
                        setViewDocTitle('Licencia de Conducir');
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/50"
                    >
                      <Eye size={14} />
                      Ver Pase
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setLicenseExpiry(user.licenseExpiry || '');
                      setLicensePhoto(user.licensePhoto || null);
                      setShowLicenseModal(true);
                    }}
                    className="flex-1 py-2 bg-primary-container text-white hover:opacity-90 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={14} />
                    {user.licensePhoto ? 'Actualizar' : 'Subir Pase'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* MIS VEHÍCULOS SECTION (SOAT, Tecno, Tarjeta Propiedad) */}
        {user.role === 'conductor' && (
          <section className="bg-white rounded-2xl p-5 border border-surface-container shadow-[0px_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-outline uppercase tracking-wider">Mis Vehículos (Flota)</h3>
              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="text-xs font-black text-[#1E5EFF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} strokeWidth={3} />
                Agregar Vehículo
              </button>
            </div>

            {(!user.vehicles || user.vehicles.length === 0) ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center">
                <Truck className="text-slate-300 mb-2" size={32} />
                <p className="text-xs font-bold text-slate-400">Ningún vehículo registrado</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  Registra tu primer camión o furgoneta para poder aceptar fletes.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {user.vehicles.map((vh) => {
                  const soatVal = getDocValidity(vh.soatExpiry, vh.soatPhoto);
                  const tecnoVal = getDocValidity(vh.tecnomecanicaExpiry, vh.tecnomecanicaPhoto);
                  const isDefault = user.plateNumber === vh.plate;

                  return (
                    <div 
                      key={vh.id} 
                      className={`p-4 bg-slate-50/40 rounded-xl border flex flex-col gap-3 relative transition-all ${
                        isDefault 
                          ? 'border-[#0b224d] shadow-[0px_4px_12px_rgba(11,34,77,0.06)] bg-white' 
                          : 'border-slate-100'
                      }`}
                    >
                      
                      {/* Details & Actions */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${isDefault ? 'bg-[#0b224d] text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Truck size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-on-surface">{vh.type}</span>
                              {vh.model && <span className="text-[10px] text-slate-400 font-bold">Mod. {vh.model}</span>}
                            </div>
                            <span className="text-xs font-black text-[#0b224d] tracking-wider uppercase">{vh.plate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isDefault ? (
                            <span className="text-[9px] font-black bg-[#0b224d]/10 text-[#0b224d] px-2 py-0.5 rounded-full border border-[#0b224d]/20 flex items-center gap-1">
                              <UserCheck size={10} strokeWidth={3} />
                              Principal
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onUpdateProfile({
                                  plateNumber: vh.plate,
                                  vehicleType: vh.type
                                });
                              }}
                              className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 transition-colors cursor-pointer"
                            >
                              Fijar Principal
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`¿Estás seguro de eliminar el vehículo ${vh.plate}?`)) {
                                const remaining = user.vehicles?.filter(v => v.id !== vh.id) || [];
                                const wasDefault = user.plateNumber === vh.plate;
                                onUpdateProfile({
                                  vehicles: remaining,
                                  plateNumber: wasDefault ? (remaining[0]?.plate || '') : user.plateNumber,
                                  vehicleType: wasDefault ? (remaining[0]?.type || '') : user.vehicleType
                                });
                              }
                            }}
                            className="p-1 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Documents Grid (SOAT, Tecno, Tarjeta Propiedad) */}
                      <div className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-slate-100/80">
                        {/* Headers */}
                        <div className="grid grid-cols-3 text-[9px] font-black text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                          <span>SOAT</span>
                          <span className="border-l border-slate-100 pl-2">Tecno</span>
                          <span className="border-l border-slate-100 pl-2">Propiedad</span>
                        </div>

                        {/* Contents */}
                        <div className="grid grid-cols-3 text-[10px] font-extrabold text-on-surface pt-1 items-start">
                          {/* SOAT */}
                          <div className="flex flex-col gap-1 pr-1">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{vh.soatExpiry ? vh.soatExpiry : 'Sin fecha'}</span>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-1 ${soatVal.dotColor}`} title={soatVal.label}></span>
                            </div>
                            {vh.soatPhoto && (
                              <button
                                onClick={() => {
                                  setViewDocPhoto(vh.soatPhoto!);
                                  setViewDocTitle(`SOAT - ${vh.plate}`);
                                }}
                                className="text-[9px] font-black text-primary hover:underline mt-0.5 text-left flex items-center gap-0.5 cursor-pointer"
                              >
                                <Eye size={10} />
                                Ver SOAT
                              </button>
                            )}
                          </div>

                          {/* Tecno */}
                          <div className="flex flex-col gap-1 border-l border-slate-100 pl-2 pr-1">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{vh.tecnomecanicaExpiry ? vh.tecnomecanicaExpiry : 'Sin fecha'}</span>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-1 ${tecnoVal.dotColor}`} title={tecnoVal.label}></span>
                            </div>
                            {vh.tecnomecanicaPhoto && (
                              <button
                                onClick={() => {
                                  setViewDocPhoto(vh.tecnomecanicaPhoto!);
                                  setViewDocTitle(`Tecno - ${vh.plate}`);
                                }}
                                className="text-[9px] font-black text-primary hover:underline mt-0.5 text-left flex items-center gap-0.5 cursor-pointer"
                              >
                                <Eye size={10} />
                                Ver Tecno
                              </button>
                            )}
                          </div>

                          {/* Tarjeta Propiedad */}
                          <div className="flex flex-col gap-1 border-l border-slate-100 pl-2">
                            <div className="flex items-center justify-between">
                              <span className="truncate text-slate-500">
                                {vh.propiedadNumber ? `N° ${vh.propiedadNumber}` : 'Propiedad'}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-1 ${
                                vh.propiedadPhoto ? 'bg-emerald-500' : 'bg-red-500'
                              }`} title={vh.propiedadPhoto ? 'Cargada' : 'Pendiente'}></span>
                            </div>
                            {vh.propiedadPhoto && (
                              <button
                                onClick={() => {
                                  setViewDocPhoto(vh.propiedadPhoto!);
                                  setViewDocTitle(`Tarjeta Propiedad - ${vh.plate}`);
                                }}
                                className="text-[9px] font-black text-primary hover:underline mt-0.5 text-left flex items-center gap-0.5 cursor-pointer"
                              >
                                <Eye size={10} />
                                Ver Tarjeta
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Navigation Grid */}
        <section className="flex flex-col gap-2">
          {/* Payment Methods */}
          <button 
            onClick={() => alert('Métodos de Pago: Visa **** 5678, Bancolombia, Efectivo.')}
            className="flex items-center justify-between w-full p-4 bg-white rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-surface-container hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-primary-container group-hover:text-white transition-colors">
                <CreditCard size={18} />
              </div>
              <span className="text-sm font-bold text-on-surface">Métodos de Pago</span>
            </div>
            <span className="text-outline-variant group-hover:text-primary transition-transform group-hover:translate-x-0.5">▶</span>
          </button>

          {/* Help Center */}
          <button 
            onClick={() => alert('Centro de Ayuda CargoFlow. Soporte 24/7 vía Chat.')}
            className="flex items-center justify-between w-full p-4 bg-white rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-surface-container hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-primary-container group-hover:text-white transition-colors">
                <HelpCircle size={18} />
              </div>
              <span className="text-sm font-bold text-on-surface">Centro de Ayuda</span>
            </div>
            <span className="text-outline-variant group-hover:text-primary transition-transform group-hover:translate-x-0.5">▶</span>
          </button>

          {/* Settings */}
          <button 
            onClick={onNavigateToSettings}
            className="flex items-center justify-between w-full p-4 bg-white rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-surface-container hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-primary-container group-hover:text-white transition-colors">
                <Settings size={18} />
              </div>
              <span className="text-sm font-bold text-on-surface">Ajustes</span>
            </div>
            <span className="text-outline-variant group-hover:text-primary transition-transform group-hover:translate-x-0.5">▶</span>
          </button>

          {/* Logout */}
          <button 
            onClick={onLogout}
            className="flex items-center justify-between w-full p-4 bg-white rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-surface-container hover:bg-red-50 text-red-600 hover:border-red-200 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <LogOut size={18} />
              </div>
              <span className="text-sm font-extrabold text-red-600">Cerrar Sesión</span>
            </div>
          </button>
        </section>

        <div className="h-1" aria-hidden="true" />

      </main>

      {/* ── PHOTO VIEWER POPUP MODAL ───────────────────────── */}
      <AnimatePresence>
        {viewDocPhoto && (
          <div className="fixed inset-0 bg-black/85 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden max-w-sm w-full border border-slate-200 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-black text-on-surface flex items-center gap-1.5">
                  <FileText size={16} />
                  {viewDocTitle}
                </h3>
                <button 
                  onClick={() => setViewDocPhoto(null)} 
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[250px]">
                <img 
                  src={viewDocPhoto} 
                  alt={viewDocTitle} 
                  className="max-h-[350px] w-auto object-contain rounded-lg shadow-md"
                />
              </div>
              <div className="p-4 text-center">
                <button
                  onClick={() => setViewDocPhoto(null)}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cerrar Vista
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PERSONAL CÉDULA UPDATE MODAL ────────────────────── */}
      <AnimatePresence>
        {showCedulaModal && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-surface-container"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-on-surface">Subir Cédula de Ciudadanía</h3>
                <button onClick={() => setShowCedulaModal(false)} className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCedulaSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Número de Cédula</label>
                  <input
                    type="text"
                    value={cedulaNumber}
                    onChange={(e) => setCedulaNumber(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-semibold focus:outline-none focus:border-primary-container"
                    placeholder="Ej: 1020456789"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Foto de la Cédula</label>
                  
                  {cedulaPhoto ? (
                    <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                          <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Cédula cargada</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCedulaPhoto(null)}
                        className="text-[10px] font-black text-red-500 hover:underline cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50">
                      <Camera className="text-slate-400" size={24} />
                      <span className="text-xs font-bold text-slate-500">
                        {uploadingCedula ? 'Procesando imagen...' : 'Tomar Foto / Seleccionar'}
                      </span>
                      <span className="text-[9px] text-slate-400">Compresión automática de costo cero</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCedulaPhotoChange}
                        className="hidden"
                        disabled={uploadingCedula}
                        required={!user.cedulaPhoto}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploadingCedula}
                  className="w-full h-11 bg-[#1E5EFF] text-white font-bold rounded-xl mt-2 flex items-center justify-center shadow-md hover:bg-primary transition-all cursor-pointer disabled:opacity-50"
                >
                  Guardar Cédula
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DRIVER LICENSE UPDATE MODAL ─────────────────────── */}
      <AnimatePresence>
        {showLicenseModal && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-surface-container"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-on-surface">Subir Licencia de Conducir</h3>
                <button onClick={() => setShowLicenseModal(false)} className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleLicenseSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={licenseExpiry}
                    onChange={(e) => setLicenseExpiry(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-semibold focus:outline-none focus:border-primary-container"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Foto del Documento</label>
                  
                  {licensePhoto ? (
                    <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                          <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Foto cargada correctamente</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLicensePhoto(null)}
                        className="text-[10px] font-black text-red-500 hover:underline cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50">
                      <Camera className="text-slate-400" size={24} />
                      <span className="text-xs font-bold text-slate-500">
                        {uploadingLicense ? 'Procesando imagen...' : 'Tomar Foto / Seleccionar'}
                      </span>
                      <span className="text-[9px] text-slate-400">Compresión automática inteligente</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLicensePhotoChange}
                        className="hidden"
                        disabled={uploadingLicense}
                        required={!user.licensePhoto}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploadingLicense}
                  className="w-full h-11 bg-[#1E5EFF] text-white font-bold rounded-xl mt-2 flex items-center justify-center shadow-md hover:bg-primary transition-all cursor-pointer disabled:opacity-50"
                >
                  Guardar Licencia
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADD VEHICLE MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {showAddVehicleModal && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-surface-container flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-on-surface">Agregar Nuevo Vehículo</h3>
                <button onClick={() => setShowAddVehicleModal(false)} className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddVehicleSubmit} className="flex flex-col gap-4">
                {/* Plate */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Placa</label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-bold uppercase placeholder:normal-case focus:outline-none focus:border-primary-container"
                    placeholder="Ej: WYZ-789"
                    required
                  />
                </div>

                {/* Type Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Tipo de Vehículo</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-semibold focus:outline-none focus:border-primary-container"
                  >
                    <option value="Furgón">Furgón</option>
                    <option value="Camión Sencillo">Camión Sencillo</option>
                    <option value="Turbo">Turbo</option>
                    <option value="Tractomula">Tractomula</option>
                    <option value="Camioneta">Camioneta</option>
                  </select>
                </div>

                {/* Model Year */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Modelo (Año)</label>
                  <input
                    type="number"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-semibold focus:outline-none focus:border-primary-container"
                    placeholder="Ej: 2022"
                    min="1980"
                    max="2027"
                  />
                </div>

                {/* Tarjeta Propiedad Details */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-[#0b224d]">Tarjeta de Propiedad</h4>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-outline uppercase">Número de Tarjeta (Opcional)</label>
                    <input
                      type="text"
                      value={newPropiedadNumber}
                      onChange={(e) => setNewPropiedadNumber(e.target.value)}
                      className="w-full h-10 px-3 bg-surface rounded-xl border border-outline-variant text-xs font-semibold focus:outline-none"
                      placeholder="Ej: 10024959"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-outline uppercase">Foto Tarjeta de Propiedad</label>
                    {newPropiedadPhoto ? (
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold">Tarjeta de Propiedad cargada</span>
                        <button type="button" onClick={() => setNewPropiedadPhoto(null)} className="text-[9px] font-black text-red-500 hover:underline">Eliminar</button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50">
                        <Camera className="text-slate-400" size={18} />
                        <span className="text-[10px] text-slate-500 font-bold mt-1">
                          {uploadingPropiedad ? 'Procesando...' : 'Tomar Foto Propiedad'}
                        </span>
                        <input type="file" accept="image/*" onChange={handlePropiedadPhotoChange} className="hidden" disabled={uploadingPropiedad} />
                      </label>
                    )}
                  </div>
                </div>

                {/* SOAT details */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-[#0b224d]">Seguro SOAT Obligatorio</h4>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-outline uppercase">Vencimiento SOAT</label>
                    <input
                      type="date"
                      value={newSoatExpiry}
                      onChange={(e) => setNewSoatExpiry(e.target.value)}
                      className="w-full h-10 px-3 bg-surface rounded-xl border border-outline-variant text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-outline uppercase">Foto del SOAT</label>
                    {newSoatPhoto ? (
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold">SOAT cargado</span>
                        <button type="button" onClick={() => setNewSoatPhoto(null)} className="text-[9px] font-black text-red-500 hover:underline">Eliminar</button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50">
                        <Camera className="text-slate-400" size={18} />
                        <span className="text-[10px] text-slate-500 font-bold mt-1">
                          {uploadingSoat ? 'Procesando...' : 'Tomar Foto SOAT'}
                        </span>
                        <input type="file" accept="image/*" onChange={handleSoatPhotoChange} className="hidden" disabled={uploadingSoat} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Tecnicomecanica details */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-[#0b224d]">Revisión Tecnicomecánica</h4>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-outline uppercase">Vencimiento Tecnicomecánica</label>
                    <input
                      type="date"
                      value={newTecnoExpiry}
                      onChange={(e) => setNewTecnoExpiry(e.target.value)}
                      className="w-full h-10 px-3 bg-surface rounded-xl border border-outline-variant text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-outline uppercase">Foto Tecnicomecánica</label>
                    {newTecnoPhoto ? (
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold">Tecno cargado</span>
                        <button type="button" onClick={() => setNewTecnoPhoto(null)} className="text-[9px] font-black text-red-500 hover:underline">Eliminar</button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50">
                        <Camera className="text-slate-400" size={18} />
                        <span className="text-[10px] text-slate-500 font-bold mt-1">
                          {uploadingTecno ? 'Procesando...' : 'Tomar Foto Tecno'}
                        </span>
                        <input type="file" accept="image/*" onChange={handleTecnoPhotoChange} className="hidden" disabled={uploadingTecno} />
                      </label>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploadingSoat || uploadingTecno || uploadingPropiedad}
                  className="w-full h-11 bg-[#1E5EFF] text-white font-bold rounded-xl mt-3 flex items-center justify-center shadow-md hover:bg-primary transition-all cursor-pointer disabled:opacity-50"
                >
                  Agregar Vehículo
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DEPOSIT WALLET MODAL */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-surface-container"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-on-surface">Recargar Billetera</h3>
                <button onClick={() => setShowDepositModal(false)} className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleDepositSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Monto a Depositar (COP)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-extrabold focus:outline-none focus:border-primary-container"
                    placeholder="200000"
                    min="10000"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['50000', '100000', '500000'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDepositAmount(val)}
                      className="py-1.5 px-3 bg-surface border border-outline-variant hover:border-primary-container rounded-lg text-xs font-bold text-on-surface transition-colors"
                    >
                      +${parseFloat(val).toLocaleString('es-CO')}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="w-full h-11 bg-[#1E5EFF] text-white font-bold rounded-xl mt-2 flex items-center justify-center shadow-md hover:bg-primary transition-all cursor-pointer"
                >
                  Confirmar Recarga
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-surface-container"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-on-surface">Editar Perfil</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Nombre Completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-semibold focus:outline-none focus:border-primary-container"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Teléfono</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-semibold focus:outline-none focus:border-primary-container"
                    placeholder="+57 300 000 0000"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Número de Cédula</label>
                  <input
                    type="text"
                    value={editCedula}
                    onChange={(e) => setEditCedula(e.target.value)}
                    className="w-full h-11 px-3 bg-surface rounded-xl border border-outline-variant text-sm font-semibold focus:outline-none focus:border-primary-container"
                    placeholder="Ej: 1020456789"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-[#1E5EFF] text-white font-bold rounded-xl mt-2 flex items-center justify-center shadow-md hover:bg-primary transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
