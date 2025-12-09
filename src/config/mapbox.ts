/**
 * KENTRA MAPBOX CONFIG
 * Configuración centralizada para Mapbox GL JS
 */

export const MAPBOX_CONFIG = {
  // Token desde variable de entorno con fallback público
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoia2VudHJhIiwiYSI6ImNtaDN6d2UyNTFnZmswc285Mms0M3RmaWgifQ.U-9iKz8BnLdmpSj8scN5Pg',
  
  // Estilo del mapa
  defaultStyle: 'mapbox://styles/mapbox/streets-v12',
  
  // Centro default: Ciudad de México
  defaultCenter: [-99.1332, 19.4326] as [number, number],
  
  // Zoom levels
  defaultZoom: 5,
  minZoom: 3,
  maxZoom: 18,
  
  // Límites de México (restricción de navegación)
  bounds: [
    [-118.5, 14.5], // Suroeste
    [-86.5, 32.7]   // Noreste
  ] as [[number, number], [number, number]],
  
  // Configuración de clustering
  cluster: {
    maxZoom: 14,      // Clusters hasta zoom 14
    radius: 50,       // Radio de clustering en píxeles
  },
  
  // Límites de propiedades por nivel de zoom
  propertyLimits: {
    zoomThresholds: [
      { zoom: 8, limit: 50 },
      { zoom: 10, limit: 100 },
      { zoom: 12, limit: 200 },
      { zoom: 14, limit: 300 },
      { zoom: 16, limit: 500 },
      { zoom: 18, limit: 1000 },
    ]
  }
} as const;

export type MapboxConfig = typeof MAPBOX_CONFIG;

/**
 * Obtiene el límite de propiedades para un nivel de zoom dado
 */
export function getPropertyLimitForZoom(zoom: number): number {
  const thresholds = MAPBOX_CONFIG.propertyLimits.zoomThresholds;
  
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (zoom >= thresholds[i].zoom) {
      return thresholds[i].limit;
    }
  }
  
  return thresholds[0].limit;
}
