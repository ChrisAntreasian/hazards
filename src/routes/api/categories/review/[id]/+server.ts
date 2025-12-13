import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';
import type { RequestHandler } from './$types';

/**
 * PATCH /api/categories/review/[id]
 * Review a category suggestion (approve/reject)
 * The [id] is the suggestion ID
 */
export const PATCH: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Database connection not available');
  }

  const suggestionId = event.params.id;
  
  if (!suggestionId) {
    throw error(400, 'Suggestion ID is required');
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
    // Get the suggestion first
    const { data: suggestion, error: suggestionError } = await supabase
      .from('category_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (suggestionError || !suggestion) {
      throw error(404, 'Suggestion not found');
    }

    if (action === 'approve') {
      // If suggestion has a provisional category, approve it
      if (suggestion.approved_category_id) {
        // Update the category status
        const { error: categoryUpdateError } = await supabase
          .from('hazard_categories')
          .update({
            status: 'active',
            approved_by: user.id,
            approved_at: new Date().toISOString()
          })
          .eq('id', suggestion.approved_category_id);

        if (categoryUpdateError) {
          throw error(500, categoryUpdateError.message);
        }
      } else {
        // Create a new category from the suggestion
        const level = suggestion.suggested_parent_id ? 1 : 0; // Simplified level calculation
        
        const { data: newCategory, error: createError } = await supabase
          .from('hazard_categories')
          .insert({
            name: suggestion.suggested_name,
            path: suggestion.suggested_path,
            parent_id: suggestion.suggested_parent_id,
            icon: suggestion.suggested_icon || '📌',
            level,
            status: 'active',
            description: suggestion.description,
            suggested_by: suggestion.suggested_by,
            approved_by: user.id,
            approved_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          throw error(500, createError.message);
        }

        // Update suggestion with the new category ID
        await supabase
          .from('category_suggestions')
          .update({ approved_category_id: newCategory.id })
          .eq('id', suggestionId);
      }
    }

    // Update suggestion status
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    const { error: updateError } = await supabase
      .from('category_suggestions')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null
      })
      .eq('id', suggestionId);

    if (updateError) {
      throw error(500, updateError.message);
    }

    logger.info('Category suggestion reviewed', {
      metadata: {
        suggestionId,
        action,
        reviewedBy: user.id,
        notes
      }
    });

    return json({
      success: true,
      action,
      message: `Suggestion ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });

  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    
    logger.error('Suggestion review failed', err instanceof Error ? err : new Error(String(err)));
    throw error(500, 'Failed to review suggestion');
  }
};

/**
 * POST /api/categories/review/[id]
 * Approve or reject a category suggestion (legacy - uses category ID)
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
