-- Drop the overly permissive policy that exposes all profile data
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow users to view their own complete profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Allow conversation participants to see each other's profiles
-- This enables users in active conversations to contact each other
CREATE POLICY "Conversation participants can view each other"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE (conversations.buyer_id = auth.uid() OR conversations.agent_id = auth.uid())
    AND (conversations.buyer_id = profiles.id OR conversations.agent_id = profiles.id)
  )
);

-- Allow public to view agent profiles
-- Note: Applications should filter sensitive fields like phone numbers
-- when displaying to non-conversation participants
CREATE POLICY "Public can view agent profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = profiles.id
    AND user_roles.role IN ('agent', 'agency')
  )
);