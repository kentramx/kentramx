-- Fix search_path security warning in get_user_subscription_info
DROP FUNCTION IF EXISTS get_user_subscription_info(uuid);

CREATE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  name TEXT,
  display_name TEXT,
  features JSONB,
  status TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  properties_used INTEGER,
  properties_limit INTEGER,
  featured_used INTEGER,
  featured_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reset_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar si necesita reseteo
  SELECT us.featured_reset_date INTO v_reset_date
  FROM user_subscriptions us
  WHERE us.user_id = user_uuid AND us.status = 'active';

  -- Resetear si pasó el mes
  IF v_reset_date IS NOT NULL AND v_reset_date <= NOW() THEN
    UPDATE user_subscriptions
    SET 
      featured_used_this_month = 0,
      featured_reset_date = date_trunc('month', NOW()) + INTERVAL '1 month'
    WHERE user_subscriptions.user_id = user_uuid AND user_subscriptions.status = 'active';
  END IF;

  RETURN QUERY
  SELECT 
    true as has_subscription,
    sp.name,
    sp.display_name,
    sp.features,
    us.status::TEXT,
    us.current_period_end,
    (SELECT COUNT(*)::INTEGER FROM properties p WHERE p.agent_id = user_uuid AND p.status = 'activa') as properties_used,
    (sp.features->>'max_properties')::INTEGER as properties_limit,
    COALESCE(us.featured_used_this_month, 0) as featured_used,
    (sp.features->>'featured_listings')::INTEGER as featured_limit
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = user_uuid AND us.status = 'active'
  LIMIT 1;
END;
$$;