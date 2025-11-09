-- Crear tablas para sistema de suscripciones

-- 1. Planes de suscripción
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  currency TEXT DEFAULT 'MXN',
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Suscripciones de usuarios
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Propiedades destacadas
CREATE TABLE featured_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID NOT NULL,
  featured_type TEXT NOT NULL DEFAULT 'standard',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  position INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost DECIMAL(10,2),
  status TEXT DEFAULT 'active',
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Historial de pagos
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'MXN',
  payment_type TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_featured_properties_active ON featured_properties(status, end_date);
CREATE INDEX idx_payment_history_user ON payment_history(user_id);

-- Habilitar RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscription_plans
CREATE POLICY "Plans viewable by everyone" 
ON subscription_plans FOR SELECT 
USING (is_active = true);

-- Políticas RLS para user_subscriptions
CREATE POLICY "Users view own subscription" 
ON user_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System inserts subscriptions" 
ON user_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System updates subscriptions" 
ON user_subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas RLS para featured_properties
CREATE POLICY "Active featured viewable by all" 
ON featured_properties FOR SELECT 
USING (status = 'active' AND end_date > NOW());

CREATE POLICY "Agents view own featured" 
ON featured_properties FOR SELECT 
USING (auth.uid() = agent_id);

CREATE POLICY "Agents create featured" 
ON featured_properties FOR INSERT 
WITH CHECK (auth.uid() = agent_id);

-- Políticas RLS para payment_history
CREATE POLICY "Users view own payments" 
ON payment_history FOR SELECT 
USING (auth.uid() = user_id);

-- Función para verificar si el usuario puede crear propiedades
CREATE OR REPLACE FUNCTION can_create_property(user_uuid UUID)
RETURNS TABLE(can_create BOOLEAN, reason TEXT, current_count INTEGER, max_allowed INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  max_props INTEGER;
  current_props INTEGER;
  sub_status TEXT;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO user_role FROM user_roles WHERE user_id = user_uuid LIMIT 1;
  
  -- Contar propiedades activas actuales
  SELECT COUNT(*) INTO current_props FROM properties WHERE agent_id = user_uuid AND status = 'activa';
  
  -- CASO 1: Buyer (particular) - 1 propiedad gratis
  IF user_role = 'buyer' THEN
    max_props := 1;
    IF current_props < max_props THEN
      RETURN QUERY SELECT true, 'Puedes publicar tu primera propiedad gratis'::TEXT, current_props, max_props;
    ELSE
      RETURN QUERY SELECT false, 'Ya tienes 1 propiedad publicada. Conviértete en Agente para publicar más.'::TEXT, current_props, max_props;
    END IF;
    RETURN;
  END IF;
  
  -- CASO 2: Agent o Agency - requiere suscripción
  IF user_role IN ('agent', 'agency') THEN
    -- Verificar suscripción activa
    SELECT 
      us.status,
      (sp.features->>'max_properties')::INTEGER
    INTO sub_status, max_props
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = user_uuid AND us.status = 'active';
    
    -- Sin suscripción
    IF sub_status IS NULL THEN
      RETURN QUERY SELECT false, 'Necesitas una suscripción activa para publicar propiedades'::TEXT, current_props, 0;
      RETURN;
    END IF;
    
    -- Ilimitado (-1)
    IF max_props = -1 THEN
      RETURN QUERY SELECT true, 'Propiedades ilimitadas'::TEXT, current_props, max_props;
      RETURN;
    END IF;
    
    -- Con límite
    IF current_props < max_props THEN
      RETURN QUERY SELECT true, format('Puedes publicar %s propiedades más', max_props - current_props), current_props, max_props;
    ELSE
      RETURN QUERY SELECT false, 'Has alcanzado el límite de propiedades de tu plan'::TEXT, current_props, max_props;
    END IF;
    RETURN;
  END IF;
  
  -- Default: no permitir
  RETURN QUERY SELECT false, 'Rol no válido'::TEXT, 0, 0;
END;
$$;

-- Función para obtener información de suscripción
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid UUID)
RETURNS TABLE(
  has_subscription BOOLEAN,
  plan_name TEXT,
  plan_display_name TEXT,
  features JSONB,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  properties_used INTEGER,
  properties_limit INTEGER,
  featured_used INTEGER,
  featured_limit INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as has_subscription,
    sp.name,
    sp.display_name,
    sp.features,
    us.status,
    us.current_period_end,
    (SELECT COUNT(*)::INTEGER FROM properties WHERE agent_id = user_uuid AND status = 'activa') as properties_used,
    (sp.features->>'max_properties')::INTEGER as properties_limit,
    (SELECT COUNT(*)::INTEGER FROM featured_properties WHERE agent_id = user_uuid AND status = 'active' AND end_date > NOW()) as featured_used,
    (sp.features->>'featured_listings')::INTEGER as featured_limit
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = user_uuid AND us.status = 'active'
  LIMIT 1;
END;
$$;

-- Insertar planes iniciales
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features) VALUES
('free', 'Particular', 'Para propietarios que quieren vender o rentar una propiedad', 0, 0, 
  '{"max_properties": 1, "featured_listings": 0, "analytics": false, "priority_support": false}'::jsonb),
('basic', 'Agente Básico', 'Para agentes inmobiliarios independientes', 499, 4990, 
  '{"max_properties": 10, "featured_listings": 1, "analytics": true, "priority_support": false, "api_access": false}'::jsonb),
('professional', 'Agente Profesional', 'Para agentes con cartera amplia', 1999, 19990, 
  '{"max_properties": 50, "featured_listings": 5, "analytics": true, "priority_support": true, "api_access": true, "custom_branding": false}'::jsonb),
('enterprise', 'Agencia Inmobiliaria', 'Para inmobiliarias y equipos', 4999, 49990, 
  '{"max_properties": -1, "featured_listings": 20, "analytics": true, "priority_support": true, "api_access": true, "custom_branding": true, "multi_agent": true}'::jsonb);