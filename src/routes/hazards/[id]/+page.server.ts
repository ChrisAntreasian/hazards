// Server-side data loading for hazard details page
import { error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';
import type { PageServerLoad } from './$types';

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
        ),
        users!hazards_user_id_fkey (
          id,
          email,
          role,
          trust_score
        )
      `)
      .eq('id', hazardId)
      .single();

    if (hazardError) {
      logger.dbError('fetch hazard details', new Error(hazardError.message));
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
      votes_up: img.vote_score > 0 ? img.vote_score : 0,
      votes_down: img.vote_score < 0 ? Math.abs(img.vote_score) : 0,
      moderation_status: 'approved', // TODO: Add this column to the database
      metadata: img.metadata
    }));

    // Check if user has permission to view this hazard
    // Allow viewing if: public approved hazard OR user owns the hazard OR user is moderator/admin
    const canView = hazard.status === 'approved' || 
                   hazard.user_id === user.id ||
                   ['moderator', 'admin', 'content_editor'].includes(user.user_metadata?.role);

    if (!canView) {
      throw error(403, 'You do not have permission to view this hazard');
    }

    // Get hazard ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('hazard_ratings')
      .select('*')
      .eq('hazard_id', hazardId);

    if (ratingsError) {
      logger.dbError('fetch hazard ratings', new Error(ratingsError.message));
    }

    // Calculate average ratings
    const avgSeverity = ratings?.length ? 
      ratings.reduce((sum, r) => sum + r.severity_rating, 0) / ratings.length : null;
    const avgAccuracy = ratings?.length ? 
      ratings.reduce((sum, r) => sum + r.accuracy_rating, 0) / ratings.length : null;

    return {
      user,
      hazard,
      ratings: ratings || [],
      averageRatings: {
        severity: avgSeverity,
        accuracy: avgAccuracy,
        count: ratings?.length || 0
      }
    };
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    logger.error('Failed to load hazard details', err instanceof Error ? err : new Error(String(err)));
    throw error(500, 'Failed to load hazard details');
  }
};