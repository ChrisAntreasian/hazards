import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import type { RequestHandler } from '@sveltejs/kit';
import type { SystemConfiguration, AdminApiResponse } from '$lib/types/admin';

// Default system configuration
const defaultConfig: SystemConfiguration = {
  moderation: {
    mode: 'hybrid',
    auto_approve_threshold: 0.8,
    auto_reject_threshold: 0.2,
    require_moderator_approval: true,
    trusted_user_bypass: true,
    max_pending_queue_size: 1000
  },
  validation: {
    strict_location_bounds: true,
    require_images: false,
    min_description_length: 10,
    max_image_size_mb: 10,
    allowed_file_types: ['image/jpeg', 'image/png', 'image/webp'],
    duplicate_detection_enabled: true,
    profanity_filter_enabled: true
  },
  notifications: {
    email_notifications: true,
    real_time_updates: true,
    digest_frequency: 'weekly',
    notification_types: ['new_hazard_nearby', 'moderation_status_change', 'system_announcements']
  },
  features: {
    user_generated_templates: true,
    advanced_mapping: true,
    community_voting: false,
    hazard_comments: true,
    real_time_collaboration: false,
    ai_assisted_categorization: false
  }
};

// GET - Fetch current system configuration
export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      throw error(403, 'Admin access required');
    }

    // Fetch configuration from database
    const { data: configData, error: fetchError } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw error(500, `Failed to fetch configuration: ${fetchError.message}`);
    }

    // Use stored config or default
    const config: SystemConfiguration = configData ? 
      configData.config_data : 
      defaultConfig;

    const response: AdminApiResponse<SystemConfiguration> = {
      success: true,
      data: config
    };

    return json(response);
  } catch (err) {
    console.error('Error fetching configuration:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};

// PUT - Update system configuration
export const PUT: RequestHandler = async (event) => {
  const { request } = event;
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      throw error(403, 'Admin access required');
    }

    const configUpdate: Partial<SystemConfiguration> = await request.json();

    // Get current config
    const { data: currentConfigData } = await supabase
      .from('system_config')
      .select('config_data')
      .limit(1)
      .single();

    const currentConfig: SystemConfiguration = currentConfigData ? 
      currentConfigData.config_data : 
      defaultConfig;

    // Merge updates
    const newConfig: SystemConfiguration = {
      ...currentConfig,
      ...configUpdate,
      moderation: { ...currentConfig.moderation, ...configUpdate.moderation },
      validation: { ...currentConfig.validation, ...configUpdate.validation },
      notifications: { ...currentConfig.notifications, ...configUpdate.notifications },
      features: { ...currentConfig.features, ...configUpdate.features }
    };

    // Validate configuration values
    if (newConfig.moderation.auto_approve_threshold < 0 || newConfig.moderation.auto_approve_threshold > 1) {
      throw error(400, 'Auto-approve threshold must be between 0 and 1');
    }

    if (newConfig.moderation.auto_reject_threshold < 0 || newConfig.moderation.auto_reject_threshold > 1) {
      throw error(400, 'Auto-reject threshold must be between 0 and 1');
    }

    if (newConfig.moderation.auto_approve_threshold <= newConfig.moderation.auto_reject_threshold) {
      throw error(400, 'Auto-approve threshold must be higher than auto-reject threshold');
    }

    if (newConfig.validation.min_description_length < 1) {
      throw error(400, 'Minimum description length must be at least 1');
    }

    if (newConfig.validation.max_image_size_mb < 1 || newConfig.validation.max_image_size_mb > 100) {
      throw error(400, 'Maximum image size must be between 1 and 100 MB');
    }

    // Store configuration
    const { error: upsertError } = await supabase
      .from('system_config')
      .upsert({
        id: 1, // Single row config
        config_data: newConfig,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });

    if (upsertError) {
      throw error(500, `Failed to update configuration: ${upsertError.message}`);
    }

    // Log the action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action_type: 'config_update',
        target_type: 'system_config',
        target_id: '1',
        details: {
          changes: configUpdate,
          timestamp: new Date().toISOString()
        }
      });

    const response: AdminApiResponse<SystemConfiguration> = {
      success: true,
      data: newConfig,
      message: 'Configuration updated successfully'
    };

    return json(response);
  } catch (err) {
    console.error('Error updating configuration:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};