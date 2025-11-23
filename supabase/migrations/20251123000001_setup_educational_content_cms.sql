-- Educational Content CMS Setup Migration
-- Phase 1: Infrastructure Setup
-- Date: November 23, 2025

-- ============================================================================
-- PART 1: STORAGE BUCKET SETUP
-- ============================================================================

-- Create storage bucket for educational content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hazard-educational-content',
  'hazard-educational-content', 
  true,  -- Public read access for educational content
  10485760,  -- 10MB file size limit
  ARRAY[
    'text/markdown',
    'text/plain',
    'image/jpeg', 
    'image/png', 
    'image/webp',
    'application/pdf'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for hazard-educational-content bucket

-- Policy: Public can read all educational content
CREATE POLICY "Public can read educational content"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hazard-educational-content');

-- Policy: Content editors, admins, and moderators can upload content
CREATE POLICY "Content editors can upload educational content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hazard-educational-content' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'content_editor', 'moderator')
  )
);

-- Policy: Content editors can update educational content
CREATE POLICY "Content editors can update educational content"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hazard-educational-content' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'content_editor', 'moderator')
  )
);

-- Policy: Content editors can delete educational content
CREATE POLICY "Content editors can delete educational content"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hazard-educational-content' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'content_editor', 'moderator')
  )
);

-- ============================================================================
-- PART 2: DATABASE SCHEMA UPDATES
-- ============================================================================

-- Update hazard_templates table to support educational content
-- Add new columns for storage path and publishing metadata

ALTER TABLE public.hazard_templates 
ADD COLUMN IF NOT EXISTS storage_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS has_educational_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id);

-- Create unique constraint on storage_path
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_storage_path'
  ) THEN
    ALTER TABLE public.hazard_templates 
    ADD CONSTRAINT unique_storage_path UNIQUE(storage_path);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_storage_path ON public.hazard_templates(storage_path);
CREATE INDEX IF NOT EXISTS idx_templates_status ON public.hazard_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_needs_content 
  ON public.hazard_templates(needs_cms_content) 
  WHERE needs_cms_content = true;
CREATE INDEX IF NOT EXISTS idx_templates_has_content 
  ON public.hazard_templates(has_educational_content) 
  WHERE has_educational_content = true;

-- ============================================================================
-- PART 3: CMS CONTENT DRAFTS TABLE
-- ============================================================================

-- Table for AI-generated content drafts awaiting human review
CREATE TABLE IF NOT EXISTS public.cms_content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.hazard_templates(id) ON DELETE CASCADE,
  
  -- Draft Content (before publishing to Storage)
  -- Structure: { "overview.md": "content...", "identification.md": "content...", ... }
  draft_files JSONB NOT NULL,
  
  -- AI Generation Metadata
  generation_method VARCHAR(50), -- 'ai_agent', 'user_submitted', 'scraped'
  ai_model VARCHAR(100), -- 'gpt-4', 'claude-3', etc.
  generation_prompt TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Review Workflow
  -- Statuses: pending_review, in_review, approved, rejected, published
  status VARCHAR(20) DEFAULT 'pending_review' 
    CHECK (status IN ('pending_review', 'in_review', 'approved', 'rejected', 'published')),
  
  assigned_reviewer UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Publishing
  published_to_storage BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_by VARCHAR(100) NOT NULL, -- 'ai_agent' or user_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on cms_content_drafts
ALTER TABLE public.cms_content_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Content editors and admins can view all drafts
CREATE POLICY "Content editors can view drafts"
ON public.cms_content_drafts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'content_editor', 'moderator')
  )
);

-- Policy: Content editors can create drafts
CREATE POLICY "Content editors can create drafts"
ON public.cms_content_drafts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'content_editor', 'moderator')
  )
);

-- Policy: Content editors can update drafts
CREATE POLICY "Content editors can update drafts"
ON public.cms_content_drafts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'content_editor', 'moderator')
  )
);

-- Policy: Admins can delete drafts
CREATE POLICY "Admins can delete drafts"
ON public.cms_content_drafts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Create indexes for cms_content_drafts
CREATE INDEX IF NOT EXISTS idx_drafts_status ON public.cms_content_drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_template ON public.cms_content_drafts(template_id);
CREATE INDEX IF NOT EXISTS idx_drafts_needs_review 
  ON public.cms_content_drafts(assigned_reviewer) 
  WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON public.cms_content_drafts(created_at DESC);

-- ============================================================================
-- PART 4: CONTENT EDIT HISTORY TABLE
-- ============================================================================

-- Track changes to educational content for audit purposes
CREATE TABLE IF NOT EXISTS public.content_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.hazard_templates(id) ON DELETE CASCADE,
  
  -- Change Details
  file_path VARCHAR(500) NOT NULL, -- Path within storage bucket
  change_type VARCHAR(20) NOT NULL 
    CHECK (change_type IN ('created', 'updated', 'deleted')),
  
  -- Version Control
  previous_content TEXT,
  new_content TEXT,
  
  -- Editor Info
  edited_by UUID REFERENCES auth.users(id),
  editor_role VARCHAR(50), -- 'admin', 'content_editor', 'trusted_user', 'ai_agent'
  edit_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on content_edit_history
ALTER TABLE public.content_edit_history ENABLE ROW LEVEL SECURITY;

-- Policy: Content editors and admins can view edit history
CREATE POLICY "Content editors can view edit history"
ON public.content_edit_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'content_editor', 'moderator')
  )
);

-- Policy: System can insert edit history (via triggers or services)
CREATE POLICY "System can insert edit history"
ON public.content_edit_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for content_edit_history
CREATE INDEX IF NOT EXISTS idx_edit_history_template ON public.content_edit_history(template_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_created ON public.content_edit_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edit_history_editor ON public.content_edit_history(edited_by);

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp on cms_content_drafts
CREATE OR REPLACE FUNCTION update_cms_draft_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS trigger_update_cms_draft_timestamp ON public.cms_content_drafts;
CREATE TRIGGER trigger_update_cms_draft_timestamp
  BEFORE UPDATE ON public.cms_content_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_draft_timestamp();

-- ============================================================================
-- PART 6: SAMPLE DATA FOR BOSTON AREA (Development Only)
-- ============================================================================

-- Note: This sample data setup will be done via application code
-- after the CMS is deployed, not in this migration.
-- The folder structure will be created through Supawald CMS interface.

COMMENT ON TABLE public.cms_content_drafts IS 
  'Stores AI-generated educational content drafts awaiting human review before publishing to storage';

COMMENT ON TABLE public.content_edit_history IS 
  'Audit log tracking all changes to educational content files in storage';

COMMENT ON COLUMN public.hazard_templates.storage_path IS 
  'Path within hazard-educational-content bucket (e.g., plants/poisonous/poison_ivy)';

COMMENT ON COLUMN public.hazard_templates.has_educational_content IS 
  'Indicates whether complete educational content exists in storage for this hazard';
