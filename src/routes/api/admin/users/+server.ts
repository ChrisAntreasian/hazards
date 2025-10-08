import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '$lib/supabase';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from '@sveltejs/kit';
import type { AdminUserData, UserRole, AdminApiResponse } from '$lib/types/admin.js';

// Create admin supabase client that bypasses RLS
function createAdminSupabaseClient() {
  const supabaseUrl = PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(`Missing environment variables: URL=${!!supabaseUrl}, Key=${!!serviceRoleKey}`);
  }
  
  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// GET - Fetch users with pagination and filtering
export const GET: RequestHandler = async (event) => {
  const { url } = event;
  const supabase = createSupabaseServerClient(event);
  const adminSupabase = createAdminSupabaseClient();
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    // Use admin client to bypass RLS for checking user role
    const { data: userProfile } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'moderator'].includes(userProfile.role)) {
      throw error(403, 'Admin access required');
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Build query using admin client to see all users
    let query = adminSupabase
      .from('users')
      .select(`
        id,
        email,
        role,
        trust_score,
        total_contributions,
        created_at,
        updated_at
      `, { count: 'exact' });

    // Add filters
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Add sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Add pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, count, error: fetchError } = await query;

    if (fetchError) {
      throw error(500, `Failed to fetch users: ${fetchError.message}`);
    }

    // Transform data to AdminUserData format
    const adminUsers: AdminUserData[] = (users || []).map(userData => ({
      id: userData.id,
      email: userData.email,
      role: userData.role as UserRole,
      trust_score: userData.trust_score || 0,
      is_active: userData.role !== 'banned', // Derive from role since there's no is_active column
      created_at: userData.created_at,
      updated_at: userData.updated_at,
      last_login_at: undefined, // Not available in current schema
      profile: {
        display_name: userData.email.split('@')[0] // Use email prefix as display name fallback
      }
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    const response = {
      success: true,
      data: adminUsers,
      pagination: {
        page: page,
        limit: limit,
        total: count || 0,
        pages: totalPages
      }
    };

    return json(response);
  } catch (err) {
    console.error('Error fetching users:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};

// PUT - Update user role, trust score, or ban status
export const PUT: RequestHandler = async (event) => {
  const { request } = event;
  const supabase = createSupabaseServerClient(event);
  const adminSupabase = createAdminSupabaseClient();
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    // Use admin client to check permissions
    const { data: userProfile } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      throw error(403, 'Admin access required');
    }

    const { userId, role, trustScore, notes } = await request.json();

    if (!userId) {
      throw error(400, 'User ID is required');
    }

    // Prevent self-demotion
    if (userId === user.id && role !== 'admin') {
      throw error(400, 'Cannot change your own admin role');
    }

    // Validate role - note: these are the actual roles from the schema
    const validRoles: UserRole[] = ['new_user', 'contributor', 'trusted_user', 'content_editor', 'moderator', 'admin', 'banned'];
    if (role && !validRoles.includes(role)) {
      throw error(400, 'Invalid role specified');
    }

    // Validate trust score
    if (trustScore !== undefined && (trustScore < 0 || trustScore > 1000)) {
      throw error(400, 'Trust score must be between 0 and 1000');
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (role) updates.role = role;
    if (trustScore !== undefined) updates.trust_score = trustScore;

    // Update user using admin client
    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw error(500, `Failed to update user: ${updateError.message}`);
    }

    // Log admin action using admin client
    await adminSupabase
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action_type: 'user_update',
        target_type: 'user',
        target_id: userId,
        details: {
          changes: updates,
          notes: notes || null,
          timestamp: new Date().toISOString()
        }
      });

    const response: AdminApiResponse<AdminUserData> = {
      success: true,
      data: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        role: updatedProfile.role,
        trust_score: updatedProfile.trust_score,
        is_active: updatedProfile.role !== 'banned', // Derive from role
        created_at: updatedProfile.created_at,
        updated_at: updatedProfile.updated_at,
        last_login_at: undefined, // Not available in schema
        profile: {
          display_name: updatedProfile.email.split('@')[0]
        }
      },
      message: 'User updated successfully'
    };

    return json(response);
  } catch (err) {
    console.error('Error updating user:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};

// DELETE - Ban user (soft delete)
export const DELETE: RequestHandler = async (event) => {
  const { url } = event;
  const supabase = createSupabaseServerClient(event);
  const adminSupabase = createAdminSupabaseClient();
  
  if (!supabase) {
    throw error(500, 'Supabase not configured');
  }

  try {
    // Check authentication and admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw error(401, 'Authentication required');
    }

    // Use admin client to check permissions
    const { data: userProfile } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      throw error(403, 'Admin access required');
    }

    const userId = url.searchParams.get('userId');
    const reason = url.searchParams.get('reason');

    if (!userId) {
      throw error(400, 'User ID is required');
    }

    if (!reason || reason.trim().length < 5) {
      throw error(400, 'Ban reason must be at least 5 characters long');
    }

    // Prevent self-banning
    if (userId === user.id) {
      throw error(400, 'Cannot ban yourself');
    }

    // Ban the user by changing their role using admin client
    const { error: banError } = await adminSupabase
      .from('users')
      .update({
        role: 'banned', // Set to banned role
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (banError) {
      throw error(500, `Failed to ban user: ${banError.message}`);
    }

    // Log admin action using admin client
    await adminSupabase
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action_type: 'user_ban',
        target_type: 'user',
        target_id: userId,
        details: {
          reason: reason.trim(),
          timestamp: new Date().toISOString()
        }
      });

    const response: AdminApiResponse = {
      success: true,
      message: 'User banned successfully'
    };

    return json(response);
  } catch (err) {
    console.error('Error banning user:', err);
    const response: AdminApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    return json(response, { status: 500 });
  }
};