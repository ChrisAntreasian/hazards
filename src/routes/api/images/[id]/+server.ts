import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return json({ error: 'Database connection not available' }, { status: 500 });
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return json({ error: 'Authentication required' }, { status: 401 });
  }

  const imageId = event.params.id;
  if (!imageId) {
    return json({ error: 'Image ID is required' }, { status: 400 });
  }

  try {
    // First, get the image details to verify ownership
    const { data: image, error: fetchError } = await supabase
      .from('hazard_images')
      .select('id, user_id, original_url, thumbnail_url, original_path, thumbnail_path, hazard_id')
      .eq('id', imageId)
      .single();

    if (fetchError || !image) {
      logger.dbError('fetch image for deletion', new Error(fetchError?.message || 'Image not found'));
      return json({ error: 'Image not found' }, { status: 404 });
    }

    // Now get the hazard details separately
    const { data: hazard, error: hazardError } = await supabase
      .from('hazards')
      .select('id, user_id, status')
      .eq('id', image.hazard_id)
      .single();

    if (hazardError || !hazard) {
      logger.dbError('fetch hazard for image deletion', new Error(hazardError?.message || 'Hazard not found'));
      return json({ error: 'Associated hazard not found' }, { status: 404 });
    }

    // Check if user has permission to delete this image
    // User can delete if they uploaded the image OR they own the hazard
    const canDelete = image.user_id === user.id || hazard.user_id === user.id;
    
    if (!canDelete) {
      return json({ error: 'You do not have permission to delete this image' }, { status: 403 });
    }

    // Only allow deletion if hazard is still pending
    if (hazard.status !== 'pending') {
      return json({ error: 'Images can only be deleted from pending hazards' }, { status: 403 });
    }

    // Delete the image record from database
    const { error: deleteError } = await supabase
      .from('hazard_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) {
      logger.dbError('delete image record', new Error(deleteError.message));
      return json({ error: 'Failed to delete image' }, { status: 500 });
    }

    // Delete the actual image files from storage
    try {
      // Use the stored paths to delete from storage
      if (image.original_path && image.thumbnail_path) {
        const { error: storageError } = await supabase.storage
          .from('hazard-images')
          .remove([image.original_path, image.thumbnail_path]);

        if (storageError) {
          logger.warn('Failed to delete image files from storage', { 
            metadata: { imageId, error: storageError.message } 
          });
          // Don't fail the whole operation for storage deletion errors
        }
      } else {
        logger.warn('Image paths not found, skipping storage deletion', { metadata: { imageId } });
      }
    } catch (storageErr) {
      logger.warn('Error deleting image from storage', { 
        metadata: { imageId, error: storageErr instanceof Error ? storageErr.message : String(storageErr) }
      });
      // Don't fail the whole operation for storage errors
    }

    logger.info('Image deleted successfully', { 
      metadata: { imageId, userId: user.id, hazardId: hazard.id } 
    });

    return json({ success: true, message: 'Image deleted successfully' });

  } catch (err) {
    logger.error('Failed to delete image', err instanceof Error ? err : new Error(String(err)));
    return json({ error: 'Failed to delete image' }, { status: 500 });
  }
};