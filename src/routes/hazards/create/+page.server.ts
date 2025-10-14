// SvelteKit framework imports
import { fail, redirect } from '@sveltejs/kit';

// Internal utility imports
import { createSupabaseServerClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';

// Type-only imports
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return {
      categories: []
    };
  }

  // Load categories for the hazard creation form
  const { data: categories, error: categoryError } = await supabase
    .from('hazard_categories')
    .select('id, name, path, icon, level')
    .order('level', { ascending: true })
    .order('name', { ascending: true });

  if (categoryError) {
    logger.dbError('load categories', new Error(categoryError.message || 'Failed to load categories'));
    return {
      categories: []
    };
  }

  return {
    categories: categories || []
  };
};

export const actions: Actions = {
  createHazard: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Database connection not available' });
    }

    // Get current user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return fail(401, { error: 'You must be logged in to report hazards' });
    }

    // Verify we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return fail(401, { error: 'Invalid session. Please log in again.' });
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
    const uploaded_images = formData.get('uploaded_images')?.toString();

    // Validation
    if (!title) {
      return fail(400, { error: 'Title is required' });
    }

    if (!description) {
      return fail(400, { error: 'Description is required' });
    }

    if (!category_id) {
      return fail(400, { error: 'Please select a category' });
    }

    if (!latitude || !longitude) {
      return fail(400, { error: 'Location is required' });
    }

    try {
      // Use PostgreSQL function to create hazard (RLS works properly this way)
      const { data: createResult, error: hazardError } = await supabase.rpc('create_hazard', {
        p_title: title,
        p_description: description,
        p_category_id: category_id,
        p_latitude: latitude,
        p_longitude: longitude,
        p_severity_level: severity_level,
        p_reported_active_date: reported_active_date ? new Date(reported_active_date).toISOString() : null,
        p_is_seasonal: is_seasonal
      });

      if (hazardError || !createResult?.success) {
        logger.dbError('create hazard', new Error(hazardError?.message || createResult?.error_message || 'Failed to create hazard'));
        return fail(500, { 
          error: `Failed to create hazard: ${hazardError?.message || createResult?.error_message || 'Unknown error'}`,
          code: hazardError?.code || createResult?.error_code || 'UNKNOWN'
        });
      }

      const hazardId = createResult.hazard_id;

      // Update uploaded images to link to this hazard
      if (uploaded_images) {
        try {
          const imageIds = uploaded_images.split(',').filter(id => id.trim());
          if (imageIds.length > 0) {
            const { error: updateError } = await supabase
              .from('hazard_images')
              .update({ hazard_id: hazardId })
              .in('id', imageIds);

            if (updateError) {
              logger.warn('Failed to link images to hazard', { metadata: { hazardId, imageIds: imageIds.length } });
              // Don't fail the whole operation for this
            }
          }
        } catch (imgError) {
          logger.warn('Error linking images', { metadata: { hazardId } });
        }
      }

    } catch (err) {
      logger.error('Failed to submit hazard', err instanceof Error ? err : new Error(String(err)));
      return fail(500, { 
        error: `Failed to submit hazard: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: err instanceof Error ? (err as any).code : 'UNKNOWN'
      });
    }

    // Redirect to dashboard on success (outside try-catch to prevent redirect being caught as error)
    redirect(303, '/dashboard?success=hazard-created');
  }
};