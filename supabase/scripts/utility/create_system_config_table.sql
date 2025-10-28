-- Create system_config table for admin configuration storage

CREATE TABLE IF NOT EXISTS public.system_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    config_data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    CONSTRAINT single_config_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Allow admins to read and update system configuration
CREATE POLICY "Admins can manage system config" ON system_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Insert default configuration if none exists
INSERT INTO system_config (id, config_data) 
VALUES (1, '{
    "moderation": {
        "mode": "manual",
        "auto_approve_threshold": 0.8,
        "auto_reject_threshold": 0.2,
        "require_moderator_approval": true,
        "trusted_user_bypass": true,
        "max_pending_queue_size": 1000
    },
    "validation": {
        "strict_location_bounds": true,
        "require_images": false,
        "min_description_length": 10,
        "max_image_size_mb": 10,
        "allowed_file_types": ["image/jpeg", "image/png", "image/webp"],
        "duplicate_detection_enabled": true,
        "profanity_filter_enabled": true
    },
    "notifications": {
        "email_notifications": true,
        "real_time_updates": true,
        "digest_frequency": "weekly",
        "notification_types": ["new_hazard_nearby", "moderation_status_change", "system_announcements"]
    },
    "features": {
        "user_generated_templates": true,
        "advanced_mapping": true,
        "community_voting": false,
        "hazard_comments": true,
        "real_time_collaboration": false,
        "ai_assisted_categorization": false
    }
}')
ON CONFLICT (id) DO NOTHING;