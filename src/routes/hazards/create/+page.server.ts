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
      categories: [],
      userTrustScore: 0
    };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user's trust score
  let userTrustScore = 0;
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('trust_score')
      .eq('id', user.id)
      .single();
    userTrustScore = userData?.trust_score || 0;
  }

  // Load categories for the hazard creation form
  const { data: categories, error: categoryError } = await supabase
    .from('hazard_categories')
    .select('id, name, path, icon, level, parent_id, created_at')
    .order('level', { ascending: true })
    .order('name', { ascending: true });

  if (categoryError) {
    logger.dbError('load categories', new Error(categoryError.message || 'Failed to load categories'));
    return {
      categories: [],
      userTrustScore
    };
  }

  return {
    categories: categories || [],
    userTrustScore
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
    
    // Log all form data keys for debugging
    console.log('===== FORM DATA KEYS =====');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, typeof value === 'string' ? value.substring(0, 100) : value);
    }
    console.log('==========================');
    
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
    const area_json = formData.get('area')?.toString();
    const suggested_category_json = formData.get('suggested_category')?.toString();
    const zoomRaw = formData.get('zoom')?.toString();
    console.log('Server received zoom:', zoomRaw, 'type:', typeof zoomRaw);
    let zoom = parseInt(zoomRaw || '13');
    
    // Extract expiration data
    const expiration_type = formData.get('expiration_type')?.toString() || 'user_resolvable';
    const expires_at = formData.get('expires_at')?.toString();
    const seasonal_pattern = formData.get('seasonal_pattern')?.toString();
    
    // Validate zoom is within acceptable range (1-20, Leaflet's max)
    if (isNaN(zoom) || zoom < 1 || zoom > 20) {
      logger.warn('Invalid zoom value, using default', { metadata: { zoom, raw: zoomRaw } });
      zoom = 13;
    }

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

    let hazardId: string | null = null;

    try {
      // Log the parameters for debugging
      logger.info('Creating hazard with parameters', { 
        metadata: { 
          title, 
          category_id, 
          latitude, 
          longitude, 
          severity_level, 
          zoom,
          zoom_type: typeof zoom,
          is_seasonal,
          has_area: !!area,
          expiration_type,
          has_expires_at: !!expires_at,
          has_seasonal_pattern: !!seasonal_pattern
        } 
      });

      // Parse seasonal pattern if provided
      let seasonal_pattern_json = null;
      if (seasonal_pattern) {
        try {
          seasonal_pattern_json = JSON.parse(seasonal_pattern);
        } catch (err) {
          logger.warn('Invalid seasonal_pattern JSON', { metadata: { seasonal_pattern } });
        }
      }

      // Use PostgreSQL function to create hazard (RLS works properly this way)
      const { data: createResult, error: hazardError } = await supabase.rpc('create_hazard', {
        p_title: title,
        p_description: description,
        p_category_id: category_id,
        p_latitude: latitude,
        p_longitude: longitude,
        p_severity_level: severity_level,
        p_reported_active_date: reported_active_date ? new Date(reported_active_date).toISOString() : null,
        p_is_seasonal: is_seasonal,
        p_area: area,
        p_zoom: zoom,
        p_expiration_type: expiration_type,
        p_expires_at: expires_at || null,
        p_seasonal_pattern: seasonal_pattern_json
      });

      if (hazardError || !createResult?.success) {
        logger.dbError('create hazard', new Error(hazardError?.message || createResult?.error_message || 'Failed to create hazard'));
        return fail(500, { 
          error: `Failed to create hazard: ${hazardError?.message || createResult?.error_message || 'Unknown error'}`,
          code: hazardError?.code || createResult?.error_code || 'UNKNOWN'
        });
      }

      hazardId = createResult.hazard_id;
      logger.info('Hazard created successfully', { metadata: { hazardId, createResult } });

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

    // Redirect to hazard detail page on success (outside try-catch to prevent redirect being caught as error)
    if (!hazardId) {
      logger.error('Hazard created but no ID returned');
      return fail(500, { error: 'Failed to get hazard ID after creation' });
    }
    
    logger.info('Redirecting to hazard detail page', { metadata: { hazardId } });
    redirect(303, `/hazards/${hazardId}?success=hazard-created`);
  }
};