import React, { useState } from 'react';
import { Star, X, Check, HeartHandshake } from 'lucide-react';
import { motion } from 'motion/react';

interface RatingProps {
  driverName?: string;
  photoURL?: string;
  tripId?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string, tip?: number) => void;
}

export default function Rating({ driverName = 'Carlos Rodríguez', photoURL, tripId = '#CF-8842', onClose, onSubmit }: RatingProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tip, setTip] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>(['Puntual', 'Cuidado de la Carga']);
  const [submitted, setSubmitted] = useState(false);

  const availableTags = ['Puntual', 'Cuidado de la Carga', 'Buena comunicación', 'Amable', 'Conducción segura'];

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      onSubmit(rating, comment, tip || 0);
    }, 1000);
  };

  const renderAvatar = () => {
    if (photoURL && typeof photoURL === 'string' && photoURL.startsWith('http')) {
      return (
        <img
          src={photoURL}
          alt={driverName}
          className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
        />
      );
    }
    const initials = (driverName || 'CargoFlow').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return (
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center border-4 border-white shadow-md">
        {initials}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative border border-surface-container flex flex-col items-center text-center space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Profile Avatar */}
        <div className="relative mt-2">
          {renderAvatar()}
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-xs">
            <Check size={14} strokeWidth={3} />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-800">¿Cómo fue tu experiencia?</h2>
          <p className="text-xs text-slate-500 mt-0.5">Califica el servicio de {driverName} ({tripId})</p>
        </div>

        {/* Star Rating Selection */}
        <div className="flex gap-2 justify-center my-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="p-1 text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            >
              <Star
                size={34}
                fill={star <= rating ? '#FFB800' : 'transparent'}
                stroke={star <= rating ? '#FFB800' : '#c3c5d9'}
              />
            </button>
          ))}
        </div>

        {/* Quick Tag Badges */}
        <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
          {availableTags.map((tag) => {
            const isSelected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Tip Section (Propina Opcional) */}
        <div className="w-full pt-2">
          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-black uppercase tracking-wider mb-2">
            <HeartHandshake size={15} className="text-emerald-600" />
            <span>Agregar Propina Opcional</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[2000, 5000, 10000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTip(tip === amount ? null : amount)}
                className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  tip === amount
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ${(amount / 1000)}k
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTip(null)}
              className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                tip === null
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Sin propina
            </button>
          </div>
        </div>

        {/* Comment Input */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escribe un comentario opcional sobre el servicio..."
          rows={2}
          className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500 transition-all resize-none"
        />

        {/* Action Button */}
        <button
          onClick={handleSubmit}
          disabled={submitted}
          className="w-full py-3.5 bg-blue-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-blue-700 transition-all active:scale-[0.98] cursor-pointer"
        >
          {submitted ? '¡Gracias por calificar!' : 'Enviar Calificación'}
        </button>
      </motion.div>
    </div>
  );
}
