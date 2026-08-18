import React, { useState } from 'react';
import { LatLng, MapProviderType, PlaceSearchResult, RouteInfo } from '../models/mapTypes';
import { 
  Navigation, 
  Compass, 
  MapPin, 
  Flag, 
  X, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Route as RouteIcon, 
  Layers,
  Sparkles
} from 'lucide-react';

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
      {/* Route & Search Panel (Collapsible) — Matching Panel Cliente Green Gradient */}
      {isExpanded && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 border border-emerald-400/40 rounded-3xl shadow-[0px_15px_40px_rgba(16,185,129,0.35)] p-4 text-white flex flex-col gap-3 backdrop-blur-md animate-fade-in-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-200 uppercase tracking-widest flex items-center gap-1.5">
              <RouteIcon size={16} />
              Simular / Trazar Ruta Logística
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Origin Field */}
          <div className="relative">
            <div className="flex items-center bg-white/20 border border-white/30 rounded-2xl px-3 py-2 text-xs backdrop-blur-sm">
              <Compass size={16} className="text-emerald-200 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={originText}
                onFocus={() => setActiveInput('origin')}
                onChange={(e) => handleInputChange('origin', e.target.value)}
                placeholder="Origen (Dirección o Ciudad)"
                className="bg-transparent border-none outline-none text-xs text-white placeholder-emerald-100/70 w-full font-bold"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocationForOrigin}
                className="text-[10px] bg-white text-emerald-700 hover:bg-slate-100 px-2 py-1 rounded-lg font-black flex-shrink-0 transition shadow-sm cursor-pointer"
                title="Usar GPS Actual"
              >
                GPS
              </button>
            </div>
          </div>

          {/* Destination Field */}
          <div className="relative">
            <div className="flex items-center bg-white/20 border border-white/30 rounded-2xl px-3 py-2 text-xs backdrop-blur-sm">
              <Flag size={16} className="text-amber-300 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={destText}
                onFocus={() => setActiveInput('dest')}
                onChange={(e) => handleInputChange('dest', e.target.value)}
                placeholder="Destino (e.g. Terminal Norte, Bogotá, Cali, Puerto...)"
                className="bg-transparent border-none outline-none text-xs text-white placeholder-emerald-100/70 w-full font-bold"
              />
              {destText && (
                <button
                  type="button"
                  onClick={() => {
                    setDestText('');
                    setDestPos(null);
                    setSearchResults([]);
                  }}
                  className="text-white/80 hover:text-white mr-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {activeInput && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-emerald-400/40 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-56 overflow-y-auto divide-y divide-white/10 backdrop-blur-md">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => handleSelectResult(res)}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition flex flex-col gap-0.5 text-white cursor-pointer"
                  >
                    <span className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                      <MapPin size={13} />
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
              className="flex-1 bg-white hover:bg-slate-100 text-emerald-800 font-black text-xs py-2.5 px-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <RouteIcon size={16} />
              <span>Trazar y Calcular Ruta Logística</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Route Details Card & Turn-by-Turn Steps */}
      {activeRoute && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 border border-emerald-400/40 rounded-3xl p-4 shadow-[0px_15px_40px_rgba(16,185,129,0.35)] text-white flex flex-col gap-3 backdrop-blur-md animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold">
                <Navigation size={16} />
              </span>
              <div>
                <h4 className="text-xs font-black text-white">Ruta Calculada con Éxito</h4>
                <p className="text-[10px] text-emerald-100 font-medium">
                  {activeRoute.isOffline ? 'Ruta procesada offline (Haversine)' : 'Ruta OSRM Online'}
                </p>
              </div>
            </div>
            <button
              onClick={onClearRoute}
              className="text-emerald-800 font-black text-xs bg-white hover:bg-slate-100 px-3 py-1 rounded-xl shadow-xs transition cursor-pointer"
            >
              Limpiar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white/20 border border-white/30 p-2.5 rounded-2xl text-center backdrop-blur-xs">
            <div>
              <p className="text-[10px] text-emerald-100 uppercase font-extrabold tracking-wider">Distancia Total</p>
              <p className="text-base font-black text-white">{activeRoute.distanceKm} km</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-100 uppercase font-extrabold tracking-wider">Tiempo Estimado</p>
              <p className="text-base font-black text-amber-300">{activeRoute.durationMin} min</p>
            </div>
          </div>

          {activeRoute.steps && activeRoute.steps.length > 0 && (
            <div>
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="w-full flex items-center justify-between text-xs text-white py-1 font-bold cursor-pointer"
              >
                <span>Itinerario paso a paso ({activeRoute.steps.length} instrucciones)</span>
                {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showSteps && (
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                  {activeRoute.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-white/15 p-2 rounded-xl text-[11px] flex items-start justify-between border border-white/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white text-emerald-700 flex items-center justify-center font-black text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-white font-medium">{step.instruction}</span>
                      </div>
                      <span className="text-amber-300 font-mono font-bold text-[10px] flex-shrink-0">
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

      {/* Floating Toolbar Controls — Matching Panel Cliente Green Gradient Style */}
      <div className="flex items-center justify-between gap-2">
        {/* Recenter GPS Location Button */}
        <button
          onClick={onCenterUserLocation}
          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:opacity-95 text-white border border-emerald-400/40 rounded-2xl p-2.5 shadow-lg transition flex items-center gap-1.5 text-xs font-black active:scale-95 cursor-pointer"
          title="Centrar en mi ubicación GPS"
        >
          <Compass size={18} className="text-white" />
          <span className="hidden sm:inline">Mi Posición</span>
        </button>

        {/* Toggle Route Simulator */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`rounded-2xl p-2.5 shadow-lg border text-xs font-black transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
            isExpanded 
              ? 'bg-white text-emerald-800 border-white' 
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white border-emerald-400/40 hover:opacity-95'
          }`}
          title="Trazar y Calcular Ruta"
        >
          <RouteIcon size={16} />
          <span>Trazar Ruta</span>
        </button>

        {/* Offline Region Manager Download */}
        {onOpenRegionManager && (
          <button
            onClick={onOpenRegionManager}
            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:opacity-95 text-white border border-emerald-400/40 rounded-2xl p-2.5 shadow-lg transition flex items-center gap-1 text-xs font-black active:scale-95 cursor-pointer"
            title="Descargar Mapas Offline"
          >
            <Download size={16} className="text-white" />
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
            className={`rounded-2xl p-2.5 shadow-lg border text-xs font-black transition flex items-center gap-1 active:scale-95 cursor-pointer ${
              trafficEnabled
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white border-emerald-400/40 hover:opacity-95'
            }`}
            title="Tráfico en Tiempo Real"
          >
            <Layers size={16} />
            <span className="hidden sm:inline">Tráfico</span>
          </button>
        )}

        {/* Provider Selector Menu Toggle */}
        <div className="flex bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-700 border border-emerald-400/40 rounded-2xl p-1 shadow-lg text-xs">
          <button
            onClick={() => {
              onToggleAutoSwitch(false);
              onToggleProvider('google');
            }}
            disabled={!isOnline}
            className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer ${
              activeProvider === 'google'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-emerald-100 hover:text-white disabled:opacity-40'
            }`}
          >
            Google
          </button>
          <button
            onClick={() => {
              onToggleAutoSwitch(false);
              onToggleProvider('osm_offline');
            }}
            className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer ${
              activeProvider === 'osm_offline'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-emerald-100 hover:text-white'
            }`}
          >
            OSM
          </button>
        </div>
      </div>
    </div>
  );
};
