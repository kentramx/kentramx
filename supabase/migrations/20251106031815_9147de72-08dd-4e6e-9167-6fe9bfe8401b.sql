-- Recrear funciones con search_path correcto para seguridad

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id, unread_count)
  VALUES 
    (NEW.id, NEW.buyer_id, 0),
    (NEW.id, NEW.agent_id, 0);
  RETURN NEW;
END;
$$;