-- ====================================
-- LIMPIEZA DE INFORMACIÓN LEGACY
-- ====================================
-- Este script elimina el enum user_role y la columna profiles.role que ya no se usan
-- El sistema actual usa app_role enum y la tabla user_roles

-- 1. Eliminar la columna role de la tabla profiles
-- Esta columna ya no se usa, todo el sistema usa la tabla user_roles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 2. Eliminar el enum user_role legacy
-- Este enum fue reemplazado por app_role
DROP TYPE IF EXISTS public.user_role CASCADE;

-- 3. Verificar que handle_new_user no intenta usar campos legacy
-- Actualizar la función para asegurar que solo usa user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles (sin rol)
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario')
  );
  
  -- Forzar rol buyer en user_roles (ignorar cualquier intento de rol admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    'buyer'::app_role
  );
  
  RETURN NEW;
END;
$$;