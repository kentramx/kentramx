-- 1. Agregar columnas de renovación a properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Inicializar propiedades existentes
UPDATE properties 
SET last_renewed_at = created_at,
    expires_at = created_at + INTERVAL '30 days'
WHERE last_renewed_at IS NULL;

-- 2. Crear función para actualizar expires_at automáticamente
CREATE OR REPLACE FUNCTION public.update_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.expires_at := NEW.last_renewed_at + INTERVAL '30 days';
  RETURN NEW;
END;
$$;

-- 3. Crear trigger para actualizar expires_at
DROP TRIGGER IF EXISTS update_property_expires_at ON properties;
CREATE TRIGGER update_property_expires_at
  BEFORE INSERT OR UPDATE OF last_renewed_at ON properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expires_at();

-- 4. Crear función para renovar propiedad
CREATE OR REPLACE FUNCTION public.renew_property(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE properties
  SET last_renewed_at = NOW()
  WHERE id = property_id
  AND agent_id = auth.uid();
END;
$$;

-- 5. Crear tabla de log de propiedades eliminadas
CREATE TABLE IF NOT EXISTS public.property_expiration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  property_title TEXT NOT NULL,
  expired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_renewed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  property_created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- RLS para property_expiration_log
ALTER TABLE public.property_expiration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own expiration logs"
ON public.property_expiration_log
FOR SELECT
USING (auth.uid() = agent_id);

-- 6. Habilitar extensiones para cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;