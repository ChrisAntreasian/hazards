-- ============================================================================
-- CATEGORY MANAGEMENT MIGRATION
-- Adds support for:
-- 1. "Other" catch-all category for novel hazards
-- 2. Status tracking on hazard_categories
-- 3. Category suggestions from users
-- 4. Suggested category field on hazards for pending approval
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE CATEGORY STATUS ENUM
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_status') THEN
    CREATE TYPE category_status AS ENUM ('active', 'provisional', 'pending', 'rejected', 'archived');
  END IF;
END $$;

-- ============================================================================
-- PART 2: ADD STATUS COLUMN TO HAZARD_CATEGORIES
-- ============================================================================

ALTER TABLE public.hazard_categories 
ADD COLUMN IF NOT EXISTS status category_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS suggested_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_categories_status ON public.hazard_categories(status);

-- ============================================================================
-- PART 3: ADD "OTHER" CATCH-ALL CATEGORY
-- ============================================================================

-- Insert "Other" as a root category if it doesn't exist
INSERT INTO public.hazard_categories (name, parent_id, level, path, icon, status, description)
SELECT 'Other', NULL, 0, 'other', '❓', 'active', 'Catch-all category for hazards that don''t fit existing categories'
WHERE NOT EXISTS (
  SELECT 1 FROM public.hazard_categories WHERE path = 'other'
);

-- Add subcategory for "Uncategorized" under Other
WITH other_category AS (
  SELECT id FROM public.hazard_categories WHERE path = 'other'
)
INSERT INTO public.hazard_categories (name, parent_id, level, path, icon, status, description)
SELECT 'Uncategorized', oc.id, 1, 'other/uncategorized', '❔', 'active', 'Temporary category for hazards awaiting proper classification'
FROM other_category oc
WHERE NOT EXISTS (
  SELECT 1 FROM public.hazard_categories WHERE path = 'other/uncategorized'
);

-- ============================================================================
-- PART 4: ADD SUGGESTED_CATEGORY FIELD TO HAZARDS
-- ============================================================================

-- This allows users to suggest a category name when reporting a hazard
-- that doesn't match existing categories
ALTER TABLE public.hazards
ADD COLUMN IF NOT EXISTS suggested_category JSONB;
-- Structure: { "name": "New Category Name", "parent_path": "animals", "reason": "explanation" }

COMMENT ON COLUMN public.hazards.suggested_category IS 
  'User-suggested category when existing categories don''t fit. Structure: { name, parent_path, reason }';

-- ============================================================================
-- PART 5: CATEGORY SUGGESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.category_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Suggestion details
  suggested_name VARCHAR(100) NOT NULL,
  suggested_path VARCHAR(500), -- e.g., "animals/marine" 
  suggested_parent_id UUID REFERENCES public.hazard_categories(id),
  suggested_icon VARCHAR(50),
  description TEXT, -- Description/reason for the new category
  
  -- Examples that would use this category
  example_hazard_ids UUID[] DEFAULT '{}', -- Hazards that would benefit from this category
  
  -- Submitter info
  suggested_by UUID NOT NULL REFERENCES auth.users(id),
  user_trust_score INTEGER DEFAULT 0, -- Snapshot of user's trust score at time of suggestion
  
  -- Review workflow
  status category_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- If approved, reference to the created category
  approved_category_id UUID REFERENCES public.hazard_categories(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_category_suggestions_status ON public.category_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_category_suggestions_user ON public.category_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_category_suggestions_created ON public.category_suggestions(created_at DESC);

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY FOR CATEGORY_SUGGESTIONS
-- ============================================================================

ALTER TABLE public.category_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved suggestions
CREATE POLICY "Public read approved suggestions" ON public.category_suggestions
  FOR SELECT
  USING (status = 'active');

-- Authenticated users can read all suggestions
CREATE POLICY "Authenticated read all suggestions" ON public.category_suggestions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can create suggestions
CREATE POLICY "Users can create suggestions" ON public.category_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = suggested_by);

-- Users can update their own pending suggestions
CREATE POLICY "Users can update own pending suggestions" ON public.category_suggestions
  FOR UPDATE
  USING (auth.uid() = suggested_by AND status = 'pending')
  WITH CHECK (auth.uid() = suggested_by AND status = 'pending');

-- Admins and moderators can update any suggestion (for review)
CREATE POLICY "Admins can update suggestions" ON public.category_suggestions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- PART 7: FUNCTION TO CREATE PROVISIONAL CATEGORY
-- ============================================================================

-- Function for trusted users to create provisional categories
CREATE OR REPLACE FUNCTION public.create_provisional_category(
  p_name VARCHAR(100),
  p_parent_path VARCHAR(500),
  p_icon VARCHAR(50) DEFAULT '📌',
  p_description TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_trust_score INTEGER;
  v_parent_id UUID;
  v_new_path VARCHAR(500);
  v_new_level INTEGER;
  v_new_category_id UUID;
  v_suggestion_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create categories';
  END IF;
  
  -- Check user's trust score
  SELECT trust_score INTO v_user_trust_score
  FROM public.users
  WHERE id = v_user_id;
  
  -- Require minimum trust score of 500 for provisional category creation
  IF v_user_trust_score < 500 THEN
    RAISE EXCEPTION 'Insufficient trust score (%) to create provisional categories. Required: 500', v_user_trust_score;
  END IF;
  
  -- Get parent category
  IF p_parent_path IS NOT NULL AND p_parent_path != '' THEN
    SELECT id, level INTO v_parent_id, v_new_level
    FROM public.hazard_categories
    WHERE path = p_parent_path AND status IN ('active', 'provisional');
    
    IF v_parent_id IS NULL THEN
      RAISE EXCEPTION 'Parent category not found: %', p_parent_path;
    END IF;
    
    v_new_level := v_new_level + 1;
    v_new_path := p_parent_path || '/' || LOWER(REPLACE(p_name, ' ', '_'));
  ELSE
    -- Root level category
    v_new_level := 0;
    v_new_path := LOWER(REPLACE(p_name, ' ', '_'));
  END IF;
  
  -- Check if category with this path already exists
  IF EXISTS (SELECT 1 FROM public.hazard_categories WHERE path = v_new_path) THEN
    RAISE EXCEPTION 'Category with path % already exists', v_new_path;
  END IF;
  
  -- Create the provisional category
  INSERT INTO public.hazard_categories (
    name, parent_id, level, path, icon, status, description, suggested_by
  ) VALUES (
    p_name, v_parent_id, v_new_level, v_new_path, p_icon, 'provisional', p_description, v_user_id
  )
  RETURNING id INTO v_new_category_id;
  
  -- Also create a category suggestion record for admin review
  INSERT INTO public.category_suggestions (
    suggested_name, suggested_path, suggested_parent_id, suggested_icon,
    description, suggested_by, user_trust_score, status, approved_category_id
  ) VALUES (
    p_name, v_new_path, v_parent_id, p_icon,
    COALESCE(p_description, 'Created as provisional category by trusted user'),
    v_user_id, v_user_trust_score, 'provisional', v_new_category_id
  )
  RETURNING id INTO v_suggestion_id;
  
  RETURN v_new_category_id;
END;
$$;

-- ============================================================================
-- PART 8: FUNCTION TO APPROVE/REJECT CATEGORY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.review_category(
  p_category_id UUID,
  p_action VARCHAR(20), -- 'approve' or 'reject'
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_role VARCHAR(50);
  v_new_status category_status;
BEGIN
  -- Get current user and role
  v_user_id := auth.uid();
  
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = v_user_id;
  
  -- Only admins and moderators can review categories
  IF v_user_role NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Only admins and moderators can review categories';
  END IF;
  
  -- Determine new status
  IF p_action = 'approve' THEN
    v_new_status := 'active';
  ELSIF p_action = 'reject' THEN
    v_new_status := 'rejected';
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be approve or reject', p_action;
  END IF;
  
  -- Update the category
  UPDATE public.hazard_categories
  SET 
    status = v_new_status,
    approved_by = v_user_id,
    approved_at = NOW()
  WHERE id = p_category_id
  AND status IN ('pending', 'provisional');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found or not in reviewable state';
  END IF;
  
  -- Update any related suggestion record
  UPDATE public.category_suggestions
  SET 
    status = v_new_status,
    reviewed_by = v_user_id,
    reviewed_at = NOW(),
    review_notes = p_notes,
    updated_at = NOW()
  WHERE created_category_id = p_category_id;
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- PART 9: UPDATE TIMESTAMPS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_category_suggestions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_category_suggestions_timestamp ON public.category_suggestions;
CREATE TRIGGER update_category_suggestions_timestamp
  BEFORE UPDATE ON public.category_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_category_suggestions_timestamp();

-- ============================================================================
-- PART 10: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.category_suggestions IS 
  'User suggestions for new hazard categories. Reviewed by admins/moderators.';

COMMENT ON COLUMN public.hazard_categories.status IS 
  'Category status: active (normal use), provisional (created by trusted user, awaiting approval), pending (suggested, not yet approved), rejected, archived';

COMMENT ON FUNCTION public.create_provisional_category IS 
  'Allows users with trust_score >= 500 to create provisional categories that work immediately but require admin approval';

COMMENT ON FUNCTION public.review_category IS 
  'Admin/moderator function to approve or reject pending/provisional categories';
