/**
 * Configuración centralizada de Google Maps para Kentra
 *
 * IMPORTANTE: Este archivo es la ÚNICA fuente de verdad para
 * configuración de mapas en toda la aplicación.
 *
 * [BUILD TRIGGER v3 - 2025-12-11]
 */

// Librerías requeridas - definidas fuera del objeto para evitar problemas de tipo
export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

// Diagnóstico de API Key (siempre activo para debugging)
const apiKey = "AIzaSyDbrfYnZWrf434__ZEp92Py7O4u5b55Z0Q";
console.log("[GoogleMaps] API Key status:", apiKey ? `Loaded (${apiKey.length} chars)` : "NOT FOUND");

export const GOOGLE_MAPS_CONFIG = {
  // API Key desde variables de entorno
  apiKey,

  // Restricción geográfica a México
  bounds: {
    north: 32.72,
    south: 14.53,
    west: -118.4,
    east: -86.7,
  },

  // Centro por defecto (México)
  defaultCenter: { lat: 23.6345, lng: -102.5528 },

  // Límites de zoom
  zoom: {
    default: 5,
    min: 4,
    max: 18,
    showPropertiesAt: 12,
    minForQueries: 5,
  },

  // Configuración de clustering SERVER-SIDE
  clustering: {
    gridSizeByZoom: {
      5: 3.0,
      6: 2.0,
      7: 1.0,
      8: 0.5,
      9: 0.25,
      10: 0.1,
      11: 0.05,
      12: 0,
    } as Record<number, number>,
    maxMarkersPerViewport: 200,
    maxClustersPerViewport: 100,
  },

  // Debounce para eventos de mapa
  debounce: {
    boundsChange: 500, // Aumentado de 300ms para reducir flickering
    search: 500,
  },

  // Estilos del mapa (minimalista - modo claro)
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      stylers: [{ visibility: "off" }],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// ESTILOS DARK MODE - Elegante y profesional
// ═══════════════════════════════════════════════════════════
export const GOOGLE_MAPS_DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b8b8b" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#3d3d5c" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b0b0b0" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d2d44" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a2e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3d3d5c" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a2e" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1525" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a5568" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1a1a2e" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1a2e1a" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
];

// Validación en desarrollo
if (!GOOGLE_MAPS_CONFIG.apiKey && import.meta.env.DEV) {
  console.warn("[GoogleMaps] API Key no configurada. Agrega VITE_GOOGLE_MAPS_API_KEY al .env");
}
