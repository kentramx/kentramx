/**
 * ✅ Componente de mapa optimizado para la página de búsqueda
 * - Viewport-based loading con debounce
 * - Clustering automático en zoom bajo
 * - Manejo de errores con monitoring
 * - Comunicación bidireccional con la lista
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BasicGoogleMap } from "@/components/BasicGoogleMap";
import { useTiledMap, ViewportBounds, MIN_ZOOM_FOR_TILES } from "@/hooks/useTiledMap";
import { useAdaptiveDebounce } from "@/hooks/useAdaptiveDebounce";
import type { MapProperty, PropertyFilters } from "@/types/property";
import { monitoring } from "@/lib/monitoring";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchMapProps {
  filters: PropertyFilters;
  searchCoordinates: { lat: number; lng: number } | null;
  onMarkerClick: (id: string) => void;
  onPropertyHover?: (property: MapProperty | null) => void;
  hoveredPropertyId?: string | null;
  hoveredPropertyCoords?: { lat: number; lng: number } | null;
  height?: string;
  onMapError?: (error: string) => void;
  onVisibleCountChange?: (count: number) => void;
  // ✅ NUEVA PROP: Para avisar que el mapa se movió
  onMapPositionChange?: (center: { lat: number; lng: number }, bounds: ViewportBounds) => void;
}

export const SearchMap: React.FC<SearchMapProps> = ({
  filters,
  searchCoordinates,
  onMarkerClick,
  onPropertyHover,
  hoveredPropertyId,
  hoveredPropertyCoords,
  height = "100%",
  onMapError,
  onVisibleCountChange,
  onMapPositionChange, // ✅ Recibir la prop
}) => {
  const navigate = useNavigate();
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // ✅ Mantener datos previos para evitar parpadeos
  const previousMarkersRef = useRef<any[]>([]);

  // ✅ Debounce adaptativo de viewport según FPS del dispositivo
  const debouncedBounds = useAdaptiveDebounce(viewportBounds, 300);

  // 🚀 TILE-BASED ARCHITECTURE: fetch con escalabilidad infinita
  const { data: viewportData, isLoading, error } = useTiledMap(debouncedBounds, { ...filters, status: ["activa"] });

  // ✅ Log de errores
  if (error) {
    monitoring.error("Error loading properties for map", {
      component: "SearchMap",
      error,
      filters,
      bounds: debouncedBounds,
    });
  }

  const { properties = [], clusters = [] } = viewportData || {};

  // ✅ Calcular y reportar el total de propiedades visibles en el mapa
  useEffect(() => {
    if (!onVisibleCountChange) return;

    const totalVisible = (properties?.length || 0) + (clusters?.reduce((acc, c) => acc + c.property_count, 0) || 0);

    onVisibleCountChange(totalVisible);
  }, [properties, clusters, onVisibleCountChange]);

  // ✅ Handler para errores críticos del mapa (Google Maps no carga)
  const handleMapError = useCallback(
    (error: Error) => {
      const errorMsg = error.message;
      setMapError(errorMsg);
      monitoring.error("[SearchMap] Error crítico del mapa", {
        component: "SearchMap",
        error: errorMsg,
      });
      onMapError?.(errorMsg);
    },
    [onMapError],
  );

  // ✅ Memoizar markers - Combinar propiedades y clusters
  const mapMarkers = useMemo(() => {
    if (isLoading && properties.length === 0 && clusters.length === 0 && previousMarkersRef.current.length > 0) {
      return previousMarkersRef.current;
    }

    const markers: any[] = [];

    if (properties && properties.length > 0) {
      const propertyMarkers = properties
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({
          id: p.id,
          lat: Number(p.lat),
          lng: Number(p.lng),
          title: p.title,
          price: p.price,
          currency: (p.currency ?? "MXN") as "MXN" | "USD",
          type: "property" as const,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          images: p.images,
          listing_type: p.listing_type as "venta" | "renta",
          address: p.address,
        }));
      markers.push(...propertyMarkers);
    }

    if (clusters && clusters.length > 0) {
      const clusterMarkers = clusters.map((c) => ({
        id: `cluster-${c.cluster_id}`,
        lat: c.lat,
        lng: c.lng,
        title: `${c.property_count} propiedades`,
        price: c.avg_price,
        currency: "MXN" as const,
        type: "cluster" as const,
        count: c.property_count,
      }));
      markers.push(...clusterMarkers);
    }

    if (markers.length > 0) {
      previousMarkersRef.current = markers;
    }

    return markers;
  }, [properties.length, clusters.length, isLoading, properties, clusters]);

  // ✅ Centro del mapa
  const mapCenter = useMemo(() => {
    if (searchCoordinates) {
      return searchCoordinates;
    }
    return { lat: 23.6345, lng: -102.5528 };
  }, [searchCoordinates]);

  const mapZoom = searchCoordinates ? 12 : 5;

  // ✅ Callback mejorado: Actualiza estado local Y avisa al padre
  const handleBoundsChange = useCallback(
    (bounds: ViewportBounds) => {
      setViewportBounds(bounds);

      // Avisar al componente padre que el mapa se movió
      // Esto permite sincronizar la lista con el viewport del mapa
      if (onMapPositionChange) {
        // CORRECCIÓN: Usar las propiedades correctas de ViewportBounds (min/max en lugar de north/south)
        const center = {
          lat: (bounds.maxLat + bounds.minLat) / 2,
          lng: (bounds.maxLng + bounds.minLng) / 2,
        };
        onMapPositionChange(center, bounds);
      }
    },
    [onMapPositionChange],
  );

  const handleMarkerClickInternal = useCallback(
    (id: string) => {
      if (id.startsWith("cluster-")) return;
      onMarkerClick(id);
    },
    [onMarkerClick],
  );

  const handleMarkerHover = useCallback(
    (markerId: string | null) => {
      if (!onPropertyHover) return;
      if (markerId) {
        const property = properties.find((p) => p.id === markerId);
        if (property) onPropertyHover(property);
      } else {
        onPropertyHover(null);
      }
    },
    [properties, onPropertyHover],
  );

  return (
    <div className="relative w-full" style={{ height }}>
      <BasicGoogleMap
        center={mapCenter}
        zoom={mapZoom}
        markers={mapMarkers as any}
        enableClustering={true}
        onBoundsChanged={handleBoundsChange}
        onMarkerClick={handleMarkerClickInternal}
        onMarkerHover={handleMarkerHover}
        hoveredMarkerId={hoveredPropertyId}
        hoveredPropertyCoords={hoveredPropertyCoords}
        disableAutoFit={true}
        onMapError={handleMapError}
      />

      {isLoading && viewportBounds && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] z-50">
          <div className="rounded-lg bg-background/95 px-4 py-3 shadow-lg border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando zona...</span>
            </div>
          </div>
        </div>
      )}

      {mapError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-50">
          <div className="pointer-events-auto rounded-lg bg-background border border-destructive/20 px-6 py-4 shadow-xl max-w-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-medium text-foreground">No pudimos cargar el mapa</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMapError(null);
                    window.location.reload();
                  }}
                  className="mt-2"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aviso de zoom bajo */}
      {viewportBounds && viewportBounds.zoom < MIN_ZOOM_FOR_TILES && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-40">
          <div className="rounded-full bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow-lg backdrop-blur-sm border">
            Acerca el mapa para ver propiedades
          </div>
        </div>
      )}
    </div>
  );
};
