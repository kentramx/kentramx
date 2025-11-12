-- Tabla de historial de cambios en verificaciones KYC
CREATE TABLE public.kyc_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES public.identity_verifications(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para optimizar queries
CREATE INDEX idx_kyc_history_verification_id ON public.kyc_verification_history(verification_id);
CREATE INDEX idx_kyc_history_reviewed_by ON public.kyc_verification_history(reviewed_by);
CREATE INDEX idx_kyc_history_created_at ON public.kyc_verification_history(created_at DESC);

-- Función para registrar cambios automáticamente
CREATE OR REPLACE FUNCTION public.log_kyc_verification_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo registrar si el status cambió
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.kyc_verification_history (
      verification_id,
      reviewed_by,
      previous_status,
      new_status,
      rejection_reason,
      admin_notes
    ) VALUES (
      NEW.id,
      NEW.reviewed_by,
      OLD.status,
      NEW.status,
      NEW.rejection_reason,
      NEW.admin_notes
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para ejecutar la función automáticamente
CREATE TRIGGER trigger_log_kyc_verification_change
AFTER UPDATE ON public.identity_verifications
FOR EACH ROW
EXECUTE FUNCTION public.log_kyc_verification_change();

-- RLS policies
ALTER TABLE public.kyc_verification_history ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todo el historial
CREATE POLICY "Admins pueden ver historial de KYC"
ON public.kyc_verification_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin'::app_role, 'moderator'::app_role)
  )
);

-- Sistema puede insertar registros
CREATE POLICY "Sistema puede insertar historial de KYC"
ON public.kyc_verification_history
FOR INSERT
TO authenticated
WITH CHECK (true);