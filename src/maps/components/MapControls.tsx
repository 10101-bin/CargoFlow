import React, { useState } from 'react';
import { LatLng, MapProviderType, PlaceSearchResult, RouteInfo } from '../models/mapTypes';

interface MapControlsProps {
  activeProvider: MapProviderType;
  isOnline: boolean;
  isAutoSwitch: boolean;
  activeRoute: RouteInfo | null;
  onSearch: (query: string) => Promise<PlaceSearchResult[]>;
  onSelectPlace: (place: PlaceSearchResult) => void;
  onCalculateRoute: (origin: LatLng, destination: LatLng) => Promise<RouteInfo>;
  onClearRoute: () => void;
  onCenterUserLocation: () => void;
  onToggleProvider: (provider: MapProviderType) => void;
  onToggleAutoSwitch: (enabled: boolean) => void;
  onToggleTraffic: (enabled: boolean) => void;
  userLocation: LatLng;
  onOpenRegionManager?: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  activeProvider,
  isOnline,
  isAutoSwitch,
  activeRoute,
  onSearch,
  onSelectPlace,
  onCalculateRoute,
  onClearRoute,
  onCenterUserLocation,
  onToggleProvider,
  onToggleAutoSwitch,
  onToggleTraffic,
  userLocation,
  onOpenRegionManager,
}) => {
  const [originText, setOriginText] = useState('Mi Ubicación GPS');
  const [originPos, setOriginPos] = useState<LatLng>(userLocation);
  const [destText, setDestText] = useState('');
  const [destPos, setDestPos] = useState<LatLng | null>(null);

  const [activeInput, setActiveInput] = useState<'origin' | 'dest' | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const handleInputChange = async (type: 'origin' | 'dest', text: string) => {
    if (type === 'origin') {
      setOriginText(text);
    } else {
      setDestText(text);
    }
    setActiveInput(type);

    if (text.trim().length > 1) {
      setIsSearching(true);
      const results = await onSearch(text);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectResult = (place: PlaceSearchResult) => {
    if (activeInput === 'origin') {
      setOriginText(place.title);
      setOriginPos(place.position);
    } else {
      setDestText(place.title);
      setDestPos(place.position);
    }
    onSelectPlace(place);
    setSearchResults([]);
    setActiveInput(null);
  };

  const handleUseCurrentLocationForOrigin = () => {
    setOriginText('Mi Ubicación GPS');
    setOriginPos(userLocation);
    onCenterUserLocation();
    setActiveInput(null);
  };

  const handleTraceRoute = async () => {
    const start = originPos || userLocation;
    let end = destPos;

    if (!end) {
      // If user typed destination without selecting from dropdown, search it first
      if (destText.trim()) {
        const results = await onSearch(destText);
        if (results.length > 0) {
          end = results[0].position;
        }
      }
    }

    // Default fallback logistics destination (e.g. Medellín Terminal Norte or Bogotá Salitre)
    if (!end) {
      end = { lat: 6.273, lng: -75.568 };
      setDestText('Terminal del Norte, Medellín');
    }

    await onCalculateRoute(start, end);
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-md pointer-events-auto">
      {/* Route & Search Panel (Collapsible) */}
      {isExpanded && (
        <div className="bg-gradient-to-br from-[#0b224d]/95 via-slate-900/95 to-emerald-950/95 border border-emerald-500/30 rounded-3xl shadow-2xl p-4 text-white flex flex-col gap-3 backdrop-blur-md animate-fade-in-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">alt_route</span>
              Simular / Trazar Ruta
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        {/* Origin Field */}
        <div className="relative">
          <div className="flex items-center bg-white/10 border border-white/15 rounded-2xl px-3 py-2 text-xs">
            <span className="material-symbols-outlined text-emerald-400 mr-2 text-base">my_location</span>
            <input
              type="text"
              value={originText}
              onFocus={() => setActiveInput('origin')}
              onChange={(e) => handleInputChange('origin', e.target.value)}
              placeholder="Origen (Dirección o Ciudad)"
              className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-400 w-full font-medium"
            />
            <button
              type="button"
              onClick={handleUseCurrentLocationForOrigin}
              className="text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 px-2 py-1 rounded-lg font-bold flex-shrink-0 transition"
              title="Usar GPS Actual"
            >
              GPS
            </button>
          </div>
        </div>

        {/* Destination Field */}
        <div className="relative">
          <div className="flex items-center bg-white/10 border border-white/15 rounded-2xl px-3 py-2 text-xs">
            <span className="material-symbols-outlined text-rose-400 mr-2 text-base">flag</span>
            <input
              type="text"
              value={destText}
              onFocus={() => setActiveInput('dest')}
              onChange={(e) => handleInputChange('dest', e.target.value)}
              placeholder="Destino (e.g. Terminal Norte, Bogotá, Cali, Puerto...)"
              className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-400 w-full font-medium"
            />
            {destText && (
              <button
                type="button"
                onClick={() => {
                  setDestText('');
                  setDestPos(null);
                  setSearchResults([]);
                }}
                className="text-slate-400 hover:text-white mr-1"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {activeInput && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0b224d] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-56 overflow-y-auto divide-y divide-white/10">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  onClick={() => handleSelectResult(res)}
                  className="w-full text-left px-4 py-3 hover:bg-white/10 transition flex flex-col gap-0.5 text-white"
                >
                  <span className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">location_on</span>
                    {res.title}
                  </span>
                  <span className="text-[11px] text-slate-300 truncate">{res.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Button: Trazar Ruta */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTraceRoute}
            className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">alt_route</span>
            <span>Trazar y Calcular Ruta</span>
          </button>
        </div>
      </div>
      )}

      {/* Active Route Details Card & Turn-by-Turn Steps */}
      {activeRoute && (
        <div className="bg-gradient-to-br from-[#0b224d]/95 via-slate-900/95 to-emerald-950/95 border border-emerald-500/40 rounded-3xl p-4 shadow-2xl text-white flex flex-col gap-3 backdrop-blur-md animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-sm">navigation</span>
              </span>
              <div>
                <h4 className="text-xs font-bold text-emerald-300">Ruta Calculada con Éxito</h4>
                <p className="text-[10px] text-slate-300">
                  {activeRoute.isOffline ? 'Ruta procesada offline (Haversine)' : 'Ruta OSRM Online'}
                </p>
              </div>
            </div>
            <button
              onClick={onClearRoute}
              className="text-slate-300 hover:text-white text-xs bg-white/10 border border-white/10 px-2.5 py-1 rounded-xl transition"
            >
              Limpiar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white/10 border border-white/10 p-2.5 rounded-2xl text-center">
            <div>
              <p className="text-[10px] text-slate-300 uppercase font-semibold">Distancia Total</p>
              <p className="text-base font-black text-white">{activeRoute.distanceKm} km</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-300 uppercase font-semibold">Tiempo Estimado</p>
              <p className="text-base font-black text-emerald-400">{activeRoute.durationMin} min</p>
            </div>
          </div>

          {activeRoute.steps && activeRoute.steps.length > 0 && (
            <div>
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white py-1 font-medium"
              >
                <span>Itinerario paso a paso ({activeRoute.steps.length} instrucciones)</span>
                <span className="material-symbols-outlined text-sm">
                  {showSteps ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {showSteps && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                  {activeRoute.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 p-2 rounded-xl text-[11px] flex items-start justify-between border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-slate-200">{step.instruction}</span>
                      </div>
                      <span className="text-emerald-400 font-mono font-bold text-[10px] flex-shrink-0">
                        {step.distanceKm} km
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Toolbar Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Recenter GPS Location Button */}
        <button
          onClick={onCenterUserLocation}
          className="bg-gradient-to-r from-[#0b224d]/95 to-slate-900/95 hover:from-[#0b224d] hover:to-slate-800 text-white border border-emerald-500/30 rounded-2xl p-2.5 shadow-xl transition flex items-center gap-1.5 text-xs font-medium active:scale-95 cursor-pointer"
          title="Centrar en mi ubicación GPS"
        >
          <span className="material-symbols-outlined text-emerald-400 text-lg">my_location</span>
          <span className="hidden sm:inline">Mi Posición</span>
        </button>

        {/* Toggle Route Simulator */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`rounded-2xl p-2.5 shadow-xl border text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
            isExpanded 
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 text-white border-emerald-400' 
              : 'bg-gradient-to-r from-[#0b224d]/95 to-slate-900/95 text-slate-200 border-emerald-500/30 hover:text-white'
          }`}
          title="Trazar y Calcular Ruta"
        >
          <span className="material-symbols-outlined text-base">alt_route</span>
          <span>Trazar Ruta</span>
        </button>

        {/* Offline Region Manager Download */}
        {onOpenRegionManager && (
          <button
            onClick={onOpenRegionManager}
            className="bg-gradient-to-r from-[#0b224d]/95 to-slate-900/95 hover:from-[#0b224d] hover:to-slate-800 text-white border border-emerald-500/30 rounded-2xl p-2.5 shadow-xl transition flex items-center gap-1 text-xs font-medium active:scale-95 cursor-pointer"
            title="Descargar Mapas Offline"
          >
            <span className="material-symbols-outlined text-emerald-400 text-base">download</span>
            <span className="hidden sm:inline">Mapas</span>
          </button>
        )}

        {/* Toggle Traffic (Online Mode) */}
        {activeProvider === 'google' && (
          <button
            onClick={() => {
              const next = !trafficEnabled;
              setTrafficEnabled(next);
              onToggleTraffic(next);
            }}
            className={`rounded-2xl p-2.5 shadow-xl border text-xs font-medium transition flex items-center gap-1 active:scale-95 ${
              trafficEnabled
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-gradient-to-r from-[#0b224d]/95 to-slate-900/95 text-slate-300 border-emerald-500/30 hover:text-white'
            }`}
            title="Tráfico en Tiempo Real"
          >
            <span className="material-symbols-outlined text-base">traffic</span>
            <span className="hidden sm:inline">Tráfico</span>
          </button>
        )}

        {/* Provider Selector Menu Toggle */}
        <div className="flex bg-[#0b224d]/95 border border-emerald-500/30 rounded-2xl p-1 shadow-xl text-xs">
          <button
            onClick={() => {
              onToggleAutoSwitch(false);
              onToggleProvider('google');
            }}
            disabled={!isOnline}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              activeProvider === 'google'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white disabled:opacity-40'
            }`}
          >
            Google
          </button>
          <button
            onClick={() => {
              onToggleAutoSwitch(false);
              onToggleProvider('osm_offline');
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              activeProvider === 'osm_offline'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            OSM
          </button>
        </div>
      </div>
    </div>
  );
};
