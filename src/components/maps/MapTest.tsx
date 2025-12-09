/**
 * Componente temporal para probar el mapa
 * ELIMINAR después de verificar que funciona
 */

import { MapboxMap } from './MapboxMap';
import { MapBounds, MapViewport } from '@/types/map';

export function MapTest() {
  const handleMapLoad = () => {
    console.log('✅ Mapa Mapbox cargado correctamente');
  };

  const handleBoundsChange = (bounds: MapBounds) => {
    console.log('📍 Bounds:', bounds);
  };

  const handleViewportChange = (viewport: MapViewport) => {
    console.log('🔍 Viewport:', viewport);
  };

  return (
    <div className="w-full h-[500px] border rounded-lg overflow-hidden">
      <MapboxMap
        onMapLoad={handleMapLoad}
        onBoundsChange={handleBoundsChange}
        onViewportChange={handleViewportChange}
      />
    </div>
  );
}
