import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';
import type { RequestHandler } from './$types';

/**
 * POST /api/categories/review/[id]
 * Approve or reject a category suggestion
 */
export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Database connection not available');
  }

  const categoryId = event.params.id;
  
  if (!categoryId) {
    throw error(400, 'Category ID is required');
  }

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw error(401, 'Authentication required');
  }

  // Check if user is admin or moderator
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || !['admin', 'moderator'].includes(userData.role)) {
    throw error(403, 'Admin or moderator access required');
  }

  // Parse request body
  const body = await event.request.json();
  const { action, notes } = body;

  if (!action || !['approve', 'reject'].includes(action)) {
    throw error(400, 'Valid action (approve/reject) is required');
  }

  try {
    // Call the review function
    const { data: result, error: reviewError } = await supabase
      .rpc('review_category', {
        p_category_id: categoryId,
        p_action: action,
        p_notes: notes || null
      });

    if (reviewError) {
      logger.error('Failed to review category', new Error(reviewError.message));
      throw error(500, reviewError.message);
    }

    logger.info('Category reviewed', {
      metadata: {
        categoryId,
        action,
        reviewedBy: user.id,
        notes
      }
    });

    return json({
      success: true,
      action,
      message: `Category ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });

  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    
    logger.error('Category review failed', err instanceof Error ? err : new Error(String(err)));
    throw error(500, 'Failed to review category');
  }
};

/**
 * GET /api/categories/review/[id]
 * Get details of a specific category (for review)
 */
export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Database connection not available');
  }

  const categoryId = event.params.id;
  
  if (!categoryId) {
    throw error(400, 'Category ID is required');
  }

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw error(401, 'Authentication required');
  }

  // Check if user is admin or moderator
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || !['admin', 'moderator'].includes(userData.role)) {
    throw error(403, 'Admin or moderator access required');
  }

  try {
    // Get category details
    const { data: category, error: categoryError } = await supabase
      .from('hazard_categories')
      .select(`
        *,
        users!hazard_categories_suggested_by_fkey (
          id,
          email,
          trust_score
        )
      `)
      .eq('id', categoryId)
      .single();

    if (categoryError || !category) {
      throw error(404, 'Category not found');
    }

    // Get related suggestion record if exists
    const { data: suggestion } = await supabase
      .from('category_suggestions')
      .select('*')
      .eq('created_category_id', categoryId)
      .single();

    // Count hazards using this category
    const { count: hazardCount } = await supabase
      .from('hazards')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    return json({
      success: true,
      category,
      suggestion,
      hazardCount: hazardCount || 0
    });

  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    
    logger.error('Failed to get category details', err instanceof Error ? err : new Error(String(err)));
    throw error(500, 'Failed to get category details');
  }
};
