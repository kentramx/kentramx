-- Add 'developer' to app_role enum if it doesn't exist
-- Note: We need to check if the value exists before adding
DO $$ 
BEGIN
  -- Check if 'developer' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'developer'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'developer';
  END IF;
END $$;

-- Update the type comment to include developer
COMMENT ON TYPE app_role IS 'User roles: super_admin, admin, agent, agency, buyer, developer';