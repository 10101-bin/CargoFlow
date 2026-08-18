import { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Trip, ChatMessage, UserRole } from './types';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
import CompleteProfile from './components/CompleteProfile';
import Home from './components/Home';
import Activity from './components/Activity';
import Chat from './components/Chat';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import SplashScreen from './components/SplashScreen';
import NotificationToast from './components/NotificationToast';
import Rating from './components/Rating';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import {
  requestNotificationPermission,
  listenForSWMessages,
  sendInAppNotification,
} from './services/notificationService';

const INITIAL_TRIPS: Trip[] = [];

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'driver',
    text: 'Buenas tardes, ya estoy en el punto de carga. ¿Por qué puerta ingreso?',
    timestamp: '14:30',
  },
  {
    id: 'msg-2',
    sender: 'user',
    text: 'Hola Carlos. Ingresa por la puerta 3, la carga ya está lista en el muelle A.',
    timestamp: '14:32',
    isRead: true,
  },
  {
    id: 'msg-3',
    sender: 'driver',
    text: 'Documentos de remisión recibidos y firmados por bodega.',
    timestamp: '14:45',
    attachmentUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7Ni2J9mIQdEC-_mery1HR1eITP8ujrDv7cUBoos-8uxn654p1cXf6gQNwgBICsftKkSS5jLRUXolNSWMRw5DEtawj4dUcjMGxBYvdh_vbd1jB2QyX0UgF74iwD1g1PX3ffUQpUva-T9vOu0b29_hkFvsB2G5U0XRFvPXvEQWzxGALO9iN7k1A-Zcb35zA1Yvg_m4O83ttx240Nj0EjX5VsWFUW3L9P9Un5HTf3V0bi6My_pyvjLYP',
  }
];

export default function App() {
  const [view, setView] = useState<'login' | 'admin_login' | 'complete_profile' | 'home' | 'activity' | 'chat' | 'dashboard' | 'profile' | 'settings'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/admin')) {
      return 'admin_login';
    }
    const savedView = localStorage.getItem('cf_active_view');
    const savedUser = localStorage.getItem('cf_user_profile');
    if (savedUser && savedView && ['home', 'activity', 'chat', 'dashboard', 'profile', 'settings'].includes(savedView)) {
      return savedView as any;
    }
    return savedUser ? 'home' : 'login';
  });
  
  // Splash Screen State
  const [isSplashActive, setIsSplashActive] = useState<boolean>(true);
  const [splashMessage, setSplashMessage] = useState<string>('Cargando CargoFlow...');
  const [splashSubtext, setSplashSubtext] = useState<string>('Tu solución inteligente de transporte');
  // Helper to get system sounds
  const getSysTone = (type: 'login' | 'logout') => {
    if (localStorage.getItem('cf_sys_sound') === 'false') return undefined;
    const file = localStorage.getItem(`cf_sys_tone_file_${type}`) || 
      (type === 'login' ? '550332__wax_vibe__cyberpunk-bass.wav' : '73577__cyberpunk64bit__boomstick.mp3');
    return `/sounds/${file}`;
  };

  const [splashSound, setSplashSound] = useState<string | undefined>(getSysTone('login'));

  // Selected role
  const [selectedRole, setSelectedRole] = useState<UserRole>(() => {
    return (localStorage.getItem('cf_last_role') as UserRole) || 'conductor';
  });
  
  // Current user state (persisted in localStorage to preserve email & role on page refresh)
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('cf_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      } catch (_) {}
    }
    return {
      name: 'Carlos Rodríguez',
      email: 'carlos.rod@cargoflow.co',
      phone: '+57 311 456 7890',
      role: 'conductor',
      isVerified: true,
      rating: 4.9,
      balance: 1250000,
      plateNumber: 'WYZ-789',
      vehicleType: 'Furgón Mediano',
    };
  });

  // Automatically sync user profile to localStorage whenever user changes
  useEffect(() => {
    if (user && user.email) {
      localStorage.setItem('cf_user_profile', JSON.stringify(user));
      localStorage.setItem('cf_last_role', user.role);
    }
  }, [user]);

  // Database of shipments (trips)
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [activeChatTrip, setActiveChatTrip] = useState<Trip | null>(null);
  
  // Chat messages
  const [chatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; message: string; type?: string; tag?: string; tripId?: string } | null>(null);
  const [ratingTrip, setRatingTrip] = useState<Trip | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Auto-dismiss in-app activeToast banner after 5 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Listen to all users for profile sync (photos, names, ratings)
  useEffect(() => {
    let unsubscribe = () => {};
    const listenToUsers = async () => {
      try {
        const { db } = await import('./config/firebase');
        const { collection, onSnapshot } = await import('firebase/firestore');
        unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
          const list: UserProfile[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || '',
              role: data.role || 'cliente',
              isVerified: data.isVerified || false,
              rating: data.rating || 5,
              balance: data.balance || 0,
              photoURL: data.photoURL || undefined,
              plateNumber: data.plateNumber || undefined,
              vehicleType: data.vehicleType || undefined,
              licenseExpiry: data.licenseExpiry || undefined,
              licensePhoto: data.licensePhoto || undefined,
              cedulaNumber: data.cedulaNumber || undefined,
              cedulaPhoto: data.cedulaPhoto || undefined,
              vehicles: data.vehicles || [],
            });
          });
          setUsersList(list);
        });
      } catch (e) {
        console.warn('Error listening to users collection:', e);
      }
    };
    listenToUsers();
    return () => unsubscribe();
  }, []);

  // ── Mutual Confirmation Completion Handlers ───────────────────────
  const handleRequestCompletion = async (trip: Trip) => {
    const nowIso = new Date().toISOString();
    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, completionRequestedBy: user.email, completionRequestedAt: nowIso } : t));

    try {
      const { db } = await import('./config/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'trips', trip.id), {
        completionRequestedBy: user.email,
        completionRequestedAt: nowIso
      });

      const { sendDbNotification } = await import('./services/notificationService');
      const counterpartEmail = user.email === trip.clienteId ? trip.conductorId : trip.clienteId;
      if (counterpartEmail) {
        const requesterRoleName = user.role === 'conductor' ? 'El conductor' : 'El cliente';
        sendDbNotification(
          counterpartEmail,
          '🏁 Solicitud de Finalización',
          `${requesterRoleName} (${user.name}) solicita finalizar el servicio #${trip.id}. Ingresa a Actividad para confirmar la entrega.`,
          `completion-req-${trip.id}`
        );
      }

      setActiveToast({
        id: `req-done-${Date.now()}`,
        title: '🏁 Solicitud enviada',
        message: 'Esperando confirmación de la contraparte para cerrar el servicio.',
        type: 'info'
      });
    } catch (e) {
      console.warn('Error requesting trip completion:', e);
    }
  };

  const handleConfirmCompletion = async (trip: Trip) => {
    await handleCompleteTrip(trip);
  };

  const handleRejectCompletion = async (trip: Trip) => {
    const requesterEmail = trip.completionRequestedBy;
    setTrips(prev => prev.map(t => {
      if (t.id === trip.id) {
        const copy = { ...t };
        delete copy.completionRequestedBy;
        delete copy.completionRequestedAt;
        return copy;
      }
      return t;
    }));

    try {
      const { db } = await import('./config/firebase');
      const { doc, updateDoc, deleteField } = await import('firebase/firestore');
      await updateDoc(doc(db, 'trips', trip.id), {
        completionRequestedBy: deleteField(),
        completionRequestedAt: deleteField()
      });

      if (requesterEmail) {
        const { sendDbNotification } = await import('./services/notificationService');
        sendDbNotification(
          requesterEmail,
          '❌ Solicitud Rechazada',
          `La solicitud de finalización para el flete #${trip.id} fue rechazada por la contraparte.`,
          `completion-rej-${trip.id}`,
          'warning'
        );
      }

      setActiveToast({
        id: `req-rej-${Date.now()}`,
        title: 'Solicitud rechazada',
        message: 'Has rechazado la solicitud de finalización del servicio.',
        type: 'info'
      });
    } catch (e) {
      console.warn('Error rejecting trip completion:', e);
    }
  };

  const handleCompleteTrip = async (trip: Trip) => {
    setTrips(prev => prev.map(t => t.id === trip.id ? { ...t, status: 'COMPLETADO' } : t));
    setRatingTrip(trip);

    try {
      const { db } = await import('./config/firebase');
      const { doc, updateDoc, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'trips', trip.id), {
        status: 'COMPLETADO',
        completedAt: new Date().toISOString()
      });

      // Transaction: Deduct client, credit driver (minus 10% platform fee)
      const clientUser = usersList.find(u => u.email === trip.clienteId && u.role === 'cliente');
      const conductorUser = usersList.find(u => u.email === trip.conductorId && u.role === 'conductor');

      if (clientUser && clientUser.id) {
        await updateDoc(doc(db, 'users', clientUser.id), {
          balance: Math.max(0, (clientUser.balance || 0) - trip.price)
        });
      }
      if (conductorUser && conductorUser.id) {
        await updateDoc(doc(db, 'users', conductorUser.id), {
          balance: (conductorUser.balance || 0) + (trip.price * 0.9)
        });
      }

      // Update local state if current user is involved
      if (user.email === trip.clienteId) {
        setUser(prev => ({ ...prev, balance: Math.max(0, prev.balance - trip.price) }));
      } else if (user.email === trip.conductorId) {
        setUser(prev => ({ ...prev, balance: prev.balance + (trip.price * 0.9) }));
      }

      await addDoc(collection(db, `trips/${trip.id}/chat_messages`), {
        senderEmail: 'system@cargoflow.com',
        senderName: 'CargoFlow System',
        text: '✅ Servicio Completado con Éxito. ¡Gracias por usar CargoFlow!',
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
        createdAt: serverTimestamp()
      });

      const { sendDbNotification } = await import('./services/notificationService');
      const targetEmail = user.email === trip.clienteId ? trip.conductorId : trip.clienteId;
      if (targetEmail) {
        const cleanTripId = trip.id.startsWith('#') ? trip.id : `#${trip.id}`;
        sendDbNotification(
          targetEmail,
          '🎉 Servicio Finalizado',
          `El flete ${cleanTripId} ha sido completado. ¡Por favor califica la experiencia!`,
          `trip-completed-${trip.id}`,
          'info'
        );
      }
    } catch (e) {
      console.warn('Error completing trip in Firestore:', e);
    }
  };

  const handleSaveRating = async (stars: number, comment: string, tip?: number) => {
    if (!ratingTrip) return;
    const isClient = user.email === ratingTrip.clienteId;
    const updatedData = isClient
      ? { ratedByCliente: true, clienteRating: { stars, comment, tip: tip || 0 } }
      : { ratedByConductor: true, conductorRating: { stars, comment } };

    // Optimistic update
    setTrips(prev => prev.map(t => t.id === ratingTrip.id ? { ...t, ...updatedData } : t));

    const currentTrip = ratingTrip;
    setRatingTrip(null);

    try {
      const { db } = await import('./config/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'trips', currentTrip.id), updatedData);

      // Apply tip transaction if client rated with a tip
      if (isClient && tip && tip > 0) {
        const clientUser = usersList.find(u => u.email === currentTrip.clienteId && u.role === 'cliente');
        const conductorUser = usersList.find(u => u.email === currentTrip.conductorId && u.role === 'conductor');

        if (clientUser && clientUser.id) {
          await updateDoc(doc(db, 'users', clientUser.id), {
            balance: Math.max(0, (clientUser.balance || 0) - tip)
          });
        }
        if (conductorUser && conductorUser.id) {
          await updateDoc(doc(db, 'users', conductorUser.id), {
            balance: (conductorUser.balance || 0) + tip
          });
        }

        // Update local state if involved
        if (user.email === currentTrip.clienteId) {
          setUser(prev => ({ ...prev, balance: Math.max(0, prev.balance - tip) }));
        } else if (user.email === currentTrip.conductorId) {
          setUser(prev => ({ ...prev, balance: prev.balance + tip }));
        }
      }

      const recipientEmail = isClient ? currentTrip.conductorId : currentTrip.clienteId;
      const recipientRole = isClient ? 'conductor' : 'cliente';
      if (recipientEmail) {
        // Recalculate average stars from current trips state plus latest update
        const updatedTrips = trips.map(t => t.id === currentTrip.id ? { ...t, ...updatedData } : t);
        const ratedTrips = updatedTrips.filter(t => 
          recipientRole === 'conductor'
            ? (t.conductorId === recipientEmail && t.ratedByCliente && t.clienteRating)
            : (t.clienteId === recipientEmail && t.ratedByConductor && t.conductorRating)
        );
        let newRating = 5;
        if (ratedTrips.length > 0) {
          const sum = ratedTrips.reduce((acc, t) => 
            acc + (recipientRole === 'conductor' ? (t.clienteRating?.stars || 5) : (t.conductorRating?.stars || 5))
          , 0);
          newRating = parseFloat((sum / ratedTrips.length).toFixed(1));
        }

        const recipientUser = usersList.find(u => u.email === recipientEmail && u.role === recipientRole);
        if (recipientUser && recipientUser.id) {
          await updateDoc(doc(db, 'users', recipientUser.id), {
            rating: newRating
          });
        }

        const { sendDbNotification } = await import('./services/notificationService');
        sendDbNotification(
          recipientEmail,
          '⭐ ¡Tienes una calificación recibida!',
          `${user.name} te ha calificado con ${stars} estrellas. Toca aquí para calificar la experiencia.`,
          `rate-trip-${currentTrip.id}`,
          'rating'
        );
      }

      setActiveToast({
        id: `rating-done-${Date.now()}`,
        title: '⭐ ¡Calificación guardada!',
        message: tip ? `Calificaste con ${stars}★ y $${tip.toLocaleString('es-CO')} de propina.` : `Calificaste con ${stars}★.`,
        type: 'info'
      });
    } catch (e) {
      console.warn('Error saving rating:', e);
    }
  };

  // Play pleasant 2-tone chime sound
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio sound playback:', e);
    }
  }, []);

  // Listen to unread notifications for audio chime + in-app toast + bottom nav badge
  useEffect(() => {
    if (!user.email || !['home', 'activity', 'chat', 'profile'].includes(view)) return;
    let unsubscribe: () => void;
    let isInitial = true;

    const setupListener = async () => {
      try {
        const { db } = await import('./config/firebase');
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');

        const q = query(
          collection(db, 'notifications'),
          where('userId', 'in', [user.email, 'all_conductors'])
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            if (change.type === 'added' && !data.read) {
              if (!isInitial) {
                const isFreightOffer = data.userId === 'all_conductors' || data.tag?.startsWith('trip-new-') || data.title?.includes('Flete');
                const isConductorInactive = user.role === 'conductor' && user.isAvailable === false;

                // Silence new freight offer notifications if conductor is set to Inactive / No Disponible
                if (!isFreightOffer || !isConductorInactive) {
                  playNotificationSound();
                  setActiveToast({
                    id: change.doc.id,
                    title: data.title || 'Nueva Notificación',
                    message: data.body || data.message || '',
                    type: data.type || (data.tag?.includes('chat') || data.title?.includes('Mensaje') ? 'chat' : 'info'),
                    tag: data.tag || undefined,
                    tripId: data.tag?.startsWith('chat-') ? data.tag.replace('chat-', '') : undefined,
                  });
                }
              }
            }
          });

          const unreadCount = snapshot.docs.filter(d => !d.data().read && (d.data().type === 'chat' || d.data().tag?.includes('chat') || d.data().title?.includes('Mensaje'))).length;
          setUnreadChatCount(unreadCount);
          isInitial = false;
        });
      } catch (e) {
        console.warn('Notification snapshot error:', e);
      }
    };

    setupListener();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user.email, view, playNotificationSound]);

  // Clear unread chat badge and mark notifications read when entering chat view
  useEffect(() => {
    if (view === 'chat' && user.email) {
      setUnreadChatCount(0);
      (async () => {
        try {
          const { db } = await import('./config/firebase');
          const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
          const q = query(
            collection(db, 'notifications'),
            where('userId', 'in', [user.email, 'all_conductors']),
            where('read', '==', false)
          );
          const snap = await getDocs(q);
          snap.forEach((d) => {
            const data = d.data();
            if (data.type === 'chat' || data.tag?.includes('chat') || data.title?.includes('Mensaje')) {
              updateDoc(doc(db, 'notifications', d.id), { read: true }).catch(() => null);
            }
          });
        } catch (_) {}
      })();
    }
  }, [view, user.email]);

  // Splash screen on initial app load / refresh (2.6s duration)
  useEffect(() => {
    setSplashMessage('Iniciando CargoFlow...');
    setSplashSubtext('Preparando tu panel logístico');
    
    // Check localStorage for the custom login sound
    const sysSoundEnabled = localStorage.getItem('cf_sys_sound') !== 'false';
    const loginToneFile = localStorage.getItem('cf_sys_tone_file_login') || '550332__wax_vibe__cyberpunk-bass.wav';
    setSplashSound(sysSoundEnabled ? `/sounds/${loginToneFile}` : undefined);

    const timer = setTimeout(() => {
      setIsSplashActive(false);
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  // Request notification permission once user is logged in
  // and listen for SW notification click messages
  const notifPermRequestedRef = useRef(false);
  useEffect(() => {
    if (!['home', 'activity', 'chat', 'profile'].includes(view)) return;
    if (notifPermRequestedRef.current) return;
    notifPermRequestedRef.current = true;

    // Ask for permission after a short delay (avoids permission prompt on first render)
    const t = setTimeout(() => {
      requestNotificationPermission().then((perm) => {
        if (perm === 'granted') {
          sendInAppNotification({
            title: '¡Notificaciones activadas!',
            body:  'Recibirás alertas de fletes, estado de envíos y mensajes.',
            tag:   'cargoflow-success',
          });
        }
      });
    }, 3000);

    // Listen for SW notification click -> navigate within app
    const unlistenSW = listenForSWMessages((url) => {
      if (url.includes('chat'))     setView('chat');
      else if (url.includes('activity')) setView('activity');
      else setView('home');
    });

    return () => {
      clearTimeout(t);
      unlistenSW();
    };
  }, [view]);

  // Listen for active Firebase Auth session and read full profile from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Merge base auth data first
        setUser(prev => ({
          ...prev,
          name: firebaseUser.displayName || prev.name,
          email: firebaseUser.email || prev.email,
          photoURL: firebaseUser.photoURL || prev.photoURL,
        }));

        // Read the persisted Firestore profile to get isComplete and role-specific fields
        try {
          const lastRole = localStorage.getItem('cf_last_role') || 'cliente';
          const docRef = doc(db, 'users', `${firebaseUser.uid}_${lastRole}`);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const firestoreProfile = snap.data() as UserProfile;
            const activeRole = firestoreProfile.role || lastRole as any;
            setUser(prev => ({
              ...prev,
              ...firestoreProfile,
              role: activeRole,
              name: firebaseUser.displayName || firestoreProfile.name || prev.name,
              email: firebaseUser.email || firestoreProfile.email || prev.email,
              photoURL: firebaseUser.photoURL || firestoreProfile.photoURL || prev.photoURL,
            }));
            if (firestoreProfile.isComplete || activeRole === 'admin') {
              setView('home');
            } else {
              setView('complete_profile');
            }
          } else {
            // Fallback to checking both if lastRole didn't match (for new devices)
            for (const role of ['conductor', 'cliente']) {
              const docRef = doc(db, 'users', `${firebaseUser.uid}_${role}`);
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                const firestoreProfile = snap.data() as UserProfile;
                const activeRole = firestoreProfile.role || role as any;
                localStorage.setItem('cf_last_role', role);
                setUser(prev => ({
                  ...prev,
                  ...firestoreProfile,
                  role: activeRole,
                  name: firebaseUser.displayName || firestoreProfile.name || prev.name,
                  email: firebaseUser.email || firestoreProfile.email || prev.email,
                  photoURL: firebaseUser.photoURL || firestoreProfile.photoURL || prev.photoURL,
                }));
                if (firestoreProfile.isComplete || activeRole === 'admin') {
                  setView('home');
                } else {
                  setView('complete_profile');
                }
                break;
              }
            }
          }
        } catch (e) {
          console.warn('Could not read Firestore profile on auth change:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);


  const triggerSplash = (
    msg: string, 
    sub: string, 
    sound: string | undefined = undefined, 
    durationMs: number = 2600, 
    callback: () => void
  ) => {
    setSplashMessage(msg);
    setSplashSubtext(sub);
    setSplashSound(sound);
    setIsSplashActive(true);
    setTimeout(() => {
      callback();
      setIsSplashActive(false);
    }, durationMs);
  };

  // Bottom Navigation View Change
  const handleViewChange = (newView: 'home' | 'activity' | 'chat' | 'dashboard' | 'profile') => {
    if (newView !== 'chat') {
      setActiveChatTrip(null);
    }
    setView(newView);
  };

  // Login completion (Checks if profile is completed or directs to complete_profile)
  const handleLoginSuccess = (profileData: any) => {
    const role = profileData.role || selectedRole;
    setSelectedRole(role);
    localStorage.setItem('cf_last_role', role);
    const isProfileComplete = Boolean(profileData.isComplete);
    const updatedUser: UserProfile = {
      ...profileData,
      role,
      isComplete: isProfileComplete,
      plateNumber: profileData.plateNumber || (role === 'conductor' ? 'WYZ-789' : undefined),
      isVerified: true,
    };
    setUser(updatedUser);

    // Set view IMMEDIATELY underneath splash screen to eliminate any blank/white screen
    const targetView = isProfileComplete ? 'home' : 'complete_profile';
    setView(targetView);

    // Trigger splash screen overlay and sound
    triggerSplash(
      'Iniciando sesión...', 
      `Bienvenido, ${updatedUser.name.split(' ')[0]}`, 
      getSysTone('login'), 
      2600, 
      () => {
        // Splash completed
      }
    );
  };

  // Complete profile completion (Driver vehicle/doc step — only conductors reach here)
  const handleCompleteProfile = (data: {
    fullName: string;
    idNumber: string;
    plateNumber: string;
    vehicleType: string;
  }) => {
    const updatedProfile = {
      name: data.fullName,
      plateNumber: data.plateNumber,
      vehicleType: data.vehicleType,
      isVerified: true,
      isComplete: true,
      documentsUploaded: {
        cedula: true,
        licencia: true,
        soat: true,
        propiedad: true,
      }
    };

    setUser(prev => ({ ...prev, ...updatedProfile }));
    setView('home');

    // Persist to Firestore AND localStorage (localStorage is the offline fallback)
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      const role = user.role || 'conductor';
      const fullProfile = { ...user, ...updatedProfile };

      // 1. Save to localStorage immediately (works offline)
      try {
        localStorage.setItem(`cf_profile_${firebaseUser.uid}_${role}`, JSON.stringify(fullProfile));
      } catch (_) {}

      // 2. Save to Firestore (async, may fail if offline — that's OK)
      const docRef = doc(db, 'users', `${firebaseUser.uid}_${role}`);
      updateDoc(docRef, updatedProfile)
        .catch(() => {
          setDoc(docRef, fullProfile)
            .catch((e: Error) => console.warn('Firestore setDoc fallback error:', e));
        });
    }

    triggerSplash(
      'Verificando perfil...', 
      'Configurando tu vehículo en CargoFlow', 
      getSysTone('login'), 
      2600, 
      () => {}
    );
  };

  // Create Shipment helper
  const handleCreateShipment = async (newTrip: Trip) => {
    // Optimistic local update
    setTrips(prev => [newTrip, ...prev]);
    
    // Save to Firestore so conductors receive it in real-time
    try {
      const { db } = await import('./config/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'trips', newTrip.id), {
        ...newTrip,
        clienteId: user.email,
        clienteName: user.name,
        clientePhotoURL: user.photoURL || null,
        createdAt: new Date().toISOString()
      });

      const { sendDbNotification } = await import('./services/notificationService');
      sendDbNotification(
        'all_conductors',
        '📦 ¡Nuevo Flete Disponible!',
        `${user.name} solicita flete (${newTrip.vehicleType}): ${newTrip.origin} → ${newTrip.destination} por $${newTrip.price.toLocaleString('es-CO')} COP`,
        `trip-new-${newTrip.id}`
      );
    } catch (e) {
      console.warn('Could not save trip to Firestore:', e);
    }
  };

  const handleEditTrip = async (updatedTrip: Trip) => {
    // Optimistic local update
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    setEditingTrip(null);
    
    try {
      const { db } = await import('./config/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      // eslint-origin-ignore
      const { id, ...rest } = updatedTrip;
      await updateDoc(doc(db, 'trips', updatedTrip.id), rest);
    } catch (e) {
      console.warn('Could not update trip in Firestore:', e);
    }
  };

  const handleCancelTrip = async (tripId: string) => {
    // Optimistic local update
    setTrips(prev => prev.filter(t => t.id !== tripId));
    
    // Remove from Firestore
    try {
      const { db } = await import('./config/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'trips', tripId));
    } catch (e) {
      console.warn('Could not delete trip from Firestore:', e);
    }
  };

  const handleAcceptTrip = async (tripId: string, assignedPlate?: string, assignedType?: string) => {
    const plate = assignedPlate || user.plateNumber || '';
    const vtype = assignedType || user.vehicleType || '';

    // Optimistic local update
    setTrips(prev => prev.map(t => 
      t.id === tripId 
        ? { 
            ...t, 
            status: 'EN CAMINO', 
            conductorId: user.email, 
            conductorName: user.name,
            conductorPlate: plate,
            conductorVehicleType: vtype,
            conductorPhotoURL: user.photoURL || undefined
          } 
        : t
    ));
    
    // Firestore update
    try {
      const { db } = await import('./config/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'EN CAMINO',
        conductorId: user.email,
        conductorName: user.name,
        conductorPlate: plate || null,
        conductorVehicleType: vtype || null,
        conductorPhotoURL: user.photoURL || null
      });

      const targetTrip = trips.find(t => t.id === tripId);
      if (targetTrip?.clienteId) {
        const { sendDbNotification } = await import('./services/notificationService');
        sendDbNotification(
          targetTrip.clienteId,
          '🚚 ¡Tu Flete ha sido Aceptado!',
          `${user.name} (${vtype || 'Vehículo'} - Placa: ${plate || 'asignada'}) aceptó tu servicio de ${targetTrip.origin} a ${targetTrip.destination}.`,
          `trip-accepted-${tripId}`
        );
      }
    } catch (e) {
      console.warn('Could not accept trip in Firestore:', e);
    }
  };

  const handleCounterOffer = async (tripId: string, price: number, assignedPlate?: string, assignedType?: string) => {
    const plate = assignedPlate || user.plateNumber || '';
    const vtype = assignedType || user.vehicleType || '';

    // Optimistic update
    setTrips(prev => prev.map(t => 
      t.id === tripId 
        ? { 
            ...t, 
            counterOffer: { 
              price, 
              conductorId: user.email, 
              conductorName: user.name,
              assignedPlate: plate,
              assignedType: vtype,
              conductorPhotoURL: user.photoURL || undefined
            } 
          } 
        : t
    ));
    
    try {
      const { db } = await import('./config/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'trips', tripId), {
        counterOffer: { 
          price, 
          conductorId: user.email, 
          conductorName: user.name,
          assignedPlate: plate || null,
          assignedType: vtype || null,
          conductorPhotoURL: user.photoURL || null
        }
      });

      const targetTrip = trips.find(t => t.id === tripId);
      if (targetTrip?.clienteId) {
        const { sendDbNotification } = await import('./services/notificationService');
        sendDbNotification(
          targetTrip.clienteId,
          '🏷️ ¡Nueva Oferta de Conductor!',
          `${user.name} propone realizar tu viaje por $${price.toLocaleString('es-CO')} COP con vehículo ${vtype || 'asignado'} (Placa: ${plate || 'pendiente'}).`,
          `trip-offer-${tripId}`
        );
      }
    } catch (e) {
      console.warn('Could not add counter offer:', e);
    }
  };

  const handleResolveCounterOffer = async (tripId: string, accept: boolean) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip || !trip.counterOffer) return;

    if (accept) {
      // Optimistic update
      setTrips(prev => prev.map(t => 
        t.id === tripId 
          ? { 
              ...t, 
              status: 'EN CAMINO', 
              price: trip.counterOffer!.price, 
              conductorId: trip.counterOffer!.conductorId, 
              conductorName: trip.counterOffer!.conductorName,
              conductorPlate: trip.counterOffer!.assignedPlate || '',
              conductorVehicleType: trip.counterOffer!.assignedType || '',
              conductorPhotoURL: trip.counterOffer!.conductorPhotoURL || undefined,
              counterOffer: undefined 
            } 
          : t
      ));
      
      try {
        const { db } = await import('./config/firebase');
        const { doc, updateDoc, deleteField } = await import('firebase/firestore');
        await updateDoc(doc(db, 'trips', tripId), {
          status: 'EN CAMINO',
          price: trip.counterOffer.price,
          conductorId: trip.counterOffer.conductorId,
          conductorName: trip.counterOffer.conductorName,
          conductorPlate: trip.counterOffer.assignedPlate || null,
          conductorVehicleType: trip.counterOffer.assignedType || null,
          conductorPhotoURL: trip.counterOffer.conductorPhotoURL || null,
          counterOffer: deleteField()
        });
      } catch (e) {
        console.warn('Could not accept counter offer:', e);
      }
    } else {
      // Reject offer
      setTrips(prev => prev.map(t => 
        t.id === tripId 
          ? { ...t, counterOffer: undefined } 
          : t
      ));
      
      try {
        const { db } = await import('./config/firebase');
        const { doc, updateDoc, deleteField } = await import('firebase/firestore');
        await updateDoc(doc(db, 'trips', tripId), {
          counterOffer: deleteField()
        });
      } catch (e) {
        console.warn('Could not reject counter offer:', e);
      }
    }
  };


  const knownTripsRef = useRef<Map<string, string>>(new Map());
  const isInitialSnapshotRef = useRef<boolean>(true);

  // Listen to new trips in real-time
  useEffect(() => {
    let unsubscribe = () => {};
    isInitialSnapshotRef.current = true;

    const listenToTrips = async () => {
      try {
        const { auth, db } = await import('./config/firebase');
        if (!auth.currentUser && !user.email) return;

        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { notify } = await import('./services/notificationService');

        let q;
        if (user.role === 'conductor' || user.role === 'admin') {
          // Conductors listen to all pending trips or trips accepted by them
          q = query(collection(db, 'trips')); 
        } else {
          // Clients listen to their own trips
          q = query(collection(db, 'trips'), where('clienteId', '==', user.email));
        }

        unsubscribe = onSnapshot(
          q, 
          (snapshot) => {
            const isInitial = isInitialSnapshotRef.current;

            snapshot.docChanges().forEach((change) => {
              const tripData = change.doc.data() as Trip;
              const prevStatus = knownTripsRef.current.get(tripData.id);

              if (change.type === 'added' || change.type === 'modified') {
                // Add or update it locally
                setTrips(prev => {
                  const exists = prev.some(t => t.id === tripData.id);
                  if (exists) {
                    return prev.map(t => t.id === tripData.id ? tripData : t);
                  }
                  return [tripData, ...prev];
                });

                if (!isInitial) {
                  // NOTIFICATIONS FOR REAL-TIME UPDATES

                  // 1. Client creates trip -> Active Conductors get notified
                  if (change.type === 'added' && tripData.status === 'PENDIENTE') {
                    const isConductorAvailable = user.isAvailable ?? true;
                    if ((user.role === 'conductor' || user.role === 'admin') && tripData.clienteId !== user.email && isConductorAvailable) {
                      notify({
                        title: '📦 ¡Nuevo Flete Disponible!',
                        body: `${tripData.clienteName || 'Un cliente'} solicita flete (${tripData.vehicleType}): ${tripData.origin} → ${tripData.destination} por $${tripData.price.toLocaleString('es-CO')} COP`,
                        tag: `trip-new-${tripData.id}`,
                        url: '/activity',
                        sound: localStorage.getItem('cf_notif_sound') !== 'false'
                          ? `/sounds/${localStorage.getItem('cf_notif_tone_file') || 'notification.mp3'}`
                          : undefined,
                      });
                    }
                  }

                  // 2. Conductor accepts trip -> Client gets notified
                  if (tripData.status === 'EN CAMINO' && prevStatus === 'PENDIENTE') {
                    if (user.email === tripData.clienteId) {
                      notify({
                        title: '🚚 ¡Tu Flete ha sido Aceptado!',
                        body: `${tripData.conductorName || 'El conductor'} (${tripData.conductorVehicleType || tripData.vehicleType} - Placa: ${tripData.conductorPlate || 'asignada'}) aceptó tu servicio ${tripData.origin} → ${tripData.destination}.`,
                        tag: `trip-accepted-${tripData.id}`,
                        url: '/activity',
                        sound: localStorage.getItem('cf_notif_sound') !== 'false'
                          ? `/sounds/${localStorage.getItem('cf_notif_tone_file') || 'notification.mp3'}`
                          : undefined,
                      });
                    }
                  }

                  // 3. Conductor makes counteroffer -> Client gets notified
                  if (tripData.counterOffer && user.email === tripData.clienteId && prevStatus !== 'EN CAMINO') {
                    notify({
                      title: '🏷️ ¡Nueva Oferta de Conductor!',
                      body: `${tripData.counterOffer.conductorName} propone realizar tu viaje por $${tripData.counterOffer.price.toLocaleString('es-CO')} COP.`,
                      tag: `trip-offer-${tripData.id}`,
                      url: '/activity',
                      sound: localStorage.getItem('cf_notif_sound') !== 'false'
                        ? `/sounds/${localStorage.getItem('cf_notif_tone_file') || 'notification.mp3'}`
                        : undefined,
                    });
                  }
                }

                knownTripsRef.current.set(tripData.id, tripData.status);
              } else if (change.type === 'removed') {
                const tripData = change.doc.data() as Trip;
                knownTripsRef.current.delete(tripData.id);
                setTrips(prev => prev.filter(t => t.id !== tripData.id));
              }
            });

            isInitialSnapshotRef.current = false;
          },
          (err) => {
            console.warn('Firestore snapshot error handled:', err.message);
          }
        );
      } catch (e) {
        console.warn('Real-time trip listening failed:', e);
      }
    };
    
    listenToTrips();
    return () => unsubscribe();
  }, [user.role, user.email]);

  // Deposit funds to wallet helper
  const handleDeposit = (amount: number) => {
    setUser(prev => ({
      ...prev,
      balance: prev.balance + amount,
    }));
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const { auth, db } = await import('./config/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      if (auth.currentUser && user.role) {
        // Try updating both possible role documents to ensure we catch the correct one
        // especially for admin users who might be using either a conductor or cliente doc
        const possibleRoles = ['conductor', 'cliente'];
        for (const r of possibleRoles) {
          try {
            const docRef = doc(db, 'users', `${auth.currentUser.uid}_${r}`);
            await updateDoc(docRef, updates);
          } catch(e) {}
        }
      }
    } catch (e) {
      console.error('Error updating profile in DB:', e);
    }

    setUser(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Linked accounts list (Instagram style quick account switcher)
  const [linkedAccounts, setLinkedAccounts] = useState<UserProfile[]>([
    {
      name: 'Luis Fernando (Cliente)',
      email: 'lfalzatel29@gmail.com',
      phone: '+57 300 123 4567',
      role: 'cliente',
      isVerified: true,
      rating: 5.0,
      balance: 1500000,
    }
  ]);

  // Switch account helper (Instagram style)
  const handleSwitchAccount = (targetAccount: UserProfile) => {
    triggerSplash(
      'Cambiando de cuenta...', 
      `Accediendo como ${targetAccount.name.split(' ')[0]}`, 
      getSysTone('login'), 
      2600, 
      () => {
        localStorage.setItem('cf_last_role', targetAccount.role);
        localStorage.setItem('cf_user_profile', JSON.stringify(targetAccount));
        setLinkedAccounts(prev => {
          const filtered = prev.filter(acc => !(acc.email === targetAccount.email && acc.role === targetAccount.role));
          const exists = prev.some(acc => acc.email === user.email && acc.role === user.role);
          if (!exists) {
            return [...filtered, user];
          }
          return filtered;
        });
        setUser(targetAccount);
        setView('home');
      }
    );
  };

  // Add new account helper (Triggers Google Auth)
  const handleAddAccount = async () => {
    try {
      const { loginWithGoogle } = await import('./services/authService');
      const targetRole = user.role === 'conductor' ? 'cliente' : 'conductor';
      localStorage.setItem('cf_last_role', targetRole);
      const newProfile = await loginWithGoogle(targetRole);
      localStorage.setItem('cf_user_profile', JSON.stringify(newProfile));
      
      triggerSplash(
        'Conectando nueva cuenta...', 
        `Añadiendo a ${newProfile.name.split(' ')[0]}`, 
        getSysTone('login'), 
        2600, 
        () => {
          setLinkedAccounts(prev => {
            const exists = prev.some(acc => acc.email === user.email && acc.role === user.role);
            if (!exists) {
              return [...prev, user];
            }
            return prev;
          });
          setUser(newProfile);
          setView('home');
        }
      );
    } catch (e) {
      console.warn('Add account notice:', e);
    }
  };

  // Reset/Logout helper (plays logout sound)
  const handleLogout = async () => {
    triggerSplash(
      'Cerrando sesión...', 
      '¡Hasta pronto!', 
      getSysTone('logout'), 
      2600, 
      async () => {
        try {
          const { logoutUser } = await import('./services/authService');
          await logoutUser();
        } catch (e) {
          console.warn('Logout error:', e);
        }
        localStorage.removeItem('cf_user_profile');
        setView('login');
      }
    );
  };

  return (
    <>
      {/* Global in-app notification toasts — rendered above everything */}
      <NotificationToast />

      <div className={`bg-background text-on-surface ${
        ['home', 'activity', 'chat', 'dashboard', 'profile', 'settings'].includes(view)
          ? 'h-screen flex flex-col overflow-hidden'
          : 'min-h-screen'
      }`}>
      {/* Global Splash Screen Overlay with Audio */}
      <AnimatePresence>
        {isSplashActive && (
          <SplashScreen 
            message={splashMessage} 
            subtext={splashSubtext} 
            soundUrl={splashSound}
          />
        )}
      </AnimatePresence>

      {/* Global Header on main authenticated dashboards — flex-none so it doesn't steal from content area */}
      {['home', 'activity', 'chat', 'dashboard', 'profile', 'settings'].includes(view) && (
        <div className="flex-none">
          <Header
            user={user}
            trips={trips}
            linkedAccounts={linkedAccounts}
            onNavigateToView={handleViewChange}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
            onAddAccount={handleAddAccount}
            onSwitchAccount={handleSwitchAccount}
            unreadCount={2}
          />
        </div>
      )}

      {/* Main content area — flex-1 so it takes exactly the remaining space */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className={`flex flex-col ${
            ['home', 'settings'].includes(view)
              ? 'flex-1 overflow-hidden'
              : ['activity', 'chat', 'dashboard', 'profile'].includes(view)
              ? 'flex-1 overflow-y-auto pb-5'
              : 'min-h-screen'
          }`}
        >
          {view === 'login' && (
            <Login 
              currentRole={selectedRole}
              onLoginSuccess={handleLoginSuccess}
              onOpenAdminLogin={() => setView('admin_login')}
            />
          )}

          {view === 'admin_login' && (
            <AdminLogin
              onAdminLoginSuccess={(adminProfile) => {
                setUser(adminProfile);
                setView('dashboard');
              }}
              onBackToNormalLogin={() => setView('login')}
            />
          )}

          {view === 'complete_profile' && (
            <CompleteProfile 
              initialName={user.name}
              onComplete={handleCompleteProfile} 
              onBack={() => setView('login')} 
            />
          )}

          {view === 'home' && (
            <Home 
              user={user} 
              trips={trips}
              usersList={usersList}
              pendingTrip={
                (user.role === 'conductor' && user.isAvailable === false)
                  ? undefined
                  : trips.find(t => t.status === 'PENDIENTE' && t.clienteId !== user.email)
              }
              editingTrip={editingTrip}
              onCloseEditing={() => setEditingTrip(null)}
              onCreateShipment={handleCreateShipment} 
              onEditShipment={handleEditTrip}
              onAcceptTrip={handleAcceptTrip}
              onCounterOfferTrip={handleCounterOffer}
              onNavigateToView={handleViewChange}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
            />
          )}

          {view === 'activity' && (
            <Activity 
              user={user}
              trips={trips} 
              usersList={usersList}
              onNavigateToChat={(trip) => {
                setActiveChatTrip(trip || null);
                setView('chat');
              }} 
              onCancelTrip={handleCancelTrip}
              onEditTrip={(trip) => {
                setEditingTrip(trip);
                setView('home');
              }}
              onResolveCounterOffer={handleResolveCounterOffer}
              onCompleteTrip={handleCompleteTrip}
              onRequestCompletion={handleRequestCompletion}
              onConfirmCompletion={handleConfirmCompletion}
              onRejectCompletion={handleRejectCompletion}
              onOpenRating={(trip) => setRatingTrip(trip)}
            />
          )}

          {/* Rating Service Modal */}
          {ratingTrip && (() => {
            const isClient = user.email === ratingTrip.clienteId;
            const partnerEmail = isClient ? ratingTrip.conductorId : ratingTrip.clienteId;
            const liveUser = usersList.find(u => u.email === partnerEmail);
            const displayPhoto = liveUser?.photoURL || (isClient ? ratingTrip.conductorPhotoURL : ratingTrip.clientePhotoURL);
            const displayName = liveUser?.name || (isClient ? (ratingTrip.conductorName || 'Conductor Asignado') : (ratingTrip.clienteName || 'Cliente Solicitante'));

            return (
              <Rating
                driverName={displayName}
                photoURL={displayPhoto}
                tripId={`#CF-${ratingTrip.id}`}
                onClose={() => setRatingTrip(null)}
                onSubmit={(stars, comment, tip) => handleSaveRating(stars, comment, tip)}
              />
            );
          })()}

          {view === 'chat' && (
            <Chat 
              user={user}
              activeTrip={activeChatTrip}
              trips={trips}
              usersList={usersList}
              initialMessages={chatMessages} 
              onBack={() => setView('activity')} 
              onSelectTripChat={(trip) => setActiveChatTrip(trip)}
            />
          )}

          {view === 'dashboard' && (
            <Dashboard 
              user={user}
              trips={trips}
              usersList={usersList}
              onNavigateToView={handleViewChange}
            />
          )}

          {view === 'profile' && (
            <Profile 
              user={user} 
              trips={trips}
              onUpdateProfile={handleUpdateProfile} 
              onDeposit={handleDeposit} 
              onLogout={handleLogout}
              onNavigateToSettings={() => setView('settings')}
            />
          )}

          {view === 'settings' && (
            <Settings
              user={user}
              onBack={() => setView('home')}
              onLogout={handleLogout}
              onInstallApp={() => {
                const headerEvent = new CustomEvent('cargoflow:install-app');
                window.dispatchEvent(headerEvent);
              }}
              onShareApp={() => {
                 if (navigator.share) {
                    navigator.share({
                      title: 'CargoFlow',
                      text: 'Únete a CargoFlow, la plataforma de logística inteligente.',
                      url: window.location.origin
                    }).catch(() => {});
                 }
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating In-App Toast Banner */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            onClick={() => {
              if (activeToast.type === 'chat' || activeToast.title.includes('Mensaje')) {
                setView('chat');
              } else if (activeToast.type === 'rating' || activeToast.title.includes('Calific')) {
                const unratedTrip = trips.find(t => 
                  t.status === 'COMPLETADO' && 
                  ((user.email === t.clienteId && !t.ratedByCliente) || (user.email === t.conductorId && !t.ratedByConductor))
                );
                if (unratedTrip) setRatingTrip(unratedTrip);
                else setView('activity');
              } else {
                setView('activity');
              }
              setActiveToast(null);
            }}
            className="fixed top-18 left-4 right-4 z-50 bg-white/95 text-slate-900 p-3.5 rounded-2xl shadow-xl backdrop-blur-md border border-slate-200/90 flex flex-col gap-2 cursor-pointer active:scale-98 transition-all overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0 border border-emerald-100">
                  {activeToast.title.includes('Finalizado') ? '🎉' : activeToast.title.includes('Mensaje') ? '💬' : '📦'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 truncate">{activeToast.title}</p>
                  <p className="text-xs font-semibold text-slate-600 truncate">{activeToast.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-xs transition-colors">
                  Responder
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveToast(null);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            {/* Auto-dismiss countdown bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-1 bg-emerald-500 rounded-full origin-left -mx-3.5 -mb-3.5 mt-1"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render Bottom navigation on main dashboards */}
      {['home', 'activity', 'chat', 'dashboard', 'profile', 'settings'].includes(view) && (
        <BottomNav 
          currentView={view as any} 
          onViewChange={handleViewChange} 
          unreadChatCount={unreadChatCount}
          userRole={user.role}
        />
      )}
    </div>
    </>
  );
}
