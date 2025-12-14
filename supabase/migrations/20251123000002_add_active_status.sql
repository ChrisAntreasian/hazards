-- ============================================================================
-- ADD 'active' TO hazard_status ENUM
-- Migration: 20251123000002_add_active_status.sql
-- Description: Adds 'active' as a valid hazard_status value for clearer semantics
-- ============================================================================

-- Add 'active' to the hazard_status enum type
-- This allows hazards to have an explicit 'active' status instead of just 'approved'
ALTER TYPE hazard_status ADD VALUE IF NOT EXISTS 'active';

-- Optional: Update existing 'approved' hazards to 'active' if desired
-- COMMENT THIS OUT if you want to keep 'approved' as-is
-- UPDATE public.hazards SET status = 'active' WHERE status = 'approved';

-- Add comment explaining the status values
COMMENT ON TYPE hazard_status IS 'Moderation status of a hazard: pending (awaiting review), approved (moderator approved), active (actively shown on map), flagged (needs attention), removed (hidden from public)';
