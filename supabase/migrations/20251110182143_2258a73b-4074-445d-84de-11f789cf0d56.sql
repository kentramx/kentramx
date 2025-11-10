-- Allow admins to view all subscription changes
CREATE POLICY "Admins can view all subscription changes"
  ON public.subscription_changes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );