import React, { useEffect, useState } from 'react';
import { OfflineRegion } from '../models/mapTypes';
import {
  regionDownloadManager,
  StorageEstimateInfo,
} from '../services/storage/RegionDownloadManager';

interface RegionDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegionDownloadModal: React.FC<RegionDownloadModalProps> = ({ isOpen, onClose }) => {
  const [regions, setRegions] = useState<OfflineRegion[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageEstimateInfo>({
    quotaMb: 0,
    usageMb: 0,
    availableMb: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const rList = await regionDownloadManager.getRegions();
    setRegions(rList);
    const est = await regionDownloadManager.getStorageEstimate();
    setStorageInfo(est);
  };

  const handleDownload = async (regionId: string) => {
    await regionDownloadManager.downloadRegion(regionId, (updatedRegion) => {
      setRegions((prev) => prev.map((r) => (r.id === updatedRegion.id ? updatedRegion : r)));
    });
    const est = await regionDownloadManager.getStorageEstimate();
    setStorageInfo(est);
  };

  const handleCancel = (regionId: string) => {
    regionDownloadManager.cancelDownload(regionId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#09152b] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined">map</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">Gestor de Mapas Offline</h2>
              <p className="text-xs text-slate-400">
                Descarga regiones de Colombia para navegar sin conexión
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Device Storage Capacity Card */}
        <div className="p-6 bg-slate-900/60 border-b border-white/5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-medium">Almacenamiento del Dispositivo</span>
            <span className="text-emerald-400 font-bold">
              {storageInfo.availableMb} MB disponibles
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (storageInfo.usageMb / Math.max(1, storageInfo.quotaMb)) * 100
                )}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
            <span>Uso de la App: {storageInfo.usageMb} MB</span>
            <span>Espacio Total: {storageInfo.quotaMb} MB</span>
          </div>
        </div>

        {/* Region List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 no-scrollbar">
          {regions.map((region) => {
            const isDownloading = region.status === 'downloading';
            const isDownloaded = region.status === 'downloaded';
            const progress =
              region.totalTiles > 0
                ? Math.round((region.downloadedTiles / region.totalTiles) * 100)
                : 0;

            return (
              <div
                key={region.id}
                className="bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{region.name}</h3>
                      {region.department && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                          {region.department}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{region.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                      <span>📦 ~{region.estimatedSizeMb} MB</span>
                      <span>🗺️ Zooms {region.minZoom}-{region.maxZoom}</span>
                    </div>
                  </div>

                  <div>
                    {isDownloaded ? (
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Descargado
                        </span>
                      </div>
                    ) : isDownloading ? (
                      <button
                        onClick={() => handleCancel(region.id)}
                        className="bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs px-3 py-1.5 rounded-xl font-semibold transition"
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownload(region.id)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Descargar
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar during download */}
                {isDownloading && (
                  <div className="mt-1">
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Descargando mosaicos del mapa...</span>
                      <span className="font-bold text-emerald-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {region.downloadedTiles} / {region.totalTiles} mosaicos guardados en IndexedDB
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-between items-center text-xs text-slate-400">
          <span>Sincronización automática de recorridos activa</span>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
