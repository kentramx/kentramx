/**
 * ✅ Componente modular: Filtros de búsqueda
 * Extraído de Buscar.tsx para mejor mantenibilidad
 */

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Filters {
  estado: string;
  municipio: string;
  precioMin: string;
  precioMax: string;
  tipo: string;
  listingType: string;
  recamaras: string;
  banos: string;
  orden: 'price_desc' | 'price_asc' | 'newest' | 'oldest' | 'bedrooms_desc' | 'sqft_desc';
}

interface SearchFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  onReset: () => void;
  states: { value: string; label: string }[];
  municipalities: { value: string; label: string }[];
  propertyTypes: { value: string; label: string }[];
}

const SearchFiltersComponent = ({
  filters,
  onFiltersChange,
  onReset,
  states,
  municipalities,
  propertyTypes
}: SearchFiltersProps) => {
  const activeFiltersCount = [
    filters.estado,
    filters.municipio,
    filters.tipo,
    filters.precioMin,
    filters.precioMax,
    filters.recamaras !== 'all' ? filters.recamaras : null,
    filters.banos !== 'all' ? filters.banos : null,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header con reset */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Filtros</h3>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar ({activeFiltersCount})
            </Button>
          )}
        </div>

        {/* Tipo de operación */}
        <div className="space-y-2">
          <Label>Tipo de Operación</Label>
          <Select
            value={filters.listingType}
            onValueChange={(value) => onFiltersChange({ listingType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="venta">Venta</SelectItem>
              <SelectItem value="renta">Renta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de propiedad */}
        <div className="space-y-2">
          <Label>Tipo de Propiedad</Label>
          <Combobox
            options={propertyTypes}
            value={filters.tipo}
            onValueChange={(value) => onFiltersChange({ tipo: value })}
            placeholder="Selecciona tipo..."
            emptyText="No se encontró tipo"
          />
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label>Estado</Label>
          <Combobox
            options={states}
            value={filters.estado}
            onValueChange={(value) => onFiltersChange({ estado: value })}
            placeholder="Selecciona estado..."
            emptyText="No se encontró estado"
          />
        </div>

        {/* Municipio */}
        {filters.estado && (
          <div className="space-y-2">
            <Label>Municipio</Label>
            <Combobox
              options={municipalities}
              value={filters.municipio}
              onValueChange={(value) => onFiltersChange({ municipio: value })}
              placeholder="Selecciona municipio..."
              emptyText="No se encontró municipio"
            />
          </div>
        )}

        {/* Rango de precio */}
        <div className="space-y-2">
          <Label>Precio</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Mínimo"
              value={filters.precioMin}
              onChange={(e) => onFiltersChange({ precioMin: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Máximo"
              value={filters.precioMax}
              onChange={(e) => onFiltersChange({ precioMax: e.target.value })}
            />
          </div>
        </div>

        {/* Recámaras */}
        <div className="space-y-2">
          <Label>Recámaras</Label>
          <Select
            value={filters.recamaras}
            onValueChange={(value) => onFiltersChange({ recamaras: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquiera</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Baños */}
        <div className="space-y-2">
          <Label>Baños</Label>
          <Select
            value={filters.banos}
            onValueChange={(value) => onFiltersChange({ banos: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquiera</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orden */}
        <div className="space-y-2">
          <Label>Ordenar por</Label>
          <Select
            value={filters.orden}
            onValueChange={(value) => onFiltersChange({ orden: value as Filters['orden'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="price_desc">Mayor precio</SelectItem>
              <SelectItem value="price_asc">Menor precio</SelectItem>
              <SelectItem value="bedrooms_desc">Más recámaras</SelectItem>
              <SelectItem value="sqft_desc">Mayor m²</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export const SearchFilters = memo(SearchFiltersComponent);
