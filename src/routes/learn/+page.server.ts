import type { PageServerLoad } from './$types';

interface CategoryWithCounts {
  id: string;
  name: string;
  path: string;
  level: number;
  icon: string;
  description: string | null;
  short_description: string | null;
  child_count: number;
  template_count: number;
}

export const load: PageServerLoad = async ({ locals }) => {
  const supabase = locals.supabase;
  
  if (!supabase) {
    console.error('Supabase client not initialized');
    return { categories: [] };
  }

  try {
    // Get root categories (level 0)
    const { data: rootCategories, error: catError } = await supabase
      .from('hazard_categories')
      .select(`
        id,
        name,
        path,
        level,
        icon,
        description,
        short_description
      `)
      .eq('level', 0)
      .eq('status', 'active')
      .order('name');

    if (catError) {
      console.error('Error fetching categories:', catError);
      return { categories: [] };
    }

    // Get counts for each root category
    const categoriesWithCounts: CategoryWithCounts[] = await Promise.all(
      (rootCategories || []).map(async (cat) => {
        // Count direct child categories
        const { count: childCount } = await supabase
          .from('hazard_categories')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', cat.id)
          .eq('status', 'active');

        // Count templates in this category and all subcategories
        // First get all descendant category IDs
        const { data: descendants } = await supabase
          .from('hazard_categories')
          .select('id')
          .like('path', `${cat.path}%`)
          .eq('status', 'active');

        const categoryIds = [cat.id, ...(descendants || []).map(d => d.id)];

        const { count: templateCount } = await supabase
          .from('hazard_templates')
          .select('id', { count: 'exact', head: true })
          .in('category_id', categoryIds);

        return {
          ...cat,
          child_count: childCount || 0,
          template_count: templateCount || 0
        };
      })
    );

    // Get total stats
    const { count: totalCategories } = await supabase
      .from('hazard_categories')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: totalTemplates } = await supabase
      .from('hazard_templates')
      .select('id', { count: 'exact', head: true });

    return {
      categories: categoriesWithCounts,
      stats: {
        totalCategories: totalCategories || 0,
        totalTemplates: totalTemplates || 0,
        rootCategories: categoriesWithCounts.length
      }
    };
  } catch (err) {
    console.error('Error loading learn page data:', err);
    return { 
      categories: [],
      stats: { totalCategories: 0, totalTemplates: 0, rootCategories: 0 }
    };
  }
};
