import React, { useState } from 'react';
import { Truck, User, Sun, Moon, Mail, Lock, Phone, UserCheck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithGoogle, registerWithEmail } from '../services/authService';
import { UserRole } from '../types';
import CargoFlowLogo from './CargoFlowLogo';

interface LoginProps {
  currentRole?: UserRole;
  onLoginSuccess: (profile: any) => void;
  onOpenAdminLogin?: () => void;
}

export default function Login({ currentRole = 'conductor', onLoginSuccess, onOpenAdminLogin }: LoginProps) {
  const [tapCount, setTapCount] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);

    if (authMode === 'register') {
      try {
        const profile = await registerWithEmail(
          name || email.split('@')[0],
          email,
          password,
          phone || '+57 300 000 0000',
          selectedRole
        );
        setIsLoading(false);
        onLoginSuccess(profile);
      } catch (err) {
        setIsLoading(false);
        // Fallback for demo mode
        onLoginSuccess({
          uid: 'demo-' + Date.now(),
          name: name || email.split('@')[0],
          email,
          phone: phone || '+57 300 000 0000',
          role: selectedRole,
          isVerified: true,
          rating: 5.0,
          balance: selectedRole === 'cliente' ? 2500000 : 1250000,
        });
      }
    } else {
      // Login mode
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess({
          uid: 'demo-user-' + Date.now(),
          name: email.split('@')[0],
          email: email,
          phone: '+57 312 987 6543',
          role: selectedRole,
          isVerified: true,
          rating: 5.0,
          balance: selectedRole === 'cliente' ? 2500000 : 1250000,
        });
      }, 1000);
    }
  };

  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      const userProfile = await loginWithGoogle(selectedRole);
      setIsLoading(false);
      onLoginSuccess({ ...userProfile, role: userProfile.role === 'admin' ? 'admin' : selectedRole });
    } catch (e: any) {
      setIsLoading(false);
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
        return;
      }
      onLoginSuccess({
        name: selectedRole === 'cliente' ? 'Luis Fernando (Cliente)' : 'Luis Fernando Alzate',
        email: selectedRole === 'cliente' ? 'lfalzatel29@gmail.com' : 'lfalzatel@gmail.com',
        phone: selectedRole === 'cliente' ? '+57 300 123 4567' : '+57 312 987 6543',
        role: selectedRole,
        isVerified: true,
        rating: 5.0,
        balance: 1250000,
        photoURL: undefined,
      });
    }
  };

  return (
    <div className={`min-h-screen relative flex flex-col justify-center items-center px-4 py-8 antialiased select-none transition-colors duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-[#09152b] via-[#0b224d] to-[#041029] text-white' 
        : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 text-slate-900'
    }`}>
      {/* Scanlines Overlay */}
      {isDarkMode && (
        <div className="absolute inset-0 pointer-events-none z-0 opacity-20 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
      )}

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={() => setIsDarkMode(!isDarkMode)}
        className={`absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 shadow-lg ${
          isDarkMode 
            ? 'bg-white/10 text-amber-400 border border-white/20 hover:bg-white/20' 
            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
        }`}
        title={isDarkMode ? 'Cambiar a modo Día' : 'Cambiar a modo Noche'}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Main Glassmorphic Card */}
      <motion.main 
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`w-full max-w-sm sm:max-w-md rounded-[36px] p-7 sm:p-9 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-b from-[#141E34] via-[#0E1728] to-[#090F1C] border border-blue-500/20 shadow-[0_30px_70px_rgba(0,0,0,0.8)]' 
            : 'bg-white border border-slate-200 shadow-2xl'
        }`}
      >
        {/* Glow */}
        {isDarkMode && (
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />
        )}

        {/* Logo (Tap 5 times for Admin Login trigger) */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut' }}
          onClick={() => {
            const next = tapCount + 1;
            setTapCount(next);
            if (next >= 5 && onOpenAdminLogin) {
              setTapCount(0);
              onOpenAdminLogin();
            }
          }}
          className="mb-5 flex justify-center drop-shadow-2xl z-10 cursor-pointer"
          title="CargoFlow Logo"
        >
          <CargoFlowLogo size="xl" />
        </motion.div>

        {/* Welcome Text */}
        <div className="text-center mb-5 w-full z-10">
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isDarkMode ? 'text-white drop-shadow-sm' : 'text-slate-900'
          }`}>
            Bienvenido a CargoFlow
          </h1>
          <p className={`text-xs font-medium mt-1 leading-relaxed max-w-xs mx-auto ${
            isDarkMode ? 'text-slate-300/80' : 'text-slate-600'
          }`}>
            La plataforma inteligente para conectar conductores y clientes en todo el país.
          </p>
        </div>

        {/* Role Selector */}
        <div className={`w-full p-1.5 rounded-2xl mb-4 flex gap-1.5 shadow-md border transition-colors z-10 ${
          isDarkMode ? 'bg-black/30 border-white/10 backdrop-blur-md' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setSelectedRole('conductor')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedRole === 'conductor'
                ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]'
                : isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck size={16} />
            <span>Soy Conductor</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('cliente')}
            className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedRole === 'cliente'
                ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                : isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User size={16} />
            <span>Soy Cliente</span>
          </button>
        </div>

        {/* Auth Mode Toggle (Iniciar Sesión vs Registrarse) */}
        <div className={`w-full p-1 rounded-xl mb-5 flex border z-10 ${
          isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-200/60 border-slate-300'
        }`}>
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              authMode === 'login'
                ? isDarkMode ? 'bg-white/15 text-white font-extrabold shadow-sm' : 'bg-white text-slate-900 font-extrabold shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              authMode === 'register'
                ? isDarkMode ? 'bg-white/15 text-white font-extrabold shadow-sm' : 'bg-white text-slate-900 font-extrabold shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Registrarse / Crear Cuenta
          </button>
        </div>

        {/* Google Authentication Button */}
        <div className="w-full z-10 mb-4">
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-3 h-[50px] bg-white rounded-2xl transition-all active:scale-[0.98] cursor-pointer shadow-xl border ${
              isDarkMode 
                ? 'border-white/20 hover:border-emerald-400 text-slate-900' 
                : 'border-slate-300 hover:border-blue-500 text-slate-900'
            } ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
            title={`Continuar con Google como ${selectedRole === 'conductor' ? 'Conductor' : 'Cliente'}`}
          >
            <svg aria-hidden="true" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            <span className="text-xs font-extrabold text-slate-900">
              {isLoading ? 'Conectando con Google...' : `Continuar con Google (${selectedRole === 'conductor' ? 'Conductor' : 'Cliente'})`}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-2 z-10">
          <div className={`flex-1 h-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            o con correo
          </span>
          <div className={`flex-1 h-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className="w-full z-10 mt-2 flex flex-col gap-3">
          {/* Name Field for Registration */}
          {authMode === 'register' && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserCheck size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                required
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full h-11 pl-9 pr-3 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                  isDarkMode 
                    ? 'bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-emerald-400' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              />
            </div>
          )}

          {/* Email Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-slate-400" />
            </div>
            <input
              type="email"
              required
              placeholder="Correo electrónico (p.ej. prueba@gmail.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full h-11 pl-9 pr-3 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-emerald-400' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Phone Field for Registration */}
          {authMode === 'register' && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone size={16} className="text-slate-400" />
              </div>
              <input
                type="tel"
                placeholder="Teléfono cel. (p.ej. 300 123 4567)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full h-11 pl-9 pr-3 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                  isDarkMode 
                    ? 'bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-emerald-400' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              />
            </div>
          )}

          {/* Password Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-slate-400" />
            </div>
            <input
              type="password"
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full h-11 pl-9 pr-3 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-emerald-400' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Role Registration Explanation Box */}
          {authMode === 'register' && (
            <div className={`p-3 rounded-xl border text-[11px] font-medium leading-tight ${
              selectedRole === 'conductor'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-blue-950/40 border-blue-500/30 text-blue-300'
            }`}>
              {selectedRole === 'conductor' ? (
                <span>🚛 <strong>Modo Conductor:</strong> Luego del registro podrás agregar vehículos (Placa, Modelo) y licencias desde tu Perfil para aceptar fletes.</span>
              ) : (
                <span>👤 <strong>Modo Cliente:</strong> Registro instantáneo. Podrás publicar fletes de inmediato sin necesidad de licencias ni vehículos.</span>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full h-12 rounded-xl text-xs font-extrabold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              selectedRole === 'conductor'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-blue-600 hover:bg-blue-500'
            } ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
          >
            {isLoading ? (
              'Procesando...'
            ) : authMode === 'register' ? (
              <>
                <span>Crear Cuenta como {selectedRole === 'conductor' ? 'Conductor' : 'Cliente'}</span>
                <ArrowRight size={16} />
              </>
            ) : (
              `Iniciar Sesión (${selectedRole === 'conductor' ? 'Conductor' : 'Cliente'})`
            )}
          </button>
        </form>

        {/* Terms Disclaimer */}
        <div className="flex flex-col items-center gap-1.5 mt-5 z-10">
          <p className={`text-[10px] font-medium text-center ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Al continuar, aceptas los términos y condiciones de CargoFlow.
          </p>
          {onOpenAdminLogin && (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="text-[10px] font-bold text-slate-500 hover:text-blue-400 transition-colors opacity-60 hover:opacity-100 mt-1 cursor-pointer"
            >
              🔒 Portal Administrador
            </button>
          )}
        </div>
      </motion.main>
    </div>
  );
}

