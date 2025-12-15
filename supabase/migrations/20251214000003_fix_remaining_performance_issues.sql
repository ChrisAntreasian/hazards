-- Fix remaining Auth RLS Initplan warnings and add missing FK indexes

-- =====================================================
-- PART 1: Fix cms_content_drafts and content_edit_history RLS policies
-- =====================================================

-- Fix cms_content_drafts policies
DROP POLICY IF EXISTS "Content editors can view drafts" ON public.cms_content_drafts;
DROP POLICY IF EXISTS "Content editors can create drafts" ON public.cms_content_drafts;
DROP POLICY IF EXISTS "Content editors can update drafts" ON public.cms_content_drafts;
DROP POLICY IF EXISTS "Admins can delete drafts" ON public.cms_content_drafts;

CREATE POLICY "Content editors can view drafts" 
ON public.cms_content_drafts FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'content_editor'::user_role, 'moderator'::user_role])));

CREATE POLICY "Content editors can create drafts" 
ON public.cms_content_drafts FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'content_editor'::user_role, 'moderator'::user_role])));

CREATE POLICY "Content editors can update drafts" 
ON public.cms_content_drafts FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'content_editor'::user_role, 'moderator'::user_role])));

CREATE POLICY "Admins can delete drafts" 
ON public.cms_content_drafts FOR DELETE 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = 'admin'::user_role));

-- Fix content_edit_history policy
DROP POLICY IF EXISTS "Content editors can view edit history" ON public.content_edit_history;

CREATE POLICY "Content editors can view edit history" 
ON public.content_edit_history FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin'::user_role, 'content_editor'::user_role, 'moderator'::user_role])));

-- =====================================================
-- PART 2: Add missing foreign key indexes
-- =====================================================

-- category_suggestions
CREATE INDEX IF NOT EXISTS idx_category_suggestions_approved_category ON public.category_suggestions(approved_category_id);
CREATE INDEX IF NOT EXISTS idx_category_suggestions_reviewed_by ON public.category_suggestions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_category_suggestions_parent ON public.category_suggestions(suggested_parent_id);

-- cms_content_drafts
CREATE INDEX IF NOT EXISTS idx_cms_drafts_reviewed_by ON public.cms_content_drafts(reviewed_by);

-- expiration_audit_log
CREATE INDEX IF NOT EXISTS idx_expiration_audit_performed_by ON public.expiration_audit_log(performed_by);

-- expiration_settings
CREATE INDEX IF NOT EXISTS idx_expiration_settings_updated_by ON public.expiration_settings(updated_by);

-- hazard_categories
CREATE INDEX IF NOT EXISTS idx_hazard_categories_approved_by ON public.hazard_categories(approved_by);
CREATE INDEX IF NOT EXISTS idx_hazard_categories_suggested_by ON public.hazard_categories(suggested_by);

-- hazard_flags
CREATE INDEX IF NOT EXISTS idx_hazard_flags_reviewed_by ON public.hazard_flags(reviewed_by);

-- hazard_templates
CREATE INDEX IF NOT EXISTS idx_hazard_templates_published_by ON public.hazard_templates(published_by);

-- hazards - resolved_by
CREATE INDEX IF NOT EXISTS idx_hazards_resolved_by ON public.hazards(resolved_by);

-- trust_score_config
CREATE INDEX IF NOT EXISTS idx_trust_score_config_updated_by ON public.trust_score_config(updated_by);
