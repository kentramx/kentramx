-- Agregar columna email_notifications a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN email_notifications boolean DEFAULT true;