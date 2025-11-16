/**
 * ✅ Grid OPTIMIZADO con React.memo para evitar re-renders innecesarios
 * Usado en Home, Buscar, Favorites para grids masivos
 */

import { memo } from 'react';
import PropertyCard from './PropertyCard';

interface Property {
  id: string;
  title: string;
  price: number;
  type: string;
  listing_type: string;
  address: string;
  municipality: string;
  state: string;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  sqft?: number;
  images?: { url: string; position: number }[];
  agent_id: string;
  is_featured?: boolean;
  currency?: string;
  created_at?: string | null;
}

interface VirtualizedPropertyGridProps {
  properties: Property[];
  hoveredPropertyId?: string | null;
  onPropertyHover?: (property: Property | null) => void;
  onPropertyClick?: (propertyId: string) => void;
}

const VirtualizedPropertyGridComponent = ({ 
  properties,
  hoveredPropertyId,
  onPropertyHover,
  onPropertyClick,
}: VirtualizedPropertyGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {properties.map((property) => (
        <div
          key={property.id}
          onMouseEnter={() => onPropertyHover?.(property)}
          onMouseLeave={() => onPropertyHover?.(null)}
        >
          <PropertyCard
            {...property}
            agentId={property.agent_id}
            isFeatured={property.is_featured}
            isHovered={hoveredPropertyId === property.id}
            onCardClick={onPropertyClick}
            createdAt={property.created_at || undefined}
          />
        </div>
      ))}
    </div>
  );
};

// ✅ Memoizado para evitar re-renders cuando props no cambian
export const VirtualizedPropertyGrid = memo(VirtualizedPropertyGridComponent);
