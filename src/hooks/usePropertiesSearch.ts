/**
 * ✅ Hook OPTIMIZADO para búsqueda con batch loading
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SearchFilters {
  query: string;
  estado?: string;
  municipio?: string;
  tipo?: string;
  listingType?: string;
  precioMin?: number;
  precioMax?: number;
  limit?: number;
  offset?: number;
}

export const usePropertiesSearch = (filters: SearchFilters) => {
  return useQuery({
    queryKey: ['properties-search', filters],
    queryFn: async () => {
      // Si no hay query, no buscar
      if (!filters.query || filters.query.trim().length < 2) {
        return [];
      }

      // Usar la función de full-text search optimizada
      const { data, error } = await supabase.rpc('search_properties_fts', {
        search_query: filters.query,
        p_state: filters.estado || null,
        p_municipality: filters.municipio || null,
        p_type: filters.tipo || null,
        p_listing_type: filters.listingType || null,
        p_price_min: filters.precioMin || null,
        p_price_max: filters.precioMax || null,
        p_limit: filters.limit || 50,
        p_offset: filters.offset || 0,
      });

      if (error) {
        console.error('Error en búsqueda FTS:', error);
        throw error;
      }

      const propertyIds = data?.map((p: any) => p.id) || [];
      
      if (propertyIds.length === 0) return [];

      // ✅ OPTIMIZACIÓN: Batch loading con get_images_batch
      const { data: imagesData } = await supabase.rpc('get_images_batch', {
        property_ids: propertyIds,
      });

      const imagesMap = new Map();
      imagesData?.forEach((item: any) => {
        imagesMap.set(item.property_id, item.images || []);
      });

      // Combinar propiedades con imágenes
      const propertiesWithImages = data?.map((property: any) => ({
        ...property,
        images: imagesMap.get(property.id) || [],
        is_featured: false,
      })) || [];

      return propertiesWithImages;
    },
    enabled: !!filters.query && filters.query.trim().length >= 2,
    staleTime: 30000, // 30 segundos
  });
};
