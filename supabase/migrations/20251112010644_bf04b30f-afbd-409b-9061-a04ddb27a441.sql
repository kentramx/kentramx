-- Agregar campos para verificación de teléfono
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Crear índice para búsquedas por código de verificación
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verification 
ON public.profiles(phone_verification_code) 
WHERE phone_verification_code IS NOT NULL;

-- Comentarios explicativos
COMMENT ON COLUMN public.profiles.phone_verified IS 'Indica si el número de teléfono ha sido verificado';
COMMENT ON COLUMN public.profiles.phone_verification_code IS 'Código OTP de 6 dígitos para verificar teléfono';
COMMENT ON COLUMN public.profiles.phone_verification_expires_at IS 'Fecha de expiración del código (10 minutos)';
COMMENT ON COLUMN public.profiles.phone_verified_at IS 'Fecha cuando se verificó el teléfono';