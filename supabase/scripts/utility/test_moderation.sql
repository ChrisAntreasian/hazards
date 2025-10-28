-- Test moderation queue access and add missing RLS policies

-- First, let's add RLS policies for moderation_queue
-- Moderators and admins can read all moderation items
CREATE POLICY "Moderators can read moderation queue" ON moderation_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('moderator', 'admin')
        )
    );

-- Moderators and admins can update moderation items  
CREATE POLICY "Moderators can update moderation queue" ON moderation_queue
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('moderator', 'admin')
        )
    );

-- System can insert into moderation queue (for automated flagging)
CREATE POLICY "System can insert to moderation queue" ON moderation_queue
    FOR INSERT WITH CHECK (true);

-- Let's also check if we have any sample data
SELECT COUNT(*) as total_items FROM moderation_queue;
SELECT COUNT(*) as pending_items FROM moderation_queue WHERE status = 'pending';
SELECT * FROM moderation_queue LIMIT 3;