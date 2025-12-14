import { json, error } from '@sveltejs/kit';
import { setCacheHeaders } from '$lib/utils/cache';
import type { RequestHandler } from './$types';

const BUCKET_NAME = 'hazard-educational-content';

export const GET: RequestHandler = async ({ params, locals, setHeaders }) => {
  const supabase = locals.supabase;
  
  if (!supabase) {
    throw error(500, 'Database connection failed');
  }

  // Cache templates for 1 day
  setCacheHeaders(setHeaders, 'templates');

  const slugPath = params.slugPath;
  
  if (!slugPath) {
    throw error(400, 'Slug path is required');
  }

  // Parse path: e.g., "plants/poisonous/poison_ivy" 
  // Last segment is the template slug, rest is category path
  const segments = slugPath.split('/');
  
  if (segments.length < 2) {
    throw error(400, 'Invalid path format. Expected: category/.../slug');
  }

  const templateSlug = segments[segments.length - 1];
  const categoryPath = segments.slice(0, -1).join('/');

  try {
    // Get the category first
    const { data: category, error: catError } = await supabase
      .from('hazard_categories')
      .select('id, name, path, level, icon, parent_id')
      .eq('path', categoryPath)
      .eq('status', 'active')
      .single();

    if (catError || !category) {
      throw error(404, `Category not found: ${categoryPath}`);
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('hazard_templates')
      .select(`
        id,
        name,
        slug,
        scientific_name,
        short_description,
        danger_level,
        storage_path,
        has_educational_content,
        status,
        category_id
      `)
      .eq('slug', templateSlug)
      .eq('category_id', category.id)
      .single();

    if (templateError || !template) {
      throw error(404, `Template not found: ${templateSlug}`);
    }

    // Get sibling templates (same category)
    const { data: siblings } = await supabase
      .from('hazard_templates')
      .select(`
        id,
        name,
        slug,
        short_description,
        danger_level
      `)
      .eq('category_id', category.id)
      .in('status', ['published', 'needs_review', 'draft'])
      .order('name');

    // Get parent chain for breadcrumbs
    const parentChain: any[] = [];
    let currentCat = category;
    parentChain.push(currentCat);
    
    while (currentCat.parent_id) {
      const { data: parent } = await supabase
        .from('hazard_categories')
        .select('id, name, path, level, icon, parent_id')
        .eq('id', currentCat.parent_id)
        .single();

      if (parent) {
        parentChain.unshift(parent);
        currentCat = parent;
      } else {
        break;
      }
    }

    // Get section configuration
    const { data: sectionConfig } = await supabase.rpc('get_category_sections', {
      target_category_id: category.id
    });

    const sections = (sectionConfig || []).sort((a: any, b: any) => a.display_order - b.display_order);

    // Fetch actual content from storage
    const storagePath = template.storage_path || `${categoryPath}/${templateSlug}`;
    const contentSections = [];

    for (const section of sections) {
      const filePath = `${storagePath}/${section.section_id}.md`;
      
      let content: string | null = null;
      let isPlaceholder = false;

      try {
        const { data, error: downloadError } = await supabase.storage
          .from(BUCKET_NAME)
          .download(filePath);

        if (!downloadError && data) {
          content = await data.text();
          isPlaceholder = content.includes('*Content coming soon.*') || 
                          content.includes('*Detailed information coming soon.*') ||
                          content.includes('*Detailed description coming soon.*');
        }
      } catch {
        // File doesn't exist
      }

      contentSections.push({
        sectionId: section.section_id,
        sectionTitle: section.section_title,
        content,
        isUniversal: section.is_universal,
        isRequired: section.is_required,
        isPlaceholder
      });
    }

    return json({
      success: true,
      data: {
        template,
        category,
        parentChain,
        siblings: siblings || [],
        sections: contentSections,
        storagePath
      }
    });
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    console.error('Error fetching template by slug:', err);
    throw error(500, 'Internal server error');
  }
};
