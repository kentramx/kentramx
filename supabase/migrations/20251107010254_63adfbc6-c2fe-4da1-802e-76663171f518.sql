-- Drop old storage policies that check profiles.role (deprecated)
DROP POLICY IF EXISTS "Agents can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Agents can update own property images" ON storage.objects;
DROP POLICY IF EXISTS "Agents can delete own property images" ON storage.objects;

-- Create new storage policies using has_role() function with user_roles table
CREATE POLICY "Agents can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' AND
  public.has_role(auth.uid(), 'agent'::app_role)
);

CREATE POLICY "Agents can update own property images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-images' AND
  public.has_role(auth.uid(), 'agent'::app_role)
);

CREATE POLICY "Agents can delete own property images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images' AND
  public.has_role(auth.uid(), 'agent'::app_role)
);