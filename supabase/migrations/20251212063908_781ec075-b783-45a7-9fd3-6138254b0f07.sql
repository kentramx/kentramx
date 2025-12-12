-- Feature 1: Agregar columna is_featured a properties
-- (Solo si no existe - la tabla ya puede tenerla)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Índice para queries rápidas de featured properties
CREATE INDEX IF NOT EXISTS idx_properties_is_featured 
ON public.properties(is_featured) 
WHERE is_featured = true;