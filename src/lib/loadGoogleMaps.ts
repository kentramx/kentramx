/// <reference types="google.maps" />
/**
 * Carga dinámicamente la API de Google Maps con bibliotecas modulares
 * - Usa google.maps.importLibrary() para cargar módulos bajo demanda
 * - Evita cargas duplicadas reutilizando una única promesa
 * - Emite eventos de ventana para componentes que escuchan (compatibilidad)
 */
let googleMapsPromise: Promise<typeof google.maps> | null = null;

export const loadGoogleMaps = (): Promise<typeof google.maps> => {
  // Si ya está cargado, resolver inmediatamente
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  // Reutilizar promesa existente si ya estamos cargando
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise(async (resolve, reject) => {
    try {
      let apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

      // If not available at build-time, fetch from backend secrets
      if (!apiKey) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase.functions.invoke('public-config', { body: {} });
          if (error) throw error;
          apiKey = data?.googleMapsApiKey;
        } catch (e) {
          const err = new Error('No se pudo obtener la API key de Google Maps');
          (window as any).googleMapsLoadError = err.message;
          window.dispatchEvent(new Event('google-maps-error'));
          reject(err);
          return;
        }
      }

      if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        const err = new Error('Falta configurar VITE_GOOGLE_MAPS_API_KEY');
        (window as any).googleMapsLoadError = err.message;
        window.dispatchEvent(new Event('google-maps-error'));
        reject(err);
        return;
      }

      // Evitar insertar múltiples scripts
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps]');
      if (!existing) {
        // Cargar el loader script principal con loading=async
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&language=es&region=MX`;
        script.async = true;
        script.defer = true;
        script.setAttribute('data-google-maps', 'true');

        script.onerror = () => {
          const msg = 'No se pudo cargar Google Maps. Verifica tu conexión o tu API key.';
          (window as any).googleMapsLoadError = msg;
          window.dispatchEvent(new Event('google-maps-error'));
          reject(new Error(msg));
        };

        document.head.appendChild(script);
      }

      // Esperar a que google.maps esté disponible
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval);
          
          // Pre-cargar bibliotecas comunes en paralelo
          Promise.all([
            google.maps.importLibrary('places'),
            google.maps.importLibrary('maps'),
            google.maps.importLibrary('marker'),
            google.maps.importLibrary('geocoding'),
          ]).then(() => {
            window.dispatchEvent(new Event('google-maps-loaded'));
            resolve(window.google.maps);
          }).catch((err) => {
            const msg = 'Error cargando bibliotecas de Google Maps';
            (window as any).googleMapsLoadError = msg;
            window.dispatchEvent(new Event('google-maps-error'));
            reject(new Error(msg));
          });
        }
      }, 50);

      // Timeout después de 10 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps) {
          const msg = 'Timeout cargando Google Maps';
          (window as any).googleMapsLoadError = msg;
          window.dispatchEvent(new Event('google-maps-error'));
          reject(new Error(msg));
        }
      }, 10000);

    } catch (error: any) {
      const msg = error?.message || 'Error desconocido cargando Google Maps';
      (window as any).googleMapsLoadError = msg;
      window.dispatchEvent(new Event('google-maps-error'));
      reject(new Error(msg));
    }
  });

  return googleMapsPromise;
};
