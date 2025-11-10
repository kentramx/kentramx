-- Crear índices en payment_history para optimización
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON public.payment_history(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);

-- Función RPC para obtener métricas financieras (solo super_admin)
CREATE OR REPLACE FUNCTION public.get_financial_metrics(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  is_super_admin BOOLEAN;
BEGIN
  -- Verificar que el usuario es super_admin
  SELECT public.is_super_admin(auth.uid()) INTO is_super_admin;
  
  IF NOT is_super_admin THEN
    RAISE EXCEPTION 'Acceso denegado: solo super_admin puede acceder a métricas financieras';
  END IF;
  
  -- Si no se proporcionan fechas, usar últimos 12 meses
  IF start_date IS NULL THEN
    start_date := NOW() - INTERVAL '12 months';
  END IF;
  
  IF end_date IS NULL THEN
    end_date := NOW();
  END IF;
  
  -- Construir JSON con todas las métricas
  SELECT json_build_object(
    'daily_revenue', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM payment_history
        WHERE status = 'succeeded'
          AND created_at >= start_date
          AND created_at <= end_date
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 90
      ) t
    ),
    'weekly_revenue', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          date_trunc('week', created_at) as week_start,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM payment_history
        WHERE status = 'succeeded'
          AND created_at >= start_date
          AND created_at <= end_date
        GROUP BY date_trunc('week', created_at)
        ORDER BY week_start DESC
        LIMIT 24
      ) t
    ),
    'monthly_revenue', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          date_trunc('month', created_at) as month_start,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM payment_history
        WHERE status = 'succeeded'
          AND created_at >= start_date
          AND created_at <= end_date
        GROUP BY date_trunc('month', created_at)
        ORDER BY month_start DESC
        LIMIT 12
      ) t
    ),
    'revenue_by_plan', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          sp.display_name as plan_name,
          SUM(ph.amount) as revenue,
          COUNT(ph.id) as transactions
        FROM payment_history ph
        JOIN user_subscriptions us ON ph.user_id = us.user_id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE ph.status = 'succeeded'
          AND ph.created_at >= start_date
          AND ph.created_at <= end_date
        GROUP BY sp.display_name
        ORDER BY revenue DESC
      ) t
    ),
    'top_agents', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          ph.user_id,
          p.name as agent_name,
          sp.display_name as plan_name,
          SUM(ph.amount) as total_revenue,
          COUNT(ph.id) as total_transactions
        FROM payment_history ph
        JOIN profiles p ON ph.user_id = p.id
        LEFT JOIN user_subscriptions us ON ph.user_id = us.user_id AND us.status = 'active'
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE ph.status = 'succeeded'
          AND ph.created_at >= start_date
          AND ph.created_at <= end_date
        GROUP BY ph.user_id, p.name, sp.display_name
        ORDER BY total_revenue DESC
        LIMIT 10
      ) t
    ),
    'summary', (
      SELECT json_build_object(
        'total_revenue', COALESCE(SUM(amount), 0),
        'total_transactions', COUNT(*),
        'success_rate', CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'succeeded')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
          ELSE 0
        END,
        'avg_transaction', CASE
          WHEN COUNT(*) FILTER (WHERE status = 'succeeded') > 0 THEN ROUND(AVG(amount) FILTER (WHERE status = 'succeeded'), 2)
          ELSE 0
        END,
        'mrr', (
          SELECT COALESCE(SUM(sp.price_monthly), 0)
          FROM user_subscriptions us
          JOIN subscription_plans sp ON us.plan_id = sp.id
          WHERE us.status = 'active'
        ),
        'arr', (
          SELECT COALESCE(SUM(sp.price_monthly) * 12, 0)
          FROM user_subscriptions us
          JOIN subscription_plans sp ON us.plan_id = sp.id
          WHERE us.status = 'active'
        ),
        'active_subscriptions', (
          SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active'
        )
      )
      FROM payment_history
      WHERE created_at >= start_date
        AND created_at <= end_date
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Comentario de documentación
COMMENT ON FUNCTION public.get_financial_metrics IS 'Retorna métricas financieras completas para super_admin: ingresos diarios/semanales/mensuales, distribución por plan, top agentes, y resumen general';