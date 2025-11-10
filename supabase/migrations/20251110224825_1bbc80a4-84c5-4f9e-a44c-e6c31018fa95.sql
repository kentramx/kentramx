-- ====================================
-- ACTUALIZAR AUTO-APROBACIÓN PARA CONSIDERAR IMÁGENES
-- ====================================

-- Modificar función de auto-aprobación para validar también calidad de imágenes
CREATE OR REPLACE FUNCTION public.auto_approve_with_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_trusted BOOLEAN;
  should_auto_approve BOOLEAN := false;
  approval_reason TEXT;
  images_quality NUMERIC;
  has_image_issues BOOLEAN;
BEGIN
  -- Solo aplicar a propiedades nuevas en estado pendiente
  IF TG_OP = 'INSERT' AND NEW.status = 'pendiente_aprobacion' THEN
    
    -- Verificar si el agente es confiable
    is_trusted := check_trusted_agent(NEW.agent_id);
    
    -- Obtener calidad promedio de imágenes si existen
    images_quality := COALESCE(NEW.images_quality_avg, 0);
    has_image_issues := COALESCE(NEW.has_inappropriate_images, false) OR COALESCE(NEW.has_manipulated_images, false);
    
    -- CONDICIÓN DE AUTO-APROBACIÓN:
    -- 1. Agente confiable (20+ aprobaciones sin rechazos)
    -- 2. Score IA de texto ≥95
    -- 3. Calidad de imágenes ≥70 (si hay imágenes analizadas)
    -- 4. Sin imágenes inapropiadas o manipuladas
    
    IF is_trusted 
       AND NEW.ai_moderation_score IS NOT NULL 
       AND NEW.ai_moderation_score >= 95 
       AND NEW.ai_moderation_status = 'pass'
       AND (NEW.images_analyzed_count = 0 OR (images_quality >= 70 AND NOT has_image_issues)) THEN
      
      should_auto_approve := true;
      approval_reason := format(
        'Auto-aprobado: Agente Confiable + IA Score Excelente (%s/100) + Imágenes Calidad %s/100',
        NEW.ai_moderation_score,
        COALESCE(ROUND(images_quality), 0)
      );
      
    -- CONDICIÓN 2: Agente confiable sin análisis de IA (fallback legacy)
    ELSIF is_trusted 
          AND NEW.ai_moderation_score IS NULL 
          AND (NEW.images_analyzed_count = 0 OR (images_quality >= 70 AND NOT has_image_issues)) THEN
      
      should_auto_approve := true;
      approval_reason := 'Auto-aprobado: Agente Confiable (sin análisis IA, imágenes OK)';
      
    END IF;
    
    -- Ejecutar auto-aprobación si cumple condiciones
    IF should_auto_approve THEN
      
      -- Actualizar status a activa
      NEW.status := 'activa';
      NEW.last_renewed_at := NOW();
      NEW.expires_at := NOW() + INTERVAL '30 days';
      
      -- Registrar en historial de moderación
      INSERT INTO public.property_moderation_history (
        property_id,
        agent_id,
        admin_id,
        action,
        notes
      ) VALUES (
        NEW.id,
        NEW.agent_id,
        NULL, -- NULL = auto-aprobado por sistema
        'auto_approved',
        approval_reason
      );
      
      RAISE NOTICE 'Propiedad % auto-aprobada: %', NEW.id, approval_reason;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_approve_with_ai() IS 'Auto-aprueba propiedades de agentes confiables con score IA texto ≥95/100 E imágenes calidad ≥70/100 sin problemas';