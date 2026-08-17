import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Phone, Shield, Send, Paperclip, Camera, Check, CheckCheck, Maximize2, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, UserProfile, Trip } from '../types';

interface ChatProps {
  user: UserProfile;
  activeTrip?: Trip | null;
  trips?: Trip[];
  usersList?: UserProfile[];
  initialMessages: ChatMessage[];
  onBack: () => void;
  onSelectTripChat?: (trip: Trip) => void;
}

export default function Chat({ user, activeTrip, trips = [], usersList = [], initialMessages, onBack, onSelectTripChat }: ChatProps) {
  const [selectedTripState, setSelectedTripState] = useState<Trip | null>(activeTrip || null);
  const [inboxTab, setInboxTab] = useState<'activos' | 'historial'>('activos');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTripState(activeTrip || null);
  }, [activeTrip?.id]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);


  // Compress image to lightweight JPEG Base64 Data URL (0-cost client-side processing)
  const compressAndConvertImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressAndConvertImage(file);
        setAttachedImage(base64);
      } catch (err) {
        console.error('Image compression error:', err);
      }
    }
  };

  const isClientView = selectedTripState ? user.email === selectedTripState.clienteId : false;
  const partnerEmail = selectedTripState
    ? (isClientView ? selectedTripState.conductorId : selectedTripState.clienteId)
    : undefined;

  const livePartnerUser = usersList.find(u => u.email === partnerEmail);

  const chatPartnerName = selectedTripState
    ? (livePartnerUser?.name || (isClientView ? selectedTripState.conductorName || 'Conductor Asignado' : selectedTripState.clienteName || 'Cliente Solicitante'))
    : 'Soporte CargoFlow';

  const chatPartnerSubtitle = selectedTripState
    ? (isClientView 
        ? `${selectedTripState.conductorVehicleType || selectedTripState.vehicleType || 'Vehículo'} • ${selectedTripState.conductorPlate || 'Placa asignada'}`
        : `Cliente Flete #${selectedTripState.id}`)
    : 'Canal oficial de logística';

  const rawPartnerPhoto = selectedTripState
    ? (isClientView ? selectedTripState.conductorPhotoURL : selectedTripState.clientePhotoURL)
    : undefined;

  const chatPartnerPhoto = livePartnerUser?.photoURL || rawPartnerPhoto || (partnerEmail === user.email ? user.photoURL : undefined);

  const chatCollectionPath = selectedTripState ? `trips/${selectedTripState.id}/chat_messages` : 'global_chat';
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const renderAvatar = (photoURL?: string, name?: string, sizeClass = "w-10 h-10 text-xs") => {
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

  // Auto-scroll ONLY messages container to bottom (without scrolling top header/window)
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = mainScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen to Firestore
  useEffect(() => {
    let unsubscribe: () => void;
    
    const loadChat = async () => {
      try {
        const { db } = await import('../config/firebase');
        const { collection, query, orderBy, onSnapshot, limit } = await import('firebase/firestore');
        
        const q = query(
          collection(db, chatCollectionPath),
          orderBy('createdAt', 'asc'),
          limit(100)
        );
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const loadedMessages: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            loadedMessages.push({
              id: doc.id,
              sender: data.senderEmail === user.email ? 'user' : 'driver',
              senderName: data.senderName || undefined,
              senderPhotoURL: data.senderPhotoURL || undefined,
              text: data.text,
              attachmentUrl: data.attachmentUrl || undefined,
              timestamp: data.timestamp || new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
              isRead: true,
            });
          });
          
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
          }
        });
      } catch (e) {
        console.warn('Chat sync error', e);
      }
    };
    
    loadChat();
    return () => unsubscribe && unsubscribe();
  }, [user.email, chatCollectionPath]);

  // Handle message sending
  const handleSend = async () => {
    if (!inputText.trim() && !attachedImage) return;

    const textToSend = inputText;
    const attachmentToSend = attachedImage;
    setInputText('');
    setAttachedImage(null);

    try {
      const { db } = await import('../config/firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { sendDbNotification } = await import('../services/notificationService');
      
      await addDoc(collection(db, chatCollectionPath), {
        senderEmail: user.email,
        senderName: user.name,
        senderPhotoURL: user.photoURL || null,
        text: textToSend || (attachmentToSend ? '📷 [Imagen adjunta]' : ''),
        attachmentUrl: attachmentToSend || null,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
        createdAt: serverTimestamp()
      });

      // Send persistent notification to recipient if in a trip chat
      const targetEmail = selectedTripState
        ? (user.email === selectedTripState.clienteId ? selectedTripState.conductorId : selectedTripState.clienteId)
        : null;

      if (targetEmail) {
        sendDbNotification(
          targetEmail,
          `💬 Mensaje de ${user.name}`,
          textToSend || '📷 Imagen adjunta',
          `chat-${selectedTripState?.id}`,
          'chat'
        );
      }
    } catch (e) {
      console.warn('Error sending message:', e);
      // Fallback local update
      setMessages(prev => [...prev, {
        id: `local-${Date.now()}`,
        sender: 'user',
        senderName: user.name,
        senderPhotoURL: user.photoURL,
        text: textToSend,
        attachmentUrl: attachmentToSend || undefined,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
      }]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (!selectedTripState) {
    const userTrips = (trips || []).filter(t => t.clienteId === user.email || t.conductorId === user.email || user.role === 'admin');
    const activeInboxTrips = userTrips.filter(t => t.status === 'EN CAMINO' || t.status === 'PENDIENTE');
    const historyInboxTrips = userTrips.filter(t => t.status === 'COMPLETADO');
    const displayedTrips = inboxTab === 'activos' ? activeInboxTrips : historyInboxTrips;

    return (
      <div className="bg-background min-h-screen flex flex-col font-sans pb-28 pt-20">
        {/* Top Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm flex items-center justify-between px-4 h-[72px] border-b border-surface-container">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (onSelectTripChat) onSelectTripChat(null as any);
                onBack();
              }} 
              className="text-on-surface-variant hover:text-primary p-2 -ml-2 rounded-full cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
                💬
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-800">Conversaciones</h2>
                <p className="text-[10px] font-bold text-slate-400">Canal oficial de mensajería</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Selector: Activos vs Historial */}
        <div className="px-4 pt-3 pb-2 bg-white border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setInboxTab('activos')}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inboxTab === 'activos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ● Activos ({activeInboxTrips.length})
          </button>
          <button
            onClick={() => setInboxTab('historial')}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inboxTab === 'historial'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ✓ Historial ({historyInboxTrips.length})
          </button>
        </div>

        {/* Inbox Conversations List */}
        <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
          {displayedTrips.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center flex flex-col items-center justify-center gap-3 mt-4 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                💬
              </div>
              <h4 className="font-extrabold text-sm text-slate-700">No hay conversaciones en esta sección</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                {inboxTab === 'activos'
                  ? 'Tus fletes en camino o solicitudes de carga aparecerán aquí automáticamente.'
                  : 'Los mensajes de fletes completados quedarán guardados en tu historial.'}
              </p>
            </div>
          ) : (
            displayedTrips.map((trip) => {
              const isClient = user.email === trip.clienteId;
              const targetPartnerEmail = isClient ? trip.conductorId : trip.clienteId;
              const liveUser = usersList.find(u => u.email === targetPartnerEmail);
              const partnerName = liveUser?.name || (isClient ? (trip.conductorName || 'Conductor Asignado') : (trip.clienteName || 'Cliente Solicitante'));
              const partnerPhoto = liveUser?.photoURL || (isClient ? trip.conductorPhotoURL : trip.clientePhotoURL);

              return (
                <div
                  key={trip.id}
                  onClick={() => {
                    setSelectedTripState(trip);
                    if (onSelectTripChat) onSelectTripChat(trip);
                  }}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer active:scale-98"
                >
                  {renderAvatar(partnerPhoto || (partnerName === user.name ? user.photoURL : undefined), partnerName, "w-12 h-12 text-sm")}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-extrabold text-xs text-slate-800 truncate">{partnerName}</h4>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        trip.status === 'EN CAMINO' ? 'bg-blue-100 text-blue-700' :
                        trip.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {trip.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 truncate mb-0.5">
                      Flete #{trip.id} • {trip.vehicleType}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 truncate">
                      📍 {trip.origin} → {trip.destination}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen flex flex-col overflow-hidden font-sans antialiased">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm flex items-center justify-between px-4 h-[72px] border-b border-surface-container">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedTripState(null);
              if (onSelectTripChat) onSelectTripChat(null as any);
            }}
            className="text-on-surface-variant hover:text-primary transition-colors p-2 -ml-2 rounded-full active:bg-surface-container-low focus:outline-none cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              {renderAvatar(chatPartnerPhoto, chatPartnerName, "w-11 h-11 text-xs")}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-on-surface">{chatPartnerName}</span>
              <span className="text-[11px] text-on-surface-variant font-medium">{chatPartnerSubtitle}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => alert(`Llamando a ${chatPartnerName}...`)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-primary-container transition-colors active:scale-95 focus:outline-none"
        >
          <Phone size={18} fill="currentColor" />
        </button>
      </header>

      {/* Chat Canvas Area */}
      <main ref={mainScrollRef} className="flex-1 overflow-y-auto no-scrollbar p-4 pt-24 pb-32 flex flex-col gap-6 bg-background">
        {/* Date Separator */}
        <div className="flex justify-center">
          <span className="bg-surface-container text-on-surface-variant font-bold text-[10px] tracking-widest px-3 py-1 rounded-full uppercase">
            Hoy
          </span>
        </div>

        {/* System Message */}
        <div className="flex justify-center">
          <div className="bg-surface-container-low text-on-surface-variant text-[11px] font-semibold px-4 py-2.5 rounded-xl text-center max-w-[85%] shadow-sm border border-surface-container flex items-center justify-center gap-1.5">
            <Shield size={14} className="text-primary-container" />
            <span>Este chat está encriptado y es monitoreado para tu seguridad.</span>
          </div>
        </div>

        {/* Message Threads */}
        {messages.map((msg) => {
          if (msg.sender === 'system') return null;
          const isUser = msg.sender === 'user';
          const msgSenderPhoto = msg.senderPhotoURL || (isUser ? user.photoURL : chatPartnerPhoto);
          const msgSenderName = msg.senderName || (isUser ? user.name : chatPartnerName);
          
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
            >
              {!isUser && renderAvatar(msgSenderPhoto, msgSenderName, "w-8 h-8 text-[10px]")}
              
              <div className={`flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
                {!isUser && (
                  <span className="text-[10px] font-black text-slate-500 ml-1">
                    {msgSenderName}
                  </span>
                )}
                {/* Bubble Container */}
                <div
                  className={`p-3.5 rounded-2xl shadow-[0px_2px_8px_rgba(0,0,0,0.02)] border ${
                    isUser
                      ? 'bg-primary-container text-white rounded-br-sm border-primary'
                      : 'bg-white text-on-surface rounded-bl-sm border-surface-container'
                  }`}
                >
                  {/* Message Attachment Image */}
                  {msg.attachmentUrl && (
                    <div className="relative w-[210px] h-[135px] mb-2 group rounded-lg overflow-hidden border border-surface-container">
                      <img
                        className="w-full h-full object-cover"
                        alt="Document attachment"
                        src={msg.attachmentUrl}
                      />
                      <button
                        onClick={() => setFullscreenImage(msg.attachmentUrl!)}
                        className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        <Maximize2 className="text-white" size={24} />
                      </button>
                    </div>
                  )}
                  <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                </div>

                {/* Timestamp and receipts */}
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[10px] text-outline font-semibold">{msg.timestamp}</span>
                  {isUser && (
                    <CheckCheck size={14} className="text-primary-container" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </main>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

      {/* Input Area */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-surface-container-highest p-3 flex flex-col gap-2 z-40 pb-5 shadow-[0px_-4px_20px_rgba(0,0,0,0.02)]">
        {/* Attached Image Preview */}
        {attachedImage && (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md self-start ml-2 group">
            <img src={attachedImage} alt="Attachment preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 w-full">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar imagen de la galería"
            className="w-10 h-10 flex items-center justify-center text-outline hover:text-primary-container hover:bg-surface-container rounded-full transition-colors flex-shrink-0 active:scale-95 focus:outline-none cursor-pointer"
          >
            <Paperclip size={20} />
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            title="Tomar foto con la cámara"
            className="w-10 h-10 flex items-center justify-center text-outline hover:text-primary-container hover:bg-surface-container rounded-full transition-colors flex-shrink-0 -ml-1 active:scale-95 focus:outline-none cursor-pointer"
          >
            <Camera size={20} />
          </button>
          
          <div className="flex-1 bg-surface-container-low rounded-xl flex items-center min-h-[44px] border border-transparent focus-within:border-primary-container transition-colors px-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={attachedImage ? "Añade un comentario opcional..." : "Escribe un mensaje..."}
              className="w-full bg-transparent border-none focus:ring-0 text-sm text-on-surface resize-none py-2.5 px-3 max-h-[100px] placeholder:text-outline focus:outline-none font-semibold"
              rows={1}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputText.trim() && !attachedImage}
            className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full shadow-sm transition-all active:scale-95 ${
              inputText.trim() || attachedImage
                ? 'bg-primary-container text-white cursor-pointer hover:shadow-md' 
                : 'bg-surface-container text-outline opacity-55 cursor-not-allowed'
            }`}
          >
            <Send size={18} fill={inputText.trim() || attachedImage ? "white" : "none"} />
          </button>
        </div>
      </div>

      {/* Fullscreen Image Preview Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          >
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={fullscreenImage}
              alt="Fullscreen Document Preview"
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
