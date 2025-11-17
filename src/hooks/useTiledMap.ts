/**
 * 🚀 TILE-BASED ARCHITECTURE para escalabilidad infinita
 * - Reemplaza usePropertiesViewport con arquitectura tipo Zillow/Google Maps
 * - Soporta desde 1K hasta 10M+ propiedades con rendimiento constante
 * - Clustering adaptativo según zoom level
 * - Cache de 5 minutos por tile
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MapProperty, PropertyCluster, PropertyFilters, PropertyStatus } from '@/types/property';
import { monitoring } from '@/lib/monitoring';

export interface ViewportBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zoom: number;
}

export const useTiledMap = (
  bounds: ViewportBounds | null,
  filters?: PropertyFilters
) => {
  return useQuery({
    queryKey: ['map-tiles', bounds, filters],
    queryFn: async () => {
      if (!bounds) return { clusters: [], properties: [] };

      const startTime = performance.now();

      // Construir objeto de filtros en formato JSONB
      const filtersJson = {
        state: filters?.estado || null,
        municipality: filters?.municipio || null,
        listingType: filters?.listingType || null,
        propertyType: filters?.tipo || null,
        minPrice: filters?.precioMin || null,
        maxPrice: filters?.precioMax || null,
        minBedrooms: filters?.recamaras ? parseInt(filters.recamaras) : null,
        minBathrooms: filters?.banos ? parseInt(filters.banos) : null,
      };

      // 🎯 Llamar a nueva función RPC get_map_tiles
      const { data, error } = await supabase.rpc('get_map_tiles', {
        p_min_lng: bounds.minLng,
        p_min_lat: bounds.minLat,
        p_max_lng: bounds.maxLng,
        p_max_lat: bounds.maxLat,
        p_zoom: bounds.zoom,
        p_filters: filtersJson,
      });

      if (error) {
        monitoring.error('[useTiledMap] Error al cargar tiles', { 
          hook: 'useTiledMap', 
          error,
          bounds,
          filters: filtersJson,
        });
        throw error;
      }

      const loadTime = performance.now() - startTime;

      // 📊 Log de performance
      monitoring.debug('[useTiledMap] Tiles loaded', {
        zoom: bounds.zoom,
        loadTimeMs: Math.round(loadTime),
        dataReceived: data ? data.length : 0,
      });

      if (!data || data.length === 0) {
        return { clusters: [], properties: [] };
      }

      const result = data[0]; // get_map_tiles retorna un solo row con clusters o properties

      // 🔄 Para zoom >= 17: propiedades individuales
      if (bounds.zoom >= 17 && result.properties) {
        const propertiesArray = Array.isArray(result.properties) 
          ? result.properties 
          : [result.properties];

        const enrichedProperties: MapProperty[] = propertiesArray.map((prop: any) => ({
          id: prop.id,
          title: prop.title,
          price: prop.price,
          currency: 'MXN',
          lat: prop.lat,
          lng: prop.lng,
          type: prop.type,
          listing_type: prop.listing_type,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          parking: null, // No incluido en tile data para optimización
          sqft: null, // No incluido en tile data para optimización
          municipality: prop.municipality,
          state: prop.state,
          address: `${prop.municipality}, ${prop.state}`,
          images: prop.image_url ? [{ url: prop.image_url, position: 0 }] : [],
          agent_id: '', // No necesario para mapa
          status: 'activa' as PropertyStatus, // Todas las propiedades en mapa son activas (aprobadas)
          is_featured: prop.is_featured || false,
          created_at: '', // No necesario para mapa
        }));

        monitoring.debug('[useTiledMap] Individual properties mode', {
          zoom: bounds.zoom,
          propertiesCount: enrichedProperties.length,
          loadTimeMs: Math.round(loadTime),
        });

        return {
          clusters: [],
          properties: enrichedProperties,
        };
      }

      // 🎯 Para zoom < 17: clusters
      if (result.clusters) {
        const clustersArray = Array.isArray(result.clusters) 
          ? result.clusters 
          : [result.clusters];

        const enrichedClusters: PropertyCluster[] = clustersArray.map((cluster: any, index: number) => ({
          cluster_id: `cluster-${bounds.zoom}-${cluster.lat}-${cluster.lng}-${index}`,
          lat: cluster.lat,
          lng: cluster.lng,
          property_count: cluster.count,
          avg_price: cluster.avg_price,
          property_ids: cluster.property_ids || [],
        }));

        monitoring.debug('[useTiledMap] Clustering mode', {
          zoom: bounds.zoom,
          clustersCount: enrichedClusters.length,
          totalProperties: enrichedClusters.reduce((sum, c) => sum + c.property_count, 0),
          loadTimeMs: Math.round(loadTime),
        });

        return {
          clusters: enrichedClusters,
          properties: [],
        };
      }

      // Fallback vacío
      return { clusters: [], properties: [] };
    },
    enabled: !!bounds, // Solo ejecutar si hay bounds
    staleTime: 5 * 60 * 1000,   // Cache de 5 minutos (más largo que viewport)
    gcTime: 30 * 60 * 1000,     // Mantener en cache 30 minutos
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
