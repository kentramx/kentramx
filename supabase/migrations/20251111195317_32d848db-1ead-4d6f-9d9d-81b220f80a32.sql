-- Crear tabla de eventos de conversión para tracking de marketing
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Identificación del evento
  event_type TEXT NOT NULL, -- 'CompleteRegistration', 'Contact', 'InitiateCheckout', 'Purchase', 'Lead', 'ViewContent'
  event_source TEXT NOT NULL DEFAULT 'facebook_pixel', -- 'facebook_pixel', 'google_analytics', 'direct'
  
  -- Usuario (puede ser null para eventos anónimos)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT, -- 'buyer', 'agent', 'agency', 'developer'
  
  -- Datos del evento
  content_name TEXT,
  content_category TEXT,
  value NUMERIC,
  currency TEXT DEFAULT 'MXN',
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}',
  
  -- Información de sesión
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON public.conversion_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON public.conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON public.conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_source ON public.conversion_events(event_source);

-- Habilitar RLS
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

-- Política RLS: Solo super_admin puede ver todos los eventos
CREATE POLICY "Super admins pueden ver eventos de conversión"
ON public.conversion_events
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Política RLS: Sistema puede insertar eventos
CREATE POLICY "Sistema puede insertar eventos de conversión"
ON public.conversion_events
FOR INSERT
WITH CHECK (true);

-- Función RPC para obtener métricas agregadas de marketing
CREATE OR REPLACE FUNCTION public.get_marketing_metrics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  is_super_admin_user BOOLEAN;
BEGIN
  -- Verificar que el usuario es super_admin
  SELECT public.is_super_admin(auth.uid()) INTO is_super_admin_user;
  
  IF NOT is_super_admin_user THEN
    RAISE EXCEPTION 'Solo super_admin puede acceder a métricas de marketing';
  END IF;
  
  SELECT json_build_object(
    'total_events', (
      SELECT COUNT(*) 
      FROM conversion_events 
      WHERE created_at BETWEEN start_date AND end_date
    ),
    'conversions', (
      SELECT COUNT(*) 
      FROM conversion_events 
      WHERE event_type IN ('Purchase', 'CompleteRegistration') 
        AND created_at BETWEEN start_date AND end_date
    ),
    'total_value', (
      SELECT COALESCE(SUM(value), 0) 
      FROM conversion_events 
      WHERE created_at BETWEEN start_date AND end_date
    ),
    'events_by_type', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT event_type, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
        FROM conversion_events
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY event_type
        ORDER BY count DESC
      ) t
    ),
    'daily_trend', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE event_type IN ('Purchase', 'CompleteRegistration')) as conversions,
          COALESCE(SUM(value), 0) as total_value
        FROM conversion_events
        WHERE created_at BETWEEN start_date AND end_date
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      ) t
    ),
    'funnel_data', (
      SELECT json_build_object(
        'view_content', (SELECT COUNT(*) FROM conversion_events WHERE event_type = 'ViewContent' AND created_at BETWEEN start_date AND end_date),
        'initiate_checkout', (SELECT COUNT(*) FROM conversion_events WHERE event_type = 'InitiateCheckout' AND created_at BETWEEN start_date AND end_date),
        'purchase', (SELECT COUNT(*) FROM conversion_events WHERE event_type = 'Purchase' AND created_at BETWEEN start_date AND end_date)
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;