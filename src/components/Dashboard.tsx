import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Landmark, 
  Star, 
  Award, 
  Compass, 
  DollarSign, 
  Calendar, 
  Clock, 
  RefreshCw, 
  ChevronRight, 
  Users, 
  UserCheck, 
  Truck, 
  Coins, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { motion } from 'motion/react';
import { Trip, UserProfile } from '../types';

interface DashboardProps {
  user: UserProfile;
  trips: Trip[];
  usersList: UserProfile[];
  onNavigateToView: (view: 'home' | 'activity' | 'chat' | 'dashboard' | 'profile') => void;
}

type PeriodType = 'hoy' | 'semana' | 'mes';

export default function Dashboard({ user, trips, usersList, onNavigateToView }: DashboardProps) {
  const [period, setPeriod] = useState<PeriodType>('semana');

  // Filter only completed trips
  const completedTrips = trips.filter(t => t.status === 'COMPLETADO');

  // Filter completed trips by selected period helper
  const getTripsByPeriod = (periodVal: PeriodType, targetTrips: Trip[]) => {
    const now = new Date();
    return targetTrips.filter(t => {
      if (!t.completedAt) return false;
      const date = new Date(t.completedAt);
      const diffMs = now.getTime() - date.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (periodVal === 'hoy') {
        return date.toDateString() === now.toDateString();
      } else if (periodVal === 'semana') {
        return diffDays <= 7;
      } else {
        return diffDays <= 30;
      }
    });
  };

  // Get active trips count
  const activeTripsCount = trips.filter(t => t.status === 'EN CAMINO' || t.status === 'PENDIENTE').length;

  // Filter trips for current user based on role
  const myTrips = trips.filter(t => {
    if (user.role === 'conductor') return t.conductorId === user.email;
    if (user.role === 'cliente') return t.clienteId === user.email;
    return true; // Admin sees all
  });

  const myCompletedTrips = myTrips.filter(t => t.status === 'COMPLETADO');
  const myCompletedTripsInPeriod = getTripsByPeriod(period, myCompletedTrips);

  // 1. CONDUCTOR CALCULATIONS
  const totalEarnings = myCompletedTripsInPeriod.reduce((sum, t) => sum + (t.price || 0), 0);
  const totalTips = myCompletedTripsInPeriod.reduce((sum, t) => sum + (t.tip || 0), 0);
  const totalCompletedCount = myCompletedTripsInPeriod.length;
  const avgEarningPerTrip = totalCompletedCount > 0 ? (totalEarnings / totalCompletedCount) : 0;

  // 2. CLIENT CALCULATIONS
  const totalSpent = myCompletedTripsInPeriod.reduce((sum, t) => sum + (t.price || 0) + (t.tip || 0), 0);
  const totalShipmentsCount = getTripsByPeriod(period, myTrips).length; // Active + completed in period
  const clientCompletedCount = myCompletedTripsInPeriod.length;

  // 3. ADMIN CALCULATIONS
  const globalCompletedTripsInPeriod = getTripsByPeriod(period, completedTrips);
  const globalTransactedValue = globalCompletedTripsInPeriod.reduce((sum, t) => sum + (t.price || 0), 0);
  const globalCommission = globalTransactedValue * 0.10; // 10% platform fee
  const globalTips = globalCompletedTripsInPeriod.reduce((sum, t) => sum + (t.tip || 0), 0);
  const globalCompletedCount = globalCompletedTripsInPeriod.length;
  const globalActiveCount = trips.filter(t => t.status === 'EN CAMINO' || t.status === 'PENDIENTE').length;

  const totalRegisteredDrivers = usersList.filter(u => u.role === 'conductor').length;
  const totalRegisteredClients = usersList.filter(u => u.role === 'cliente').length;

  // CHART GENERATION DATA (Last 7 Days)
  const getLast7DaysData = () => {
    const result = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      
      // Calculate total for this day
      let dailySum = 0;
      const daysCompletedTrips = completedTrips.filter(t => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).toDateString() === dateStr;
      });

      if (user.role === 'conductor') {
        const myDailyTrips = daysCompletedTrips.filter(t => t.conductorId === user.email);
        dailySum = myDailyTrips.reduce((sum, t) => sum + (t.price || 0), 0);
      } else if (user.role === 'cliente') {
        const myDailyTrips = daysCompletedTrips.filter(t => t.clienteId === user.email);
        dailySum = myDailyTrips.reduce((sum, t) => sum + (t.price || 0) + (t.tip || 0), 0);
      } else {
        // Admin sees platform commission generated daily
        const totalVolume = daysCompletedTrips.reduce((sum, t) => sum + (t.price || 0), 0);
        dailySum = totalVolume * 0.10; // 10% commission
      }

      const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
      result.push({
        dayLabel: dayNames[d.getDay()],
        value: dailySum,
        formattedValue: dailySum >= 1000 ? `$${(dailySum / 1000).toFixed(0)}k` : `$${dailySum}`
      });
    }

    // Scale heights proportionally
    const maxVal = Math.max(...result.map(r => r.value), 1); // Avoid division by 0
    return result.map(r => ({
      ...r,
      heightPercent: Math.max(5, Math.round((r.value / maxVal) * 100))
    }));
  };

  const chartData = getLast7DaysData();
  const totalWeeklyChartSum = chartData.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="bg-slate-50 pt-20">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-5 pt-5 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
          {user.role === 'admin' ? 'PANEL DE CONTROL GENERAL' : 'HISTORIAL FINANCIERO'}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {user.role === 'admin' ? 'Dashboard' : user.role === 'conductor' ? 'Ganancias' : 'Reportes'}
          </h1>
          <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200 uppercase tracking-widest">
            {user.role}
          </span>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex mt-5 bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
          {(['hoy', 'semana', 'mes'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 text-center py-2.5 rounded-xl font-bold text-xs capitalize transition-all cursor-pointer ${
                period === p 
                  ? 'bg-[#0b224d] text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta Semana' : 'Este Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 flex flex-col gap-4">
        
        {/* ── 1. CONDUCTOR VIEW ───────────────────────────────── */}
        {user.role === 'conductor' && (
          <>
            {/* Primary metric: Total Earnings */}
            <div className="bg-[#0b224d] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
                <Landmark size={150} />
              </div>
              <div className="relative z-10 flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Ganancias Acumuladas</p>
                <h2 className="text-3xl font-black tracking-tight">${(totalEarnings + totalTips).toLocaleString('es-CO')}</h2>
                
                <div className="mt-4 flex gap-4 border-t border-white/10 pt-4">
                  <div className="flex-1">
                    <p className="text-[9px] text-slate-300 font-bold uppercase">Flete Base</p>
                    <p className="text-sm font-black">${totalEarnings.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="flex-1 border-l border-white/10 pl-4">
                    <p className="text-[9px] text-slate-300 font-bold uppercase">Propina extra</p>
                    <p className="text-sm font-black text-emerald-400">+${totalTips.toLocaleString('es-CO')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid secondary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Viajes Realizados</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-800">{totalCompletedCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">fletes</span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Promedio por flete</p>
                <span className="text-base font-black text-slate-800">${Math.round(avgEarningPerTrip).toLocaleString('es-CO')}</span>
              </div>
            </div>
          </>
        )}

        {/* ── 2. CLIENT VIEW ──────────────────────────────────── */}
        {user.role === 'cliente' && (
          <>
            {/* Primary metric: Total Spent */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
              <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Landmark size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Gastos de Fletes</p>
              <h2 className="text-3xl font-black tracking-tight text-[#0b224d]">${totalSpent.toLocaleString('es-CO')}</h2>
              
              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] font-bold w-fit mt-3">
                <TrendingDown size={12} />
                <span>12% ahorro logístico en plataforma</span>
              </div>
            </div>

            {/* Grid secondary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fletes Solicitados</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-800">{totalShipmentsCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">fletes</span>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fletes Completados</p>
                <span className="text-2xl font-black text-emerald-600">{clientCompletedCount}</span>
              </div>
            </div>
          </>
        )}

        {/* ── 3. ADMIN VIEW ───────────────────────────────────── */}
        {user.role === 'admin' && (
          <>
            {/* Admin Commission earnings card */}
            <div className="bg-gradient-to-br from-[#0b224d] to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
                <BarChart3 size={150} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Comisión Estimada de Plataforma (10%)</p>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[9px] px-2 py-0.5 rounded-md">10% Platform Fee</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight mt-1 text-emerald-400">${globalCommission.toLocaleString('es-CO')}</h2>
                <p className="text-xs text-slate-400 mt-2 font-medium">Volumen transaccionado total: <span className="font-bold text-white">${globalTransactedValue.toLocaleString('es-CO')}</span></p>
              </div>
            </div>

            {/* Grid administrative cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Truck size={14} /></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fletes Activos</p>
                </div>
                <span className="text-2xl font-black text-slate-800">{globalActiveCount}</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center"><UserCheck size={14} /></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conductores</p>
                </div>
                <span className="text-2xl font-black text-slate-800">{totalRegisteredDrivers}</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center"><Users size={14} /></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clientes</p>
                </div>
                <span className="text-2xl font-black text-slate-800">{totalRegisteredClients}</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center"><Star size={14} /></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Propinas Plataforma</p>
                </div>
                <span className="text-base font-black text-slate-800">${globalTips.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </>
        )}

        {/* ── 4. CHART SECTION (Last 7 Days) ──────────────────── */}
        <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs mt-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 size={15} className="text-blue-600" />
              Rendimiento últimos 7 días
            </h3>
            <span className="text-[10px] font-black text-[#0b224d] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              Total Semanal: ${totalWeeklyChartSum.toLocaleString('es-CO')}
            </span>
          </div>

          {/* Bar Chart */}
          <div className="h-36 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center gap-2 w-full group relative">
                
                {/* Bar */}
                <div 
                  className={`w-full rounded-t-lg transition-all duration-300 relative cursor-pointer ${
                    data.value > 0 
                      ? 'bg-blue-600 hover:bg-[#0b224d] shadow-[0_0_12px_rgba(37,99,235,0.2)]' 
                      : 'bg-slate-100'
                  }`}
                  style={{ height: `${data.heightPercent}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md pointer-events-none whitespace-nowrap z-30">
                    {data.value.toLocaleString('es-CO')}
                  </div>
                </div>

                <span className="text-[10px] font-black text-slate-400">{data.dayLabel}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. RECENT TRIPS LIST ────────────────────────────── */}
        <section className="mt-1">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider px-1 mb-3">
            {user.role === 'admin' ? 'Todos los viajes recientes' : 'Viajes Recientes'}
          </h3>

          <div className="flex flex-col gap-2.5">
            {myTrips.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center">
                <ClipboardList className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-xs text-slate-500 font-semibold">No hay viajes registrados en este período.</p>
              </div>
            ) : (
              myTrips.slice(0, 5).map((trip) => {
                const isCompletado = trip.status === 'COMPLETADO';
                const formattedPrice = `$${(trip.price || 0).toLocaleString('es-CO')}`;
                
                return (
                  <div
                    key={trip.id}
                    onClick={() => onNavigateToView('activity')}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between hover:bg-slate-50 active:scale-99 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isCompletado ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <Truck size={16} />
                      </div>
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                          <span className="truncate max-w-[80px]">{trip.origin}</span>
                          <ArrowRight size={10} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[80px]">{trip.destination}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ID: #{trip.id} {trip.vehicleType && `• ${trip.vehicleType}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-black text-slate-800">{formattedPrice}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                        trip.status === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' :
                        trip.status === 'EN CAMINO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {trip.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
        <div className="h-1" aria-hidden="true" />
      </div>
    </div>
  );
}
