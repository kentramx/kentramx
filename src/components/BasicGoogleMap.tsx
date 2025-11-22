/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";
import { MarkerClusterer, GridAlgorithm } from "@googlemaps/markerclusterer";

// --- SVGs SIMPLIFICADOS Y SEGUROS ---
const getPointSVG = () =>
  `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" fill="#000000" stroke="white" stroke-width="2"/></svg>`;

const getClusterSVG = (count: number) =>
  `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="#000000" stroke="white" stroke-width="3"/><text x="50%" y="50%" dy=".3em" text-anchor="middle" fill="white" font-weight="bold" font-family="sans-serif">${count}</text></svg>`;

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type?: "property" | "cluster";
  count?: number;
}

interface Props {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  onBoundsChanged?: (bounds: any) => void;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

export function BasicGoogleMap({ center, zoom, markers = [], onBoundsChanged, onMarkerClick, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const clusterer = useRef<MarkerClusterer | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);

  // 1. INICIALIZAR MAPA (UNA SOLA VEZ)
  useEffect(() => {
    if (map.current || !ref.current) return;

    loadGoogleMaps().then(() => {
      map.current = new google.maps.Map(ref.current!, {
        center: center || { lat: 23.6345, lng: -102.5528 },
        zoom: zoom || 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });

      // Listener para cambios de bounds (con debounce)
      let timeout: NodeJS.Timeout;
      map.current.addListener("idle", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const b = map.current?.getBounds();
          const z = map.current?.getZoom();
          if (b && z && onBoundsChanged) {
            onBoundsChanged({
              minLat: b.getSouthWest().lat(),
              maxLat: b.getNorthEast().lat(),
              minLng: b.getSouthWest().lng(),
              maxLng: b.getNorthEast().lng(),
              zoom: z,
              center: { lat: map.current!.getCenter()!.lat(), lng: map.current!.getCenter()!.lng() },
            });
          }
        }, 200);
      });
    });
  }, []); // [] VACÍO ES CRUCIAL

  // 2. ACTUALIZAR VISTA (SUAVEMENTE)
  useEffect(() => {
    if (map.current && center) {
      const c = map.current.getCenter();
      if (!c || Math.abs(c.lat() - center.lat) > 0.001) map.current.panTo(center);
    }
  }, [center?.lat, center?.lng]);

  useEffect(() => {
    if (map.current && zoom && map.current.getZoom() !== zoom) map.current.setZoom(zoom);
  }, [zoom]);

  // 3. PINTAR MARCADORES
  useEffect(() => {
    if (!map.current) return;

    // Limpiar anteriores
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = [];
    clusterer.current?.clearMarkers();

    // Crear nuevos
    const gMarkers = markers.map((m) => {
      const isCluster = m.type === "cluster";
      return new google.maps.Marker({
        position: { lat: Number(m.lat), lng: Number(m.lng) },
        map: map.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(isCluster ? getClusterSVG(m.count || 0) : getPointSVG())}`,
          scaledSize: new google.maps.Size(isCluster ? 40 : 16, isCluster ? 40 : 16),
          anchor: new google.maps.Point(isCluster ? 20 : 8, isCluster ? 20 : 8),
        },
        zIndex: isCluster ? 100 : 10,
      });
    });

    // Eventos
    gMarkers.forEach((gm, i) => {
      gm.addListener("click", () => onMarkerClick?.(markers[i].id));
    });

    markerRefs.current = gMarkers;

    // Clustering simple para propiedades sueltas
    const propsMarkers = gMarkers.filter((_, i) => markers[i].type !== "cluster");
    if (propsMarkers.length > 0) {
      clusterer.current = new MarkerClusterer({ map: map.current, markers: propsMarkers });
    }
  }, [markers.length, JSON.stringify(markers.map((m) => m.id))]); // Solo re-render si cambian IDs

  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", minHeight: "400px" }} />;
}
