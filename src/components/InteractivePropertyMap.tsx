/// <reference types="google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

interface Property {
  id: string;
  title: string;
  price: number;
  type: string;
  listing_type: string;
  address: string;
  municipality: string;
  state: string;
  lat?: number;
  lng?: number;
  created_at?: string;
  bedrooms?: number;
  bathrooms?: number;
  images?: { url: string }[];
}

interface InteractivePropertyMapProps {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  onLocationSelect?: (location: {
    address: string;
    municipality: string;
    state: string;
    lat: number;
    lng: number;
  }) => void;
  height?: string;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  hoveredPropertyId?: string | null;
  showLocationPicker?: boolean;
}

export const InteractivePropertyMap = ({
  properties,
  onPropertySelect,
  onLocationSelect,
  height = '500px',
  defaultCenter = { lat: 23.6345, lng: -102.5528 },
  defaultZoom = 5,
  hoveredPropertyId,
  showLocationPicker = false,
}: InteractivePropertyMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const locationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);

  // Helper para verificar si una propiedad es reciente
  const isRecentProperty = (createdAt?: string): boolean => {
    if (!createdAt) return false;
    const propertyDate = new Date(createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - propertyDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  };

  // Generar icono SVG con animación de pulso para propiedades recientes
  const getPropertyIcon = (type: string, isRecent: boolean): string => {
    const colors: Record<string, string> = {
      casa: '#3b82f6',
      departamento: '#8b5cf6',
      terreno: '#10b981',
      oficina: '#f59e0b',
      local: '#ef4444',
      bodega: '#6366f1',
      default: '#6366f1',
    };

    const color = colors[type.toLowerCase()] || colors.default;
    
    const pulseRing = isRecent
      ? `<circle cx="15" cy="15" r="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.6">
           <animate attributeName="r" from="12" to="20" dur="1.5s" repeatCount="indefinite"/>
           <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
         </circle>`
      : '';

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
        ${pulseRing}
        <path d="M15 0C8.4 0 3 5.4 3 12c0 8.3 12 28 12 28s12-19.7 12-28c0-6.6-5.4-12-12-12z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="15" cy="12" r="5" fill="white"/>
      </svg>
    `)}`;
  };

  // Crear marcador de propiedad
  const createMarker = (property: Property, map: google.maps.Map): google.maps.Marker | null => {
    if (!property.lat || !property.lng) return null;

    const isRecent = isRecentProperty(property.created_at);
    
    const marker = new google.maps.Marker({
      map,
      position: { lat: Number(property.lat), lng: Number(property.lng) },
      title: property.title,
      icon: {
        url: getPropertyIcon(property.type, isRecent),
        scaledSize: new google.maps.Size(30, 40),
        anchor: new google.maps.Point(15, 40),
      },
      animation: google.maps.Animation.DROP,
    });

    // Animación de rebote inicial
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1000);

    // InfoWindow con información básica
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; max-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${property.title}</h3>
          <p style="margin: 0 0 4px 0; color: #059669; font-weight: bold; font-size: 16px;">
            $${property.price.toLocaleString('es-MX')} ${property.listing_type === 'renta' ? 'MXN/mes' : 'MXN'}
          </p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            ${property.municipality}, ${property.state}
          </p>
        </div>
      `,
    });

    marker.addListener('click', () => {
      if (onPropertySelect) {
        onPropertySelect(property);
      }
      infoWindow.open(map, marker);
    });

    marker.addListener('mouseover', () => {
      marker.setAnimation(google.maps.Animation.BOUNCE);
      infoWindow.open(map, marker);
    });

    marker.addListener('mouseout', () => {
      marker.setAnimation(null);
      infoWindow.close();
    });

    return marker;
  };

  // Inicializar mapa
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMaps();

        if (!isMounted || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapInstanceRef.current = map;
        geocoderRef.current = new google.maps.Geocoder();

        // Si showLocationPicker está habilitado, agregar listener de clic
        if (showLocationPicker && onLocationSelect) {
          map.addListener('click', async (event: google.maps.MapMouseEvent) => {
            if (!event.latLng || !geocoderRef.current) return;

            const lat = event.latLng.lat();
            const lng = event.latLng.lng();

            // Actualizar marcador de ubicación
            if (locationMarkerRef.current) {
              locationMarkerRef.current.setPosition({ lat, lng });
            } else {
              locationMarkerRef.current = new google.maps.Marker({
                map,
                position: { lat, lng },
                title: 'Ubicación seleccionada',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#ef4444',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 2,
                },
              });
            }

            // Geocodificar
            setIsGeocodingAddress(true);
            
            try {
              const response = await geocoderRef.current.geocode({ location: { lat, lng } });

              if (response.results && response.results.length > 0) {
                const place = response.results[0];
                
                let municipality = '';
                let state = '';

                place.address_components?.forEach((component) => {
                  if (component.types.includes('locality')) {
                    municipality = component.long_name;
                  }
                  if (component.types.includes('administrative_area_level_1')) {
                    state = component.long_name;
                  }
                });

                onLocationSelect({
                  address: place.formatted_address || '',
                  municipality,
                  state,
                  lat,
                  lng,
                });
              }
            } catch (error) {
              console.error('Error geocoding:', error);
            } finally {
              setIsGeocodingAddress(false);
            }
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading map:', err);
        setError('No se pudo cargar el mapa');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setMap(null);
      }
    };
  }, [defaultCenter, defaultZoom, showLocationPicker, onLocationSelect]);

  // Actualizar marcadores cuando cambian las propiedades
  useEffect(() => {
    if (!mapInstanceRef.current || isLoading) return;

    // Limpiar marcadores existentes
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    // Crear nuevos marcadores
    const newMarkers: google.maps.Marker[] = [];
    
    properties.forEach((property) => {
      const marker = createMarker(property, mapInstanceRef.current!);
      if (marker) {
        markersRef.current.set(property.id, marker);
        newMarkers.push(marker);
      }
    });

    // Aplicar clustering
    if (newMarkers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map: mapInstanceRef.current,
        markers: newMarkers,
        algorithm: new SuperClusterAlgorithm({ radius: 100 }),
      });

      // Ajustar vista para mostrar todos los marcadores
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach((marker) => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      
      if (newMarkers.length > 0) {
        mapInstanceRef.current.fitBounds(bounds);
        const currentZoom = mapInstanceRef.current.getZoom();
        if (currentZoom && currentZoom > 15) {
          mapInstanceRef.current.setZoom(15);
        }
      }
    }
  }, [properties, isLoading]);

  // Efecto hover desde lista de propiedades
  useEffect(() => {
    if (!hoveredPropertyId || !markersRef.current.has(hoveredPropertyId)) return;

    const marker = markersRef.current.get(hoveredPropertyId);
    if (marker) {
      marker.setAnimation(google.maps.Animation.BOUNCE);
      return () => {
        marker.setAnimation(null);
      };
    }
  }, [hoveredPropertyId]);

  // Botón de mi ubicación
  const handleMyLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        mapInstanceRef.current?.setCenter({ lat, lng });
        mapInstanceRef.current?.setZoom(12);
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  };

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
        className="rounded-lg overflow-hidden border border-border shadow-lg"
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Cargando mapa...</p>
          </div>
        </div>
      )}

      {isGeocodingAddress && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">Obteniendo dirección...</span>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="absolute top-4 right-4 space-y-2">
            <Button
              onClick={handleMyLocation}
              size="icon"
              variant="secondary"
              className="shadow-lg"
              title="Usar mi ubicación"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
          
          {showLocationPicker && (
            <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                Haz clic en el mapa para seleccionar ubicación
              </p>
            </div>
          )}

          {!showLocationPicker && properties.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border">
              <p className="text-xs text-muted-foreground">
                {properties.length} propiedades en el mapa
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
