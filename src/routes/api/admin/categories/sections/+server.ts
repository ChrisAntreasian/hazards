import { json, error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import type { RequestHandler } from '@sveltejs/kit';

interface SectionConfig {
  id?: string;
  category_id: string | null;
  section_id: string;
  section_title: string;
  is_universal: boolean;
  is_required: boolean;
  display_order: number;
  prompt_hint?: string;
}

// GET - Fetch section config for a category (or universal sections)
export const GET: RequestHandler = async (event) => {
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

    if (!userProfile || !['admin', 'moderator'].includes(userProfile.role)) {
      throw error(403, 'Admin access required');
    }

    const categoryId = url.searchParams.get('category_id');
    
    let query = supabase
      .from('category_section_config')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (categoryId) {
      // Get sections for specific category + universal sections
      query = query.or(`category_id.eq.${categoryId},category_id.is.null`);
    } else {
      // Get all sections
    }

    const { data: sections, error: fetchError } = await query;

    if (fetchError) {
      throw error(500, `Failed to fetch sections: ${fetchError.message}`);
    }

    return json({
      success: true,
      data: sections || []
    });
  } catch (err) {
    console.error('Error fetching sections:', err);
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
};

// POST - Create a new section for a category
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

    const sectionData: SectionConfig = await request.json();

    if (!sectionData.section_id?.trim() || !sectionData.section_title?.trim()) {
      throw error(400, 'Section ID and title are required');
    }

    const { data: newSection, error: createError } = await supabase
      .from('category_section_config')
      .insert({
        category_id: sectionData.category_id || null,
        section_id: sectionData.section_id.trim().toLowerCase().replace(/\s+/g, '_'),
        section_title: sectionData.section_title.trim(),
        is_universal: sectionData.is_universal || false,
        is_required: sectionData.is_required || false,
        display_order: sectionData.display_order || 99,
        prompt_hint: sectionData.prompt_hint || null
      })
      .select()
      .single();

    if (createError) {
      throw error(500, `Failed to create section: ${createError.message}`);
    }

    return json({
      success: true,
      data: newSection,
      message: 'Section created successfully'
    });
  } catch (err) {
    console.error('Error creating section:', err);
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
};

// PUT - Update section configuration
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

    const { id, ...updateData }: SectionConfig & { id: string } = await request.json();

    if (!id) {
      throw error(400, 'Section ID is required');
    }

    const filteredUpdateData: Partial<SectionConfig> = {};
    
    if (updateData.section_title !== undefined) {
      filteredUpdateData.section_title = updateData.section_title;
    }
    if (updateData.is_required !== undefined) {
      filteredUpdateData.is_required = updateData.is_required;
    }
    if (updateData.display_order !== undefined) {
      filteredUpdateData.display_order = updateData.display_order;
    }
    if (updateData.prompt_hint !== undefined) {
      filteredUpdateData.prompt_hint = updateData.prompt_hint;
    }

    const { data: updatedSection, error: updateError } = await supabase
      .from('category_section_config')
      .update(filteredUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw error(500, `Failed to update section: ${updateError.message}`);
    }

    return json({
      success: true,
      data: updatedSection,
      message: 'Section updated successfully'
    });
  } catch (err) {
    console.error('Error updating section:', err);
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
};

// DELETE - Remove a section from a category
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

    const sectionId = url.searchParams.get('id');
    if (!sectionId) {
      throw error(400, 'Section ID is required');
    }

    // Check if it's a universal section
    const { data: section } = await supabase
      .from('category_section_config')
      .select('is_universal')
      .eq('id', sectionId)
      .single();

    if (section?.is_universal) {
      throw error(400, 'Cannot delete universal sections. Set is_required to false instead.');
    }

    const { error: deleteError } = await supabase
      .from('category_section_config')
      .delete()
      .eq('id', sectionId);

    if (deleteError) {
      throw error(500, `Failed to delete section: ${deleteError.message}`);
    }

    return json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting section:', err);
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
};
