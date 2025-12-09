import React from 'react';
import { MapPin } from 'lucide-react';

/**
 * PropertyMap - Placeholder (Google Maps eliminado)
 * 
 * Este componente es un stub temporal mientras se implementa Mapbox en FASE 2.
 * Mantiene la misma interfaz para no romper PropertyDetail.tsx
 */

interface PropertyMapProps {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  height?: string;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({ 
  lat, 
  lng, 
  address,
  height = '300px' 
}) => {
  const hasCoordinates = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

  if (!hasCoordinates && !address) {
    return null;
  }

  return (
    <div 
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground"
      style={{ height }}
    >
      <div className="text-center p-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-6 w-6 opacity-50" />
        </div>
        <p className="text-sm font-medium mb-2">Mapa desactivado temporalmente</p>
        <p className="text-xs opacity-75 mb-3">Próximamente versión con Mapbox</p>
        
        {hasCoordinates && (
          <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
            {lat?.toFixed(6)}, {lng?.toFixed(6)}
          </p>
        )}
        {address && (
          <p className="text-xs mt-2 max-w-xs truncate" title={address}>
            {address}
          </p>
        )}
      </div>
    </div>
  );
};

export default PropertyMap;
