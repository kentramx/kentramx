-- Create newsletter_subscriptions table
CREATE TABLE public.newsletter_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_email UNIQUE (email)
);

-- Enable RLS
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscriptions
FOR INSERT
WITH CHECK (true);

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.newsletter_subscriptions
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (email = auth.jwt()->>'email')
);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
ON public.newsletter_subscriptions
FOR UPDATE
USING (
  (auth.uid() = user_id) OR 
  (email = auth.jwt()->>'email')
);

-- Users can delete their own subscriptions
CREATE POLICY "Users can unsubscribe"
ON public.newsletter_subscriptions
FOR DELETE
USING (
  (auth.uid() = user_id) OR 
  (email = auth.jwt()->>'email')
);

-- Add trigger for updated_at
CREATE TRIGGER update_newsletter_subscriptions_updated_at
BEFORE UPDATE ON public.newsletter_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index on email for faster lookups
CREATE INDEX idx_newsletter_subscriptions_email ON public.newsletter_subscriptions(email);
CREATE INDEX idx_newsletter_subscriptions_user_id ON public.newsletter_subscriptions(user_id);
CREATE INDEX idx_newsletter_subscriptions_is_active ON public.newsletter_subscriptions(is_active);