import React, { useEffect, useRef, useState } from 'react';
import { mapService } from '../core/MapService';
import { LatLng, MapProviderType, PlaceSearchResult, RouteInfo } from '../models/mapTypes';
import { MapControls } from './MapControls';
import { MapStatusBadge } from './MapStatusBadge';
import { RegionDownloadModal } from './RegionDownloadModal';

interface HybridMapContainerProps {
  className?: string;
  initialHeight?: string;
}

export const HybridMapContainer: React.FC<HybridMapContainerProps> = ({
  className = '',
  initialHeight = 'h-[500px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);

  const [mapState, setMapState] = useState({
    activeProvider: mapService.getActiveProvider().type,
    providerName: mapService.getActiveProvider().name,
    isOnline: mapService.isOnline(),
    isAutoSwitch: true,
    userLocation: { lat: 6.2442, lng: -75.5812 },
    currentCamera: { center: { lat: 6.2442, lng: -75.5812 }, zoom: 13 },
    activeRoute: null as RouteInfo | null,
    clickedLocation: null as LatLng | null,
    error: null as string | null,
  });

  useEffect(() => {
    if (containerRef.current) {
      mapService.initialize(containerRef.current);
    }

    const unsubscribe = mapService.subscribe((state) => {
      setMapState(state);
    });

    const handleResize = () => {
      mapService.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
      mapService.destroy();
    };
  }, []);

  const handleCenterUserLocation = () => {
    mapService.setCamera(
      {
        center: mapState.userLocation,
        zoom: 15,
      },
      true
    );
  };

  const handleSearch = async (query: string): Promise<PlaceSearchResult[]> => {
    return mapService.searchPlaces(query);
  };

  const handleSelectPlace = (place: PlaceSearchResult) => {
    mapService.setCamera(
      {
        center: place.position,
        zoom: 15,
      },
      true
    );

    mapService.addMarker({
      id: `place_${place.id}`,
      position: place.position,
      title: place.title,
      subtitle: place.address,
      type: 'custom',
    });
  };

  const handleCalculateRoute = async (origin: LatLng, destination: LatLng): Promise<RouteInfo> => {
    return mapService.calculateRoute(origin, destination);
  };

  const handleClearRoute = () => {
    mapService.setRoute(null);
  };

  const handleToggleProvider = (providerType: MapProviderType) => {
    mapService.switchProvider(providerType);
  };

  const handleToggleAutoSwitch = (enabled: boolean) => {
    mapService.setAutoSwitch(enabled);
  };

  const handleToggleTraffic = (enabled: boolean) => {
    mapService.setTrafficEnabled(enabled);
  };

  return (
    <div
      className={`relative w-full ${initialHeight} rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-[#09152b] ${className}`}
    >
      {/* Map DOM Container */}
      <div ref={containerRef} className="w-full h-full z-0 cursor-crosshair" />

      {/* Top Overlay: Network Status Badge */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex justify-center">
        <MapStatusBadge
          isOnline={mapState.isOnline}
          providerName={mapState.providerName}
          isAutoSwitch={mapState.isAutoSwitch}
          onOpenRegionManager={() => setIsRegionModalOpen(true)}
        />
      </div>

      {/* Bottom Overlay: Search & Route Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none flex justify-center">
        <MapControls
          activeProvider={mapState.activeProvider}
          isOnline={mapState.isOnline}
          isAutoSwitch={mapState.isAutoSwitch}
          activeRoute={mapState.activeRoute}
          onSearch={handleSearch}
          onSelectPlace={handleSelectPlace}
          onCalculateRoute={handleCalculateRoute}
          onClearRoute={handleClearRoute}
          onCenterUserLocation={handleCenterUserLocation}
          onToggleProvider={handleToggleProvider}
          onToggleAutoSwitch={handleToggleAutoSwitch}
          onToggleTraffic={handleToggleTraffic}
          userLocation={mapState.userLocation}
        />
      </div>

      {/* Offline Regions Manager Modal */}
      <RegionDownloadModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
      />
    </div>
  );
};
