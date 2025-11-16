/// <reference types="google.maps" />
import React, { useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { MapPin, AlertCircle, Navigation, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import { toast } from '@/hooks/use-toast';

interface PlaceAutocompleteProps {
  onPlaceSelect: (location: {
    address: string;
    municipality: string;
    state: string;
    colonia?: string;
    lat?: number;
    lng?: number;
  }) => void;
  onInputChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  showIcon?: boolean;
  id?: string;
  unstyled?: boolean;
  showMyLocationButton?: boolean;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': any;
    }
  }
}

export const PlaceAutocomplete = ({ 
  onPlaceSelect,
  onInputChange,
  defaultValue = '', 
  placeholder = 'Escribe para buscar dirección...',
  label,
  showIcon = true,
  id = 'place-autocomplete',
  unstyled = false,
  showMyLocationButton = true
}: PlaceAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const webComponentContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [useWebComponent, setUseWebComponent] = React.useState<boolean | null>(null);
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(defaultValue);

  const onPlaceSelectRef = React.useRef(onPlaceSelect);
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  const handleGetMyLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: '❌ Geolocalización no disponible',
        description: 'Tu navegador no soporta geolocalización',
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          await loadGoogleMaps();

          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({
            location: { lat: latitude, lng: longitude }
          });

          if (result.results[0]) {
            const place = result.results[0];
            const addressComponents = place.address_components;
            
            let municipality = '';
            let state = '';
            let colonia = '';
            
            addressComponents?.forEach((component) => {
              if (component.types.includes('administrative_area_level_1')) {
                state = component.long_name;
              }
              if (component.types.includes('administrative_area_level_2')) {
                municipality = component.long_name;
              } else if (!municipality && component.types.includes('locality')) {
                municipality = component.long_name;
              }
              if (component.types.includes('sublocality_level_1') || 
                  component.types.includes('sublocality') ||
                  component.types.includes('neighborhood')) {
                colonia = component.long_name;
              }
            });

            const location = {
              address: place.formatted_address || '',
              municipality,
              state,
              colonia,
              lat: latitude,
              lng: longitude,
            };

            setInputValue(location.address);
            onPlaceSelectRef.current?.(location);

            toast({
              title: '📍 Ubicación obtenida',
              description: colonia 
                ? `${colonia}, ${municipality}` 
                : municipality,
            });
          }
        } catch (error) {
          console.error('Error en geocodificación:', error);
          toast({
            title: '❌ Error',
            description: 'No se pudo obtener la dirección',
            variant: 'destructive',
          });
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Error de geolocalización:', error);
        setIsGettingLocation(false);
        
        let errorMsg = 'No se pudo obtener tu ubicación';
        if (error.code === 1) {
          errorMsg = 'Por favor, permite el acceso a tu ubicación';
        } else if (error.code === 2) {
          errorMsg = 'No se pudo determinar tu ubicación';
        } else if (error.code === 3) {
          errorMsg = 'Tiempo de espera agotado';
        }
        
        toast({
          title: '❌ Error de geolocalización',
          description: errorMsg,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setIsLoaded(true))
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setLoadError(err.message);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const initTimer = setTimeout(() => {
      initAutocomplete();
    }, 100);

    return () => clearTimeout(initTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, unstyled]);

  const initAutocomplete = async () => {
    const handlePlaceSelection = (location: {
      address: string;
      municipality: string;
      state: string;
      colonia?: string;
      lat?: number;
      lng?: number;
    }) => {
      if (!location.municipality || !location.state) {
        toast({
          title: 'ℹ️ Información incompleta',
          description: 'No se pudo extraer municipio/estado. Verifica la dirección.',
        });
      }

      setInputValue(location.address);
      onPlaceSelectRef.current?.(location);
      
      if (location.colonia && location.municipality && location.state) {
        toast({ 
          title: '📍 Ubicación seleccionada', 
          description: `${location.colonia}, ${location.municipality}` 
        });
      }
    };

    try {
      if (!webComponentContainerRef.current || 
          !document.contains(webComponentContainerRef.current)) {
        console.warn('Web component container not ready, using legacy');
        await initLegacyAutocomplete(handlePlaceSelection);
        return;
      }

      const { PlaceAutocompleteElement } = await google.maps.importLibrary("places") as any;

      const placeAutocomplete = new PlaceAutocompleteElement({
        componentRestrictions: { country: 'mx' },
        requestedLanguage: 'es',
        requestedRegion: 'MX',
      });
      
      placeAutocomplete.style.display = 'block';
      placeAutocomplete.style.width = '100%';
      placeAutocomplete.style.maxWidth = 'none';
      placeAutocomplete.style.boxSizing = 'border-box';

      const baseClasses = unstyled
        ? 'h-12 w-full bg-transparent px-5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50'
        : 'h-12 w-full rounded-full border-2 border-primary/60 bg-background px-5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
      placeAutocomplete.className = showIcon ? `${baseClasses} pl-12` : baseClasses;
      
      if (placeholder) placeAutocomplete.placeholder = placeholder;
      if (defaultValue) placeAutocomplete.value = defaultValue;
      
      placeAutocomplete.addEventListener('gmp-placeselect', async ({ place }: any) => {
        if (!place) return;
        
        await place.fetchFields({
          fields: ['addressComponents', 'formattedAddress', 'location']
        });
        
        let municipality = '';
        let state = '';
        let colonia = '';
        
        place.addressComponents?.forEach((component: any) => {
          if (component.types.includes('administrative_area_level_1')) {
            state = component.longText;
          }
          if (component.types.includes('administrative_area_level_2')) {
            municipality = component.longText;
          } else if (!municipality && component.types.includes('locality')) {
            municipality = component.longText;
          }
          if (component.types.includes('sublocality_level_1') || 
              component.types.includes('sublocality') ||
              component.types.includes('neighborhood')) {
            colonia = component.longText;
          }
        });
        
        const location = {
          address: place.formattedAddress || place.displayName || '',
          municipality,
          state,
          colonia,
          lat: place.location?.lat(),
          lng: place.location?.lng(),
        };
        
        handlePlaceSelection(location);
      });
      
      if (onInputChange) {
        const debouncedInputHandler = (e: Event) => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            const target = e.target as HTMLInputElement;
            onInputChange(target.value || '');
          }, 300);
        };
        placeAutocomplete.addEventListener('input', debouncedInputHandler);
      }

      placeAutocomplete.addEventListener('gmp-error', () => {
        console.warn('PlaceAutocompleteElement error, usando fallback legacy');
        initLegacyAutocomplete(handlePlaceSelection);
      });
      
      webComponentContainerRef.current.appendChild(placeAutocomplete);
      autocompleteRef.current = placeAutocomplete;
      setUseWebComponent(true);
      
    } catch (error) {
      console.warn('PlaceAutocompleteElement no disponible, usando fallback legacy:', error);
      await initLegacyAutocomplete(handlePlaceSelection);
    }
  };

  const initLegacyAutocomplete = async (handlePlaceSelection: (location: {
    address: string;
    municipality: string;
    state: string;
    colonia?: string;
    lat?: number;
    lng?: number;
  }) => void) => {
    if (!inputRef.current) return;
    
    setUseWebComponent(false);
    
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'mx' },
      fields: ['address_components', 'geometry', 'name', 'formatted_address'],
    });
    
    autocompleteRef.current = autocomplete;
    
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.address_components) return;
      
      let municipality = '';
      let state = '';
      let colonia = '';
      
      place.address_components.forEach((component) => {
        if (component.types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (component.types.includes('administrative_area_level_2')) {
          municipality = component.long_name;
        } else if (!municipality && component.types.includes('locality')) {
          municipality = component.long_name;
        }
        if (component.types.includes('sublocality_level_1') || 
            component.types.includes('sublocality') ||
            component.types.includes('neighborhood')) {
          colonia = component.long_name;
        }
      });
      
      const location = {
        address: place.formatted_address || place.name || '',
        municipality,
        state,
        colonia,
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
      };
      
      handlePlaceSelection(location);
    });

    if (onInputChange && inputRef.current) {
      inputRef.current.addEventListener('input', (e) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          const target = e.target as HTMLInputElement;
          onInputChange(target.value || '');
        }, 300);
      });
    }
  };

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No se pudo cargar Google Maps. Por favor, recarga la página o ingresa la dirección manualmente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-2">
      {label && (
        <Label htmlFor={id} className="text-base font-medium text-foreground">
          {label}
        </Label>
      )}
      
      <div className="relative flex items-center gap-2">
        {showIcon && useWebComponent !== false && (
          <div className="pointer-events-none absolute left-4 z-10 flex h-full items-center">
            <MapPin className="h-5 w-5 text-primary/70" />
          </div>
        )}

        <div 
          ref={webComponentContainerRef}
          className="relative flex-1"
          style={{ 
            display: useWebComponent === false ? 'none' : 'block',
            width: '100%'
          }}
        />

        {useWebComponent === false && (
          <div className="relative flex-1">
            {showIcon && (
              <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
                <MapPin className="h-5 w-5 text-primary/70" />
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              id={id}
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={
                unstyled
                  ? `h-12 w-full bg-transparent px-5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 ${showIcon ? 'pl-12' : ''}`
                  : `h-12 w-full rounded-full border-2 border-primary/60 bg-background px-5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${showIcon ? 'pl-12' : ''}`
              }
            />
          </div>
        )}

        {showMyLocationButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGetMyLocation}
            disabled={isGettingLocation}
            className="h-12 w-12 shrink-0 rounded-full border-2 border-primary/60"
            title="Usar mi ubicación actual"
          >
            {isGettingLocation ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Navigation className="h-5 w-5 text-primary" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
