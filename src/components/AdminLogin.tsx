import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../types';

interface AdminLoginProps {
  onAdminLoginSuccess: (adminProfile: UserProfile) => void;
  onBackToNormalLogin: () => void;
}

export default function AdminLogin({ onAdminLoginSuccess, onBackToNormalLogin }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate with Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      // 2. Check Firestore admins/{uid} collection (protected by Security Rules)
      const adminDocRef = doc(db, 'admins', uid);
      const adminSnap = await getDoc(adminDocRef);

      if (!adminSnap.exists()) {
        // Not an authorized admin! Sign out immediately.
        await signOut(auth);
        setErrorMessage('❌ Acceso Denegado: Esta cuenta no posee permisos de Administrador.');
        setLoading(false);
        return;
      }

      // 3. Authorized Admin
      const adminData = adminSnap.data();
      const adminProfile: UserProfile = {
        id: uid,
        name: adminData.name || cred.user.displayName || 'Administrador CargoFlow',
        email: cred.user.email || email,
        phone: adminData.phone || '+57 300 000 0000',
        role: 'admin',
        isVerified: true,
        isComplete: true,
        rating: 5.0,
        balance: 0,
      };

      // Save to localStorage for role persistence
      localStorage.setItem('cf_user_profile', JSON.stringify(adminProfile));
      localStorage.setItem('cf_last_role', 'admin');

      onAdminLoginSuccess(adminProfile);
    } catch (err: any) {
      console.error('Admin login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setErrorMessage('Credenciales incorrectas. Verifica el correo y la contraseña.');
      } else {
        setErrorMessage(err.message || 'Error al autenticar administrador.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Cyber Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl z-10">
        <button
          onClick={onBackToNormalLogin}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Volver al inicio de sesión normal</span>
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Acceso Administrador</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Portal oficial de control de la plataforma CargoFlow. Requiere cuenta autorizada en la colección de seguridad.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2 text-xs text-red-400 animate-shake">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
              Correo de Administrador
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cargoflow.co"
                className="w-full h-12 pl-10 pr-4 bg-slate-950 rounded-2xl border border-slate-800 text-sm focus:outline-none focus:border-blue-500 text-white font-medium transition-all"
              />
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
              Contraseña Segura
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-12 pl-10 pr-4 bg-slate-950 rounded-2xl border border-slate-800 text-sm focus:outline-none focus:border-blue-500 text-white font-medium transition-all"
              />
              <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="text-xs">Verificando en Firestore...</span>
            ) : (
              <>
                <Lock size={16} />
                <span>Ingresar al Panel de Control</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500 font-mono">
            CargoFlow Platform Security • Colección <span className="text-blue-400">admins/{"{uid}"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
