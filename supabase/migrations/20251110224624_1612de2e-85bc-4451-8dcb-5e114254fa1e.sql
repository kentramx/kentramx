-- ====================================
-- ANÁLISIS DE IMÁGENES CON IA
-- ====================================
-- Almacenar resultados del análisis de imágenes por IA

-- 1. Crear tabla para resultados de análisis de imágenes
CREATE TABLE IF NOT EXISTS public.image_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Scores de calidad (0-100)
  quality_score NUMERIC(5,2) CHECK (quality_score >= 0 AND quality_score <= 100),
  resolution_score NUMERIC(5,2) CHECK (resolution_score >= 0 AND resolution_score <= 100),
  lighting_score NUMERIC(5,2) CHECK (lighting_score >= 0 AND lighting_score <= 100),
  composition_score NUMERIC(5,2) CHECK (composition_score >= 0 AND composition_score <= 100),
  
  -- Detección de problemas
  is_inappropriate BOOLEAN DEFAULT false,
  is_manipulated BOOLEAN DEFAULT false,
  is_blurry BOOLEAN DEFAULT false,
  is_dark BOOLEAN DEFAULT false,
  
  -- Detalles del análisis
  detected_issues TEXT[],
  ai_notes TEXT,
  
  -- Metadata
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_image_analysis_image ON public.image_ai_analysis(image_id);
CREATE INDEX IF NOT EXISTS idx_image_analysis_property ON public.image_ai_analysis(property_id);
CREATE INDEX IF NOT EXISTS idx_image_analysis_quality ON public.image_ai_analysis(quality_score);
CREATE INDEX IF NOT EXISTS idx_image_analysis_inappropriate ON public.image_ai_analysis(is_inappropriate);

-- 3. Agregar campos agregados a properties para análisis de imágenes
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS images_quality_avg NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS images_analyzed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_inappropriate_images BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_manipulated_images BOOLEAN DEFAULT false;

-- 4. Función para calcular score promedio de imágenes de una propiedad
CREATE OR REPLACE FUNCTION public.calculate_property_images_score(p_property_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(quality_score), 0)
  FROM public.image_ai_analysis
  WHERE property_id = p_property_id;
$$;

-- 5. Función para actualizar campos agregados de imágenes en properties
CREATE OR REPLACE FUNCTION public.update_property_images_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.properties
  SET 
    images_quality_avg = (
      SELECT COALESCE(AVG(quality_score), 0)
      FROM public.image_ai_analysis
      WHERE property_id = NEW.property_id
    ),
    images_analyzed_count = (
      SELECT COUNT(*)
      FROM public.image_ai_analysis
      WHERE property_id = NEW.property_id
    ),
    has_inappropriate_images = (
      SELECT COALESCE(bool_or(is_inappropriate), false)
      FROM public.image_ai_analysis
      WHERE property_id = NEW.property_id
    ),
    has_manipulated_images = (
      SELECT COALESCE(bool_or(is_manipulated), false)
      FROM public.image_ai_analysis
      WHERE property_id = NEW.property_id
    )
  WHERE id = NEW.property_id;
  
  RETURN NEW;
END;
$$;

-- 6. Trigger para actualizar agregados cuando se inserta análisis
CREATE TRIGGER update_images_aggregates_trigger
AFTER INSERT OR UPDATE ON public.image_ai_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_property_images_aggregates();

-- 7. RLS para image_ai_analysis
ALTER TABLE public.image_ai_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden ver análisis de imágenes" ON public.image_ai_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator', 'super_admin')
    )
  );

CREATE POLICY "Sistema puede insertar análisis" ON public.image_ai_analysis
  FOR INSERT WITH CHECK (true);

-- 8. Comentarios para documentación
COMMENT ON TABLE public.image_ai_analysis IS 'Resultados del análisis de IA para cada imagen de propiedad';
COMMENT ON COLUMN public.image_ai_analysis.quality_score IS 'Score general de calidad 0-100';
COMMENT ON COLUMN public.image_ai_analysis.is_inappropriate IS 'Contiene contenido inapropiado o explícito';
COMMENT ON COLUMN public.image_ai_analysis.is_manipulated IS 'Imagen editada/manipulada digitalmente de forma engañosa';
COMMENT ON COLUMN public.properties.images_quality_avg IS 'Promedio de calidad de todas las imágenes';
COMMENT ON COLUMN public.properties.has_inappropriate_images IS 'Tiene al menos 1 imagen inapropiada';