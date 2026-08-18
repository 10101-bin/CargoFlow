import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Truck, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import type { NotificationPayload } from '../services/notificationService';

// ── Internal toast item type ─────────────────────────────────
interface ToastItem extends NotificationPayload {
  id:        string;
  timestamp: number;
}

// ── Icon resolver based on tag ───────────────────────────────
function ToastIcon({ tag }: { tag?: string }) {
  const cls = 'w-5 h-5 flex-shrink-0';
  if (tag?.includes('flete') || tag?.includes('cargo')) return <Truck className={cls} />;
  if (tag?.includes('chat') || tag?.includes('message'))  return <MessageSquare className={cls} />;
  if (tag?.includes('error') || tag?.includes('alert'))   return <AlertCircle className={cls} />;
  if (tag?.includes('success'))                           return <CheckCircle className={cls} />;
  return <Bell className={cls} />;
}

// ── Individual Toast ──────────────────────────────────────────
function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4800);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  const isSuccess = item.tag?.includes('success');
  const isError   = item.tag?.includes('error') || item.tag?.includes('alert');

  const accentColor = isError ? '#ef4444' : isSuccess ? '#10b981' : '#6366f1';
  const bgGlow      = isError ? 'rgba(239,68,68,0.08)' : isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)';
  const iconBg      = isError ? 'rgba(239,68,68,0.12)' : isSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)';
  const iconColor   = isError ? '#ef4444' : isSuccess ? '#10b981' : '#818cf8';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -18,  scale: 0.90, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="relative flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl max-w-[340px] w-full select-none cursor-default overflow-hidden"
      style={{
        background: `rgba(255,255,255,0.92)`,
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        border: `1.5px solid ${accentColor}33`,
        boxShadow: `0 4px 24px 0 rgba(0,0,0,0.10), 0 0 0 1.5px ${accentColor}22`,
      }}
    >
      {/* Colored left pill */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}99)` }}
      />

      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: bgGlow }} />

      {/* Icon pill */}
      <div
        className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        <ToastIcon tag={item.tag} />
      </div>

      {/* Text */}
      <div className="relative z-10 flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 leading-tight truncate">{item.title}</p>
        {item.body && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-snug">{item.body}</p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(item.id)}
        className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <X size={13} />
      </button>

      {/* Progress bar — bottom, shrinks from right */}
      <motion.div
        className="absolute bottom-0 left-1 right-0 h-[2.5px] rounded-b-2xl origin-left"
        style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}66)` }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4.8, ease: 'linear' }}
      />
    </motion.div>
  );
}

// ── Container — listens to window events ──────────────────────
export default function NotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<NotificationPayload>).detail;
      const item: ToastItem = {
        ...payload,
        id:        `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      };
      setToasts((prev) => [item, ...prev].slice(0, 5)); // max 5 simultaneous
    };

    window.addEventListener('cargoflow:notification', handler);
    return () => window.removeEventListener('cargoflow:notification', handler);
  }, []);

  return (
    <div
      aria-live="polite"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
      style={{ width: 'calc(100% - 24px)', maxWidth: '360px' }}
    >
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <Toast item={toast} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
