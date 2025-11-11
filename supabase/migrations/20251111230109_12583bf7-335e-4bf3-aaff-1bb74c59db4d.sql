-- Crear enum para status de invitaciones
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- Crear tabla de invitaciones de agentes
CREATE TABLE public.agency_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para optimizar búsquedas
CREATE INDEX idx_agency_invitations_agency_id ON public.agency_invitations(agency_id);
CREATE INDEX idx_agency_invitations_email ON public.agency_invitations(email);
CREATE INDEX idx_agency_invitations_token ON public.agency_invitations(token);
CREATE INDEX idx_agency_invitations_status ON public.agency_invitations(status);

-- RLS Policies
ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;

-- Agency owners pueden ver invitaciones de su agencia
CREATE POLICY "Agency owners can view own invitations"
ON public.agency_invitations
FOR SELECT
USING (
  agency_id IN (
    SELECT id FROM public.agencies WHERE owner_id = auth.uid()
  )
);

-- Agency owners pueden crear invitaciones para su agencia
CREATE POLICY "Agency owners can create invitations"
ON public.agency_invitations
FOR INSERT
WITH CHECK (
  agency_id IN (
    SELECT id FROM public.agencies WHERE owner_id = auth.uid()
  )
  AND invited_by = auth.uid()
);

-- Agency owners pueden actualizar invitaciones de su agencia
CREATE POLICY "Agency owners can update own invitations"
ON public.agency_invitations
FOR UPDATE
USING (
  agency_id IN (
    SELECT id FROM public.agencies WHERE owner_id = auth.uid()
  )
);

-- Usuarios invitados pueden ver y actualizar sus propias invitaciones
CREATE POLICY "Invited users can view and update their invitations"
ON public.agency_invitations
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Invited users can accept invitations"
ON public.agency_invitations
FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
);

-- Función para expirar invitaciones automáticamente
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agency_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

-- Comentarios para documentación
COMMENT ON TABLE public.agency_invitations IS 'Tabla para gestionar invitaciones de agentes a inmobiliarias';
COMMENT ON COLUMN public.agency_invitations.token IS 'Token único para verificar y aceptar la invitación';
COMMENT ON COLUMN public.agency_invitations.expires_at IS 'Fecha de expiración de la invitación (7 días por defecto)';