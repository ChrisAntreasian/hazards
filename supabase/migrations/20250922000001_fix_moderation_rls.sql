-- Add RLS policies for moderation_queue table
-- This table was missing proper access policies

-- Moderators and admins can read all moderation items
CREATE POLICY "Moderators can read moderation queue" ON moderation_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('moderator', 'admin')
        )
    );

-- Moderators and admins can update moderation items (for processing actions)
CREATE POLICY "Moderators can update moderation queue" ON moderation_queue
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('moderator', 'admin')
        )
    );

-- System can insert into moderation queue (for automated flagging)
-- This allows the application to add items to the queue
CREATE POLICY "System can insert to moderation queue" ON moderation_queue
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add some sample moderation data if the table is empty
DO $$ 
DECLARE
    sample_user_id uuid;
    sample_hazard_id uuid;
BEGIN
    -- Get a sample user
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    -- Get a sample hazard  
    SELECT id INTO sample_hazard_id FROM hazards LIMIT 1;
    
    -- Only insert if we have both and the queue is empty
    IF sample_user_id IS NOT NULL AND sample_hazard_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM moderation_queue) THEN
            INSERT INTO moderation_queue (
                type, 
                content_id, 
                submitted_by, 
                flagged_reasons, 
                priority, 
                status
            ) VALUES (
                'hazard', 
                sample_hazard_id, 
                sample_user_id, 
                ARRAY['needs_review'], 
                'medium', 
                'pending'
            );
        END IF;
    END IF;
END $$;