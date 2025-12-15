import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import type { RequestHandler } from '@sveltejs/kit';
import type { AdminCategoryData, CategoryTreeNode, AdminApiResponse } from '$lib/types/admin';

// GET - Fetch all categories in tree structure
export const GET: RequestHandler = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'moderator'].includes(userProfile.role)) {
      throw error(403, 'Admin access required');
    }

    // Fetch all categories
    const { data: categories, error: fetchError } = await supabase
      .from('hazard_categories')
      .select(`
        id,
        name,
        slug,
        parent_id,
        level,
        path,
        icon,
        description,
        short_description,
        status,
        created_at
      `)
      .order('level', { ascending: true });

    if (fetchError) {
      throw error(500, `Failed to fetch categories: ${fetchError.message}`);
    }

    // Build tree structure
    const categoryMap = new Map<string, CategoryTreeNode>();
    const rootCategories: CategoryTreeNode[] = [];

    // First pass - create all nodes
    categories?.forEach(cat => {
      const node: CategoryTreeNode = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parent_id: cat.parent_id,
        level: cat.level || 0,
        path: cat.path || '',
        icon: cat.icon,
        description: cat.description,
        short_description: cat.short_description,
        status: cat.status,
        created_at: cat.created_at,
        children: []
      };
      categoryMap.set(cat.id, node);
    });

    // Second pass - build tree relationships
    categories?.forEach(cat => {
      const node = categoryMap.get(cat.id)!;
      
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootCategories.push(node);
      }
    });

    // Sort children recursively by name
    const sortChildren = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };
    
    sortChildren(rootCategories);

    const response: AdminApiResponse<CategoryTreeNode[]> = {
      success: true,
      data: rootCategories
    };

    return json(response);
  } catch (err) {
    console.error('Error fetching categories:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};

// POST - Create new category
export const POST: RequestHandler = async (event) => {
  const { request } = event;
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      throw error(403, 'Admin access required');
    }

    const categoryData: AdminCategoryData = await request.json();

    // Validate required fields
    if (!categoryData.name?.trim()) {
      throw error(400, 'Category name is required');
    }

    // Calculate level and path
    let level = 0;
    let slug = categoryData.slug?.trim() || categoryData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    let pathString = slug;
    
    if (categoryData.parent_id) {
      const { data: parentCategory } = await supabase
        .from('hazard_categories')
        .select('level, path')
        .eq('id', categoryData.parent_id)
        .single();
      
      if (parentCategory) {
        level = parentCategory.level + 1;
        pathString = `${parentCategory.path}/${slug}`;
      }
    }

    // Create category
    const { data: newCategory, error: createError } = await supabase
      .from('hazard_categories')
      .insert({
        name: categoryData.name.trim(),
        slug: slug,
        parent_id: categoryData.parent_id || null,
        level: level,
        path: pathString,
        icon: categoryData.icon || null,
        description: categoryData.description || null,
        short_description: categoryData.short_description || null,
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      throw error(500, `Failed to create category: ${createError.message}`);
    }

    const response: AdminApiResponse<AdminCategoryData> = {
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    };

    return json(response);
  } catch (err) {
    console.error('Error creating category:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};

// PUT - Update category or reorder categories
export const PUT: RequestHandler = async (event) => {
  const { request } = event;
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      throw error(403, 'Admin access required');
    }

    const body = await request.json();

    // Handle batch reorder - recalculate levels and paths
    if (body.action === 'reorder' && Array.isArray(body.categories)) {
      const updates = body.categories.map(async (cat: { id: string; parent_id?: string }) => {
        let level = 0;
        let pathString = '';
        
        if (cat.parent_id) {
          const { data: parentCategory } = await supabase
            .from('hazard_categories')
            .select('level, path, name')
            .eq('id', cat.parent_id)
            .single();
          
          if (parentCategory) {
            level = parentCategory.level + 1;
          }
        }

        // Get current category name for path
        const { data: currentCategory } = await supabase
          .from('hazard_categories')
          .select('name')
          .eq('id', cat.id)
          .single();
        
        if (currentCategory) {
          const slugName = currentCategory.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          pathString = cat.parent_id 
            ? `${(await supabase.from('hazard_categories').select('path').eq('id', cat.parent_id).single()).data?.path}/${slugName}`
            : slugName;
        }

        return supabase
          .from('hazard_categories')
          .update({ 
            level: level,
            path: pathString,
            parent_id: cat.parent_id || null
          })
          .eq('id', cat.id);
      });

      await Promise.all(updates);

      const response: AdminApiResponse = {
        success: true,
        message: 'Categories reordered successfully'
      };

      return json(response);
    }

    // Handle single category update
    const { id, ...updateData }: AdminCategoryData & { id: string } = body;

    if (!id) {
      throw error(400, 'Category ID is required');
    }

    // Only allow updating specific fields
    const filteredUpdateData: any = {};
    
    if (updateData.name !== undefined) {
      filteredUpdateData.name = updateData.name;
    }
    if (updateData.slug !== undefined) {
      filteredUpdateData.slug = updateData.slug;
    }
    if (updateData.parent_id !== undefined) {
      filteredUpdateData.parent_id = updateData.parent_id;
    }
    if (updateData.icon !== undefined) {
      filteredUpdateData.icon = updateData.icon;
    }
    if (updateData.description !== undefined) {
      filteredUpdateData.description = updateData.description;
    }
    if (updateData.short_description !== undefined) {
      filteredUpdateData.short_description = updateData.short_description;
    }

    // Recalculate level and path if parent_id or slug is being updated
    if (filteredUpdateData.parent_id !== undefined || filteredUpdateData.slug !== undefined) {
      let level = 0;
      let pathString = '';
      
      const parentId = filteredUpdateData.parent_id ?? (await supabase.from('hazard_categories').select('parent_id').eq('id', id).single()).data?.parent_id;
      
      if (parentId) {
        const { data: parentCategory } = await supabase
          .from('hazard_categories')
          .select('level, path, name')
          .eq('id', parentId)
          .single();
        
        if (parentCategory) {
          level = parentCategory.level + 1;
        }
      }

      // Get the slug to use for path (use new slug if being updated, otherwise existing)
      const slugToUse = filteredUpdateData.slug || 
        (await supabase.from('hazard_categories').select('slug').eq('id', id).single()).data?.slug;
      
      if (slugToUse) {
        pathString = parentId 
          ? `${(await supabase.from('hazard_categories').select('path').eq('id', parentId).single()).data?.path}/${slugToUse}`
          : slugToUse;
      }

      filteredUpdateData.level = level;
      filteredUpdateData.path = pathString;
    }

    const { data: updatedCategory, error: updateError } = await supabase
      .from('hazard_categories')
      .update(filteredUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw error(500, `Failed to update category: ${updateError.message}`);
    }

    const response: AdminApiResponse<AdminCategoryData> = {
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    };

    return json(response);
  } catch (err) {
    console.error('Error updating category:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};

// DELETE - Delete category
export const DELETE: RequestHandler = async (event) => {
  const { url } = event;
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      throw error(403, 'Admin access required');
    }

    const categoryId = url.searchParams.get('id');
    if (!categoryId) {
      throw error(400, 'Category ID is required');
    }

    // Check if category has children
    const { data: children, error: childrenError } = await supabase
      .from('hazard_categories')
      .select('id')
      .eq('parent_id', categoryId)
      .limit(1);

    if (childrenError) {
      throw error(500, 'Failed to check category children');
    }

    if (children && children.length > 0) {
      throw error(400, 'Cannot delete category with child categories');
    }

    // Check if category is in use by hazards
    // Note: Currently hazards table doesn't have direct category reference
    // This check is commented out until hazard-category relationship is implemented
    // const { data: hazards, error: hazardsError } = await supabase
    //   .from('hazards')
    //   .select('id')
    //   .eq('category_id', categoryId)
    //   .limit(1);

    // if (hazardsError) {
    //   throw error(500, 'Failed to check category usage');
    // }

    // if (hazards && hazards.length > 0) {
    //   throw error(400, 'Cannot delete category that is in use by hazards');
    // }

    // Delete category
    const { error: deleteError } = await supabase
      .from('hazard_categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      throw error(500, `Failed to delete category: ${deleteError.message}`);
    }

    const response: AdminApiResponse = {
      success: true,
      message: 'Category deleted successfully'
    };

    return json(response);
  } catch (err) {
    console.error('Error deleting category:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};