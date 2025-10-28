-- Development seed data for testing the moderation queue
-- Run this in your Supabase SQL editor to create test data

-- Insert test hazard categories if they don't exist
INSERT INTO hazard_categories (name, parent_id, level, path, icon) VALUES 
('Test Plants', NULL, 0, 'test_plants', '🌿'),
('Test Insects', NULL, 0, 'test_insects', '🐛')
ON CONFLICT (path) DO NOTHING;

-- Insert test hazard templates
WITH test_plant_cat AS (
    SELECT id FROM hazard_categories WHERE path = 'test_plants'
)
INSERT INTO hazard_templates (category_id, name, needs_cms_content, status) 
SELECT tc.id, 'Test Poison Oak', true, 'needs_review' FROM test_plant_cat tc
ON CONFLICT DO NOTHING;

-- Create test users (you'll need to replace these UUIDs with real user IDs from your auth.users table)
-- First create the users in Supabase Auth, then these will be created automatically by trigger
-- For now, we'll create placeholder entries

-- Insert test hazards that need moderation
DO $$
DECLARE
    test_user_id UUID;
    test_template_id UUID;
    hazard_id UUID;
BEGIN
    -- Get or create a test user (replace with your actual user ID)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        -- For testing, we'll use a placeholder UUID
        test_user_id := 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    END IF;

    -- Ensure user exists in public.users table
    INSERT INTO public.users (id, email, role) 
    VALUES (test_user_id, 'test@example.com', 'contributor')
    ON CONFLICT (id) DO NOTHING;

    -- Get a test template
    SELECT id INTO test_template_id FROM hazard_templates LIMIT 1;

    -- Insert test hazards
    INSERT INTO hazards (
        template_id, user_id, title, description, severity_level, 
        latitude, longitude, status
    ) VALUES 
    (test_template_id, test_user_id, 'Poison Ivy Patch Near Trail', 
     'Large patch of poison ivy growing alongside the main hiking trail. Very dense coverage, hard to avoid.', 
     3, 42.3601, -71.0589, 'pending'),
    (test_template_id, test_user_id, 'Wasp Nest in Tree', 
     'Active wasp nest about 6 feet up in an oak tree right next to the path.', 
     4, 42.3612, -71.0595, 'pending'),
    (NULL, test_user_id, 'Unknown Thorny Bush', 
     'Some kind of thorny bush I haven''t seen before. Thorns are really sharp and long.', 
     2, 42.3598, -71.0601, 'pending')
    RETURNING id INTO hazard_id;

    -- Add these hazards to moderation queue
    INSERT INTO moderation_queue (type, content_id, submitted_by, priority, status)
    SELECT 'hazard', h.id, h.user_id, 
           CASE 
               WHEN h.severity_level >= 4 THEN 'high'::moderation_priority
               WHEN h.severity_level >= 3 THEN 'medium'::moderation_priority 
               ELSE 'low'::moderation_priority
           END,
           'pending'::moderation_status
    FROM hazards h 
    WHERE h.user_id = test_user_id AND h.status = 'pending';

    -- Insert some test flagged content
    INSERT INTO moderation_queue (
        type, content_id, submitted_by, flagged_reasons, priority, status
    ) VALUES (
        'hazard', hazard_id, test_user_id, 
        ARRAY['Poor image quality', 'Wrong location'], 
        'medium', 'pending'
    );

END $$;

-- Update the stats for better testing
UPDATE moderation_queue 
SET created_at = NOW() - INTERVAL '2 hours' 
WHERE priority = 'high';

UPDATE moderation_queue 
SET created_at = NOW() - INTERVAL '30 minutes' 
WHERE priority = 'medium';

-- Add some processed items for stats
INSERT INTO moderation_queue (
    type, content_id, submitted_by, priority, status, resolved_at
) VALUES 
('hazard', gen_random_uuid(), (SELECT id FROM users LIMIT 1), 'low', 'approved', NOW() - INTERVAL '1 hour'),
('hazard', gen_random_uuid(), (SELECT id FROM users LIMIT 1), 'medium', 'approved', NOW() - INTERVAL '2 hours'),
('hazard', gen_random_uuid(), (SELECT id FROM users LIMIT 1), 'low', 'rejected', NOW() - INTERVAL '3 hours');

COMMIT;
