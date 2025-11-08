/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';

type LatLng = { lat: number; lng: number };
type BasicMarker = LatLng & { id?: string };

interface BasicGoogleMapProps {
  center?: LatLng;
  zoom?: number;
  markers?: BasicMarker[];
  height?: number | string;
  className?: string;
  onReady?: (map: google.maps.Map) => void;
}

export function BasicGoogleMap({
  center = { lat: 19.4326, lng: -99.1332 },
  zoom = 12,
  markers = [],
  height = 'calc(100vh - 8rem)',
  className,
  onReady,
}: BasicGoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);

  const waitForSize = async (el: HTMLElement, tries = 60, delayMs = 50) => {
    for (let i = 0; i < tries; i++) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return;
      await new Promise(r => setTimeout(r, delayMs));
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadGoogleMaps();
        if (!mounted || !containerRef.current) return;

        await waitForSize(containerRef.current);

        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        if (onReady && mapRef.current) onReady(mapRef.current);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar el mapa');
      }
    };

    init();

    return () => {
      mounted = false;
      markerRefs.current.forEach(m => m.setMap(null));
      markerRefs.current = [];
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach(m => m.setMap(null));
    markerRefs.current = [];

    if (!markers || markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const m of markers) {
      if (typeof m.lat !== 'number' || typeof m.lng !== 'number') continue;
      const marker = new google.maps.Marker({ position: { lat: m.lat, lng: m.lng }, map });
      markerRefs.current.push(marker);
      bounds.extend(marker.getPosition()!);
    }

    if (markerRefs.current.length > 1) {
      map.fitBounds(bounds);
    } else if (markerRefs.current.length === 1) {
      map.setCenter(markerRefs.current[0].getPosition()!);
    }
  }, [markers]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive text-sm">
        {error}
      </div>
    );
  }

  const style = typeof height === 'number' ? { height: `${height}px` } : { height };

  return <div ref={containerRef} className={className} style={{ width: '100%', ...style }} />;
}

export default BasicGoogleMap;
