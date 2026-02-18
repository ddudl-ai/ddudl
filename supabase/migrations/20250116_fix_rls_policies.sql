-- Fix RLS policies to allow proper API access
-- Date: 2025-01-16
-- Description: Update RLS policies to allow API endpoints to function properly

-- Drop existing restrictive users policy
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- Create new policy allowing public read access to user basic info
CREATE POLICY "Users are publicly readable"
ON public.users FOR SELECT
USING (true);

-- Ensure service role has proper permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Also grant permissions to authenticated and anon roles for basic operations
GRANT SELECT ON public.users TO authenticated, anon;
GRANT SELECT ON public.posts TO authenticated, anon;
GRANT SELECT ON public.subreddits TO authenticated, anon;
GRANT SELECT ON public.comments TO authenticated, anon;