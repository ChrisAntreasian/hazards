import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';
import type { RequestHandler } from './$types';

/**
 * POST /api/categories/suggest
 * Submit a new category suggestion or create a provisional category
 */
export const POST: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Database connection not available');
  }

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw error(401, 'Authentication required');
  }

  // Parse request body
  const body = await event.request.json();
  const { name, path, parent_id, description, icon } = body;

  // Validate required fields
  if (!name?.trim()) {
    throw error(400, 'Category name is required');
  }

  try {
    // Get user's trust score
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('trust_score')
      .eq('id', user.id)
      .single();

    if (userError) {
      logger.warn('Could not fetch user trust score', { metadata: { userId: user.id } });
    }

    const trustScore = userData?.trust_score || 0;
    const canCreateProvisional = trustScore >= 500;

    // Get parent category ID if provided
    let parentId: string | null = parent_id || null;
    let parentPath: string | null = null;
    
    if (parentId) {
      const { data: parentCategory, error: parentError } = await supabase
        .from('hazard_categories')
        .select('id, path')
        .eq('id', parentId)
        .single();

      if (parentError || !parentCategory) {
        throw error(400, `Parent category not found`);
      }
      parentPath = parentCategory.path;
    }

    // Use provided path or calculate it
    const newPath = path || (parentPath 
      ? `${parentPath}/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
      : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

    // Check if category with this path already exists
    const { data: existingCategory } = await supabase
      .from('hazard_categories')
      .select('id')
      .eq('path', newPath)
      .single();

    if (existingCategory) {
      throw error(409, `A category with path "${newPath}" already exists`);
    }

    if (canCreateProvisional) {
      // Trusted user - create provisional category directly
      const level = parentPath ? parentPath.split('/').length : 0;
      
      const { data: newCategory, error: createError } = await supabase
        .from('hazard_categories')
        .insert({
          name: name.trim(),
          path: newPath,
          parent_id: parentId,
          icon: icon || '📌',
          level,
          status: 'provisional'
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create provisional category', new Error(createError.message));
        throw error(500, createError.message);
      }

      // Also create a suggestion record to track the history
      await supabase
        .from('category_suggestions')
        .insert({
          suggested_name: name.trim(),
          suggested_path: newPath,
          suggested_parent_id: parentId,
          suggested_icon: icon || '📌',
          description: description || null,
          suggested_by: user.id,
          user_trust_score: trustScore,
          status: 'approved',
          approved_category_id: newCategory.id,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        });

      logger.info('Provisional category created', {
        metadata: {
          categoryId: newCategory.id,
          name,
          path: newPath,
          createdBy: user.id,
          trustScore
        }
      });

      return json({
        success: true,
        type: 'provisional',
        message: 'Category created successfully! It will be reviewed by moderators.',
        category: newCategory
      });

    } else {
      // Regular user - create a suggestion for review
      const { data: suggestion, error: suggestionError } = await supabase
        .from('category_suggestions')
        .insert({
          suggested_name: name.trim(),
          suggested_path: newPath,
          suggested_parent_id: parentId,
          suggested_icon: icon || '📌',
          description: description || null,
          suggested_by: user.id,
          user_trust_score: trustScore,
          status: 'pending'
        })
        .select()
        .single();

      if (suggestionError) {
        logger.error('Failed to create category suggestion', new Error(suggestionError.message));
        throw error(500, 'Failed to submit category suggestion');
      }

      logger.info('Category suggestion submitted', {
        metadata: {
          suggestionId: suggestion.id,
          name,
          path: newPath,
          suggestedBy: user.id,
          trustScore
        }
      });

      return json({
        success: true,
        type: 'suggestion',
        message: 'Category suggestion submitted! It will be reviewed by moderators.',
        suggestion
      });
    }

  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    logger.error('Category suggestion failed', err instanceof Error ? err : new Error(String(err)));
    throw error(500, 'Failed to process category suggestion');
  }
};

/**
 * GET /api/categories/suggest
 * Get pending category suggestions (for admin dashboard)
 */
export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Database connection not available');
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

  // Get query parameters
  const url = new URL(event.request.url);
  const status = url.searchParams.get('status') || 'pending,provisional';
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    // Fetch suggestions with simpler query (avoid complex joins that may fail)
    const statusArray = status.split(',');
    const { data: suggestions, error: fetchError, count } = await supabase
      .from('category_suggestions')
      .select('*', { count: 'exact' })
      .in('status', statusArray)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      logger.error('Failed to fetch category suggestions', new Error(fetchError.message));
      throw error(500, `Failed to fetch suggestions: ${fetchError.message}`);
    }

    return json({
      success: true,
      suggestions,
      pagination: {
        total: count || 0,
        limit,
        offset
      }
    });

  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    
    logger.error('Failed to get category suggestions', err instanceof Error ? err : new Error(String(err)));
    throw error(500, 'Failed to get category suggestions');
  }
};
