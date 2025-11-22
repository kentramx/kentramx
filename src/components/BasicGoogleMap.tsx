/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";
import { MarkerClusterer, GridAlgorithm } from "@googlemaps/markerclusterer";
import { monitoring } from "@/lib/monitoring";

// --- TUS HELPERS DE SVG (Mantenlos igual para no romper estilos) ---
const svgCache = new Map<string, string>();

const getClusterSVG = (count: number): string => {
  const cacheKey = `cluster-${count}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey)!;

  const baseSize = 50;
  const size = Math.min(baseSize + Math.log10(count) * 15, 90);
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#000000" stroke="white" stroke-width="3" opacity="0.95"/><text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="${size / 3}" font-weight="700" font-family="system-ui">${count}</text></svg>`;

  svgCache.set(cacheKey, svg);
  return svg;
};

const getPointSVG = () => {
  const size = 10;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#000000" stroke="white" stroke-width="2"/></svg>`;
  return { svg, size };
};

const getPricePillSVG = (price: number, currency: string) => {
  const symbol = currency === "USD" ? "$" : "$";
  const label =
    price >= 1000000 ? `${symbol}${(price / 1000000).toFixed(1)}M` : `${symbol}${(price / 1000).toFixed(0)}K`;
  const width = Math.max(40, label.length * 8 + 24);
  const height = 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${(height - 2) / 2}" fill="#000000" stroke="white" stroke-width="1"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="system-ui" font-weight="bold" font-size="12" fill="#ffffff">${label}</text></svg>`;
  return { svg, width, height };
};

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  price?: number;
  currency?: "MXN" | "USD";
  type?: "property" | "cluster";
  count?: number;
}

interface BasicGoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  height?: string;
  className?: string;
  onReady?: (map: google.maps.Map) => void;
  enableClustering?: boolean;
  onMarkerClick?: (id: string) => void;
  disableAutoFit?: boolean;
  onBoundsChanged?: (bounds: any) => void;
  onMapError?: (error: Error) => void;
  // Props opcionales ignoradas para simplificar
  hoveredMarkerId?: any;
  hoveredPropertyCoords?: any;
  onMarkerHover?: any;
  onFavoriteClick?: any;
}

export function BasicGoogleMap({
  center = { lat: 23.6345, lng: -102.5528 },
  zoom = 5,
  markers = [],
  height = "calc(100vh - 8rem)",
  className,
  onReady,
  enableClustering = true,
  onMarkerClick,
  disableAutoFit = false,
  onBoundsChanged,
  onMapError,
}: BasicGoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Refs para callbacks estables
  const onMarkerClickRef = useRef(onMarkerClick);
  const onBoundsChangedRef = useRef(onBoundsChanged);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);
  useEffect(() => {
    onBoundsChangedRef.current = onBoundsChanged;
  }, [onBoundsChanged]);

  // ✅ 1. INICIALIZACIÓN ÚNICA (Solo al montar)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const init = async () => {
      try {
        await loadGoogleMaps();
        console.log("🗺️ [BasicGoogleMap] Inicializando mapa...");

        mapRef.current = new google.maps.Map(containerRef.current!, {
          center, // Solo usa el valor inicial
          zoom, // Solo usa el valor inicial
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          restriction: { latLngBounds: { north: 32.72, south: 14.53, west: -118.4, east: -86.7 }, strictBounds: false },
        });

        // Listener de movimiento (con debounce simple)
        let timeout: NodeJS.Timeout;
        mapRef.current.addListener("idle", () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            if (!mapRef.current || !onBoundsChangedRef.current) return;
            const bounds = mapRef.current.getBounds();
            const ne = bounds?.getNorthEast();
            const sw = bounds?.getSouthWest();
            const c = mapRef.current.getCenter();

            if (ne && sw && c) {
              onBoundsChangedRef.current({
                minLat: sw.lat(),
                maxLat: ne.lat(),
                minLng: sw.lng(),
                maxLng: ne.lng(),
                zoom: mapRef.current.getZoom() || 5,
                center: { lat: c.lat(), lng: c.lng() },
              });
            }
          }, 200);
        });

        setMapReady(true);
        onReady?.(mapRef.current);
      } catch (err: any) {
        setError(err.message);
        onMapError?.(err);
      }
    };
    init();
  }, []); // 🛑 ARRAY VACÍO: ¡CRUCIAL PARA EVITAR REINICIOS!

  // ✅ 2. ACTUALIZAR VISTA (Solo si cambia desde fuera)
  useEffect(() => {
    if (mapRef.current && center) {
      const c = mapRef.current.getCenter();
      // Solo mover si la diferencia es real (evita loops)
      if (c && (Math.abs(c.lat() - center.lat) > 0.0001 || Math.abs(c.lng() - center.lng) > 0.0001)) {
        mapRef.current.panTo(center);
      }
    }
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (mapRef.current && zoom && mapRef.current.getZoom() !== zoom) {
      mapRef.current.setZoom(zoom);
    }
  }, [zoom]);

  // ✅ 3. GESTIÓN DE MARCADORES (Tu lógica de diffing simplificada y corregida)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Limpiar todo para asegurar consistencia (la caché SVG optimiza el rendimiento)
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current.clear();
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    markers.forEach((m) => {
      if (!m.lat || !m.lng) return;

      const isCluster = m.type === "cluster";
      const showPrice = (map.getZoom() || 10) >= 12;

      let svg = getPointSVG().svg;
      let size = new google.maps.Size(10, 10);
      let anchor = new google.maps.Point(5, 5);
      let zIndex = 10;

      if (isCluster) {
        svg = getClusterSVG(m.count || 0);
        const s = Math.min(50 + Math.log10(m.count || 1) * 15, 90);
        size = new google.maps.Size(s, s);
        anchor = new google.maps.Point(s / 2, s / 2);
        zIndex = 100;
      } else if (showPrice) {
        const p = getPricePillSVG(m.price || 0, m.currency || "MXN");
        svg = p.svg;
        size = new google.maps.Size(p.width, p.height);
        anchor = new google.maps.Point(p.width / 2, p.height / 2);
        zIndex = 50;
      }

      const marker = new google.maps.Marker({
        position: { lat: Number(m.lat), lng: Number(m.lng) },
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: size,
          anchor: anchor,
        },
        zIndex,
        title: m.title,
      });

      marker.addListener("click", () => onMarkerClickRef.current?.(m.id));
      markerRefs.current.set(m.id, marker);
      newMarkers.push(marker);
      bounds.extend(marker.getPosition()!);
    });

    // Clustering simple si está habilitado y no son clusters del backend
    const hasBackendClusters = markers.some((m) => m.type === "cluster");
    if (enableClustering && !hasBackendClusters && newMarkers.length > 0) {
      clustererRef.current = new MarkerClusterer({ map, markers: newMarkers });
    }
  }, [markers, enableClustering, mapReady]); // Re-render si cambian los datos

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  return <div ref={containerRef} className={className} style={{ height, width: "100%" }} />;
}
