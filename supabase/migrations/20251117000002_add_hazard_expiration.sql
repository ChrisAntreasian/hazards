-- ============================================================================
-- HAZARD EXPIRATION SYSTEM
-- Migration: 20251117000002_add_hazard_expiration.sql
-- Description: Adds comprehensive expiration system with resolution tracking
-- ============================================================================

-- ============================================================================
-- ADD EXPIRATION COLUMNS TO HAZARDS TABLE
-- ============================================================================

ALTER TABLE public.hazards
-- Expiration type and timing
ADD COLUMN IF NOT EXISTS expiration_type TEXT 
  CHECK (expiration_type IN ('auto_expire', 'user_resolvable', 'permanent', 'seasonal'))
  DEFAULT 'user_resolvable',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS extended_count INTEGER DEFAULT 0,

-- Resolution tracking
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resolution_note TEXT,

-- Seasonal pattern (JSON: {active_months: [5,6,7,8,9]})
ADD COLUMN IF NOT EXISTS seasonal_pattern JSONB,

-- Notification tracking
ADD COLUMN IF NOT EXISTS expiration_notified_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN public.hazards.expiration_type IS 'Type of expiration: auto_expire, user_resolvable, permanent, or seasonal';
COMMENT ON COLUMN public.hazards.expires_at IS 'When this hazard will automatically expire (for auto_expire type)';
COMMENT ON COLUMN public.hazards.extended_count IS 'Number of times expiration has been extended (unlimited)';
COMMENT ON COLUMN public.hazards.resolved_at IS 'When this hazard was marked as resolved';
COMMENT ON COLUMN public.hazards.resolved_by IS 'User who created the resolution report';
COMMENT ON COLUMN public.hazards.resolution_note IS 'Note explaining how hazard was resolved';
COMMENT ON COLUMN public.hazards.seasonal_pattern IS 'JSON defining active months for seasonal hazards: {active_months: [5,6,7,8,9]}';

-- ============================================================================
-- CREATE RESOLUTION REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hazard_resolution_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  resolution_note TEXT NOT NULL,
  evidence_url TEXT, -- Optional photo of resolved hazard
  trust_score_at_report INTEGER, -- Reporter's trust score when reported
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(hazard_id) -- Only ONE resolution report per hazard
);

COMMENT ON TABLE public.hazard_resolution_reports IS 'Detailed resolution reports for hazards (one per hazard)';
COMMENT ON COLUMN public.hazard_resolution_reports.evidence_url IS 'URL to photo evidence of resolution';
COMMENT ON COLUMN public.hazard_resolution_reports.trust_score_at_report IS 'Reporter trust score for audit purposes';

-- ============================================================================
-- CREATE RESOLUTION CONFIRMATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hazard_resolution_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  confirmation_type TEXT NOT NULL CHECK (confirmation_type IN ('confirmed', 'disputed')),
  note TEXT, -- Optional note explaining why
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(hazard_id, user_id) -- One confirmation per user per hazard
);

COMMENT ON TABLE public.hazard_resolution_confirmations IS 'User confirmations/disputes of resolution reports';
COMMENT ON COLUMN public.hazard_resolution_confirmations.confirmation_type IS 'confirmed = agrees hazard is resolved, disputed = says hazard still exists';

-- ============================================================================
-- CREATE EXPIRATION SETTINGS TABLE (ADMIN CONFIGURABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expiration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.hazard_categories(id) ON DELETE CASCADE,
  category_path TEXT NOT NULL UNIQUE, -- e.g., "weather/thunderstorm"
  default_expiration_type TEXT NOT NULL CHECK (default_expiration_type IN ('auto_expire', 'user_resolvable', 'permanent', 'seasonal')),
  auto_expire_duration INTERVAL, -- e.g., '6 hours', '2 days'
  seasonal_pattern JSONB, -- {active_months: [5,6,7,8,9]}
  confirmation_threshold INTEGER DEFAULT 3, -- Confirmations needed to auto-resolve
  allow_user_override BOOLEAN DEFAULT true, -- Can user choose different type?
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.expiration_settings IS 'Admin-configurable default expiration settings per category';
COMMENT ON COLUMN public.expiration_settings.confirmation_threshold IS 'Number of confirmations needed to auto-resolve hazard';
COMMENT ON COLUMN public.expiration_settings.allow_user_override IS 'Whether users can override default expiration type';

-- ============================================================================
-- CREATE EXPIRATION AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expiration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'auto_expired', 'manually_resolved', 'extended', 'restored', 'seasonal_activated', etc.
  performed_by UUID REFERENCES auth.users(id), -- NULL for system actions
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.expiration_audit_log IS 'Audit trail of all expiration-related actions';

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hazards_expiration_type ON public.hazards(expiration_type);
CREATE INDEX IF NOT EXISTS idx_hazards_expires_at ON public.hazards(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hazards_resolved_at ON public.hazards(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hazards_expiration_status ON public.hazards(expiration_type, expires_at, resolved_at);

CREATE INDEX IF NOT EXISTS idx_resolution_reports_hazard ON public.hazard_resolution_reports(hazard_id);
CREATE INDEX IF NOT EXISTS idx_resolution_reports_user ON public.hazard_resolution_reports(reported_by);

CREATE INDEX IF NOT EXISTS idx_resolution_confirmations_hazard ON public.hazard_resolution_confirmations(hazard_id);
CREATE INDEX IF NOT EXISTS idx_resolution_confirmations_user ON public.hazard_resolution_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_resolution_confirmations_type ON public.hazard_resolution_confirmations(hazard_id, confirmation_type);

CREATE INDEX IF NOT EXISTS idx_expiration_settings_category ON public.expiration_settings(category_id);
CREATE INDEX IF NOT EXISTS idx_expiration_audit_hazard ON public.expiration_audit_log(hazard_id, created_at DESC);

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get expiration status
CREATE OR REPLACE FUNCTION get_hazard_expiration_status(p_hazard_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_hazard RECORD;
  v_current_month INTEGER;
  v_confirmation_count INTEGER;
  v_dispute_count INTEGER;
BEGIN
  SELECT * INTO v_hazard FROM public.hazards WHERE id = p_hazard_id;
  
  -- Check if manually resolved
  IF v_hazard.resolved_at IS NOT NULL THEN
    RETURN 'resolved';
  END IF;
  
  -- Check expiration type
  CASE v_hazard.expiration_type
    WHEN 'permanent' THEN
      RETURN 'active';
      
    WHEN 'auto_expire' THEN
      IF v_hazard.expires_at IS NULL THEN
        RETURN 'active';
      ELSIF v_hazard.expires_at <= NOW() THEN
        RETURN 'expired';
      ELSIF v_hazard.expires_at <= NOW() + INTERVAL '24 hours' THEN
        RETURN 'expiring_soon';
      ELSE
        RETURN 'active';
      END IF;
      
    WHEN 'seasonal' THEN
      IF v_hazard.seasonal_pattern IS NULL THEN
        RETURN 'active';
      END IF;
      
      v_current_month := EXTRACT(MONTH FROM NOW());
      
      IF v_current_month = ANY(
        ARRAY(SELECT jsonb_array_elements_text(v_hazard.seasonal_pattern->'active_months')::INTEGER)
      ) THEN
        RETURN 'active';
      ELSE
        RETURN 'dormant';
      END IF;
      
    WHEN 'user_resolvable' THEN
      -- Check if there's a resolution report with confirmations
      IF EXISTS(SELECT 1 FROM public.hazard_resolution_reports WHERE hazard_id = p_hazard_id) THEN
        -- Count confirmations vs disputes
        SELECT 
          COUNT(*) FILTER (WHERE confirmation_type = 'confirmed'),
          COUNT(*) FILTER (WHERE confirmation_type = 'disputed')
        INTO v_confirmation_count, v_dispute_count
        FROM public.hazard_resolution_confirmations
        WHERE hazard_id = p_hazard_id;
        
        -- If confirmations exceed disputes significantly, consider pending resolution
        IF v_confirmation_count >= 3 AND v_confirmation_count > v_dispute_count THEN
          RETURN 'pending_resolution';
        ELSE
          RETURN 'active';
        END IF;
      ELSE
        RETURN 'active';
      END IF;
      
    ELSE
      RETURN 'active';
  END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_hazard_expiration_status(UUID) IS 'Returns current expiration status of a hazard';

-- Function to calculate time remaining
CREATE OR REPLACE FUNCTION get_expiration_time_remaining(p_hazard_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT expires_at INTO v_expires_at
  FROM public.hazards
  WHERE id = p_hazard_id AND expiration_type = 'auto_expire';
  
  IF v_expires_at IS NULL OR v_expires_at <= NOW() THEN
    RETURN INTERVAL '0';
  END IF;
  
  RETURN v_expires_at - NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on resolution confirmations
CREATE OR REPLACE FUNCTION update_resolution_confirmation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_resolution_confirmation_updated_at ON public.hazard_resolution_confirmations;
CREATE TRIGGER trigger_resolution_confirmation_updated_at
  BEFORE UPDATE ON public.hazard_resolution_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_resolution_confirmation_updated_at();

-- Trigger to auto-resolve hazard when confirmation threshold met
CREATE OR REPLACE FUNCTION check_resolution_threshold()
RETURNS TRIGGER AS $$
DECLARE
  v_threshold INTEGER;
  v_confirmation_count INTEGER;
  v_dispute_count INTEGER;
  v_report RECORD;
BEGIN
  -- Get threshold for this hazard's category
  SELECT es.confirmation_threshold INTO v_threshold
  FROM public.hazards h
  LEFT JOIN public.expiration_settings es ON es.category_id = h.category_id
  WHERE h.id = NEW.hazard_id
  LIMIT 1;
  
  -- Default to 3 if not configured
  v_threshold := COALESCE(v_threshold, 3);
  
  -- Count confirmations and disputes
  SELECT 
    COUNT(*) FILTER (WHERE confirmation_type = 'confirmed'),
    COUNT(*) FILTER (WHERE confirmation_type = 'disputed')
  INTO v_confirmation_count, v_dispute_count
  FROM public.hazard_resolution_confirmations
  WHERE hazard_id = NEW.hazard_id;
  
  -- Auto-resolve if threshold met and confirmations > disputes
  IF v_confirmation_count >= v_threshold AND v_confirmation_count > v_dispute_count THEN
    -- Get the resolution report
    SELECT * INTO v_report FROM public.hazard_resolution_reports WHERE hazard_id = NEW.hazard_id;
    
    -- Mark hazard as resolved
    UPDATE public.hazards
    SET 
      resolved_at = NOW(),
      resolved_by = v_report.reported_by,
      resolution_note = v_report.resolution_note,
      updated_at = NOW()
    WHERE id = NEW.hazard_id AND resolved_at IS NULL;
    
    -- Log the action
    IF FOUND THEN
      INSERT INTO public.expiration_audit_log (hazard_id, action, reason)
      VALUES (
        NEW.hazard_id,
        'auto_resolved',
        format('Auto-resolved after %s confirmations (threshold: %s)', v_confirmation_count, v_threshold)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_resolution_threshold ON public.hazard_resolution_confirmations;
CREATE TRIGGER trigger_check_resolution_threshold
  AFTER INSERT OR UPDATE ON public.hazard_resolution_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION check_resolution_threshold();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.hazard_resolution_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hazard_resolution_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiration_audit_log ENABLE ROW LEVEL SECURITY;

-- Resolution Reports Policies
DROP POLICY IF EXISTS "Anyone can view resolution reports" ON public.hazard_resolution_reports;
CREATE POLICY "Anyone can view resolution reports"
  ON public.hazard_resolution_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create resolution reports" ON public.hazard_resolution_reports;
CREATE POLICY "Authenticated users can create resolution reports"
  ON public.hazard_resolution_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Users can update own reports" ON public.hazard_resolution_reports;
CREATE POLICY "Users can update own reports"
  ON public.hazard_resolution_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = reported_by);

-- Resolution Confirmations Policies
DROP POLICY IF EXISTS "Anyone can view confirmations" ON public.hazard_resolution_confirmations;
CREATE POLICY "Anyone can view confirmations"
  ON public.hazard_resolution_confirmations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create confirmations" ON public.hazard_resolution_confirmations;
CREATE POLICY "Authenticated users can create confirmations"
  ON public.hazard_resolution_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own confirmations" ON public.hazard_resolution_confirmations;
CREATE POLICY "Users can update own confirmations"
  ON public.hazard_resolution_confirmations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own confirmations" ON public.hazard_resolution_confirmations;
CREATE POLICY "Users can delete own confirmations"
  ON public.hazard_resolution_confirmations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Expiration Settings Policies
DROP POLICY IF EXISTS "Anyone can view expiration settings" ON public.expiration_settings;
CREATE POLICY "Anyone can view expiration settings"
  ON public.expiration_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage expiration settings" ON public.expiration_settings;
CREATE POLICY "Admins can manage expiration settings"
  ON public.expiration_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Audit Log Policies
DROP POLICY IF EXISTS "Anyone can view audit log" ON public.expiration_audit_log;
CREATE POLICY "Anyone can view audit log"
  ON public.expiration_audit_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert audit log" ON public.expiration_audit_log;
CREATE POLICY "System can insert audit log"
  ON public.expiration_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- INITIALIZE DEFAULT SETTINGS
-- ============================================================================

-- Insert default expiration settings for common categories
-- These can be updated by admins later

INSERT INTO public.expiration_settings (category_path, default_expiration_type, auto_expire_duration, confirmation_threshold)
VALUES 
  ('weather/thunderstorm', 'auto_expire', INTERVAL '6 hours', 3),
  ('weather/ice', 'auto_expire', INTERVAL '24 hours', 3),
  ('weather/snow', 'auto_expire', INTERVAL '48 hours', 3),
  ('weather/flood', 'auto_expire', INTERVAL '72 hours', 3),
  ('infrastructure/road_closure', 'user_resolvable', NULL, 3),
  ('infrastructure/power_line', 'auto_expire', INTERVAL '12 hours', 3),
  ('accident/vehicle', 'user_resolvable', NULL, 2),
  ('terrain/fallen_tree', 'user_resolvable', NULL, 3),
  ('plants/poison_ivy', 'permanent', NULL, 3),
  ('terrain/cliff', 'permanent', NULL, 3),
  ('wildlife/bees', 'seasonal', NULL, 3),
  ('default', 'user_resolvable', INTERVAL '7 days', 3)
ON CONFLICT (category_path) DO NOTHING;

-- Set seasonal patterns for wildlife/bees (May-September)
UPDATE public.expiration_settings
SET seasonal_pattern = '{"active_months": [5, 6, 7, 8, 9]}'::jsonb
WHERE category_path = 'wildlife/bees';

-- ============================================================================
-- BACKFILL EXISTING HAZARDS
-- ============================================================================

-- Set default expiration type for existing hazards
UPDATE public.hazards
SET expiration_type = 'user_resolvable'
WHERE expiration_type IS NULL;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.hazard_resolution_reports TO authenticated, anon;
GRANT INSERT ON public.hazard_resolution_reports TO authenticated;

GRANT SELECT ON public.hazard_resolution_confirmations TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.hazard_resolution_confirmations TO authenticated;

GRANT SELECT ON public.expiration_settings TO authenticated, anon;

GRANT SELECT ON public.expiration_audit_log TO authenticated, anon;
GRANT INSERT ON public.expiration_audit_log TO authenticated;
