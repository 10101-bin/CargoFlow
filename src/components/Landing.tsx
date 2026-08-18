import React, { useState } from 'react';
import { Truck, User, Sun, Moon, ArrowRight, Shield, MapPin, DollarSign, Clock, CheckCircle2, ChevronRight, Award } from 'lucide-react';
import { motion } from 'motion/react';
import CargoFlowLogo from './CargoFlowLogo';
import { UserRole } from '../types';

interface LandingProps {
  onGetStarted: (role?: UserRole) => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <div className={`min-h-screen relative w-full flex flex-col justify-start items-center overflow-x-hidden antialiased transition-colors duration-500 pb-16 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-[#09152b] via-[#0b224d] to-[#041029] text-white' 
        : 'bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 text-slate-900'
    }`}>
      {/* Scanlines Overlay for cyberpunk aesthetics on Dark Mode */}
      {isDarkMode && (
        <div className="absolute inset-0 pointer-events-none z-0 opacity-15 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
      )}

      {/* Glow effects in background */}
      {isDarkMode && (
        <>
          <div className="absolute top-24 left-1/4 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute top-48 right-1/4 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        </>
      )}

      {/* Floating Header */}
      <header className={`w-full max-w-6xl px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md border-b transition-all duration-300 ${
        isDarkMode ? 'border-white/10 bg-[#09152b]/70' : 'border-slate-200 bg-white/70'
      }`}>
        <div className="flex items-center gap-3">
          <CargoFlowLogo size="sm" />
          <span className={`text-xl font-black tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            CargoFlow
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 shadow-md ${
              isDarkMode 
                ? 'bg-white/10 text-amber-400 border border-white/20 hover:bg-white/20' 
                : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
            title={isDarkMode ? 'Cambiar a modo Día' : 'Cambiar a modo Noche'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => onGetStarted()}
            className={`hidden sm:flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 ${
              isDarkMode 
                ? 'bg-white text-slate-900 hover:bg-slate-100' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Iniciar Sesión
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-4xl px-4 text-center mt-12 sm:mt-20 flex flex-col items-center z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <CargoFlowLogo size="lg" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className={`text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-3xl ${
            isDarkMode 
              ? 'text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]' 
              : 'text-slate-900'
          }`}
        >
          La Logística Inteligente <br />
          <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
            A Tu Alcance
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className={`text-sm sm:text-lg font-medium mt-6 max-w-2xl leading-relaxed ${
            isDarkMode ? 'text-slate-300/90' : 'text-slate-600'
          }`}
        >
          Conectamos directamente a transportadores independientes con clientes que necesitan mover su carga. Más ganancias para ti, tarifas más justas para el negocio, todo con seguridad, soporte y rastreo en tiempo real.
        </motion.p>

        {/* Global CTA "Sé parte de nosotros" */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10"
        >
          <button
            onClick={() => onGetStarted()}
            className={`group flex items-center justify-center gap-3 px-8 py-4.5 rounded-[24px] text-sm font-black transition-all cursor-pointer shadow-[0_20px_40px_rgba(16,185,129,0.2)] active:scale-95 border ${
              isDarkMode 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 border-emerald-400/30' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 border-blue-500/20'
            }`}
          >
            <span>Sé parte de nosotros</span>
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </section>

      {/* Acerca de Nosotros Section */}
      <section className="w-full max-w-5xl px-6 mt-20 sm:mt-32 z-10">
        <div className={`rounded-[36px] p-8 sm:p-12 border shadow-xl relative overflow-hidden ${
          isDarkMode 
            ? 'bg-gradient-to-b from-[#141E34]/80 to-[#090F1C]/80 border-blue-500/10' 
            : 'bg-white border-slate-200'
        }`}>
          {isDarkMode && (
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
          )}

          <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
            <div className="flex-1">
              <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${
                isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-800'
              }`}>
                Acerca de nosotros
              </span>
              <h2 className={`text-2xl sm:text-3xl font-black mt-4 leading-snug ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Estamos redefiniendo la logística de transporte en todo el país
              </h2>
              <p className={`text-xs sm:text-sm leading-relaxed mt-4 font-medium ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                CargoFlow nació con la misión de eliminar las costosas fricciones y comisiones de los intermediarios en el transporte terrestre. Desarrollamos una plataforma tecnológica de vanguardia que une a los que tienen la carga con los que tienen las llaves, garantizando transparencia absoluta.
              </p>
              <p className={`text-xs sm:text-sm leading-relaxed mt-3 font-medium ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Creemos en un modelo colaborativo donde el transportador es recompensado justamente por su esfuerzo y el cliente recibe un servicio impecable, con soporte y seguridad en cada kilometro.
              </p>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <div className={`p-5 rounded-2xl border text-center transition-all hover:scale-105 ${
                isDarkMode ? 'bg-white/5 border-white/10 hover:border-emerald-500/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <Shield size={28} className="text-emerald-500 mx-auto mb-3" />
                <h3 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Seguridad Total</h3>
                <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Documentos y conductores validados con IA.</p>
              </div>

              <div className={`p-5 rounded-2xl border text-center transition-all hover:scale-105 ${
                isDarkMode ? 'bg-white/5 border-white/10 hover:border-blue-500/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <MapPin size={28} className="text-blue-500 mx-auto mb-3" />
                <h3 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Ruta en Vivo</h3>
                <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Navegación GPS y rastreo de envíos.</p>
              </div>

              <div className={`p-5 rounded-2xl border text-center transition-all hover:scale-105 ${
                isDarkMode ? 'bg-white/5 border-white/10 hover:border-blue-500/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <DollarSign size={28} className="text-amber-500 mx-auto mb-3" />
                <h3 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Negociación Directa</h3>
                <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contraofertas directas y precios justos.</p>
              </div>

              <div className={`p-5 rounded-2xl border text-center transition-all hover:scale-105 ${
                isDarkMode ? 'bg-white/5 border-white/10 hover:border-emerald-500/20' : 'bg-slate-50 border-slate-200'
              }`}>
                <Award size={28} className="text-purple-500 mx-auto mb-3" />
                <h3 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Calidad 5 Estrellas</h3>
                <p className={`text-[10px] mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sistema de calificaciones mutuas de confianza.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits section (Drivers & Clients Cards) */}
      <section className="w-full max-w-5xl px-6 mt-16 sm:mt-24 z-10 flex flex-col items-center">
        <h2 className={`text-3xl font-black text-center mb-12 tracking-tight ${
          isDarkMode ? 'text-white' : 'text-slate-900'
        }`}>
          Beneficios diseñados para ti
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Driver Card (Emerald theme) */}
          <div className={`rounded-[32px] p-8 border shadow-xl flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] ${
            isDarkMode 
              ? 'bg-gradient-to-b from-[#102422] to-[#081313] border-emerald-500/20' 
              : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-3.5 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                  isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Truck size={24} />
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Para Conductores
                  </span>
                  <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Conduce y Gana Más
                  </h3>
                </div>
              </div>

              <p className={`text-xs font-medium leading-relaxed mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Maximiza la rentabilidad de tu vehículo y ten el control absoluto sobre tus viajes. ¡Tú decides tu horario y tarifas!
              </p>

              <ul className="flex flex-col gap-4 mb-8">
                {[
                  { title: '90% de ganancia real', desc: 'Quédate con la gran mayoría del flete. Tarifas de comisión transparentes.' },
                  { title: 'Pagos rápidos y Wallet digital', desc: 'Retira tu saldo de forma ágil y segura directamente a tu cuenta bancaria.' },
                  { title: 'Ofertas y contraofertas en vivo', desc: 'Propón tu propia tarifa para fletes solicitados si consideras que lo vale.' },
                  { title: 'Autonomía de rutas', desc: 'Elige los viajes que más se adapten a tu camión y ubicación de preferencia.' }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className={`text-xs font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>
                      <p className={`text-[11px] font-medium leading-tight mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onGetStarted('conductor')}
              className={`w-full py-4 rounded-[20px] text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-2 group transition-all active:scale-[0.98] ${
                isDarkMode 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              <span>Empezar como Conductor</span>
              <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Client Card (Blue theme) */}
          <div className={`rounded-[32px] p-8 border shadow-xl flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] ${
            isDarkMode 
              ? 'bg-gradient-to-b from-[#111c34] to-[#090f1d] border-blue-500/20' 
              : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-3.5 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                  isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'
                }`}>
                  <User size={24} />
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    Para Clientes / Empresas
                  </span>
                  <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Envía con Confianza
                  </h3>
                </div>
              </div>

              <p className={`text-xs font-medium leading-relaxed mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Encuentra vehículos confiables para tu mercancía en minutos. Tarifas competitivas directo con transportadores.
              </p>

              <ul className="flex flex-col gap-4 mb-8">
                {[
                  { title: 'Negociación directa', desc: 'Sin intermediarios comisionistas. Acuerda el valor con el transportador.' },
                  { title: 'Rastreo y monitoreo satelital', desc: 'Monitorea la ubicación de tu mercancía en tiempo real en nuestro mapa interactivo.' },
                  { title: 'Conductores calificados y verificados', desc: 'Perfiles con documentación de SOAT, vehículo y cédula verificados por nuestro equipo.' },
                  { title: 'Gestión digital de remisión', desc: 'Sube firmas y evidencias fotográficas de entrega directo desde la plataforma.' }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className={`text-xs font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>
                      <p className={`text-[11px] font-medium leading-tight mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onGetStarted('cliente')}
              className={`w-full py-4 rounded-[20px] text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-2 group transition-all active:scale-[0.98] ${
                isDarkMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-500' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <span>Empezar como Cliente</span>
              <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials / Motivational Section */}
      <section className="w-full max-w-5xl px-6 mt-20 sm:mt-28 z-10 flex flex-col items-center">
        <span className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full ${
          isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-800'
        }`}>
          Frases de nuestra comunidad
        </span>
        <h2 className={`text-2xl sm:text-3xl font-black text-center mt-3 tracking-tight ${
          isDarkMode ? 'text-white' : 'text-slate-900'
        }`}>
          Lo que dicen quienes ya son parte de nosotros
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 w-full">
          <div className={`p-6 rounded-[24px] border relative ${
            isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <span className="text-4xl text-emerald-500 font-serif absolute top-3 left-4 opacity-30">“</span>
            <p className={`text-xs sm:text-sm italic font-medium leading-relaxed z-10 relative pt-4 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Antes pasaba días buscando cargas de retorno en paraderos o agencias y terminaba cobrando poco solo por no regresar vacío. Con CargoFlow encuentro fletes listos desde el celular mientras descargo, cobro de inmediato y todo es transparente.
            </p>
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-dashed border-slate-700/20">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs">
                CR
              </div>
              <div>
                <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Carlos Rodríguez</h4>
                <p className="text-[10px] font-semibold text-slate-500">Conductor de Furgón - Bogotá</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-[24px] border relative ${
            isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <span className="text-4xl text-blue-500 font-serif absolute top-3 left-4 opacity-30">“</span>
            <p className={`text-xs sm:text-sm italic font-medium leading-relaxed z-10 relative pt-4 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              En nuestra comercializadora de alimentos enviamos despachos a diario a varias ciudades. Poder negociar de forma directa y monitorear el camión en tiempo real por GPS nos ha ahorrado tiempo, costos de coordinación y llamadas estresantes.
            </p>
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-dashed border-slate-700/20">
              <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-xs">
                LA
              </div>
              <div>
                <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Luis Alzate</h4>
                <p className="text-[10px] font-semibold text-slate-500">Cliente Logístico - Medellín</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Call to Action Card */}
      <section className="w-full max-w-4xl px-4 mt-20 sm:mt-28 z-10 text-center flex flex-col items-center">
        <div className={`w-full rounded-[36px] p-8 sm:p-12 border shadow-xl relative overflow-hidden flex flex-col items-center ${
          isDarkMode 
            ? 'bg-gradient-to-r from-[#0d1e3f] via-[#09152b] to-[#0a1e3b] border-blue-500/20' 
            : 'bg-blue-600 text-white border-blue-500/20'
        }`}>
          {isDarkMode && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
          )}

          <h2 className={`text-2xl sm:text-4xl font-black max-w-xl leading-tight ${isDarkMode ? 'text-white' : 'text-white'}`}>
            ¿Estás listo para optimizar tus operaciones de transporte?
          </h2>
          <p className={`text-xs sm:text-sm font-medium mt-4 max-w-md ${isDarkMode ? 'text-slate-300' : 'text-blue-100'}`}>
            Miles de conductores y clientes ya están conectando de forma directa y segura. No esperes más para ser parte del cambio.
          </p>

          <button
            onClick={() => onGetStarted()}
            className={`mt-8 px-8 py-4 rounded-[20px] text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-2 group ${
              isDarkMode 
                ? 'bg-emerald-500 text-white hover:bg-emerald-400' 
                : 'bg-white text-blue-700 hover:bg-slate-100'
            }`}
          >
            <span>Crear mi Cuenta Gratis</span>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>
    </div>
  );
}
