import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

type ConfirmVariant = 'danger' | 'success' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<ConfirmVariant, {
  icon: React.ReactNode;
  iconBg: string;
  confirmBtn: string;
}> = {
  danger: {
    icon: <XCircle size={26} className="text-red-500" />,
    iconBg: 'bg-red-50',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
  },
  success: {
    icon: <CheckCircle size={26} className="text-emerald-500" />,
    iconBg: 'bg-emerald-50',
    confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  warning: {
    icon: <AlertTriangle size={26} className="text-amber-500" />,
    iconBg: 'bg-amber-50',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  info: {
    icon: <Info size={26} className="text-blue-500" />,
    iconBg: 'bg-blue-50',
    confirmBtn: 'bg-[#0b224d] hover:bg-[#09152b] text-white',
  },
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cfg = variantConfig[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-5"
          onClick={onCancel}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Top accent bar */}
            <div className={`h-1 w-full ${
              variant === 'danger' ? 'bg-red-500' :
              variant === 'success' ? 'bg-emerald-500' :
              variant === 'warning' ? 'bg-amber-400' :
              'bg-[#0b224d]'
            }`} />

            <div className="p-6 flex flex-col items-center text-center gap-4">
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${cfg.iconBg} flex items-center justify-center`}>
                {cfg.icon}
              </div>

              {/* Text */}
              <div>
                <h3 className="text-base font-black text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{message}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 w-full mt-1">
                <button
                  onClick={onCancel}
                  className="flex-1 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95 cursor-pointer"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 h-12 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md cursor-pointer ${cfg.confirmBtn}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
