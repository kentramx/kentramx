/**
 * KENTRA MAP TYPES
 * Tipos TypeScript para el sistema de mapas
 */

/**
 * Estado del viewport del mapa
 */
export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

/**
 * Límites geográficos del mapa
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Marcador de propiedad individual en el mapa
 */
export interface MapPropertyMarker {
  id: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
  status: string;
  image_url?: string;
  title?: string;
}

/**
 * Cluster de propiedades agrupadas
 */
export interface MapCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  expansion_zoom: number;
}

/**
 * Datos del mapa (respuesta del backend)
 */
export interface MapData {
  properties: MapPropertyMarker[];
  clusters: MapCluster[];
  total_count: number;
  is_clustered: boolean;
}

/**
 * Filtros aplicables al mapa
 */
export interface MapFilters {
  listing_type?: 'venta' | 'renta';
  property_type?: string;
  price_min?: number;
  price_max?: number;
  bedrooms?: number;
  bathrooms?: number;
  state?: string;
  municipality?: string;
}
