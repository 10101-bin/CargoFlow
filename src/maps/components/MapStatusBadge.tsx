import React, { useEffect, useState } from 'react';
import { mapSyncService } from '../services/sync/MapSyncService';

interface MapStatusBadgeProps {
  isOnline: boolean;
  providerName: string;
  isAutoSwitch: boolean;
  onOpenRegionManager?: () => void;
}

export const MapStatusBadge: React.FC<MapStatusBadgeProps> = ({
  isOnline,
  providerName,
  isAutoSwitch,
  onOpenRegionManager,
}) => {
  const [syncStatus, setSyncStatus] = useState<{ isSyncing: boolean; syncedCount: number }>({
    isSyncing: false,
    syncedCount: 0,
  });

  useEffect(() => {
    const unsubscribe = mapSyncService.subscribe((status) => {
      setSyncStatus({ isSyncing: status.isSyncing, syncedCount: status.syncedCount });
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full max-w-md pointer-events-auto">
      {/* Network Status Header Pills */}
      <div className="flex items-center justify-between bg-[#09152b]/90 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-xl text-white">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            {isOnline ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </>
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </>
            )}
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-200 truncate max-w-[170px]">{providerName}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {isAutoSwitch ? 'Cambio automático activado' : 'Modo manual'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncStatus.isSyncing && (
            <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 text-[10px] px-2 py-1 rounded-full animate-pulse border border-blue-500/30">
              <span className="material-symbols-outlined text-xs animate-spin">sync</span>
              Sincronizando...
            </div>
          )}

          {onOpenRegionManager && (
            <button
              onClick={onOpenRegionManager}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-xl transition font-medium border border-white/10 active:scale-95"
              title="Descargar Mapas Offline"
            >
              <span className="material-symbols-outlined text-sm text-emerald-400">download</span>
              <span>Mapas</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500/90 text-amber-950 font-semibold text-xs px-4 py-2 rounded-xl flex items-center justify-between shadow-lg backdrop-blur-sm border border-amber-400/40 animate-slide-down">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-amber-950">wifi_off</span>
            <span>Trabajando con mapas sin conexión</span>
          </div>
          <span className="text-[10px] bg-amber-950/20 px-2 py-0.5 rounded-md font-mono">
            OSM Local
          </span>
        </div>
      )}
    </div>
  );
};
