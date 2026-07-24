import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Download, 
  Share2, 
  Settings, 
  Plus, 
  LogOut, 
  Sun,
  Moon,
  Monitor,
  Check,
  Truck,
  X,
  Layers,
  Terminal,
  Zap,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Trip } from '../types';
import CargoFlowLogo from './CargoFlowLogo';
import { notify, scheduleNotification } from '../services/notificationService';

interface HeaderProps {
  user: UserProfile;
  trips: Trip[];
  linkedAccounts?: UserProfile[];
  onNavigateToView: (view: 'home' | 'activity' | 'chat' | 'profile' | 'settings') => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
  onLogout: () => void;
  onAddAccount?: () => void;
  onSwitchAccount?: (acc: UserProfile) => void;
  unreadCount?: number;
}

export default function Header({ 
  user, 
  trips,
  linkedAccounts = [], 
  onNavigateToView,
  onUpdateProfile,
  onLogout, 
  onAddAccount, 
  onSwitchAccount, 
  unreadCount = 0 
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showSplashModal, setShowSplashModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeTheme, setActiveTheme] = useState<string>('dia');
  const [quickThemes, setQuickThemes] = useState<string[]>(['dia', 'cyber', 'kilo']);
  // Local state for immediate UI feedback on availability toggle
  const [isAvailable, setIsAvailable] = useState(user.isAvailable ?? true);

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
  const displayStarsVal = ratingStats.totalStars || (user.rating ? Math.round(user.rating * (ratingStats.count || 1)) : 5);

  // States and refs for the flying star animation
  const [animatingStars, setAnimatingStars] = useState<number | null>(null);
  const [capsuleScale, setCapsuleScale] = useState(1);
  const prevStarsRef = useRef<number | null>(null);

  useEffect(() => {
    const currentStars = ratingStats.totalStars || (user.rating ? Math.round(user.rating * (ratingStats.count || 1)) : 5);
    if (prevStarsRef.current !== null && currentStars > prevStarsRef.current) {
      const diff = currentStars - prevStarsRef.current;
      setAnimatingStars(diff);
    }
    prevStarsRef.current = currentStars;
  }, [trips, user.rating]);

  // Sync state if user prop changes
  useEffect(() => {
    setIsAvailable(user.isAvailable ?? true);
  }, [user.isAvailable]);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('cf_theme_quick_list');
        if (stored) {
          setQuickThemes(JSON.parse(stored));
        }
      } catch (e) {}
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Dynamic user avatar helper (Google profile photo if logged in with Google, or sleek initials avatar)
  const renderAvatar = (photoURL?: string, name?: string, sizeClass = "w-8 h-8 text-xs") => {
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

  // Capture PWA install prompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Share App - Exactly shares https://cargoflow-c387d.web.app/
  const handleShareApp = async () => {
    const shareUrl = 'https://cargoflow-c387d.web.app/';
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CargoFlow Colombia',
          text: 'CargoFlow - La plataforma líder de transporte de carga en Colombia',
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert(`¡Enlace copiado al portapapeles!\n${shareUrl}`);
    }
  };

  // Handle PWA Installation
  const handleInstallPwa = async () => {
    if (pwaInstallPrompt) {
      pwaInstallPrompt.prompt();
      const choiceResult = await pwaInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true);
        setPwaInstallPrompt(null);
      }
    } else {
      alert('Instrucciones para instalar CargoFlow:\n\n1. Presiona el botón Compartir o Menú en tu navegador\n2. Selecciona "Agregar a la pantalla de inicio"');
    }
  };

  const [notifications, setNotifications] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('cf_notifications_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'notif-welcome',
        title: '¡Bienvenido a CargoFlow!',
        desc: 'Aquí recibirás las alertas de solicitudes, ofertas y viajes en tiempo real.',
        time: 'Hoy',
        unread: false,
      }
    ];
  });

  const [localUnreadCount, setLocalUnreadCount] = useState(() => {
    try {
      const saved = localStorage.getItem('cf_notifications_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((n: any) => n.unread).length;
      }
    } catch (e) {}
    return 1;
  });

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const payload = customEvent.detail;
      
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setNotifications(prev => {
        const next = [
          {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            title: payload.title,
            desc: payload.body,
            time: `Hoy, ${nowStr}`,
            unread: true,
          },
          ...prev.filter(n => n.id !== 'notif-welcome'),
        ].slice(0, 20); // Keep latest 20 notifications
        
        try {
          localStorage.setItem('cf_notifications_history', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      setLocalUnreadCount(prev => prev + 1);
    };

    window.addEventListener('cargoflow:notification', handleNotification);
    return () => window.removeEventListener('cargoflow:notification', handleNotification);
  }, []);

  // Sync notifications from Firestore in real-time
  useEffect(() => {
    if (!user.email) return;

    let unsubscribe = () => {};
    const syncDbNotifications = async () => {
      try {
        const { auth, db } = await import('../config/firebase');
        if (!auth.currentUser) return;
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');

        const targets = [user.email];
        if (user.role === 'conductor' || user.role === 'admin') {
          targets.push('all_conductors');
        }

        const q = query(collection(db, 'notifications'), where('userId', 'in', targets));

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const dbNotifs: any[] = [];
            let unread = 0;

            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const dateObj = data.createdAt ? new Date(data.createdAt) : new Date();
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              dbNotifs.push({
                id: docSnap.id,
                title: data.title,
                desc: data.body,
                time: `Hoy, ${timeStr}`,
                unread: !data.read,
                createdAt: data.createdAt || '',
              });

              if (!data.read) unread++;
            });

            // Sort by createdAt descending
            dbNotifs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

            if (dbNotifs.length > 0) {
              setNotifications(dbNotifs.slice(0, 25));
              setLocalUnreadCount(unread);
              try {
                localStorage.setItem('cf_notifications_history', JSON.stringify(dbNotifs.slice(0, 25)));
              } catch (_) {}
            }
          },
          (err) => console.warn('Notification snapshot error:', err)
        );
      } catch (e) {
        console.warn('Could not sync DB notifications:', e);
      }
    };

    syncDbNotifications();
    return () => unsubscribe();
  }, [user.email, user.role]);

  const getFirstName = (name?: string) => {
    if (!name) return 'Usuario';
    return name.split(' ')[0];
  };

  return (
    <>
      {/* Dark backdrop overlay when menu or notifications are open */}
      <AnimatePresence>
        {(isMenuOpen || isNotificationsOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsMenuOpen(false);
              setIsNotificationsOpen(false);
            }}
            className="fixed inset-0 bg-transparent backdrop-blur-[0px] z-[90]"
          />
        )}
      </AnimatePresence>

      {/* Notifications Dropdown Panel (Moved out of header to prevent clipping) */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <div 
            className="fixed inset-0 z-[250] backdrop-blur-sm bg-black/40 flex items-center justify-center p-4"
            onClick={() => setIsNotificationsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-surface-container flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-primary-container" />
                  <h3 className="font-bold text-sm text-on-surface">Notificaciones</h3>
                </div>
                <span className="text-[11px] font-bold bg-blue-50 text-primary-container px-2 py-0.5 rounded-full">
                  {localUnreadCount} Nuevas
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-surface-container-low min-h-0">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-3.5 hover:bg-surface-container-low transition-colors cursor-pointer flex gap-3 ${
                      n.unread ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.unread ? 'bg-primary-container' : 'bg-outline-variant'}`} />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-on-surface leading-snug">{n.title}</h4>
                      <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">{n.desc}</p>
                      <span className="text-[10px] text-outline font-medium mt-1 block">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-surface-container-low text-center border-t border-surface-container flex-shrink-0">
                <button 
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    onNavigateToView('activity');
                  }} 
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Ver todas las actividades
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-surface-container h-16 px-2.5 sm:px-4 md:px-8 flex items-center justify-between shadow-sm transition-all">
        {/* Left: Animated Circular Logo Icon (Triggers Fullscreen Splash Modal on Click) */}
        <div 
          onClick={() => setShowSplashModal(true)} 
          className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group select-none flex-shrink-0"
          title="Ver Splash Screen CargoFlow"
        >
          <div className="group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
            <CargoFlowLogo size="sm" />
          </div>
          <span className="font-headline-md text-base font-extrabold text-primary-container tracking-tight">CargoFlow</span>
        </div>

        {/* Right Actions: WhatsApp Support, Notifications, Profile Capsule */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0">
          {/* WhatsApp Direct Support Button */}
          <a
            href="https://wa.me/573000000000?text=Hola,%20necesito%20soporte%20en%20CargoFlow"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center transition-all active:scale-95 shadow-xs flex-shrink-0"
            title="Soporte WhatsApp"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </a>

          {/* Notifications Bell */}
          <div className="relative flex-shrink-0" ref={notifRef}>
            <button
              onClick={() => {
                const opening = !isNotificationsOpen;
                setIsNotificationsOpen(opening);
                setIsMenuOpen(false);
                
                if (opening) {
                  setLocalUnreadCount(0);
                  setNotifications(prev => {
                    const marked = prev.map(n => ({ ...n, unread: false }));
                    try {
                      localStorage.setItem('cf_notifications_history', JSON.stringify(marked));
                    } catch (e) {}
                    return marked;
                  });

                  // Mark in Firestore as read
                  (async () => {
                    try {
                      const { auth, db } = await import('../config/firebase');
                      if (!auth.currentUser || !user.email) return;
                      const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');

                      const targets = [user.email];
                      if (user.role === 'conductor' || user.role === 'admin') {
                        targets.push('all_conductors');
                      }

                      const q = query(collection(db, 'notifications'), where('userId', 'in', targets), where('read', '==', false));
                      const snap = await getDocs(q);
                      snap.forEach((docSnap) => {
                        updateDoc(doc(db, 'notifications', docSnap.id), { read: true }).catch(() => {});
                      });
                    } catch (_) {}
                  })();
                }
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-all relative active:scale-95"
              title="Notificaciones"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {localUnreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>
          </div>

          {/* Profile Capsule Button (Google Avatar + Name + Role Badge + Chevron) */}
          <div className="relative min-w-0" ref={menuRef}>
            <motion.button
              animate={{ scale: capsuleScale }}
              transition={{ type: 'spring', stiffness: 350, damping: 12 }}
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                setIsNotificationsOpen(false);
              }}
              className={`flex items-center gap-1 sm:gap-2 p-1 pl-1.5 pr-2 rounded-full border transition-all duration-200 active:scale-95 ${
                isMenuOpen 
                  ? 'bg-blue-50 border-primary-container/40 shadow-sm' 
                  : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
              }`}
            >
              {/* User Profile Avatar from Google/Registration */}
              {renderAvatar(user.photoURL, user.name, "w-7 h-7 sm:w-8 sm:h-8 text-xs")}

              {/* Name & Role Badge (Optimized responsive text) */}
              <div className="flex flex-col text-left min-w-0 max-w-[70px] sm:max-w-[110px]">
                <span className="text-[11px] sm:text-xs font-bold text-on-surface leading-tight truncate">
                  {getFirstName(user.name)}
                </span>
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-full w-fit truncate">
                  {user.role.toUpperCase()}
                </span>
              </div>

              {/* Stars Badge stacked vertically above Chevron */}
              <div className="flex flex-col items-center justify-center pl-1.5 border-l border-slate-200/60 ml-0.5 min-w-[28px] select-none">
                <div className="flex items-center gap-0.5 px-1 py-0.2 bg-amber-500 text-amber-950 font-black text-[9px] rounded-full border border-amber-400 leading-none shadow-sm mb-0.5">
                  <Star size={8} fill="currentColor" className="text-amber-950" />
                  <span className="text-[8px] leading-none">{displayStarsVal}</span>
                </div>
                {isMenuOpen ? (
                  <ChevronUp size={10} className="text-primary-container leading-none" />
                ) : (
                  <ChevronDown size={10} className="text-outline leading-none" />
                )}
              </div>
            </motion.button>
            {/* Profile Dropdown Menu */}
            {isMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2.5 shadow-2xl shadow-black/10 animate-slide-down origin-top-right overflow-y-auto max-h-[calc(100vh-120px)] no-scrollbar z-50 glass-dropdown rounded-2xl border border-[var(--glass-border)]" 
                style={{ width: '272px' }}
              >
                {/* Header User Card (Google Photo & Registration Email) */}
                <div className="px-4 py-4 flex items-center gap-3 border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--accent-glow)] to-transparent">
                  <div className="relative w-11 h-11 overflow-hidden ring-2 ring-[var(--accent)] flex-shrink-0 rounded-full">
                    {renderAvatar(user.photoURL, user.name, "w-full h-full text-sm")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-slate-800">{user.name || 'Usuario CargoFlow'}</p>
                    <p className="text-xs truncate text-slate-500">{user.email || 'usuario@cargoflow.co'}</p>
                    <span className="inline-block mt-1 text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold rounded-full bg-[var(--accent-glow)] border border-[var(--accent)] text-[var(--accent)]">
                      {user.role.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Theme Selector Segmented Control */}
                <div className="p-1.5 border-b border-surface-container">
                  <div className="flex items-center justify-between gap-1 p-1 bg-[var(--glass)] border border-[var(--glass-border)] rounded-xl">
                    {quickThemes.map(themeId => {
                      let Icon = Sun;
                      let label = 'Día';
                      if (themeId === 'original') { Icon = Moon; label = 'Noche'; }
                      if (themeId === 'glass') { Icon = Layers; label = 'Glass'; }
                      if (themeId === 'cyber') { Icon = Terminal; label = 'Cyber'; }
                      if (themeId === 'kilo') { Icon = Zap; label = 'Kilo'; }

                      return (
                        <button
                          key={themeId}
                          onClick={() => setActiveTheme(themeId)}
                          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all font-bold ${
                            activeTheme === themeId
                              ? 'bg-[var(--accent)] text-black shadow-sm'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass)]'
                          }`}
                        >
                          <Icon size={16} className="mb-1" />
                          <span className="text-[9px] font-semibold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Menu Options */}
                <div className="p-1.5">
                  {(user.role === 'conductor' || user.role === 'admin') && (
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = !isAvailable;
                          setIsAvailable(newStatus);
                          if (onUpdateProfile) {
                            onUpdateProfile({ isAvailable: newStatus });
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isAvailable ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                            <Truck size={14} />
                          </div>
                          <span className="text-sm font-semibold">Estoy Disponible</span>
                        </div>
                        
                        {/* Toggle Switch */}
                        <div className={`w-8 h-[18px] rounded-full p-0.5 transition-colors duration-200 ${isAvailable ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${isAvailable ? 'translate-x-3.5' : 'translate-x-0'}`} />
                        </div>
                      </button>
                    </div>
                  )}

                  <div>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onNavigateToView('profile');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass)] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--glass-strong)] flex items-center justify-center">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-semibold">Mi perfil</span>
                    </button>
                  </div>

                  <div>
                    <button
                      onClick={(e) => {
                        // Don't close the menu, just toggle
                        e.stopPropagation();
                        setNotificationsEnabled(!notificationsEnabled);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/25 text-[var(--accent)] flex items-center justify-center">
                          <Bell size={14} />
                        </div>
                        <span className="text-sm font-semibold">Notificaciones</span>
                      </div>
                      
                      {/* Toggle Switch */}
                      <div className={`w-8 h-[18px] rounded-full p-0.5 transition-colors duration-200 ${notificationsEnabled ? 'bg-[var(--accent)]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${notificationsEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowInstallModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass)] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--glass-strong)] flex items-center justify-center">
                        <Download size={14} />
                      </div>
                      <span className="text-sm font-semibold flex-1 text-left">Instalar app</span>
                      {installSuccess && <Check size={14} className="text-[var(--accent)]" />}
                    </button>
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleShareApp();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass)] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--glass-strong)] flex items-center justify-center">
                        <Share2 size={14} />
                      </div>
                      <span className="text-sm font-semibold">Compartir app</span>
                    </button>
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onNavigateToView('settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass)] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--glass-strong)] flex items-center justify-center">
                        <Settings size={14} />
                      </div>
                      <span className="text-sm font-semibold">Configuración</span>
                    </button>
                  </div>
                </div>

                {/* OTRAS CUENTAS Section */}
                <div className="p-1.5 border-t border-surface-container">
                  <div className="mb-2">
                    <p className="px-2 py-1.5 text-[10px] uppercase tracking-widest font-extrabold text-slate-400">
                      Otras Cuentas
                    </p>
                    
                    {/* Dynamic List of Linked Accounts */}
                    {linkedAccounts.length > 0 ? (
                      linkedAccounts.map((acc, idx) => (
                        <button
                          key={acc.email + idx}
                          onClick={() => {
                            setIsMenuOpen(false);
                            if (onSwitchAccount) onSwitchAccount(acc);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/60 transition-colors text-left group"
                        >
                          <div className="relative w-7 h-7 overflow-hidden rounded-full ring-1 ring-slate-200">
                            {renderAvatar(acc.photoURL, acc.name, "w-full h-full text-[10px] grayscale group-hover:grayscale-0 transition-all")}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div>
                              <p className="text-xs truncate text-slate-800 font-medium group-hover:text-emerald-700">{acc.name}</p>
                              <p className="text-[10px] truncate text-slate-500">{acc.email}</p>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tight text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full ml-2">
                              {acc.role.toUpperCase()}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <button 
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (onAddAccount) onAddAccount();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/60 transition-colors text-left group opacity-60 hover:opacity-100"
                      >
                        <div className="relative w-7 h-7 overflow-hidden rounded-full ring-1 ring-slate-200">
                          {renderAvatar(undefined, "Luis Fernando", "w-full h-full text-[10px] grayscale group-hover:grayscale-0 transition-all")}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div>
                            <p className="text-xs truncate text-slate-800 font-medium group-hover:text-emerald-700">Luis Fernando</p>
                            <p className="text-[10px] truncate text-slate-500">lfalzatel29@gmail.com</p>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-tight text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full ml-2">
                            CLIENTE
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (onAddAccount) onAddAccount();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <span className="text-lg leading-none font-bold">+</span>
                    </div>
                    <span className="text-sm font-semibold">Añadir Cuenta</span>
                  </button>
                </div>

                {/* Cerrar Sesión */}
                <div className="p-1.5 border-t border-surface-container">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/8 active:bg-red-500/15 transition-all duration-150 group/so"
                  >
                    <div className="w-7 h-7 rounded-lg bg-transparent flex items-center justify-center group-hover/so:bg-red-500/15 transition-colors">
                      <LogOut size={14} />
                    </div>
                    <span className="text-sm font-bold">Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Fullscreen Splash Screen Modal Overlay (Triggered by clicking top left logo) */}
      <AnimatePresence>
        {showSplashModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSplashModal(false)}
            className="fixed inset-0 z-[99999] bg-gradient-to-br from-[#09152b] via-[#0b224d] to-[#041029] text-white flex flex-col items-center justify-between py-12 px-6 select-none cursor-pointer"
          >
            {/* Thin Cyberpunk Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-25 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />

            {/* Close Button */}
            <button
              onClick={() => setShowSplashModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20 active:scale-95 z-10"
              title="Cerrar Splash Screen"
            >
              <X size={24} />
            </button>

            {/* Top Tag */}
            <div className="w-full flex justify-center pt-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/70 px-3.5 py-1 rounded-full border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                CargoFlow Colombia PWA
              </span>
            </div>

            {/* Main Center Animated Logo & Status (Matches user's reference image style) */}
            <div className="flex flex-col items-center justify-center gap-6 text-center my-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  y: [0, -12, 0] // Smooth floating levitation
                }}
                transition={{ 
                  scale: { duration: 0.4 },
                  y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
                }}
                className="drop-shadow-[0_0_35px_rgba(16,185,129,0.35)]"
              >
                <CargoFlowLogo size="xl" />
              </motion.div>

              <div className="flex flex-col items-center gap-2 max-w-xs">
                <h2 className="text-4xl font-extrabold text-white tracking-wider uppercase drop-shadow-md">
                  CargoFlow
                </h2>
                <p className="text-sm font-semibold text-blue-200/90 mt-1">
                  Tu solución inteligente de transporte
                </p>
                <span className="text-xs text-slate-400 mt-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  Toca en cualquier parte para cerrar
                </span>
              </div>
            </div>

            {/* Footer Info */}
            <div className="text-center pb-2">
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Plataforma de Logística & Carga Terrestre
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PWA Install Instructions Modal ─────────────────── */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowInstallModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1,   y: 0  }}
              exit={{    opacity: 0, scale: 0.9,  y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Header del modal */}
              <div className="bg-gradient-to-br from-[#09152b] to-[#0b224d] px-6 pt-7 pb-6 text-center relative flex-shrink-0">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X size={14} />
                </button>
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3">
                  <Download size={26} className="text-white" />
                </div>
                <h2 className="text-white font-bold text-lg leading-tight">Instalar CargoFlow</h2>
                <p className="text-blue-200 text-xs mt-1 leading-relaxed">
                  Para la mejor experiencia y acceso rápido,<br />instala la app en tu dispositivo.
                </p>
              </div>

              <div className="overflow-y-auto no-scrollbar flex-1">
                {/* ⚠️ Nota importante: limpiar caché */}
                <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2.5">
                <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">⚠️</span>
                <div>
                  <p className="text-amber-800 text-xs font-bold mb-0.5">Antes de instalar: limpia el caché</p>
                  <p className="text-amber-700 text-[11px] leading-snug">
                    Si ya instalaste la app anteriormente, debes borrar el caché del navegador para que se instale con las últimas actualizaciones. De lo contrario puede quedar una versión desactualizada.
                  </p>
                  <p className="text-amber-800 text-[11px] font-semibold mt-1.5">
                    Chrome: Menú → Más herramientas → Borrar datos de navegación → Imágenes y archivos en caché ✓
                  </p>
                </div>
              </div>

              {/* Instrucciones por plataforma */}
              <div className="px-4 pb-2 mt-4 space-y-3">

                {/* PC — Chrome / Edge */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                      <rect x="2" y="3" width="20" height="14" rx="2" stroke="#1d4ed8" strokeWidth="1.8"/>
                      <path d="M8 21h8M12 17v4" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-800 text-xs font-bold">En PC — Chrome o Edge</p>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">
                      Haz clic en el ícono de <strong>instalar</strong> (⊕) en la barra de direcciones, o ve al menú <strong>(⋮)</strong> y selecciona <strong>"Instalar CargoFlow"</strong>.
                    </p>
                  </div>
                </div>

                {/* Android — Chrome */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                      <path d="M17 2L7 2M17 2C19.2 2 21 3.8 21 6V18C21 20.2 19.2 22 17 22H7C4.8 22 3 20.2 3 18V6C3 3.8 4.8 2 7 2" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="12" cy="19" r="1" fill="#15803d"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-800 text-xs font-bold">En Android — Chrome</p>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">
                      Toca el menú de <strong>tres puntos (⋮)</strong> arriba a la derecha y selecciona <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar app"</strong>.
                    </p>
                  </div>
                </div>

                {/* iPhone / iPad — Safari */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#374151" strokeWidth="1.8"/>
                      <path d="M12 8v4l3 3" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-800 text-xs font-bold">En iPhone / iPad — Safari</p>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">
                      Toca el botón <strong>Compartir</strong> (□↑) en la barra inferior y selecciona <strong>"Añadir a pantalla de inicio"</strong>. Solo funciona desde Safari.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón instalar directo (Chrome Android/PC) */}
              {pwaInstallPrompt && (
                <div className="px-4 pt-2 pb-1">
                  <button
                    onClick={async () => {
                      await handleInstallPwa();
                      setShowInstallModal(false);
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#09152b] to-[#0b224d] text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Download size={16} />
                    Instalar ahora en este dispositivo
                  </button>
                </div>
              )}

              {/* Footer — cerrar */}
              <div className="px-4 pt-2 pb-5">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="w-full py-2.5 rounded-2xl text-slate-500 text-sm font-semibold hover:bg-slate-100 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Flying Star Animation */}
      <AnimatePresence>
        {animatingStars !== null && (
          <motion.div
            initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
            animate={[
              { scale: 1.5, opacity: 1, x: '-50%', y: '-50%', transition: { duration: 0.5, type: 'spring' } },
              { 
                scale: 0.3, 
                opacity: 0.8, 
                x: 'calc(50vw - 120px)', // Flies directly toward profile capsule!
                y: 'calc(-50vh + 32px)', 
                transition: { delay: 1.2, duration: 0.8, ease: 'easeInOut' } 
              }
            ]}
            exit={{ scale: 0, opacity: 0 }}
            onAnimationComplete={() => {
              // Wait for the flight to reach the target capsule (1.2s delay + 0.8s flight = 2s)
              setTimeout(() => {
                setAnimatingStars(null);
                setCapsuleScale(1.25);
                setTimeout(() => setCapsuleScale(1), 200);
              }, 1800);
            }}
            className="fixed top-1/2 left-1/2 z-[9999] pointer-events-none"
          >
            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 p-6 rounded-full shadow-[0_0_50px_rgba(245,158,11,0.6)] border-4 border-amber-200">
              <Star size={64} fill="currentColor" className="text-white drop-shadow-md animate-pulse" />
              <span className="text-2xl font-black text-amber-950 mt-1">+{animatingStars} ★</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-900 bg-white/40 px-2.5 py-0.5 rounded-full mt-1.5 leading-none">
                ¡Calificación Recibida!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
