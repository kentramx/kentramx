-- Crear tabla de caché para geocodificación
CREATE TABLE IF NOT EXISTS public.geocoding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_key TEXT NOT NULL UNIQUE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  components JSONB DEFAULT '{}'::jsonb,
  hits INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_normalized_key ON public.geocoding_cache(normalized_key);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_last_used ON public.geocoding_cache(last_used_at DESC);

-- Comentarios
COMMENT ON TABLE public.geocoding_cache IS 'Cache de geocodificación para reducir llamadas a Google Maps API';
COMMENT ON COLUMN public.geocoding_cache.normalized_key IS 'Clave normalizada: "colonia, municipio, estado, mexico" en lowercase';
COMMENT ON COLUMN public.geocoding_cache.hits IS 'Número de veces que se ha usado este resultado desde caché';

-- RLS policies (solo sistema puede leer/escribir)
ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sistema puede insertar en caché de geocodificación"
  ON public.geocoding_cache
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema puede actualizar caché de geocodificación"
  ON public.geocoding_cache
  FOR UPDATE
  USING (true);

CREATE POLICY "Sistema puede leer caché de geocodificación"
  ON public.geocoding_cache
  FOR SELECT
  USING (true);