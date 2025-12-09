/**
 * KENTRA MAP STACK - MAPBOX BASE
 * Componente base de Mapbox GL JS
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import { MapBounds, MapViewport } from '@/types/map';

// Configurar token
mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

interface MapboxMapProps {
  className?: string;
  initialViewport?: Partial<MapViewport>;
  onViewportChange?: (viewport: MapViewport) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  onMapLoad?: (map: mapboxgl.Map) => void;
  onMapClick?: (e: mapboxgl.MapMouseEvent) => void;
  children?: React.ReactNode;
}

export function MapboxMap({
  className = '',
  initialViewport,
  onViewportChange,
  onBoundsChange,
  onMapLoad,
  onMapClick,
  children,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener bounds del mapa
  const getBounds = useCallback((): MapBounds | null => {
    if (!map.current) return null;
    const bounds = map.current.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  }, []);

  // Obtener viewport del mapa
  const getViewport = useCallback((): MapViewport | null => {
    if (!map.current) return null;
    const center = map.current.getCenter();
    return {
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.current.getZoom(),
      bearing: map.current.getBearing(),
      pitch: map.current.getPitch(),
    };
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      const initialCenter: [number, number] = [
        initialViewport?.longitude ?? MAPBOX_CONFIG.defaultCenter[0],
        initialViewport?.latitude ?? MAPBOX_CONFIG.defaultCenter[1],
      ];

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_CONFIG.defaultStyle,
        center: initialCenter,
        zoom: initialViewport?.zoom ?? MAPBOX_CONFIG.defaultZoom,
        minZoom: MAPBOX_CONFIG.minZoom,
        maxZoom: MAPBOX_CONFIG.maxZoom,
        maxBounds: MAPBOX_CONFIG.bounds,
        attributionControl: false,
      });

      // Agregar controles de navegación
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        'top-right'
      );

      // Evento de carga
      map.current.on('load', () => {
        setIsLoaded(true);
        if (onMapLoad && map.current) {
          onMapLoad(map.current);
        }
      });

      // Evento de error
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Error al cargar el mapa');
      });

      // Evento de movimiento
      map.current.on('moveend', () => {
        if (onViewportChange) {
          const viewport = getViewport();
          if (viewport) onViewportChange(viewport);
        }
        if (onBoundsChange) {
          const bounds = getBounds();
          if (bounds) onBoundsChange(bounds);
        }
      });

      // Evento de click
      map.current.on('click', (e) => {
        if (onMapClick) onMapClick(e);
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Error al inicializar el mapa');
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Error state
  if (error) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center bg-muted ${className}`}>
        <div className="text-center p-4">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifica tu conexión a internet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      {isLoaded && children}
    </div>
  );
}

export default MapboxMap;
