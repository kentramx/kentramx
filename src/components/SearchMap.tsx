/**
 * ✅ Componente de mapa optimizado para la página de búsqueda
 * - Viewport-based loading con debounce
 * - Clustering automático en zoom bajo
 * - Manejo de errores con monitoring
 * - Comunicación bidireccional con la lista
 *
 * ✅ FIX CRÍTICO:
 * Antes el mapa recibía zoom/center "fijos" por props (5 o 12).
 * Eso causaba que al clickear clusters o hacer zoom, el mapa rebotara al zoom original.
 * Ahora center/zoom son state internos que se actualizan con el movimiento REAL del mapa.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  onMapPositionChange,
}) => {
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // ✅ Center/Zoom internos (NO fijos)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    searchCoordinates || { lat: 23.6345, lng: -102.5528 },
  );
  const [mapZoom, setMapZoom] = useState<number>(searchCoordinates ? 12 : 5);

  // Ref para evitar bucles y mantener markers previos en loading
  const previousMarkersRef = useRef<any[]>([]);

  // Debounce de bounds para tiles
  const debouncedBounds = useAdaptiveDebounce(viewportBounds, 300);

  // ✅ Filtros del mapa estabilizados (sin bounds externos) para evitar refetch infinito
  const tiledFilters = useMemo(() => {
    const { bounds, ...rest } = (filters as any) || {};
    return { ...rest, status: ["activa"] };
  }, [filters]);

  // Cargar datos del mapa (tiles)
  const { data: viewportData, isLoading, error } = useTiledMap(debouncedBounds, tiledFilters);

  if (error) {
    monitoring.error("Error loading properties for map", {
      component: "SearchMap",
      error,
      filters,
      bounds: debouncedBounds,
    });
  }

  const { properties = [], clusters = [] } = viewportData || {};

  // Avisar count visible
  useEffect(() => {
    if (!onVisibleCountChange) return;
    const totalVisible = (properties?.length || 0) + (clusters?.reduce((acc, c) => acc + c.property_count, 0) || 0);
    onVisibleCountChange(totalVisible);
  }, [properties, clusters, onVisibleCountChange]);

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

  // ✅ Construir marcadores (properties + clusters)
  const mapMarkers = useMemo(() => {
    // Si sigue cargando pero ya había marcadores, no los borres (evita “flash”)
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
  }, [properties, clusters, isLoading]);

  // ✅ Si cambia searchCoordinates (usuario buscó una ciudad), ahí sí recentramos y acercamos
  useEffect(() => {
    if (!searchCoordinates) return;
    setMapCenter(searchCoordinates);
    setMapZoom(12);
  }, [searchCoordinates]);

  // ✅ Bounds change: actualiza viewport para tiles + actualiza zoom/center internos
  const handleBoundsChange = useCallback(
    (bounds: ViewportBounds) => {
      setViewportBounds(bounds);

      const center = {
        lat: (bounds.maxLat + bounds.minLat) / 2,
        lng: (bounds.maxLng + bounds.minLng) / 2,
      };

      // Actualiza solo si hubo cambio real (evita renders inútiles)
      setMapCenter((prev) => (prev.lat === center.lat && prev.lng === center.lng ? prev : center));
      if (typeof bounds.zoom === "number") {
        setMapZoom((prev) => (prev === bounds.zoom ? prev : bounds.zoom));
      }

      onMapPositionChange?.(center, bounds);
    },
    [onMapPositionChange],
  );

  // ✅ Cluster click: NO lo manejamos aquí. Deja que Google/clusterer haga zoom natural.
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
