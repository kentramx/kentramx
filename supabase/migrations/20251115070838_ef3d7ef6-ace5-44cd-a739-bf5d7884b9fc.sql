-- Allow admins/moderators to update any property
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'properties'
      AND policyname = 'Admins can update any property'
  ) THEN
    CREATE POLICY "Admins can update any property"
    ON public.properties
    FOR UPDATE
    USING (public.has_admin_access(auth.uid()))
    WITH CHECK (public.has_admin_access(auth.uid()));
  END IF;
END$$;