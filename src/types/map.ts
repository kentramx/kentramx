/**
 * KENTRA MAP TYPES
 * Tipos TypeScript para el sistema de mapas
 */

export interface MapViewport {
  lat: number;
  lng: number;
  zoom: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PropertyMarker {
  id: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
  title: string;
  image_url?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
}

export interface PropertyCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  expansion_zoom: number;
  min_price?: number;
  max_price?: number;
}

export interface MapData {
  properties: PropertyMarker[];
  clusters: PropertyCluster[];
  total_count: number;
  is_clustered: boolean;
}

export interface MapFilters {
  listing_type?: 'venta' | 'renta' | null;
  property_type?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  bedrooms_min?: number | null;
  bathrooms_min?: number | null;
  state?: string | null;
  municipality?: string | null;
}

export type ViewMode = 'split' | 'list' | 'map';
