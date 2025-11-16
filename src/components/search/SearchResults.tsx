/**
 * ✅ Componente modular: Resultados de búsqueda
 * Extraído de Buscar.tsx
 */

import { memo } from 'react';
import { VirtualizedPropertyGrid } from '@/components/VirtualizedPropertyGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
}

interface SearchResultsProps {
  properties: Property[];
  loading: boolean;
  totalCount: number;
}

const SearchResultsComponent = ({
  properties,
  loading,
  totalCount,
}: SearchResultsProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se encontraron propiedades con los filtros seleccionados.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {properties.length} de {totalCount} propiedades
        </p>
      </div>
      
      <VirtualizedPropertyGrid properties={properties} />
    </div>
  );
};

export const SearchResults = memo(SearchResultsComponent);
