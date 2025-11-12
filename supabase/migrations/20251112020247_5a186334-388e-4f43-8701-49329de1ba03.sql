-- Agregar campos de verificación de WhatsApp a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMP WITH TIME ZONE;

-- Índice para búsquedas de agentes con WhatsApp verificado
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_verified 
ON public.profiles(whatsapp_verified) 
WHERE whatsapp_verified = true;

-- Comentarios para documentación
COMMENT ON COLUMN public.profiles.whatsapp_verified IS 'Indica si el número de WhatsApp fue verificado mediante Twilio Lookup API';
COMMENT ON COLUMN public.profiles.whatsapp_verified_at IS 'Timestamp de cuando se verificó el WhatsApp';