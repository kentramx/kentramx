/**
 * Marcador de precio premium estilo Zillow
 * KENTRA MAP STACK - OFICIAL
 * 
 * Features:
 * - Estilo compacto con precio formateado
 * - Estados: default, hover, selected, visited, featured
 * - Propiedades destacadas con borde dorado y estrella
 */

import { memo, useCallback, useMemo } from 'react';
import { StableOverlay } from './StableOverlay';
import type { PropertyMarker } from '@/types/map';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface PriceMarkerProps {
  map: google.maps.Map | null;
  property: PropertyMarker;
  isSelected?: boolean;
  isHovered?: boolean;
  isVisited?: boolean;
  isFeatured?: boolean;
  hidden?: boolean;
  onClick?: (id: string) => void;
  onHover?: (property: PropertyMarker | null) => void;
}

// Formatear precio compacto
function formatPrice(price: number, currency: string): string {
  const symbol = currency === 'USD' ? 'US$' : '$';
  
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    return `${symbol}${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (price >= 1_000) {
    const thousands = price / 1_000;
    return `${symbol}${thousands.toFixed(0)}K`;
  }
  return `${symbol}${price.toLocaleString()}`;
}

// ═══════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ESTILOS POR ESTADO
// Prioridad: selected > hover > featured > visited > default
// ═══════════════════════════════════════════════════════════
const MARKER_STYLES = {
  default: {
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-white',
    shadow: '0 4px 12px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2)',
    scale: 1,
    zIndex: 20,
    triangleColor: 'border-t-black',
  },
  // ✨ FEATURED: Borde dorado, ligeramente más grande, mayor z-index
  featured: {
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-amber-400',
    shadow: '0 4px 14px rgba(245, 158, 11, 0.35), 0 2px 6px rgba(0,0,0,0.25)',
    scale: 1.05,
    zIndex: 30,
    triangleColor: 'border-t-black',
  },
  hover: {
    bg: 'bg-primary',
    text: 'text-primary-foreground',
    border: 'border-primary',
    shadow: '0 6px 20px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.25)',
    scale: 1.08,
    zIndex: 40,
    triangleColor: 'border-t-primary',
  },
  selected: {
    bg: 'bg-primary',
    text: 'text-primary-foreground',
    border: 'border-primary',
    shadow: '0 8px 28px rgba(0,0,0,0.45), 0 4px 8px rgba(0,0,0,0.3)',
    scale: 1.12,
    zIndex: 50,
    triangleColor: 'border-t-primary',
  },
  visited: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-muted',
    shadow: '0 2px 8px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)',
    scale: 1,
    zIndex: 10,
    triangleColor: 'border-t-muted',
  },
} as const;

export const PriceMarker = memo(function PriceMarker({
  map,
  property,
  isSelected = false,
  isHovered = false,
  isVisited = false,
  isFeatured = false,
  hidden = false,
  onClick,
  onHover,
}: PriceMarkerProps) {
  const handleClick = useCallback(() => {
    onClick?.(property.id);
  }, [onClick, property.id]);

  const handleMouseEnter = useCallback(() => {
    onHover?.(property);
  }, [onHover, property]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  const priceLabel = useMemo(
    () => formatPrice(property.price, property.currency),
    [property.price, property.currency]
  );

  // Prioridad de estados: selected > hover > featured > visited > default
  const state = isSelected 
    ? 'selected' 
    : isHovered 
      ? 'hover' 
      : isFeatured 
        ? 'featured'
        : isVisited 
          ? 'visited' 
          : 'default';
  const styles = MARKER_STYLES[state];
  
  // Mostrar estrella si es featured (incluso en otros estados excepto visited)
  const showFeaturedBadge = isFeatured && !isVisited;

  return (
    <StableOverlay
      map={map}
      position={{ lat: property.lat, lng: property.lng }}
      zIndex={styles.zIndex}
      hidden={hidden}
    >
      <div
        className="absolute"
        style={{ 
          transform: 'translate(-50%, -100%)',
          paddingBottom: '8px',
        }}
      >
        <button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'relative px-2.5 py-1.5 rounded-lg',
            'text-xs font-bold whitespace-nowrap',
            styles.bg,
            styles.text,
            'border-2',
            styles.border,
            'transition-all duration-150 ease-out',
            'cursor-pointer select-none',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1'
          )}
          style={{
            boxShadow: styles.shadow,
            transform: `scale(${styles.scale})`,
          }}
          aria-label={`${property.title} - ${priceLabel}${isFeatured ? ' - Destacada' : ''}`}
        >
          {priceLabel}
          
          {/* ✨ Badge de estrella para propiedades destacadas */}
          {showFeaturedBadge && (
            <span 
              className={cn(
                'absolute -top-1.5 -right-1.5',
                'bg-amber-400 rounded-full p-0.5',
                'shadow-sm',
                'transition-transform duration-150'
              )}
            >
              <Star className="h-2 w-2 text-white fill-white" />
            </span>
          )}
          
          {/* Triángulo inferior (pointer) */}
          <span 
            className={cn(
              'absolute left-1/2 top-full -translate-x-1/2 -mt-px',
              'border-l-[7px] border-r-[7px] border-t-[7px]',
              'border-l-transparent border-r-transparent',
              styles.triangleColor,
              'transition-colors duration-150'
            )} 
          />
        </button>
      </div>
    </StableOverlay>
  );
});
