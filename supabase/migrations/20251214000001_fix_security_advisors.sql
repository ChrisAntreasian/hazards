-- Migration: Fix Supabase Security Advisors
-- Date: 2024-12-14
-- Fixes: hazard_ratings RLS policies, function search_path settings
-- 
-- Note: The following issues CANNOT be fixed via migration:
-- - spatial_ref_sys RLS: PostGIS system table owned by postgres
-- - PostGIS in public schema: Requires superuser access
-- - Leaked Password Protection: Enable in Supabase Dashboard → Auth → Settings
-- - Postgres version: Upgrade via Supabase Dashboard → Database

-- ============================================
-- 1. Add RLS policies for hazard_ratings table
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hazard_ratings') THEN
    -- Users can read all ratings
    EXECUTE 'DROP POLICY IF EXISTS "Users can read all ratings" ON public.hazard_ratings';
    EXECUTE 'CREATE POLICY "Users can read all ratings" ON public.hazard_ratings FOR SELECT USING (true)';
    
    -- Users can create their own ratings
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own ratings" ON public.hazard_ratings';
    EXECUTE 'CREATE POLICY "Users can create their own ratings" ON public.hazard_ratings FOR INSERT WITH CHECK (auth.uid() = user_id)';
    
    -- Users can update their own ratings
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own ratings" ON public.hazard_ratings';
    EXECUTE 'CREATE POLICY "Users can update their own ratings" ON public.hazard_ratings FOR UPDATE USING (auth.uid() = user_id)';
    
    -- Users can delete their own ratings
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.hazard_ratings';
    EXECUTE 'CREATE POLICY "Users can delete their own ratings" ON public.hazard_ratings FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END
$$;

-- ============================================
-- 2. Fix search_path on functions
-- This prevents search_path injection attacks by setting an immutable search_path
-- ============================================
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Loop through all functions that need search_path fixed
  FOR func_record IN 
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_trust_score_tier',
      'get_trust_score_breakdown', 
      'update_trust_score',
      'get_expiration_time_remaining',
      'get_hazard_expiration_status',
      'check_auto_resolve',
      'check_resolution_threshold',
      'update_hazard_vote_counts',
      'trust_score_on_vote_cast',
      'trust_score_on_vote_received',
      'can_user_vote_on_hazard',
      'get_user_vote_status',
      'update_hazard_votes_updated_at',
      'update_category_suggestions_timestamp',
      'get_category_sections',
      'review_category',
      'create_provisional_category',
      'trust_score_on_flag_review',
      'update_resolution_confirmation_updated_at',
      'trust_score_on_resolution_confirmation',
      'create_hazard',
      'update_cms_draft_timestamp',
      'generate_slug',
      'geo_cell_encode',
      'geohash_encode'
    )
  LOOP
    -- Set search_path for each function
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', 
                   func_record.proname, func_record.args);
  END LOOP;
END
$$;
