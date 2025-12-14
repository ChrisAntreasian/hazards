import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'hazard-educational-content';

interface CategoryInfo {
  id: string;
  name: string;
  path: string;
  level: number;
  icon: string;
  description: string | null;
  short_description: string | null;
  parent_id: string | null;
}

interface TemplateInfo {
  id: string;
  name: string;
  slug: string;
  scientific_name: string | null;
  short_description: string | null;
  danger_level: number | null;
  storage_path: string | null;
  has_educational_content: boolean;
  category_id: string;
}

interface SectionConfig {
  section_id: string;
  section_title: string;
  is_universal: boolean;
  is_required: boolean;
  display_order: number;
}

interface ContentSection {
  sectionId: string;
  sectionTitle: string;
  content: string | null;
  isUniversal: boolean;
  isRequired: boolean;
  isPlaceholder: boolean;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const supabase = locals.supabase;
  
  if (!supabase) {
    throw error(500, 'Database connection failed');
  }

  const pathString = params.path || '';
  const segments = pathString ? pathString.split('/') : [];

  // If no path, this shouldn't happen (root /learn is handled by +page.svelte)
  if (segments.length === 0) {
    throw error(404, 'Path required');
  }

  try {
    // First, try to find a category matching the full path
    const { data: category } = await supabase
      .from('hazard_categories')
      .select(`
        id, name, path, level, icon, description, short_description, parent_id
      `)
      .eq('path', pathString)
      .eq('status', 'active')
      .single();

    if (category) {
      // It's a category page
      return await loadCategoryPage(supabase, category, segments);
    }

    // Not a category - check if the last segment is a template slug
    if (segments.length >= 2) {
      const templateSlug = segments[segments.length - 1];
      const categoryPath = segments.slice(0, -1).join('/');

      const { data: parentCategory } = await supabase
        .from('hazard_categories')
        .select(`
          id, name, path, level, icon, description, short_description, parent_id
        `)
        .eq('path', categoryPath)
        .eq('status', 'active')
        .single();

      if (parentCategory) {
        const { data: template } = await supabase
          .from('hazard_templates')
          .select(`
            id, name, slug, scientific_name, short_description, 
            danger_level, storage_path, has_educational_content, category_id
          `)
          .eq('slug', templateSlug)
          .eq('category_id', parentCategory.id)
          .single();

        if (template) {
          // It's a template/hazard page
          return await loadTemplatePage(supabase, template, parentCategory, segments);
        }
      }
    }

    // Nothing found
    throw error(404, `Page not found: ${pathString}`);

  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    console.error('Error loading learn page:', err);
    throw error(500, 'Failed to load page');
  }
};

async function loadCategoryPage(
  supabase: SupabaseClient,
  category: CategoryInfo,
  segments: string[]
) {
  // Get child categories
  const { data: children } = await supabase
    .from('hazard_categories')
    .select(`
      id, name, path, level, icon, description, short_description, parent_id
    `)
    .eq('parent_id', category.id)
    .eq('status', 'active')
    .order('name');

  // Get templates in this category
  const { data: templates } = await supabase
    .from('hazard_templates')
    .select(`
      id, name, slug, short_description, danger_level, 
      storage_path, has_educational_content, category_id
    `)
    .eq('category_id', category.id)
    .in('status', ['published', 'needs_review', 'draft'])
    .order('name');

  // Get parent chain for breadcrumbs
  const parentChain = await getParentChain(supabase, category);

  // Get child counts for children
  const childrenWithCounts = await Promise.all(
    (children || []).map(async (child) => {
      const { count: childCount } = await supabase
        .from('hazard_categories')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', child.id)
        .eq('status', 'active');

      const { count: templateCount } = await supabase
        .from('hazard_templates')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', child.id);

      return {
        ...child,
        child_count: childCount || 0,
        template_count: templateCount || 0
      };
    })
  );

  return {
    pageType: 'category' as const,
    category,
    children: childrenWithCounts,
    templates: templates || [],
    parentChain,
    segments
  };
}

async function loadTemplatePage(
  supabase: SupabaseClient,
  template: TemplateInfo,
  category: CategoryInfo,
  segments: string[]
) {
  // Get parent chain for breadcrumbs (including current category)
  const parentChain = await getParentChain(supabase, category);
  parentChain.push(category);

  // Get sibling templates
  const { data: siblings } = await supabase
    .from('hazard_templates')
    .select(`
      id, name, slug, short_description, danger_level
    `)
    .eq('category_id', category.id)
    .in('status', ['published', 'needs_review', 'draft'])
    .order('name');

  // Get section configuration
  const { data: sectionConfig } = await supabase.rpc('get_category_sections', {
    target_category_id: category.id
  });

  const sections: SectionConfig[] = (sectionConfig || [])
    .sort((a: SectionConfig, b: SectionConfig) => a.display_order - b.display_order);

  // Fetch actual content from storage
  const categoryPath = segments.slice(0, -1).join('/');
  const storagePath = template.storage_path || `${categoryPath}/${template.slug}`;
  const contentSections: ContentSection[] = [];

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
      // File doesn't exist - that's ok
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

  return {
    pageType: 'template' as const,
    template,
    category,
    parentChain,
    siblings: siblings || [],
    sections: contentSections,
    storagePath,
    segments
  };
}

async function getParentChain(
  supabase: SupabaseClient,
  category: CategoryInfo
): Promise<CategoryInfo[]> {
  const chain: CategoryInfo[] = [];
  let currentParentId = category.parent_id;

  while (currentParentId) {
    const { data: parent } = await supabase
      .from('hazard_categories')
      .select(`
        id, name, path, level, icon, description, short_description, parent_id
      `)
      .eq('id', currentParentId)
      .single();

    if (parent) {
      chain.unshift(parent);
      currentParentId = parent.parent_id;
    } else {
      break;
    }
  }

  return chain;
}
