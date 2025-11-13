-- Función para obtener métricas de salud del sistema de monetización
CREATE OR REPLACE FUNCTION public.get_system_health_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
  is_super_admin_user BOOLEAN;
BEGIN
  -- Verificar que el usuario es super_admin
  SELECT public.is_super_admin(auth.uid()) INTO is_super_admin_user;
  
  IF NOT is_super_admin_user THEN
    RAISE EXCEPTION 'Solo super_admin puede acceder a métricas del sistema';
  END IF;
  
  SELECT json_build_object(
    'subscriptions', (
      SELECT json_build_object(
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'past_due', COUNT(*) FILTER (WHERE status = 'past_due'),
        'canceled', COUNT(*) FILTER (WHERE status = 'canceled'),
        'trialing', COUNT(*) FILTER (WHERE status = 'trialing'),
        'total', COUNT(*)
      )
      FROM user_subscriptions
      WHERE created_at >= NOW() - INTERVAL '90 days'
    ),
    'recent_failed_payments', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          ph.id,
          ph.created_at,
          ph.amount,
          ph.currency,
          p.name as user_name,
          p.email as user_email,
          ph.metadata
        FROM payment_history ph
        LEFT JOIN profiles p ON p.id = ph.user_id
        WHERE ph.status = 'failed'
          AND ph.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY ph.created_at DESC
        LIMIT 20
      ) t
    ),
    'payment_stats_30d', (
      SELECT json_build_object(
        'total_attempts', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status = 'succeeded'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'success_rate', CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'succeeded')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0
        END
      )
      FROM payment_history
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'subscription_changes_7d', (
      SELECT json_build_object(
        'total', COUNT(*),
        'upgrades', COUNT(*) FILTER (WHERE change_type = 'upgrade'),
        'downgrades', COUNT(*) FILTER (WHERE change_type = 'downgrade'),
        'cancellations', COUNT(*) FILTER (WHERE change_type = 'cancellation')
      )
      FROM subscription_changes
      WHERE changed_at >= NOW() - INTERVAL '7 days'
    ),
    'expiring_soon', (
      SELECT COUNT(*)
      FROM user_subscriptions
      WHERE status = 'active'
        AND current_period_end <= NOW() + INTERVAL '7 days'
        AND current_period_end > NOW()
    )
  ) INTO result;
  
  RETURN result;
END;
$$;