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
    const timer = setTimeout(() => onDismiss(item.id), 4500);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  const isSuccess = item.tag?.includes('success');
  const isError   = item.tag?.includes('error') || item.tag?.includes('alert');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -16,  scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="relative flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl max-w-[340px] w-full select-none cursor-default"
      style={{
        background:   'rgba(9, 21, 43, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border:       isError   ? '1px solid rgba(239,68,68,0.4)'
                    : isSuccess ? '1px solid rgba(16,185,129,0.4)'
                    :             '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{
          background: isError   ? '#ef4444'
                    : isSuccess ? '#10b981'
                    :             '#0b224d',
        }}
      />

      {/* Icon */}
      <div
        className="mt-0.5 p-1.5 rounded-xl flex-shrink-0"
        style={{
          background: isError   ? 'rgba(239,68,68,0.15)'
                    : isSuccess ? 'rgba(16,185,129,0.15)'
                    :             'rgba(11,34,77,0.3)',
          color:      isError   ? '#ef4444'
                    : isSuccess ? '#10b981'
                    :             '#60a5fa',
        }}
      >
        <ToastIcon tag={item.tag} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pl-1">
        <p className="text-sm font-bold text-white leading-tight truncate">{item.title}</p>
        {item.body && (
          <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-snug">{item.body}</p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(item.id)}
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors mt-0.5"
      >
        <X size={13} />
      </button>

      {/* Progress bar auto-dismiss */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl origin-left"
        style={{ background: isError ? '#ef4444' : isSuccess ? '#10b981' : '#3b82f6' }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4.5, ease: 'linear' }}
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
