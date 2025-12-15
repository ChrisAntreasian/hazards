-- Fix Performance Advisors - Auth RLS Initplan warnings
-- Convert auth.uid() to (SELECT auth.uid()) for better query planning

-- Fix hazard_ratings policies
DROP POLICY IF EXISTS "Users can create their own ratings" ON public.hazard_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.hazard_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.hazard_ratings;

CREATE POLICY "Users can create their own ratings" 
ON public.hazard_ratings FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own ratings" 
ON public.hazard_ratings FOR UPDATE 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own ratings" 
ON public.hazard_ratings FOR DELETE 
USING ((SELECT auth.uid()) = user_id);

-- Fix hazard_flags policies
DROP POLICY IF EXISTS "Users can insert their own flags" ON public.hazard_flags;
DROP POLICY IF EXISTS "Users can view their own flags" ON public.hazard_flags;
DROP POLICY IF EXISTS "Moderators can view all flags" ON public.hazard_flags;
DROP POLICY IF EXISTS "Moderators can update flags" ON public.hazard_flags;

CREATE POLICY "Users can insert their own flags" 
ON public.hazard_flags FOR INSERT 
WITH CHECK (((SELECT auth.uid()) = user_id) AND ((status)::text = 'pending'::text));

CREATE POLICY "Users can view their own flags" 
ON public.hazard_flags FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Moderators can view all flags" 
ON public.hazard_flags FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])));

CREATE POLICY "Moderators can update flags" 
ON public.hazard_flags FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])));

-- Fix hazard_votes policies
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.hazard_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.hazard_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.hazard_votes;
DROP POLICY IF EXISTS "Admins can manage all votes" ON public.hazard_votes;

CREATE POLICY "Users can insert their own votes" 
ON public.hazard_votes FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own votes" 
ON public.hazard_votes FOR UPDATE 
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own votes" 
ON public.hazard_votes FOR DELETE 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can manage all votes" 
ON public.hazard_votes FOR ALL 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])));

-- Fix hazard_resolution_confirmations policies
DROP POLICY IF EXISTS "Authenticated users can create confirmations" ON public.hazard_resolution_confirmations;
DROP POLICY IF EXISTS "Users can update own confirmations" ON public.hazard_resolution_confirmations;
DROP POLICY IF EXISTS "Users can delete own confirmations" ON public.hazard_resolution_confirmations;

CREATE POLICY "Authenticated users can create confirmations" 
ON public.hazard_resolution_confirmations FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own confirmations" 
ON public.hazard_resolution_confirmations FOR UPDATE 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own confirmations" 
ON public.hazard_resolution_confirmations FOR DELETE 
USING ((SELECT auth.uid()) = user_id);

-- Fix hazard_resolution_reports policies
DROP POLICY IF EXISTS "Authenticated users can create resolution reports" ON public.hazard_resolution_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.hazard_resolution_reports;

CREATE POLICY "Authenticated users can create resolution reports" 
ON public.hazard_resolution_reports FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = reported_by);

CREATE POLICY "Users can update own reports" 
ON public.hazard_resolution_reports FOR UPDATE 
USING ((SELECT auth.uid()) = reported_by);

-- Fix category_suggestions policies
DROP POLICY IF EXISTS "Authenticated read all suggestions" ON public.category_suggestions;
DROP POLICY IF EXISTS "Users can create suggestions" ON public.category_suggestions;
DROP POLICY IF EXISTS "Users can update own pending suggestions" ON public.category_suggestions;
DROP POLICY IF EXISTS "Admins can update suggestions" ON public.category_suggestions;

CREATE POLICY "Authenticated read all suggestions" 
ON public.category_suggestions FOR SELECT 
USING ((SELECT auth.role()) = 'authenticated'::text);

CREATE POLICY "Users can create suggestions" 
ON public.category_suggestions FOR INSERT 
WITH CHECK ((SELECT auth.uid()) = suggested_by);

CREATE POLICY "Users can update own pending suggestions" 
ON public.category_suggestions FOR UPDATE 
USING (((SELECT auth.uid()) = suggested_by) AND (status = 'pending'::category_status))
WITH CHECK (((SELECT auth.uid()) = suggested_by) AND (status = 'pending'::category_status));

CREATE POLICY "Admins can update suggestions" 
ON public.category_suggestions FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])));

-- Fix category_section_config policies
DROP POLICY IF EXISTS "Admins can manage section config" ON public.category_section_config;

CREATE POLICY "Admins can manage section config" 
ON public.category_section_config FOR ALL 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])));

-- Fix trust_score_config policies
DROP POLICY IF EXISTS "Admins can manage trust score config" ON public.trust_score_config;

CREATE POLICY "Admins can manage trust score config" 
ON public.trust_score_config FOR ALL 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = 'admin'::user_role));

-- Fix trust_score_events policies
DROP POLICY IF EXISTS "Users can view their own trust score events" ON public.trust_score_events;
DROP POLICY IF EXISTS "Admins can view all trust score events" ON public.trust_score_events;

CREATE POLICY "Users can view their own trust score events" 
ON public.trust_score_events FOR SELECT 
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can view all trust score events" 
ON public.trust_score_events FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])));

-- Fix expiration_settings policies
DROP POLICY IF EXISTS "Admins can manage expiration settings" ON public.expiration_settings;

CREATE POLICY "Admins can manage expiration settings" 
ON public.expiration_settings FOR ALL 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'moderator'::user_role])));

-- Fix hazards policies that still use auth.uid() directly
DROP POLICY IF EXISTS "Users can update hazards" ON public.hazards;
DROP POLICY IF EXISTS "Moderators can read all hazards" ON public.hazards;

CREATE POLICY "Users can update hazards" 
ON public.hazards FOR UPDATE 
USING (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) IS NOT NULL))
WITH CHECK (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) IS NOT NULL));

CREATE POLICY "Moderators can read all hazards" 
ON public.hazards FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['moderator'::user_role, 'admin'::user_role])));

-- Add a few missing indexes that help with common queries (these are additive, won't fail if they exist)
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON public.moderation_queue(content_id);
CREATE INDEX IF NOT EXISTS idx_image_votes_image_id ON public.image_votes(image_id);
CREATE INDEX IF NOT EXISTS idx_hazard_ratings_hazard_id ON public.hazard_ratings(hazard_id);
