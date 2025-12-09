import React from 'react';
import { MapPin } from 'lucide-react';
import type { MapProperty, PropertyCluster } from '@/types/property';
import type { ViewportBounds } from '@/hooks/useTiledMap';

/**
 * SearchMap - Placeholder (Google Maps eliminado)
 * 
 * Este componente es un stub temporal mientras se implementa Mapbox en FASE 2.
 * Mantiene la misma interfaz para no romper Buscar.tsx
 */

// Re-exportar tipos para compatibilidad
export type { ViewportBounds } from '@/hooks/useTiledMap';
export { MIN_ZOOM_FOR_TILES, MAX_PROPERTIES_PER_TILE, CLUSTER_ZOOM_THRESHOLD } from '@/hooks/useTiledMap';

export interface SearchMapProps {
  properties?: MapProperty[];
  clusters?: PropertyCluster[];
  isLoading?: boolean;
  isFetching?: boolean;
  filters?: any;
  searchCoordinates?: { lat: number; lng: number } | null;
  onMarkerClick?: (propertyId: string) => void;
  onPropertyHover?: (propertyId: string | null) => void;
  hoveredPropertyId?: string | null;
  onBoundsChanged?: (bounds: ViewportBounds) => void;
  onVisibleCountChange?: (count: number) => void;
  onMapError?: (error: string) => void;
  debugViewportReason?: string | null;
  debugViewportBounds?: ViewportBounds | null;
  height?: string;
  totalCount?: number;
  hasTooManyResults?: boolean;
  centerOnCoordinates?: { lat: number; lng: number } | null;
}

export const SearchMap: React.FC<SearchMapProps> = ({
  properties = [],
  clusters = [],
  isLoading = false,
}) => {
  const totalProperties = properties.length + clusters.reduce((acc, c) => acc + (c.property_count || 0), 0);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground">
      <div className="text-center p-6 max-w-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-8 w-8 opacity-50" />
        </div>
        <h3 className="text-lg font-medium mb-2">Mapa desactivado temporalmente</h3>
        <p className="text-sm opacity-75 mb-4">
          Google Maps ha sido eliminado. Próximamente versión con Mapbox.
        </p>
        {!isLoading && totalProperties > 0 && (
          <p className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full inline-block">
            {totalProperties} propiedades disponibles
          </p>
        )}
        {isLoading && (
          <p className="text-xs opacity-50">Cargando datos...</p>
        )}
      </div>
    </div>
  );
};

export default SearchMap;
