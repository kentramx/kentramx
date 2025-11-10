-- Agregar campos de WhatsApp a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_business_hours VARCHAR(100);

-- Tabla para tracking de interacciones de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('property_inquiry', 'agent_contact', 'general')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS en whatsapp_interactions
ALTER TABLE public.whatsapp_interactions ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver sus propias interacciones de WhatsApp
CREATE POLICY "Users can view their own whatsapp interactions"
ON public.whatsapp_interactions
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = agent_id);

-- Política: Usuarios pueden crear interacciones de WhatsApp
CREATE POLICY "Users can create whatsapp interactions"
ON public.whatsapp_interactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_user_id ON public.whatsapp_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_agent_id ON public.whatsapp_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_property_id ON public.whatsapp_interactions(property_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_created_at ON public.whatsapp_interactions(created_at DESC);