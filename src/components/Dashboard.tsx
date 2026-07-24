import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingDown, 
  Landmark, 
  Star, 
  CalendarDays,
  ChevronRight,
  ChevronLeft, 
  Users, 
  UserCheck, 
  Truck, 
  ArrowRight,
  ClipboardList,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip, UserProfile } from '../types';

interface DashboardProps {
  user: UserProfile;
  trips: Trip[];
  usersList: UserProfile[];
  onNavigateToView: (view: 'home' | 'activity' | 'chat' | 'dashboard' | 'profile') => void;
}

type PeriodType = 'hoy' | 'semana' | 'mes';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAY_LABELS = ['D','L','M','M','J','V','S'];

export default function Dashboard({ user, trips, usersList, onNavigateToView }: DashboardProps) {
  const [period, setPeriod] = useState<PeriodType>('semana');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [showHeatCalendar, setShowHeatCalendar] = useState(false);
  const [calMonthOffset, setCalMonthOffset] = useState(0);

  // ── Trip base filters ──────────────────────────────────────────────
  const completedTrips = trips.filter(t => t.status === 'COMPLETADO');

  const myTrips = trips.filter(t => {
    if (user.role === 'conductor') return t.conductorId === user.email;
    if (user.role === 'cliente') return t.clienteId === user.email;
    return true;
  });
  const myCompletedTrips = myTrips.filter(t => t.status === 'COMPLETADO');

  // ── Week helpers ───────────────────────────────────────────────────
  const getWeekStart = (offset: number): Date => {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getWeekEnd = (offset: number): Date => {
    const monday = getWeekStart(offset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  };

  const getWeekLabel = (offset: number): string => {
    const monday = getWeekStart(offset);
    const sunday = getWeekEnd(offset);
    if (monday.getMonth() === sunday.getMonth()) {
      return `${monday.getDate()} Al ${sunday.getDate()} De ${MONTH_SHORT[monday.getMonth()]}`;
    }
    return `${monday.getDate()} ${MONTH_SHORT[monday.getMonth()]} Al ${sunday.getDate()} ${MONTH_SHORT[sunday.getMonth()]}`;
  };

  const getMonthTarget = (offset: number): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  };

  const getMonthLabel = (offset: number): string => {
    const t = getMonthTarget(offset);
    return `${MONTH_NAMES[t.getMonth()]} De ${t.getFullYear()}`;
  };

  // ── Period filter ──────────────────────────────────────────────────
  const getTripsByPeriod = (periodVal: PeriodType, targetTrips: Trip[]): Trip[] => {
    return targetTrips.filter(t => {
      if (!t.completedAt) return false;
      const date = new Date(t.completedAt);
      if (periodVal === 'hoy') {
        return date.toDateString() === new Date().toDateString();
      } else if (periodVal === 'semana') {
        return date >= getWeekStart(weekOffset) && date <= getWeekEnd(weekOffset);
      } else {
        const target = getMonthTarget(monthOffset);
        return date.getMonth() === target.getMonth() && date.getFullYear() === target.getFullYear();
      }
    });
  };

  const myCompletedTripsInPeriod = getTripsByPeriod(period, myCompletedTrips);

  // ── Conductor metrics ──────────────────────────────────────────────
  const totalEarnings = myCompletedTripsInPeriod.reduce((s, t) => s + (t.price || 0), 0);
  const totalTips = myCompletedTripsInPeriod.reduce((s, t) => s + ((t.clienteRating?.tip) || 0), 0);
  const totalCompletedCount = myCompletedTripsInPeriod.length;
  const avgEarningPerTrip = totalCompletedCount > 0 ? totalEarnings / totalCompletedCount : 0;

  // ── Client metrics ─────────────────────────────────────────────────
  const totalSpent = myCompletedTripsInPeriod.reduce((s, t) => s + (t.price || 0) + ((t.clienteRating?.tip) || 0), 0);
  const totalShipmentsCount = getTripsByPeriod(period, myTrips).length;
  const clientCompletedCount = myCompletedTripsInPeriod.length;

  // ── Admin metrics ──────────────────────────────────────────────────
  const globalCompletedTripsInPeriod = getTripsByPeriod(period, completedTrips);
  const globalTransactedValue = globalCompletedTripsInPeriod.reduce((s, t) => s + (t.price || 0), 0);
  const globalCommission = globalTransactedValue * 0.10;
  const globalTips = globalCompletedTripsInPeriod.reduce((s, t) => s + ((t.clienteRating?.tip) || 0), 0);
  const globalActiveCount = trips.filter(t => t.status === 'EN CAMINO' || t.status === 'PENDIENTE').length;
  const totalRegisteredDrivers = usersList.filter(u => u.role === 'conductor').length;
  const totalRegisteredClients = usersList.filter(u => u.role === 'cliente').length;

  // ── Dynamic Chart Data ─────────────────────────────────────────────
  const getChartData = () => {
    const result: { label: string; value: number; heightPercent: number; formattedValue: string }[] = [];

    const calcDayValue = (dateStr: string): number => {
      const dayTrips = completedTrips.filter(t => t.completedAt && new Date(t.completedAt).toDateString() === dateStr);
      if (user.role === 'conductor') return dayTrips.filter(t => t.conductorId === user.email).reduce((s, t) => s + (t.price || 0), 0);
      if (user.role === 'cliente') return dayTrips.filter(t => t.clienteId === user.email).reduce((s, t) => s + (t.price || 0), 0);
      return dayTrips.reduce((s, t) => s + (t.price || 0), 0) * 0.1;
    };

    if (period === 'hoy') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        result.push({ label: DAY_LABELS[d.getDay()], value: calcDayValue(d.toDateString()), heightPercent: 0, formattedValue: '' });
      }
    } else if (period === 'semana') {
      const monday = getWeekStart(weekOffset);
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        result.push({ label: DAY_LABELS[d.getDay()], value: calcDayValue(d.toDateString()), heightPercent: 0, formattedValue: '' });
      }
    } else {
      const target = getMonthTarget(monthOffset);
      const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      const weeksInMonth = Math.ceil(daysInMonth / 7);
      for (let w = 0; w < weeksInMonth; w++) {
        const startDay = w * 7 + 1;
        const endDay = Math.min(startDay + 6, daysInMonth);
        let weekSum = 0;
        for (let d = startDay; d <= endDay; d++) {
          weekSum += calcDayValue(new Date(target.getFullYear(), target.getMonth(), d).toDateString());
        }
        result.push({ label: `S${w + 1}`, value: weekSum, heightPercent: 0, formattedValue: '' });
      }
    }

    const maxVal = Math.max(...result.map(r => r.value), 1);
    return result.map(r => ({
      ...r,
      heightPercent: Math.max(5, Math.round((r.value / maxVal) * 100)),
      formattedValue: r.value >= 1000000
        ? `$${(r.value / 1000000).toFixed(1)}M`
        : r.value >= 1000 ? `$${(r.value / 1000).toFixed(0)}k` : `$${r.value}`
    }));
  };

  const chartData = getChartData();
  const chartTotal = chartData.reduce((s, r) => s + r.value, 0);

  // ── Heat Calendar Data ─────────────────────────────────────────────
  const now = new Date();
  const calMonth = new Date(now.getFullYear(), now.getMonth() + calMonthOffset, 1);
  const daysInCalMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = calMonth.getDay(); // 0=Sun
  const dayCounts: Record<number, number> = {};
  myCompletedTrips.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    if (d.getMonth() === calMonth.getMonth() && d.getFullYear() === calMonth.getFullYear()) {
      dayCounts[d.getDate()] = (dayCounts[d.getDate()] || 0) + 1;
    }
  });

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 text-slate-400';
    if (count === 1) return 'bg-blue-200 text-blue-800';
    if (count <= 3) return 'bg-blue-400 text-white';
    return 'bg-blue-700 text-white';
  };

  // ── Download CSV Report ────────────────────────────────────────────
  const downloadReport = () => {
    const rows = [
      ['ID', 'Fecha', 'Origen', 'Destino', 'Precio COP', 'Propina COP', 'Estado', 'Conductor', 'Cliente'],
      ...myTrips.map(t => [
        t.id,
        t.completedAt ? new Date(t.completedAt).toLocaleDateString('es-CO') : (t.date || ''),
        t.origin,
        t.destination,
        (t.price || 0).toString(),
        ((t.clienteRating?.tip) || 0).toString(),
        t.status,
        t.conductorName || '',
        t.clienteName || ''
      ])
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cargoflow_reporte_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Chart title ────────────────────────────────────────────────────
  const chartTitle = period === 'hoy'
    ? 'Rendimiento — Últimos 7 Días'
    : period === 'semana'
    ? `Rendimiento — ${getWeekLabel(weekOffset)}`
    : `Rendimiento — ${getMonthLabel(monthOffset)}`;

  return (
    <div className="bg-slate-50 pt-20">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-5 pt-5 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
          {user.role === 'admin' ? 'PANEL DE CONTROL GENERAL' : 'HISTORIAL FINANCIERO'}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {user.role === 'admin' ? 'Dashboard' : user.role === 'conductor' ? 'Ganancias' : 'Reportes'}
          </h1>
          <div className="flex items-center gap-2">
            {/* Download Report */}
            <button
              onClick={downloadReport}
              title="Descargar reporte CSV"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              <Download size={15} />
            </button>
            {/* Heat Calendar Toggle */}
            <button
              onClick={() => setShowHeatCalendar(v => !v)}
              title="Calendario de actividad"
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                showHeatCalendar ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <CalendarDays size={15} />
            </button>
            {/* Role badge */}
            <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200 uppercase tracking-widest">
              {user.role}
            </span>
          </div>
        </div>

        {/* Heat Calendar Panel */}
        <AnimatePresence>
          {showHeatCalendar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                {/* Calendar month navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setCalMonthOffset(o => o - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => setCalMonthOffset(o => Math.min(o + 1, 0))}
                    disabled={calMonthOffset >= 0}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Day-of-week headers (Mon first) */}
                <div className="grid grid-cols-7 mb-1">
                  {['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d => (
                    <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase">{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty leading cells — Mon=0 offset */}
                  {Array.from({ length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInCalMonth }).map((_, i) => {
                    const day = i + 1;
                    const count = dayCounts[day] || 0;
                    const isToday =
                      calMonth.getMonth() === now.getMonth() &&
                      calMonth.getFullYear() === now.getFullYear() &&
                      day === now.getDate();
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          // Navigate to the week containing this day
                          const clicked = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
                          const diffMs = now.getTime() - clicked.getTime();
                          const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
                          setWeekOffset(-diffWeeks);
                          setPeriod('semana');
                          setShowHeatCalendar(false);
                        }}
                        className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-black transition-all cursor-pointer border-2 ${
                          isToday ? 'border-blue-500' : 'border-transparent'
                        } ${getHeatColor(count)} hover:scale-105`}
                        title={count > 0 ? `${count} servicio${count > 1 ? 's' : ''}` : 'Sin actividad'}
                      >
                        <span className="leading-none">{day}</span>
                        {count > 0 && <span className="text-[8px] leading-none opacity-80">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 mt-3 justify-end">
                  {[
                    { color: 'bg-slate-100', label: '0' },
                    { color: 'bg-blue-200', label: '1' },
                    { color: 'bg-blue-400', label: '2-3' },
                    { color: 'bg-blue-700', label: '4+' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-sm ${color}`} />
                      <span className="text-[9px] text-slate-500 font-semibold">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Period Selector Tabs */}
        <div className="flex mt-4 bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
          {(['hoy', 'semana', 'mes'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setWeekOffset(0);
                setMonthOffset(0);
              }}
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

        {/* Week Navigator */}
        {period === 'semana' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mt-3 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200"
          >
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-slate-700">{getWeekLabel(weekOffset)}</span>
            <button
              onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
              disabled={weekOffset >= 0}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Month Navigator */}
        {period === 'mes' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mt-3 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200"
          >
            <button
              onClick={() => setMonthOffset(o => o - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-slate-700">{getMonthLabel(monthOffset)}</span>
            <button
              onClick={() => setMonthOffset(o => Math.min(o + 1, 0))}
              disabled={monthOffset >= 0}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* ── 1. CONDUCTOR VIEW ──────────────────────────────────────── */}
        {user.role === 'conductor' && (
          <>
            {/* Primary metric */}
            <div className="bg-[#0b224d] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
                <Landmark size={150} />
              </div>
              {/* Scanlines */}
              <div className="absolute inset-0 pointer-events-none rounded-3xl opacity-[0.07] bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]" />
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
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Viajes Realizados</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-800">{totalCompletedCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">fletes</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Promedio por flete</p>
                <span className="text-base font-black text-slate-800">${Math.round(avgEarningPerTrip).toLocaleString('es-CO')}</span>
              </div>
            </div>
          </>
        )}

        {/* ── 2. CLIENT VIEW ─────────────────────────────────────────── */}
        {user.role === 'cliente' && (
          <>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fletes Solicitados</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-800">{totalShipmentsCount}</span>
                  <span className="text-xs text-slate-400 font-semibold">fletes</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fletes Completados</p>
                <span className="text-2xl font-black text-emerald-600">{clientCompletedCount}</span>
              </div>
            </div>
          </>
        )}

        {/* ── 3. ADMIN VIEW ──────────────────────────────────────────── */}
        {user.role === 'admin' && (
          <>
            <div className="bg-gradient-to-br from-[#0b224d] to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
                <BarChart3 size={150} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Comisión Estimada (10%)</p>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[9px] px-2 py-0.5 rounded-md">10% Fee</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight mt-1 text-emerald-400">${globalCommission.toLocaleString('es-CO')}</h2>
                <p className="text-xs text-slate-400 mt-2 font-medium">Volumen total: <span className="font-bold text-white">${globalTransactedValue.toLocaleString('es-CO')}</span></p>
              </div>
            </div>
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
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Propinas</p>
                </div>
                <span className="text-base font-black text-slate-800">${globalTips.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </>
        )}

        {/* ── 4. CHART ───────────────────────────────────────────────── */}
        <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs mt-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 size={15} className="text-blue-600" />
              {chartTitle}
            </h3>
            <span className="text-[10px] font-black text-[#0b224d] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              ${chartTotal.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="h-36 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center gap-2 w-full group relative">
                <div
                  className={`w-full rounded-t-lg transition-all duration-300 relative cursor-pointer ${
                    data.value > 0
                      ? 'bg-blue-600 hover:bg-[#0b224d] shadow-[0_0_12px_rgba(37,99,235,0.2)]'
                      : 'bg-slate-100'
                  }`}
                  style={{ height: `${data.heightPercent}%` }}
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md pointer-events-none whitespace-nowrap z-30">
                    {data.value.toLocaleString('es-CO')}
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-400">{data.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. RECENT TRIPS ────────────────────────────────────────── */}
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
