-- Eliminar 12 badges redundantes del sistema

-- 1. Eliminar badges secretos (7)
DELETE FROM public.badge_definitions WHERE code IN (
  'UNICORN',
  'MARATHON_AGENT', 
  'SPEED_SELLER',
  'PERFECT_MONTH',
  'QUICK_RESPONDER',
  'NEGOTIATOR',
  'NIGHT_OWL'
);

-- 2. Eliminar badges públicos redundantes (5)
DELETE FROM public.badge_definitions WHERE code IN (
  'fast_response',
  'verified_pro',
  'trusted',
  'popular',
  'consistent'
);

-- 3. Simplificar función auto_assign_badges para manejar solo 7 badges esenciales
DROP FUNCTION IF EXISTS public.auto_assign_badges(uuid);

CREATE OR REPLACE FUNCTION public.auto_assign_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_agent_stats RECORD;
  v_plan_level TEXT;
  v_badge_code TEXT;
  v_requirements JSONB;
  v_eligible BOOLEAN;
BEGIN
  -- Obtener estadísticas del agente
  SELECT 
    COUNT(CASE WHEN p.status = 'vendida' THEN 1 END) as sold_count,
    COUNT(CASE WHEN p.status = 'activa' THEN 1 END) as active_count,
    COALESCE(AVG(ar.rating), 0) as avg_rating,
    COUNT(ar.id) as review_count
  INTO v_agent_stats
  FROM profiles prof
  LEFT JOIN properties p ON p.agent_id = prof.id
  LEFT JOIN agent_reviews ar ON ar.agent_id = prof.id
  WHERE prof.id = p_user_id
  GROUP BY prof.id;

  -- Obtener plan de suscripción
  SELECT sp.name INTO v_plan_level
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id AND us.status = 'active'
  LIMIT 1;

  -- Evaluar cada badge definido en el sistema
  FOR v_badge_code, v_requirements IN 
    SELECT code, requirements FROM badge_definitions
  LOOP
    v_eligible := true;

    -- Validar requisito de propiedades vendidas
    IF v_requirements ? 'min_sold_properties' THEN
      IF v_agent_stats.sold_count < (v_requirements->>'min_sold_properties')::INTEGER THEN
        v_eligible := false;
      END IF;
    END IF;

    -- Validar requisito de propiedades activas
    IF v_requirements ? 'min_active_properties' THEN
      IF v_agent_stats.active_count < (v_requirements->>'min_active_properties')::INTEGER THEN
        v_eligible := false;
      END IF;
    END IF;

    -- Validar requisito de calificación promedio
    IF v_requirements ? 'min_avg_rating' THEN
      IF v_agent_stats.avg_rating < (v_requirements->>'min_avg_rating')::NUMERIC THEN
        v_eligible := false;
      END IF;
    END IF;

    -- Validar requisito de cantidad de reviews
    IF v_requirements ? 'min_reviews' THEN
      IF v_agent_stats.review_count < (v_requirements->>'min_reviews')::INTEGER THEN
        v_eligible := false;
      END IF;
    END IF;

    -- Validar requisito de plan específico
    IF v_requirements ? 'plan_level' THEN
      IF v_plan_level IS NULL OR v_plan_level != (v_requirements->>'plan_level') THEN
        v_eligible := false;
      END IF;
    END IF;

    -- Asignar o remover badge según elegibilidad
    IF v_eligible THEN
      INSERT INTO user_badges (user_id, badge_code)
      VALUES (p_user_id, v_badge_code)
      ON CONFLICT (user_id, badge_code) DO NOTHING;
    ELSE
      DELETE FROM user_badges
      WHERE user_id = p_user_id AND badge_code = v_badge_code;
    END IF;
  END LOOP;
END;
$function$;