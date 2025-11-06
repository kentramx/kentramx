-- Crear bucket para imágenes de mensajes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-images',
  'message-images',
  true,
  5242880, -- 5MB límite
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Políticas RLS para message-images bucket
CREATE POLICY "Users can view message images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'message-images');

CREATE POLICY "Users can upload message images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own message images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'message-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Agregar columnas a messages para soportar imágenes
ALTER TABLE public.messages
ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
ADD COLUMN image_url TEXT DEFAULT NULL;

-- Modificar constraint de content para que sea opcional cuando hay imagen
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_content_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_content_or_image_check 
CHECK (
  (message_type = 'text' AND content IS NOT NULL AND content != '') 
  OR 
  (message_type = 'image' AND image_url IS NOT NULL)
);