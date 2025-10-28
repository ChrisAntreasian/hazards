// Server-side data loading for hazard edit page
import { error, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const hazardId = event.params.id;

  if (!supabase) {
    throw error(500, 'Database connection not available');
  }

  if (!hazardId) {
    throw error(400, 'Hazard ID is required');
  }

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    // Fetch hazard details
    const { data: hazard, error: hazardError } = await supabase
      .from('hazards')
      .select(`
        *,
        hazard_categories (
          id,
          name,
          icon,
          path
        )
      `)
      .eq('id', hazardId)
      .single();

    if (hazardError) {
      logger.dbError('fetch hazard for edit', new Error(hazardError.message));
      throw error(404, 'Hazard not found');
    }

    if (!hazard) {
      throw error(404, 'Hazard not found');
    }

    // Fetch hazard images separately
    const { data: hazardImages, error: imagesError } = await supabase
      .from('hazard_images')
      .select('id, user_id, original_url, thumbnail_url, vote_score, uploaded_at, metadata')
      .eq('hazard_id', hazardId)
      .order('uploaded_at', { ascending: false });

    if (imagesError) {
      logger.warn('Failed to fetch hazard images', { metadata: { hazardId, error: imagesError.message } });
    }

    // Map the images to match expected structure
    hazard.hazard_images = (hazardImages || []).map((img: any) => ({
      id: img.id,
      image_url: img.original_url,
      thumbnail_url: img.thumbnail_url,
      uploaded_by: img.user_id,
      upload_date: img.uploaded_at,
      moderation_status: 'approved', // TODO: Add this column to the database
      metadata: img.metadata
    }));

    // Check if user has permission to edit this hazard
    if (hazard.user_id !== user.id) {
      throw error(403, 'You do not have permission to edit this hazard');
    }

    // Only allow editing of pending hazards
    if (hazard.status !== 'pending') {
      throw error(403, 'Only pending hazards can be edited');
    }

    // Load categories for the edit form
    const { data: categories, error: categoryError } = await supabase
      .from('hazard_categories')
      .select('id, name, path, icon, level')
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (categoryError) {
      logger.dbError('load categories for edit', new Error(categoryError.message));
      return {
        hazard,
        categories: []
      };
    }

    return {
      user,
      hazard,
      categories: categories || []
    };
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    logger.error('Failed to load hazard for edit', err instanceof Error ? err : new Error(String(err)));
    throw error(500, 'Failed to load hazard for edit');
  }
};

export const actions: Actions = {
  updateHazard: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return { success: false, error: 'Database connection not available' };
    }

    // Get current user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in to edit hazards' };
    }

    const hazardId = event.params.id;
    if (!hazardId) {
      return { success: false, error: 'Hazard ID is required' };
    }

    const formData = await event.request.formData();
    
    // Extract form data
    const title = formData.get('title')?.toString()?.trim();
    const description = formData.get('description')?.toString()?.trim();
    const category_id = formData.get('category_id')?.toString();
    const severity_level = parseInt(formData.get('severity_level')?.toString() || '3');
    const latitude = parseFloat(formData.get('latitude')?.toString() || '0');
    const longitude = parseFloat(formData.get('longitude')?.toString() || '0');
    const reported_active_date = formData.get('reported_active_date')?.toString();
    const is_seasonal = formData.get('is_seasonal') === 'on';
    const area_json = formData.get('area')?.toString();

    // Parse area data if provided
    let area: any = null;
    if (area_json) {
      try {
        area = JSON.parse(area_json);
      } catch (err) {
        logger.warn('Invalid area JSON provided', { metadata: { area_json } });
        // Don't fail the whole operation for invalid area data
      }
    }

    // Validation
    if (!title) {
      return { success: false, error: 'Title is required' };
    }

    if (!description) {
      return { success: false, error: 'Description is required' };
    }

    if (!category_id) {
      return { success: false, error: 'Please select a category' };
    }

    if (!latitude || !longitude) {
      return { success: false, error: 'Location is required' };
    }

    try {
      // Verify user owns this hazard
      const { data: existingHazard, error: checkError } = await supabase
        .from('hazards')
        .select('user_id, status')
        .eq('id', hazardId)
        .single();

      if (checkError || !existingHazard) {
        return { success: false, error: 'Hazard not found' };
      }

      if (existingHazard.user_id !== user.id) {
        return { success: false, error: 'You do not have permission to edit this hazard' };
      }

      if (existingHazard.status !== 'pending') {
        return { success: false, error: 'Only pending hazards can be edited' };
      }

      // Update the hazard
      const { error: updateError } = await supabase
        .from('hazards')
        .update({
          title,
          description,
          category_id,
          latitude,
          longitude,
          severity_level,
          reported_active_date: reported_active_date ? new Date(reported_active_date).toISOString() : null,
          is_seasonal,
          area,
          updated_at: new Date().toISOString()
        })
        .eq('id', hazardId);

      if (updateError) {
        logger.dbError('update hazard', new Error(updateError.message));
        return { success: false, error: `Failed to update hazard: ${updateError.message}` };
      }

      // Create new moderation queue entry for the edited hazard
      const priority = severity_level >= 4 ? 'high' : severity_level === 3 ? 'medium' : 'low';
      
      const { error: moderationError } = await supabase
        .from('moderation_queue')
        .insert({
          type: 'hazard',
          content_id: hazardId,
          submitted_by: user.id,
          priority,
          status: 'pending',
          flagged_reasons: ['content_updated']
        });

      if (moderationError) {
        logger.warn('Failed to create moderation entry for edited hazard', { 
          metadata: { hazardId, userId: user.id } 
        });
        // Don't fail the whole operation for this
      }

    } catch (err) {
      logger.error('Failed to update hazard', err instanceof Error ? err : new Error(String(err)));
      return { success: false, error: `Failed to update hazard: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }

    // Redirect to hazard details on success
    redirect(303, `/hazards/${hazardId}?success=hazard-updated`);
  }
};