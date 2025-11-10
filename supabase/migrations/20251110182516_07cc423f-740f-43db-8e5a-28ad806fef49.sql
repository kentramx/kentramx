-- Enable realtime for subscription_changes table
ALTER TABLE public.subscription_changes REPLICA IDENTITY FULL;

-- Add to realtime publication (if not already present)
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_changes;