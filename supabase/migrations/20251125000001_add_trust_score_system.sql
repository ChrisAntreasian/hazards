-- Trust Score System Implementation
-- Phase 1: Event Sourcing Architecture
-- Created: November 25, 2025

-- =====================================================
-- PART 1: TRUST SCORE EVENTS TABLE (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trust_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  points_change INTEGER NOT NULL,
  previous_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  related_content_id UUID,
  related_content_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_trust_score_events_user_id ON public.trust_score_events(user_id);
CREATE INDEX idx_trust_score_events_created_at ON public.trust_score_events(created_at DESC);
CREATE INDEX idx_trust_score_events_event_type ON public.trust_score_events(event_type);
CREATE INDEX idx_trust_score_events_user_created ON public.trust_score_events(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.trust_score_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own trust score events"
  ON public.trust_score_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trust score events"
  ON public.trust_score_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Only system can insert trust score events"
  ON public.trust_score_events
  FOR INSERT
  WITH CHECK (false); -- Only triggers can insert

COMMENT ON TABLE public.trust_score_events IS 'Audit trail of all trust score changes for transparency and accountability';

-- =====================================================
-- PART 2: TRUST SCORE CONFIG TABLE (Configurable Points)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trust_score_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key VARCHAR(50) NOT NULL UNIQUE,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX idx_trust_score_config_active ON public.trust_score_config(is_active);

-- Enable RLS
ALTER TABLE public.trust_score_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active trust score config"
  ON public.trust_score_config
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage trust score config"
  ON public.trust_score_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.trust_score_config IS 'Configurable point values for trust score actions';

-- =====================================================
-- PART 3: INSERT DEFAULT CONFIG VALUES
-- =====================================================

INSERT INTO public.trust_score_config (action_key, points, description) VALUES
  -- Positive Actions
  ('hazard_approved', 10, 'Hazard approved by moderator after review'),
  ('resolution_participation', 5, 'Resolution confirmed by community (3+ confirmations)'),
  ('moderator_action', 3, 'Moderator approves/rejects content (per action)'),
  ('hazard_upvoted', 2, 'Your hazard received an upvote from another user'),
  ('vote_cast', 2, 'You cast a vote on a hazard (up or down)'),
  ('flag_accepted', 2, 'Your content flag was accepted by a moderator'),
  
  -- Negative Actions
  ('spam_report', -50, 'Content confirmed as spam by moderator'),
  ('content_flagged_rejected', -20, 'Content was flagged AND rejected by moderator'),
  ('hazard_rejected', -10, 'Hazard rejected by moderator after review'),
  ('hazard_downvoted', -2, 'Your hazard received a downvote from another user'),
  ('flag_rejected', -2, 'Your content flag was dismissed by moderator')
ON CONFLICT (action_key) DO NOTHING;

-- =====================================================
-- PART 4: TRUST SCORE UPDATE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_trust_score(
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_related_content_id UUID DEFAULT NULL,
  p_related_content_type VARCHAR(50) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points INTEGER;
  v_previous_score INTEGER;
  v_new_score INTEGER;
BEGIN
  -- Get points from config
  SELECT points INTO v_points
  FROM public.trust_score_config
  WHERE action_key = p_event_type AND is_active = true;
  
  -- If config not found, exit silently
  IF v_points IS NULL THEN
    RAISE WARNING 'Trust score config not found for event type: %', p_event_type;
    RETURN;
  END IF;
  
  -- Get current score
  SELECT COALESCE(trust_score, 0) INTO v_previous_score
  FROM public.users
  WHERE id = p_user_id;
  
  -- If user not found, exit silently
  IF v_previous_score IS NULL THEN
    RAISE WARNING 'User not found: %', p_user_id;
    RETURN;
  END IF;
  
  -- Calculate new score (floor at 0)
  v_new_score := GREATEST(0, v_previous_score + v_points);
  
  -- Update user's trust score
  UPDATE public.users
  SET 
    trust_score = v_new_score,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Insert event record (audit trail)
  INSERT INTO public.trust_score_events (
    user_id,
    event_type,
    points_change,
    previous_score,
    new_score,
    related_content_id,
    related_content_type,
    notes
  ) VALUES (
    p_user_id,
    p_event_type,
    v_points,
    v_previous_score,
    v_new_score,
    p_related_content_id,
    p_related_content_type,
    p_notes
  );
  
  RAISE NOTICE 'Trust score updated for user % from % to % (% points)', 
    p_user_id, v_previous_score, v_new_score, v_points;
END;
$$;

COMMENT ON FUNCTION public.update_trust_score IS 'Updates user trust score and creates audit trail event';

-- =====================================================
-- PART 5: TRIGGERS FOR AUTOMATIC SCORE UPDATES
-- =====================================================

-- ---------------
-- Trigger 1: Hazard Resolution Confirmations
-- ---------------
CREATE OR REPLACE FUNCTION public.trust_score_on_resolution_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_confirmation_count INTEGER;
  v_hazard_owner_id UUID;
BEGIN
  -- Only process confirmations (not disputes)
  IF NEW.is_confirmed = false THEN
    RETURN NEW;
  END IF;
  
  -- Count total confirmations for this hazard
  SELECT COUNT(*) INTO v_confirmation_count
  FROM public.hazard_resolution_confirmations
  WHERE hazard_id = NEW.hazard_id AND is_confirmed = true;
  
  -- If we just hit the threshold (3 confirmations), award points
  IF v_confirmation_count = 3 THEN
    -- Get hazard owner
    SELECT user_id INTO v_hazard_owner_id
    FROM public.hazards
    WHERE id = NEW.hazard_id;
    
    -- Award points to hazard owner
    IF v_hazard_owner_id IS NOT NULL THEN
      PERFORM public.update_trust_score(
        v_hazard_owner_id,
        'resolution_participation',
        NEW.hazard_id,
        'hazard',
        'Resolution confirmed by community consensus'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_trust_score_resolution_confirmation
  AFTER INSERT ON public.hazard_resolution_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.trust_score_on_resolution_confirmation();

COMMENT ON TRIGGER trigger_trust_score_resolution_confirmation 
  ON public.hazard_resolution_confirmations IS 
  'Awards trust score points when hazard resolution is confirmed by community';

-- ---------------
-- Trigger 2: Hazard Voting (Voter)
-- ---------------
CREATE OR REPLACE FUNCTION public.trust_score_on_vote_cast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Award points to the voter for participating
  PERFORM public.update_trust_score(
    NEW.user_id,
    'vote_cast',
    NEW.hazard_id,
    'vote',
    format('Cast %s vote on hazard', NEW.vote_type)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_trust_score_vote_cast
  AFTER INSERT ON public.hazard_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.trust_score_on_vote_cast();

COMMENT ON TRIGGER trigger_trust_score_vote_cast ON public.hazard_votes IS 
  'Awards trust score points to users who vote on hazards';

-- ---------------
-- Trigger 3: Hazard Voting (Hazard Owner)
-- ---------------
CREATE OR REPLACE FUNCTION public.trust_score_on_vote_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hazard_owner_id UUID;
  v_event_type VARCHAR(50);
BEGIN
  -- Get hazard owner
  SELECT user_id INTO v_hazard_owner_id
  FROM public.hazards
  WHERE id = NEW.hazard_id;
  
  -- Don't award points if user votes on their own hazard (shouldn't happen but defensive)
  IF v_hazard_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Determine event type based on vote
  IF NEW.vote_type = 'up' THEN
    v_event_type := 'hazard_upvoted';
  ELSE
    v_event_type := 'hazard_downvoted';
  END IF;
  
  -- Award/deduct points to/from hazard owner
  IF v_hazard_owner_id IS NOT NULL THEN
    PERFORM public.update_trust_score(
      v_hazard_owner_id,
      v_event_type,
      NEW.hazard_id,
      'hazard',
      format('Hazard received %s vote', NEW.vote_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_trust_score_vote_received
  AFTER INSERT ON public.hazard_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.trust_score_on_vote_received();

COMMENT ON TRIGGER trigger_trust_score_vote_received ON public.hazard_votes IS 
  'Awards/deducts trust score points to hazard owners based on votes received';

-- Note: Moderation triggers will be added via application code integration
-- since the moderation queue logic is in src/lib/utils/moderation.ts

-- =====================================================
-- PART 6: HELPER FUNCTIONS FOR QUERIES
-- =====================================================

-- Function to get user's trust score tier
CREATE OR REPLACE FUNCTION public.get_trust_score_tier(p_score INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_score >= 2000 THEN
    RETURN 'Guardian';
  ELSIF p_score >= 1000 THEN
    RETURN 'Expert';
  ELSIF p_score >= 500 THEN
    RETURN 'Community Leader';
  ELSIF p_score >= 200 THEN
    RETURN 'Trusted';
  ELSIF p_score >= 50 THEN
    RETURN 'Contributor';
  ELSE
    RETURN 'New User';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_trust_score_tier IS 'Returns trust score tier name based on score';

-- Function to get user's trust score breakdown
CREATE OR REPLACE FUNCTION public.get_trust_score_breakdown(p_user_id UUID)
RETURNS TABLE(
  event_type VARCHAR(50),
  event_count BIGINT,
  total_points BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tse.event_type,
    COUNT(*)::BIGINT as event_count,
    SUM(tse.points_change)::BIGINT as total_points
  FROM public.trust_score_events tse
  WHERE tse.user_id = p_user_id
  GROUP BY tse.event_type
  ORDER BY total_points DESC;
END;
$$;

COMMENT ON FUNCTION public.get_trust_score_breakdown IS 'Returns breakdown of trust score by event type for a user';

-- =====================================================
-- PART 7: HAZARD FLAGS TABLE (User Flagging Feature)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hazard_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  additional_notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: One flag per user per hazard
  CONSTRAINT unique_user_hazard_flag UNIQUE(hazard_id, user_id),
  
  -- Constraint: Valid status values
  CONSTRAINT valid_flag_status CHECK (status IN ('pending', 'accepted', 'rejected')),
  
  -- Constraint: Valid reason values
  CONSTRAINT valid_flag_reason CHECK (reason IN (
    'spam', 'inappropriate', 'dangerous_advice', 'wrong_location', 
    'duplicate', 'offensive', 'misinformation', 'other'
  ))
);

-- Indexes
CREATE INDEX idx_hazard_flags_hazard_id ON public.hazard_flags(hazard_id);
CREATE INDEX idx_hazard_flags_user_id ON public.hazard_flags(user_id);
CREATE INDEX idx_hazard_flags_status ON public.hazard_flags(status);
CREATE INDEX idx_hazard_flags_created_at ON public.hazard_flags(created_at DESC);

-- Enable RLS
ALTER TABLE public.hazard_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own flags"
  ON public.hazard_flags
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flags"
  ON public.hazard_flags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Moderators can view all flags"
  ON public.hazard_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Moderators can update flags"
  ON public.hazard_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

COMMENT ON TABLE public.hazard_flags IS 'User-submitted flags for hazards that need moderator review';

-- ---------------
-- Trigger 4: Flag Review (Trust Score Update)
-- ---------------
CREATE OR REPLACE FUNCTION public.trust_score_on_flag_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type VARCHAR(50);
BEGIN
  -- Only process status changes to accepted/rejected
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Determine event type
  IF NEW.status = 'accepted' THEN
    v_event_type := 'flag_accepted';
  ELSIF NEW.status = 'rejected' THEN
    v_event_type := 'flag_rejected';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Update trust score for the flagger
  PERFORM public.update_trust_score(
    NEW.user_id,
    v_event_type,
    NEW.hazard_id,
    'flag',
    format('Flag %s by moderator', NEW.status)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_trust_score_flag_review
  AFTER UPDATE ON public.hazard_flags
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trust_score_on_flag_review();

COMMENT ON TRIGGER trigger_trust_score_flag_review ON public.hazard_flags IS 
  'Awards/deducts trust score points when flags are reviewed by moderators';

-- =====================================================
-- PART 8: GRANTS AND PERMISSIONS
-- =====================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_trust_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trust_score_tier TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trust_score_breakdown TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Uncomment to verify installation:

-- SELECT 'trust_score_events table created' as status, COUNT(*) as row_count 
-- FROM public.trust_score_events;

-- SELECT 'trust_score_config table created' as status, COUNT(*) as config_count 
-- FROM public.trust_score_config;

-- SELECT action_key, points, description 
-- FROM public.trust_score_config 
-- WHERE is_active = true 
-- ORDER BY points DESC;

-- SELECT 'hazard_flags table created' as status, COUNT(*) as flag_count 
-- FROM public.hazard_flags;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
