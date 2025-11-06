-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for property images bucket
CREATE POLICY "Property images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Agents can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'agent'
  )
);

CREATE POLICY "Agents can update own property images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'agent'
  )
);

CREATE POLICY "Agents can delete own property images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'agent'
  )
);