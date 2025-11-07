-- Add agency role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agency';

-- Create agencies table
CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  logo_url text,
  website text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_owner UNIQUE (owner_id)
);

-- Create agency_agents junction table (relates agencies to their agents)
CREATE TABLE IF NOT EXISTS public.agency_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'agent', -- can be 'agent', 'manager', 'admin'
  status text DEFAULT 'active', -- 'active', 'inactive', 'pending'
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_agency_agent UNIQUE (agency_id, agent_id)
);

-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_agents ENABLE ROW LEVEL SECURITY;

-- Policies for agencies table
CREATE POLICY "Agencies are viewable by everyone"
  ON public.agencies FOR SELECT
  USING (true);

CREATE POLICY "Agency owners can insert their own agency"
  ON public.agencies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Agency owners can update their own agency"
  ON public.agencies FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Agency owners can delete their own agency"
  ON public.agencies FOR DELETE
  USING (auth.uid() = owner_id);

-- Policies for agency_agents table
CREATE POLICY "Agency agents relationships are viewable by involved parties"
  ON public.agency_agents FOR SELECT
  USING (
    auth.uid() = agent_id OR 
    auth.uid() IN (SELECT owner_id FROM public.agencies WHERE id = agency_id)
  );

CREATE POLICY "Agency owners can add agents"
  ON public.agency_agents FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT owner_id FROM public.agencies WHERE id = agency_id)
  );

CREATE POLICY "Agency owners can update agent relationships"
  ON public.agency_agents FOR UPDATE
  USING (
    auth.uid() IN (SELECT owner_id FROM public.agencies WHERE id = agency_id)
  );

CREATE POLICY "Agency owners can remove agents"
  ON public.agency_agents FOR DELETE
  USING (
    auth.uid() IN (SELECT owner_id FROM public.agencies WHERE id = agency_id)
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_agencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agencies updated_at
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agencies_updated_at();

-- Add agency_id to properties table (optional - properties can belong to an agency)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agency_agents_agency_id ON public.agency_agents(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_agents_agent_id ON public.agency_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties(agency_id);
