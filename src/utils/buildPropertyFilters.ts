/**
 * ✅ Utilidad centralizada para construir PropertyFilters
 * Evita duplicación entre lista y mapa
 * 
 * REGLAS DE NORMALIZACIÓN:
 * 1. CDMX: Si estado y municipio son ambos "Ciudad de México", NO enviar municipio
 * 2. listingType: Solo acepta 'venta' o 'renta' en español (case-insensitive)
 * 3. Parseos numéricos con validación
 */

import type { PropertyFilters } from '@/types/property';

export interface RawSearchFilters {
  estado?: string;
  municipio?: string;
  precioMin?: string;
  precioMax?: string;
  tipo?: string;
  listingType?: string;
  recamaras?: string;
  banos?: string;
}

export function buildPropertyFilters(filters: RawSearchFilters): PropertyFilters {
  // Normalizar estado
  const estado = filters.estado || undefined;
  
  // Normalizar municipio con regla CDMX
  let municipio = filters.municipio || undefined;
  if (estado === 'Ciudad de México' && municipio === 'Ciudad de México') {
    // No enviar municipio para búsquedas generales en CDMX
    municipio = undefined;
  }
  
  // Normalizar listingType a español
  let listingType: string | undefined = undefined;
  if (filters.listingType && typeof filters.listingType === 'string') {
    const lt = filters.listingType.toLowerCase().trim();
    if (lt === 'venta' || lt === 'renta') {
      listingType = lt;
    }
  }
  
  // Parseos numéricos seguros
  const precioMin = filters.precioMin ? parseFloat(filters.precioMin) : undefined;
  const precioMax = filters.precioMax ? parseFloat(filters.precioMax) : undefined;
  
  return {
    estado,
    municipio,
    tipo: filters.tipo || undefined,
    listingType,
    precioMin: !isNaN(precioMin as number) ? precioMin : undefined,
    precioMax: !isNaN(precioMax as number) ? precioMax : undefined,
    recamaras: filters.recamaras || undefined,
    banos: filters.banos || undefined,
    status: ['activa'],
  };
}
