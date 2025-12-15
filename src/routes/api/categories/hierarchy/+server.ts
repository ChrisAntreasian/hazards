import { json, error } from '@sveltejs/kit';
import { setCacheHeaders } from '$lib/utils/cache';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, setHeaders }) => {
  const supabase = locals.supabase;
  
  if (!supabase) {
    throw error(500, 'Database connection failed');
  }

  try {
    // Get all active categories with their child/template counts
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

    // Get template counts per category
    const { data: templateCounts, error: countError } = await supabase
      .from('hazard_templates')
      .select('category_id')
      .in('status', ['published', 'needs_review', 'draft']);

    if (countError) {
      console.error('Error fetching template counts:', countError);
    }

    // Calculate counts
    const templateCountMap = new Map<string, number>();
    if (templateCounts) {
      for (const t of templateCounts) {
        const count = templateCountMap.get(t.category_id) || 0;
        templateCountMap.set(t.category_id, count + 1);
      }
    }

    // Calculate child counts
    const childCountMap = new Map<string, number>();
    if (categories) {
      for (const cat of categories) {
        if (cat.parent_id) {
          const count = childCountMap.get(cat.parent_id) || 0;
          childCountMap.set(cat.parent_id, count + 1);
        }
      }
    }

    // Enrich categories with counts
    const enrichedCategories = (categories || []).map(cat => ({
      ...cat,
      template_count: templateCountMap.get(cat.id) || 0,
      child_count: childCountMap.get(cat.id) || 0
    }));

    // Build tree structure
    const rootCategories = enrichedCategories.filter(c => c.level === 0);
    const categoryMap = new Map(enrichedCategories.map(c => [c.id, c]));

    // Add children arrays to each category
    for (const cat of enrichedCategories) {
      (cat as any).children = enrichedCategories.filter(c => c.parent_id === cat.id);
    }

      // Cache categories for 1 day (they rarely change)
  setCacheHeaders(setHeaders, 'categories');

  return json({
      success: true,
      categories: rootCategories,
      stats: {
        rootCategories: rootCategories.length,
        totalCategories: enrichedCategories.length,
        totalTemplates: Array.from(templateCountMap.values()).reduce((a, b) => a + b, 0)
      }
    });
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    console.error('Error in hierarchy endpoint:', err);
    throw error(500, 'Internal server error');
  }
};
