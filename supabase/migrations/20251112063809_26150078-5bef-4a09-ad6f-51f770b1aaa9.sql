-- Agregar campos de warning de duplicados y revisión manual a properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS duplicate_warning boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_warning_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS requires_manual_review boolean DEFAULT false;

-- Comentarios para documentación
COMMENT ON COLUMN properties.duplicate_warning IS 'Flag que indica que se detectó posible duplicado durante la creación';
COMMENT ON COLUMN properties.duplicate_warning_data IS 'JSON con información de las propiedades duplicadas encontradas';
COMMENT ON COLUMN properties.requires_manual_review IS 'Flag general para forzar revisión manual (duplicados, problemas de imágenes, etc)';

-- Índice para queries de moderación
CREATE INDEX IF NOT EXISTS idx_properties_manual_review 
ON properties(requires_manual_review, status) 
WHERE requires_manual_review = true;

-- Índice compuesto para búsqueda de duplicados
CREATE INDEX IF NOT EXISTS idx_properties_title_location 
ON properties(title, municipality, state) 
WHERE status IN ('activa', 'pausada');