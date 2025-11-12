-- Cambiar el bucket message-images de público a privado
UPDATE storage.buckets 
SET public = false 
WHERE id = 'message-images';

-- Crear políticas RLS para el bucket message-images

-- Política 1: Los usuarios autenticados pueden subir imágenes a su propia carpeta
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 2: Los usuarios autenticados pueden ver sus propias imágenes
CREATE POLICY "Users can view their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política 3: Los usuarios pueden ver imágenes de mensajes en conversaciones donde participan
CREATE POLICY "Users can view images from their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-images'
  AND EXISTS (
    SELECT 1 
    FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.image_url LIKE '%' || (storage.objects.name) || '%'
    AND cp.user_id = auth.uid()
  )
);

-- Política 4: Los usuarios pueden eliminar sus propias imágenes
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);