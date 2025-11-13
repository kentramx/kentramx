-- Crear tabla para tracking de trials por dispositivo/IP
CREATE TABLE IF NOT EXISTS public.trial_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.trial_tracking ENABLE ROW LEVEL SECURITY;

-- Solo sistema puede insertar
CREATE POLICY "Sistema puede insertar trial tracking"
ON public.trial_tracking
FOR INSERT
WITH CHECK (true);

-- Super admins pueden ver todo
CREATE POLICY "Super admins pueden ver trial tracking"
ON public.trial_tracking
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_trial_tracking_ip ON public.trial_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_fingerprint ON public.trial_tracking(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trial_tracking_user ON public.trial_tracking(user_id);

-- Función para validar si puede obtener trial
CREATE OR REPLACE FUNCTION public.can_get_trial(
  p_ip_address TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS TABLE(
  can_trial BOOLEAN,
  reason TEXT,
  previous_trials INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  trial_count INTEGER := 0;
  max_trials_per_device INTEGER := 1; -- Solo 1 trial por dispositivo
BEGIN
  -- Contar trials previos desde la misma IP o dispositivo
  SELECT COUNT(DISTINCT user_id) INTO trial_count
  FROM trial_tracking
  WHERE (ip_address = p_ip_address OR device_fingerprint = p_device_fingerprint)
    AND trial_started_at >= NOW() - INTERVAL '90 days'; -- Últimos 90 días
  
  IF trial_count >= max_trials_per_device THEN
    RETURN QUERY SELECT 
      false,
      'Ya se ha utilizado el período de prueba desde este dispositivo. Solo se permite un trial por dispositivo.'::TEXT,
      trial_count;
  ELSE
    RETURN QUERY SELECT 
      true,
      'Puedes iniciar el período de prueba'::TEXT,
      trial_count;
  END IF;
END;
$$;