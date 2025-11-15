-- Paso 2: Eliminar sistema de auto-aprobación y configurar default

-- Eliminar trigger de auto-aprobación con IA
DROP TRIGGER IF EXISTS auto_approve_with_ai_trigger ON public.properties;

-- Eliminar función de auto-aprobación con IA
DROP FUNCTION IF EXISTS public.auto_approve_with_ai();

-- Eliminar función de estadísticas de auto-aprobación
DROP FUNCTION IF EXISTS public.get_auto_approval_stats();

-- Cambiar default de status a pendiente_aprobacion
ALTER TABLE public.properties 
ALTER COLUMN status SET DEFAULT 'pendiente_aprobacion'::property_status;

-- Agregar comentario explicativo
COMMENT ON COLUMN public.properties.status IS 'Status de la propiedad. Nuevas propiedades inician en pendiente_aprobacion y requieren aprobación manual de moderadores o super_admin';