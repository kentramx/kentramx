-- Crear tabla para búsquedas guardadas
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Los usuarios solo pueden ver sus propias búsquedas
CREATE POLICY "Users can view own saved searches"
ON public.saved_searches
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved searches"
ON public.saved_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
ON public.saved_searches
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
ON public.saved_searches
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();