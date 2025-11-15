-- FASE 1: Índices críticos para escalar a 1M de propiedades

-- Índice para Home.tsx - propiedades recientes por listing_type
CREATE INDEX IF NOT EXISTS idx_properties_listing_status_created 
ON properties (listing_type, status, created_at DESC)
WHERE status = 'activa';

-- Índice para AdminDashboard - filtros por status
CREATE INDEX IF NOT EXISTS idx_properties_status_created 
ON properties (status, created_at DESC);

-- Índice para cleanup de propiedades expiradas
CREATE INDEX IF NOT EXISTS idx_properties_expires_at 
ON properties (expires_at)
WHERE status = 'activa' AND expires_at IS NOT NULL;

-- Índice compuesto para queries comunes de agente
CREATE INDEX IF NOT EXISTS idx_properties_agent_status_created 
ON properties (agent_id, status, created_at DESC);

-- Índice para búsqueda de duplicados (optimiza PropertyForm)
CREATE INDEX IF NOT EXISTS idx_properties_duplicate_check 
ON properties (agent_id, address, state, municipality)
WHERE status = 'activa';

-- Índice para métricas de inversión
CREATE INDEX IF NOT EXISTS idx_properties_market_analysis 
ON properties (state, municipality, listing_type, status, sqft, price)
WHERE status = 'activa' AND sqft IS NOT NULL;