-- Create table to track subscription plan changes
CREATE TABLE IF NOT EXISTS public.subscription_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  previous_plan_id UUID REFERENCES public.subscription_plans(id),
  new_plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  previous_billing_cycle TEXT,
  new_billing_cycle TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_type TEXT NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'cycle_change')),
  prorated_amount NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies
ALTER TABLE public.subscription_changes ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription changes
CREATE POLICY "Users can view own subscription changes"
  ON public.subscription_changes
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert subscription changes
CREATE POLICY "System can insert subscription changes"
  ON public.subscription_changes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_subscription_changes_user_id ON public.subscription_changes(user_id);
CREATE INDEX idx_subscription_changes_changed_at ON public.subscription_changes(changed_at DESC);

-- Add comment
COMMENT ON TABLE public.subscription_changes IS 'Tracks all subscription plan changes for audit and cooldown enforcement';