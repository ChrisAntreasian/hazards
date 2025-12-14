import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  const supabase = locals.supabase;
  
  if (!supabase) {
    throw error(500, 'Database connection failed');
  }

  const pathString = params.path;
  
  if (!pathString) {
    throw error(400, 'Path is required');
  }

  try {
    // Get the category by path
    const { data: category, error: catError } = await supabase
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
      .eq('path', pathString)
      .eq('status', 'active')
      .single();

    if (catError || !category) {
      throw error(404, `Category not found: ${pathString}`);
    }

    // Get child categories
    const { data: children } = await supabase
      .from('hazard_categories')
      .select(`
        id,
        name,
        path,
        level,
        icon,
        description,
        short_description,
        parent_id
      `)
      .eq('parent_id', category.id)
      .eq('status', 'active')
      .order('name');

    // Get templates in this category
    const { data: templates } = await supabase
      .from('hazard_templates')
      .select(`
        id,
        name,
        slug,
        short_description,
        danger_level,
        storage_path,
        has_educational_content,
        status
      `)
      .eq('category_id', category.id)
      .in('status', ['published', 'needs_review', 'draft'])
      .order('name');

    // Get parent chain for breadcrumbs
    const parentChain: any[] = [];
    let currentParentId = category.parent_id;
    
    while (currentParentId) {
      const { data: parent } = await supabase
        .from('hazard_categories')
        .select(`
          id,
          name,
          path,
          level,
          icon,
          parent_id
        `)
        .eq('id', currentParentId)
        .single();

      if (parent) {
        parentChain.unshift(parent);
        currentParentId = parent.parent_id;
      } else {
        break;
      }
    }

    // Get section config for this category
    const { data: sections } = await supabase.rpc('get_category_sections', {
      target_category_id: category.id
    });

    return json({
      success: true,
      data: {
        category,
        children: children || [],
        templates: templates || [],
        parentChain,
        sections: (sections || []).sort((a: any, b: any) => a.display_order - b.display_order)
      }
    });
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    console.error('Error fetching category by path:', err);
    throw error(500, 'Internal server error');
  }
};
