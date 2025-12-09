/**
 * KENTRA MAP STACK - OFICIAL
 * Mapa de búsqueda con Google Maps
 */

import { useState, useCallback, useRef, memo } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const containerStyle = { width: '100%', height: '100%' };
const libraries: ("places" | "geometry")[] = ['places', 'geometry'];

// Centro de México
const defaultCenter = { lat: 23.6345, lng: -102.5528 };
const defaultZoom = 5;

interface MapFilters {
  listing_type?: 'venta' | 'renta' | null;
  property_type?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  bedrooms_min?: number | null;
  bathrooms_min?: number | null;
  state?: string | null;
  municipality?: string | null;
}

interface SearchMapProps {
  filters?: MapFilters;
  selectedPropertyId?: string | null;
  onPropertyClick?: (propertyId: string) => void;
  className?: string;
}

function SearchMapComponent({
  filters = {},
  selectedPropertyId,
  onPropertyClick,
  className = '',
}: SearchMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleLocateUser = useCallback(() => {
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          mapRef.current?.panTo(pos);
          mapRef.current?.setZoom(14);
        },
        () => {
          console.error('Error obteniendo ubicación');
        }
      );
    }
  }, []);

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-muted h-full ${className}`}>
        <div className="text-center p-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">Error al cargar Google Maps</p>
          <p className="text-sm text-muted-foreground">Verifica la API key</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-muted h-full ${className}`}>
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={defaultZoom}
        onLoad={handleMapLoad}
        options={{
          minZoom: 4,
          maxZoom: 19,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        }}
      />

      {/* Locate user button */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-4 right-4 shadow-lg z-10"
        onClick={handleLocateUser}
        title="Mi ubicación"
      >
        <MapPin className="h-4 w-4" />
      </Button>
    </div>
  );
}

export const SearchMap = memo(SearchMapComponent);
