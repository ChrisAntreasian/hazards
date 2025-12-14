-- ============================================================================
-- HAZARD VOTING SYSTEM
-- Migration: 20251117000001_add_hazard_voting.sql
-- Description: Adds hazard voting functionality with upvote/downvote support
-- ============================================================================

-- ============================================================================
-- CREATE HAZARD VOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hazard_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_id UUID NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one vote per user per hazard
    CONSTRAINT unique_user_hazard_vote UNIQUE(hazard_id, user_id)
);

-- ============================================================================
-- ADD VOTE COUNTS TO HAZARDS TABLE
-- ============================================================================

ALTER TABLE public.hazards 
ADD COLUMN IF NOT EXISTS votes_up INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS votes_down INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vote_score INTEGER DEFAULT 0;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hazard_votes_hazard_id ON public.hazard_votes(hazard_id);
CREATE INDEX IF NOT EXISTS idx_hazard_votes_user_id ON public.hazard_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_hazard_votes_created_at ON public.hazard_votes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hazards_vote_score ON public.hazards(vote_score DESC);

-- ============================================================================
-- CREATE FUNCTION TO UPDATE VOTE COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_hazard_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate vote counts for the affected hazard
    UPDATE public.hazards
    SET 
        votes_up = (
            SELECT COUNT(*) 
            FROM public.hazard_votes 
            WHERE hazard_id = COALESCE(NEW.hazard_id, OLD.hazard_id) 
            AND vote_type = 'up'
        ),
        votes_down = (
            SELECT COUNT(*) 
            FROM public.hazard_votes 
            WHERE hazard_id = COALESCE(NEW.hazard_id, OLD.hazard_id) 
            AND vote_type = 'down'
        ),
        vote_score = (
            SELECT COUNT(*) FILTER (WHERE vote_type = 'up') - COUNT(*) FILTER (WHERE vote_type = 'down')
            FROM public.hazard_votes 
            WHERE hazard_id = COALESCE(NEW.hazard_id, OLD.hazard_id)
        )
    WHERE id = COALESCE(NEW.hazard_id, OLD.hazard_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Trigger to update vote counts when votes are inserted
DROP TRIGGER IF EXISTS trigger_update_vote_counts_insert ON public.hazard_votes;
CREATE TRIGGER trigger_update_vote_counts_insert
    AFTER INSERT ON public.hazard_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_hazard_vote_counts();

-- Trigger to update vote counts when votes are updated
DROP TRIGGER IF EXISTS trigger_update_vote_counts_update ON public.hazard_votes;
CREATE TRIGGER trigger_update_vote_counts_update
    AFTER UPDATE ON public.hazard_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_hazard_vote_counts();

-- Trigger to update vote counts when votes are deleted
DROP TRIGGER IF EXISTS trigger_update_vote_counts_delete ON public.hazard_votes;
CREATE TRIGGER trigger_update_vote_counts_delete
    AFTER DELETE ON public.hazard_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_hazard_vote_counts();

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hazard_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hazard_votes_updated_at ON public.hazard_votes;
CREATE TRIGGER trigger_hazard_votes_updated_at
    BEFORE UPDATE ON public.hazard_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_hazard_votes_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.hazard_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view votes
DROP POLICY IF EXISTS "Anyone can view hazard votes" ON public.hazard_votes;
CREATE POLICY "Anyone can view hazard votes"
    ON public.hazard_votes
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert their own votes
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.hazard_votes;
CREATE POLICY "Users can insert their own votes"
    ON public.hazard_votes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own votes
DROP POLICY IF EXISTS "Users can update their own votes" ON public.hazard_votes;
CREATE POLICY "Users can update their own votes"
    ON public.hazard_votes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own votes
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.hazard_votes;
CREATE POLICY "Users can delete their own votes"
    ON public.hazard_votes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Admins can manage all votes
DROP POLICY IF EXISTS "Admins can manage all votes" ON public.hazard_votes;
CREATE POLICY "Admins can manage all votes"
    ON public.hazard_votes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'moderator')
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's vote status for a hazard
CREATE OR REPLACE FUNCTION get_user_vote_status(p_hazard_id UUID, p_user_id UUID)
RETURNS TABLE (
    has_voted BOOLEAN,
    vote_type TEXT,
    can_vote BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM public.hazard_votes WHERE hazard_id = p_hazard_id AND user_id = p_user_id) AS has_voted,
        (SELECT hv.vote_type FROM public.hazard_votes hv WHERE hv.hazard_id = p_hazard_id AND hv.user_id = p_user_id) AS vote_type,
        NOT EXISTS(SELECT 1 FROM public.hazards WHERE id = p_hazard_id AND user_id = p_user_id) AS can_vote;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can vote on hazard (not their own)
CREATE OR REPLACE FUNCTION can_user_vote_on_hazard(p_hazard_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS(
        SELECT 1 FROM public.hazards 
        WHERE id = p_hazard_id 
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BACKFILL EXISTING HAZARDS
-- ============================================================================

-- Initialize vote counts for existing hazards
UPDATE public.hazards
SET 
    votes_up = 0,
    votes_down = 0,
    vote_score = 0
WHERE votes_up IS NULL OR votes_down IS NULL OR vote_score IS NULL;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.hazard_votes TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.hazard_votes TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.hazard_votes IS 'Stores user votes (upvote/downvote) for hazards';
COMMENT ON COLUMN public.hazard_votes.vote_type IS 'Type of vote: up or down';
COMMENT ON COLUMN public.hazards.votes_up IS 'Total number of upvotes for this hazard';
COMMENT ON COLUMN public.hazards.votes_down IS 'Total number of downvotes for this hazard';
COMMENT ON COLUMN public.hazards.vote_score IS 'Net vote score (votes_up - votes_down)';

COMMENT ON FUNCTION update_hazard_vote_counts() IS 'Automatically updates vote counts on hazards table when votes change';
COMMENT ON FUNCTION get_user_vote_status(UUID, UUID) IS 'Returns voting status for a user on a specific hazard';
COMMENT ON FUNCTION can_user_vote_on_hazard(UUID, UUID) IS 'Checks if a user can vote on a hazard (returns false if they own it)';
