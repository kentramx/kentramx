-- Crear tabla de upsells dinámicos
CREATE TABLE IF NOT EXISTS public.upsells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stripe_price_id TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'Plus',
  badge TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  user_type TEXT NOT NULL CHECK (user_type IN ('agent', 'agency', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX idx_upsells_user_type ON public.upsells(user_type);
CREATE INDEX idx_upsells_is_active ON public.upsells(is_active);
CREATE INDEX idx_upsells_display_order ON public.upsells(display_order);

-- Habilitar RLS
ALTER TABLE public.upsells ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Todos pueden ver upsells activos
CREATE POLICY "Upsells activos son visibles por todos"
  ON public.upsells
  FOR SELECT
  USING (is_active = true);

-- Solo super_admin puede insertar, actualizar y eliminar
CREATE POLICY "Super admin puede insertar upsells"
  ON public.upsells
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admin puede actualizar upsells"
  ON public.upsells
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admin puede eliminar upsells"
  ON public.upsells
  FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_upsells_updated_at
  BEFORE UPDATE ON public.upsells
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insertar upsells iniciales para agentes
INSERT INTO public.upsells (name, description, price, stripe_price_id, icon_name, badge, is_recurring, user_type, display_order) VALUES
('Slot Adicional de Propiedad', 'Agrega 1 propiedad activa adicional a tu plan', 49, 'price_property_slot_monthly', 'Plus', 'Más Popular', true, 'agent', 1),
('Destacar Propiedad 7 Días', 'Destaca 1 propiedad por 7 días en resultados de búsqueda', 59, 'price_featured_7days', 'Star', NULL, false, 'agent', 2);

-- Insertar upsells iniciales para inmobiliarias
INSERT INTO public.upsells (name, description, price, stripe_price_id, icon_name, badge, is_recurring, user_type, display_order) VALUES
('Agentes Adicionales', 'Agrega +5 agentes a tu equipo inmobiliario', 1500, 'price_extra_agents_monthly', 'Users', 'Más Popular', true, 'agency', 1),
('Capacitación Premium', 'Sesión de capacitación personalizada para tu equipo (2 horas)', 2500, 'price_premium_training', 'GraduationCap', NULL, false, 'agency', 2),
('Landing Page Personalizada', 'Página personalizada con tu branding para destacar tu inmobiliaria', 3500, 'price_custom_landing', 'LayoutTemplate', 'Premium', false, 'agency', 3),
('Reportes Avanzados', 'Dashboard con métricas detalladas y análisis de rendimiento', 800, 'price_advanced_analytics_monthly', 'BarChart3', NULL, true, 'agency', 4);