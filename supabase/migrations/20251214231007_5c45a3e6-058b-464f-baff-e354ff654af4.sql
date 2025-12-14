-- Índice para optimizar queries de renovación y expiración
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end 
ON public.user_subscriptions(current_period_end) 
WHERE status IN ('active', 'trialing', 'past_due');

-- Constraint para validar estados de suscripción válidos
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT check_valid_subscription_status 
CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'suspended', 'expired', 'incomplete'));