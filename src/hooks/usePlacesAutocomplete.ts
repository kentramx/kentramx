/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import { toast } from '@/hooks/use-toast';

interface UsePlacesAutocompleteProps {
  onPlaceSelect: (place: {
    address: string;
    municipality: string;
    state: string;
    lat?: number;
    lng?: number;
  }) => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': any;
    }
  }
}

/**
 * Hook moderno para PlaceAutocompleteElement (2025)
 * Usa el nuevo web component de Google Maps con eventos gmp-placeselect
 */
export const usePlacesAutocomplete = ({ onPlaceSelect }: UsePlacesAutocompleteProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    try {
      // Crear el nuevo PlaceAutocompleteElement
      const autocompleteElement = document.createElement('gmp-place-autocomplete') as any;
      
      autocompleteElement.setAttribute('country', 'mx');
      autocompleteElement.setAttribute('type', 'geocode');
      autocompleteElement.style.width = '100%';

      // Escuchar selección de lugar con evento moderno
      autocompleteElement.addEventListener('gmp-placeselect', async (event: any) => {
        const place = event.place;
        
        if (!place) return;

        try {
          await place.fetchFields({
            fields: ['addressComponents', 'formattedAddress', 'location']
          });

          let municipality = '';
          let state = '';

          const addressComponents = place.addressComponents || [];
          addressComponents.forEach((component: any) => {
            if (component.types.includes('locality')) {
              municipality = component.longText;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.longText;
            }
          });

          onPlaceSelect({
            address: place.formattedAddress || '',
            municipality,
            state,
            lat: place.location?.lat(),
            lng: place.location?.lng(),
          });
        } catch (error) {
          console.error('Error fetching place details:', error);
          toast({
            title: "❌ Error",
            description: "No se pudo obtener los detalles del lugar",
            variant: "destructive",
          });
        }
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(autocompleteElement);
        autocompleteRef.current = autocompleteElement;
      }
    } catch (err) {
      console.error('Error initializing PlaceAutocompleteElement:', err);
      setError('No se pudo inicializar el autocompletado');
    }

    return () => {
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
      }
    };
  }, [isLoaded, onPlaceSelect]);

  return { containerRef, isLoaded, error };
};
