-- Migration: Add auto-resolve trigger for user-resolvable hazards
-- When confirmations reach threshold (3 confirmed > disputed), automatically resolve the hazard
-- Created: 2025-11-17

-- Function to check and auto-resolve hazards based on confirmation threshold
CREATE OR REPLACE FUNCTION check_auto_resolve()
RETURNS TRIGGER AS $$
DECLARE
  v_hazard RECORD;
  v_resolution_report RECORD;
  v_confirmed_count INTEGER;
  v_disputed_count INTEGER;
  v_threshold INTEGER := 3; -- Default threshold
  v_expiration_settings RECORD;
BEGIN
  -- Get the hazard details
  SELECT * INTO v_hazard
  FROM hazards
  WHERE id = NEW.hazard_id;

  -- Only process user_resolvable hazards that haven't been resolved yet
  IF v_hazard.expiration_type != 'user_resolvable' OR v_hazard.resolved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get the resolution report
  SELECT * INTO v_resolution_report
  FROM hazard_resolution_reports
  WHERE hazard_id = NEW.hazard_id
  LIMIT 1;

  -- If no resolution report exists, nothing to do
  IF v_resolution_report IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count confirmations and disputes
  SELECT 
    COUNT(*) FILTER (WHERE confirmation_type = 'confirmed') AS confirmed,
    COUNT(*) FILTER (WHERE confirmation_type = 'disputed') AS disputed
  INTO v_confirmed_count, v_disputed_count
  FROM hazard_resolution_confirmations
  WHERE hazard_id = NEW.hazard_id;

  -- Try to get category-specific threshold from expiration_settings
  SELECT confirmation_threshold INTO v_threshold
  FROM expiration_settings
  WHERE category_id = v_hazard.category_id
  AND confirmation_threshold IS NOT NULL
  LIMIT 1;

  -- Default to 3 if not found
  IF v_threshold IS NULL THEN
    v_threshold := 3;
  END IF;

  -- Check if threshold is met: confirmed count >= threshold AND confirmed > disputed
  IF v_confirmed_count >= v_threshold AND v_confirmed_count > v_disputed_count THEN
    -- Auto-resolve the hazard
    UPDATE hazards
    SET 
      resolved_at = NOW(),
      resolved_by = v_resolution_report.reported_by,
      resolution_note = COALESCE(
        v_resolution_report.resolution_note,
        'Automatically resolved after ' || v_confirmed_count || ' confirmations'
      ),
      updated_at = NOW()
    WHERE id = NEW.hazard_id;

    -- Log to audit trail
    INSERT INTO expiration_audit_log (
      hazard_id,
      action,
      performed_by,
      previous_state,
      new_state,
      reason
    ) VALUES (
      NEW.hazard_id,
      'auto_resolved',
      v_resolution_report.reported_by,
      jsonb_build_object(
        'resolved_at', NULL,
        'confirmed_count', v_confirmed_count - 1,
        'disputed_count', v_disputed_count
      ),
      jsonb_build_object(
        'resolved_at', NOW(),
        'confirmed_count', v_confirmed_count,
        'disputed_count', v_disputed_count,
        'threshold', v_threshold
      ),
      'Auto-resolved after reaching confirmation threshold (' || v_confirmed_count || ' confirmations, threshold: ' || v_threshold || ')'
    );

    -- Log success
    RAISE NOTICE 'Auto-resolved hazard % with % confirmations (threshold: %)', 
      NEW.hazard_id, v_confirmed_count, v_threshold;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on hazard_resolution_confirmations
DROP TRIGGER IF EXISTS trigger_auto_resolve_on_confirmation ON hazard_resolution_confirmations;

CREATE TRIGGER trigger_auto_resolve_on_confirmation
AFTER INSERT OR UPDATE ON hazard_resolution_confirmations
FOR EACH ROW
EXECUTE FUNCTION check_auto_resolve();

-- Add comment explaining the trigger
COMMENT ON FUNCTION check_auto_resolve() IS 
'Automatically resolves user_resolvable hazards when confirmation count reaches threshold. Default threshold is 3, but can be customized per category in expiration_settings. Requires confirmed count >= threshold AND confirmed > disputed.';

COMMENT ON TRIGGER trigger_auto_resolve_on_confirmation ON hazard_resolution_confirmations IS
'Checks if hazard should be auto-resolved after each confirmation is added or updated. Resolves when threshold is met.';
