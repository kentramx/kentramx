/**
 * KENTRA MAP STACK - OFICIAL
 * Componente de prueba para el mapa
 */

import { useState } from 'react';
import { SearchMap } from './SearchMap';

export function MapPreview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border shadow-lg">
      <SearchMap
        selectedPropertyId={selectedId}
        onPropertyClick={(id) => {
          console.log('Click en propiedad:', id);
          setSelectedId(id);
        }}
        className="w-full h-full"
      />
    </div>
  );
}
