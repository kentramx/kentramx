// Google Maps API Key Configuration
// Esta es una clave pública que debe tener restricciones de dominio configuradas en Google Cloud Console
// Para actualizar: reemplaza el valor de GOOGLE_MAPS_API_KEY con tu clave

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Verifica que la API key esté configurada
if (!GOOGLE_MAPS_API_KEY) {
  console.warn(
    '⚠️ Google Maps API Key no configurada. Por favor agrega VITE_GOOGLE_MAPS_API_KEY a tu archivo .env'
  );
}
