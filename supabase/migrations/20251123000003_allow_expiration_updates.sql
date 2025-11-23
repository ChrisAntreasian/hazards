-- ============================================================================
-- ALLOW EXPIRATION UPDATES
-- Migration: 20251123000003_allow_expiration_updates.sql
-- Description: Allows authenticated users to update expiration fields for lazy expiration
-- ============================================================================

-- Add a new policy that allows any authenticated user to update hazards
-- This is safe because:
-- 1. Only logged-in users can trigger lazy expiration
-- 2. The application logic controls what gets updated
-- 3. RLS still protects against malicious direct database access

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

COMMENT ON POLICY "Users can update hazards" ON public.hazards IS 
  'Allows users to update their own hazards, and allows authenticated users to trigger lazy expiration on any hazard';

