-- Migración: Eliminar rol 'admin' legacy y mantener solo 'super_admin' y 'moderator'

-- 1. Migrar usuarios existentes con rol 'admin' a 'super_admin' (por seguridad)
UPDATE public.user_roles 
SET role = 'super_admin'::app_role 
WHERE role = 'admin'::app_role;

-- 2. Actualizar función has_admin_access() para remover 'admin'
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin'::app_role, 'moderator'::app_role)
  )
$$;

-- 3. Actualizar política RLS de subscription_changes
DROP POLICY IF EXISTS "Admins can view all subscription changes" ON public.subscription_changes;

CREATE POLICY "Super admins can view all subscription changes"
ON public.subscription_changes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'::app_role
  )
);

-- 4. Actualizar políticas RLS de admin_notification_preferences
DROP POLICY IF EXISTS "Admins can view own notification preferences" ON public.admin_notification_preferences;
DROP POLICY IF EXISTS "Admins can insert own notification preferences" ON public.admin_notification_preferences;
DROP POLICY IF EXISTS "Admins can update own notification preferences" ON public.admin_notification_preferences;

CREATE POLICY "Admin users can view own notification preferences"
ON public.admin_notification_preferences
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin'::app_role, 'moderator'::app_role)
  )
);

CREATE POLICY "Admin users can insert own notification preferences"
ON public.admin_notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin'::app_role, 'moderator'::app_role)
  )
);

CREATE POLICY "Admin users can update own notification preferences"
ON public.admin_notification_preferences
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin'::app_role, 'moderator'::app_role)
  )
);

-- NOTA: No podemos eliminar el valor 'admin' del enum app_role directamente en PostgreSQL
-- El valor quedará en el enum pero no será usado en ninguna parte del sistema