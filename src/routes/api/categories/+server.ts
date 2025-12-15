import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/categories
 * Returns all active hazard categories
 * Supports caching for performance
 */
export const GET: RequestHandler = async ({ locals, setHeaders }) => {
  const supabase = locals.supabase;
  
  if (!supabase) {
    throw error(500, 'Database connection failed');
  }

  try {
    const { data: categories, error: fetchError } = await supabase
      .from('hazard_categories')
      .select(`
        id,
        name,
        path,
        level,
        icon,
        description,
        short_description,
        parent_id,
        status
      `)
      .eq('status', 'active')
      .order('level')
      .order('name');

    if (fetchError) {
      console.error('Error fetching categories:', fetchError);
      throw error(500, 'Failed to fetch categories');
    }

    // Set cache headers - categories change infrequently
    setHeaders({
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600'
    });

    return json({
      success: true,
      categories: categories || [],
      count: categories?.length || 0
    });
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    console.error('Error in categories endpoint:', err);
    throw error(500, 'Internal server error');
  }
};
