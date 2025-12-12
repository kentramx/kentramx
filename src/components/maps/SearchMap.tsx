/**
 * KENTRA MAP STACK - OFICIAL
 * Mapa de búsqueda premium
 * - Renderiza clusters O markers según modo (nunca ambos)
 * - Optimizado para millones de propiedades
 * - Cache de markers para evitar flickering
 * - Transiciones suaves
 * - Indicadores de estado
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleMapBase } from './GoogleMapBase';
import { PriceMarker } from './PriceMarker';
import { ClusterMarker } from './ClusterMarker';
import type { MapViewport, PropertyMarker, PropertyCluster } from '@/types/map';
import { Loader2, MapPin, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchMapProps {
  // Datos del mapa
  properties: PropertyMarker[];
  clusters: PropertyCluster[];
  totalCount: number;
  isClustered: boolean;
  
  // Estados de carga
  isLoading: boolean;
  isFetching?: boolean;
  
  // Configuración
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  height?: string;
  className?: string;
  
  // Estados de interacción
  selectedPropertyId?: string | null;
  hoveredPropertyId?: string | null;
  visitedPropertyIds?: Set<string>;
  
  // Callbacks
  onPropertyClick?: (id: string) => void;
  onPropertyHover?: (property: PropertyMarker | null) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  onClusterClick?: (cluster: PropertyCluster) => void;
}

// Límite de markers para rendimiento óptimo
const MAX_VISIBLE_MARKERS = 200;

export function SearchMap({
  properties,
  clusters,
  totalCount,
  isClustered,
  isLoading,
  isFetching = false,
  initialCenter,
  initialZoom = 12,
  height = '100%',
  className,
  selectedPropertyId,
  hoveredPropertyId,
  visitedPropertyIds = new Set(),
  onPropertyClick,
  onPropertyHover,
  onViewportChange,
  onClusterClick,
}: SearchMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  // ═══════════════════════════════════════════════════════════
  // CACHE DE MARKERS - Evita flickering durante navegación
  // NO limpiar cache al cambiar modo - dejar que datos nuevos lo reemplacen
  // ═══════════════════════════════════════════════════════════
  const [cachedProperties, setCachedProperties] = useState<PropertyMarker[]>([]);
  const [cachedClusters, setCachedClusters] = useState<PropertyCluster[]>([]);
  const hasLoadedOnce = useRef(false);
  
  // Actualizar cache solo cuando hay datos válidos (sin limpiar agresivamente)
  useEffect(() => {
    // Solo actualizar cache cuando tenemos datos nuevos Y terminó de cargar
    if (!isFetching) {
      if (properties.length > 0) {
        setCachedProperties(properties);
        hasLoadedOnce.current = true;
      }
      if (clusters.length > 0) {
        setCachedClusters(clusters);
        hasLoadedOnce.current = true;
      }
    }
  }, [properties, clusters, isFetching]);

  // Handler de viewport
  const handleViewportChange = useCallback((newViewport: MapViewport) => {
    onViewportChange?.(newViewport);
  }, [onViewportChange]);

  // Handler de mapa listo
  const handleMapReady = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // Handler de click en cluster - zoom suave animado
  const handleClusterClick = useCallback((cluster: PropertyCluster) => {
    if (onClusterClick) {
      onClusterClick(cluster);
    } else if (map) {
      // Primero pan, luego zoom para animación suave
      map.panTo({ lat: cluster.lat, lng: cluster.lng });
      setTimeout(() => {
        map.setZoom(cluster.expansion_zoom);
      }, 200);
    }
  }, [map, onClusterClick]);

  // SIEMPRE preferir props si tienen datos, sino usar cache
  const visibleProperties = useMemo(() => {
    if (isClustered) return [];
    const source = properties.length > 0 ? properties : cachedProperties;
    return source.slice(0, MAX_VISIBLE_MARKERS);
  }, [properties, cachedProperties, isClustered]);

  // SIEMPRE preferir props si tienen datos, sino usar cache  
  const visibleClusters = useMemo(() => {
    if (!isClustered) return [];
    return clusters.length > 0 ? clusters : cachedClusters;
  }, [clusters, cachedClusters, isClustered]);

  // Formatear contador elegante
  const countDisplay = useMemo(() => {
    if (totalCount === 0) return '0';
    if (totalCount >= 1000000) {
      return `${(totalCount / 1000000).toFixed(1)}M`;
    }
    if (totalCount >= 1000) {
      return `${(totalCount / 1000).toFixed(totalCount >= 10000 ? 0 : 1)}K`;
    }
    return totalCount.toLocaleString();
  }, [totalCount]);

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <GoogleMapBase
        onViewportChange={handleViewportChange}
        onMapReady={handleMapReady}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        height="100%"
      >
        {/* ═══════════════════════════════════════════════════════════
            CLUSTERS - Solo cuando isClustered es TRUE
            ═══════════════════════════════════════════════════════════ */}
        {visibleClusters.map((cluster) => (
          <ClusterMarker
            key={cluster.id}
            cluster={cluster}
            onClick={handleClusterClick}
          />
        ))}

        {/* ═══════════════════════════════════════════════════════════
            PRICE MARKERS - Solo cuando isClustered es FALSE
            ═══════════════════════════════════════════════════════════ */}
        {visibleProperties.map((property) => (
          <PriceMarker
            key={property.id}
            property={property}
            isSelected={property.id === selectedPropertyId}
            isHovered={property.id === hoveredPropertyId}
            isVisited={visitedPropertyIds.has(property.id)}
            onClick={onPropertyClick}
            onHover={onPropertyHover}
          />
        ))}
      </GoogleMapBase>

      {/* ═══════════════════════════════════════════════════════════
          BADGE DE CONTEO - Esquina superior izquierda
          ═══════════════════════════════════════════════════════════ */}
      <div className="absolute top-3 left-3 z-10">
        <Badge 
          variant="secondary" 
          className={cn(
            'bg-background/95 backdrop-blur-sm shadow-lg',
            'px-3 py-1.5 text-sm',
            'border border-border',
            'transition-all duration-200'
          )}
        >
          <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary" />
          <span className="font-bold text-foreground">{countDisplay}</span>
          <span className="ml-1 text-muted-foreground font-normal">
            {totalCount === 1 ? 'propiedad' : 'propiedades'}
          </span>
        </Badge>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          INDICADOR DE CARGA - Solo en carga inicial (no en navegación)
          ═══════════════════════════════════════════════════════════ */}
      {isLoading && !hasLoadedOnce.current && (
        <div className="absolute top-3 right-3 z-10">
          <Badge 
            variant="outline" 
            className="bg-background/95 backdrop-blur-sm shadow-sm border-border"
          >
            <Loader2 className="h-3 w-3 animate-spin mr-1.5 text-primary" />
            <span className="text-xs text-muted-foreground">Cargando...</span>
          </Badge>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          INDICADOR DE MODO CLUSTER - Esquina inferior izquierda
          ═══════════════════════════════════════════════════════════ */}
      {isClustered && totalCount > 0 && !isLoading && (
        <div className="absolute bottom-3 left-3 z-10">
          <Badge 
            variant="outline" 
            className={cn(
              'bg-background/90 backdrop-blur-sm',
              'border-border shadow-sm',
              'px-2.5 py-1'
            )}
          >
            <ZoomIn className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Haz zoom para ver precios
            </span>
          </Badge>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ESTADO VACÍO - Cuando no hay propiedades
          ═══════════════════════════════════════════════════════════ */}
      {!isLoading && totalCount === 0 && (
        <div className="absolute bottom-3 left-3 z-10">
          <Badge 
            variant="outline" 
            className="bg-amber-50/95 border-amber-200 text-amber-700 dark:bg-amber-950/95 dark:border-amber-800 dark:text-amber-300"
          >
            <span className="text-xs">
              No hay propiedades en esta área
            </span>
          </Badge>
        </div>
      )}
    </div>
  );
}
