-- Add server-side validation for message content
-- This provides defense-in-depth protection against abuse and ensures data integrity

CREATE OR REPLACE FUNCTION public.validate_message_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Enforce length limit (5000 characters)
  IF LENGTH(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Message exceeds 5000 character limit';
  END IF;
  
  -- Strip control characters (except newlines and tabs)
  -- This prevents abuse and ensures clean data storage
  NEW.content := regexp_replace(NEW.content, '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply validation trigger to messages table
CREATE TRIGGER validate_message_before_insert
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.validate_message_content();