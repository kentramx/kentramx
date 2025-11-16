-- =====================================================
-- FASE 2: ÍNDICES AVANZADOS Y OPTIMIZACIONES
-- =====================================================

-- 1. Crear índices adicionales para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_properties_state_municipality_type 
ON properties (state, municipality, type) 
WHERE status = 'activa';

CREATE INDEX IF NOT EXISTS idx_properties_price_status 
ON properties (price, status) 
WHERE status = 'activa';

CREATE INDEX IF NOT EXISTS idx_properties_bedrooms_bathrooms 
ON properties (bedrooms, bathrooms) 
WHERE status = 'activa' AND bedrooms IS NOT NULL;

-- 2. Índice para búsquedas de propiedades expiradas
CREATE INDEX IF NOT EXISTS idx_properties_expiring_soon
ON properties (expires_at, agent_id)
WHERE status = 'activa' AND expires_at IS NOT NULL;

-- 3. Índice para queries de análisis de mercado
CREATE INDEX IF NOT EXISTS idx_properties_price_analysis
ON properties (state, municipality, type, price, sqft)
WHERE status = 'activa';

-- 4. Mejorar performance de favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_created
ON favorites (user_id, created_at DESC);

-- 5. Mejorar performance de mensajes
CREATE INDEX IF NOT EXISTS idx_messages_unread
ON messages (conversation_id, read_at)
WHERE read_at IS NULL;

-- 6. Índice para property views analytics
CREATE INDEX IF NOT EXISTS idx_property_views_analytics
ON property_views (property_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_views_viewer
ON property_views (viewer_id, viewed_at DESC)
WHERE viewer_id IS NOT NULL;

-- 7. Configurar autovacuum más agresivo para tabla properties
ALTER TABLE properties SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 10
);

-- 8. Crear función para limpiar datos antiguos
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Limpiar property_views mayores a 6 meses
  DELETE FROM property_views
  WHERE viewed_at < NOW() - INTERVAL '6 months';

  -- Limpiar processed_webhook_events mayores a 3 meses
  DELETE FROM processed_webhook_events
  WHERE created_at < NOW() - INTERVAL '3 months';

  -- Limpiar mensajes de conversaciones inactivas (1 año)
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '1 year'
  AND conversation_id IN (
    SELECT id FROM conversations
    WHERE updated_at < NOW() - INTERVAL '1 year'
  );
END;
$$;

-- 9. Crear vista materializada para estadísticas de agentes
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_performance_stats AS
SELECT 
  p.agent_id,
  COUNT(DISTINCT p.id) as total_properties,
  COUNT(DISTINCT CASE WHEN p.status = 'activa' THEN p.id END) as active_properties,
  AVG(p.price) as avg_price,
  COUNT(DISTINCT pv.id) as total_views,
  COUNT(DISTINCT f.id) as total_favorites,
  COUNT(DISTINCT c.id) as total_conversations,
  AVG(ar.rating) as avg_rating,
  COUNT(ar.id) as total_reviews,
  MAX(p.created_at) as last_property_date
FROM profiles pr
LEFT JOIN properties p ON p.agent_id = pr.id
LEFT JOIN property_views pv ON pv.property_id = p.id
LEFT JOIN favorites f ON f.property_id = p.id
LEFT JOIN conversations c ON c.agent_id = pr.id
LEFT JOIN agent_reviews ar ON ar.agent_id = pr.id
WHERE pr.id IN (
  SELECT user_id FROM user_roles WHERE role IN ('agent', 'agency')
)
GROUP BY p.agent_id;

-- Crear índice único para refresh concurrent
CREATE UNIQUE INDEX IF NOT EXISTS agent_performance_stats_agent_id 
ON agent_performance_stats (agent_id);

-- 10. Función para refrescar stats de agentes
CREATE OR REPLACE FUNCTION refresh_agent_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_stats;
END;
$$;

-- 11. Función para monitoreo de salud de base de datos
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS TABLE (
  metric TEXT,
  value TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Total Properties'::TEXT,
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END
  FROM properties;

  RETURN QUERY
  SELECT 
    'Active Properties'::TEXT,
    COUNT(*)::TEXT,
    'OK'::TEXT
  FROM properties WHERE status = 'activa';

  RETURN QUERY
  SELECT 
    'Table Size'::TEXT,
    pg_size_pretty(pg_total_relation_size('properties'))::TEXT,
    'INFO'::TEXT;
END;
$$;

-- Ejecutar análisis
ANALYZE properties;
ANALYZE images;
ANALYZE favorites;
ANALYZE conversations;
ANALYZE messages;