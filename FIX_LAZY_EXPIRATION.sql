-- ============================================================================
-- FIX LAZY EXPIRATION - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- This fixes the RLS policy that was preventing lazy expiration from working
-- Run this entire script in your Supabase SQL Editor and click RUN

DROP POLICY IF EXISTS "Users can update own hazards" ON public.hazards;

CREATE POLICY "Users can update hazards" 
  ON public.hazards
  FOR UPDATE 
  TO authenticated
  USING (
    -- Allow updates if:
    -- 1. User owns the hazard, OR
    -- 2. User is authenticated (for lazy expiration)
    auth.uid() = user_id OR auth.uid() IS NOT NULL
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'hazards' AND policyname = 'Users can update hazards';

-- You should see one row returned with:
-- policyname: Users can update hazards
-- cmd: UPDATE
-- roles: {authenticated}
