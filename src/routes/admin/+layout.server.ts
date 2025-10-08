import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw redirect(303, '/auth/log-in?message=Supabase not configured');
  }

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw redirect(303, '/auth/log-in?returnUrl=' + encodeURIComponent(event.url.pathname));
    }

    // Get user role and permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, trust_score, email')
      .eq('id', user.id)
      .single();

    console.log('Admin access check for user:', user.email, user.id);
    console.log('User profile query result:', userProfile, profileError);

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw redirect(303, '/dashboard?error=Unable to verify permissions - Profile not found');
    }

    // Check if user has admin permissions (only admins can access admin page)
    if (!userProfile || userProfile.role !== 'admin') {
      console.log('Access denied. User role:', userProfile?.role, 'Required: admin');
      throw redirect(303, '/dashboard?error=Admin access required');
    }

    console.log('Admin access granted');

    return {
      user: {
        id: user.id,
        email: user.email,
        role: userProfile.role,
        trust_score: userProfile.trust_score,
        display_name: user.user_metadata?.display_name || userProfile.email.split('@')[0]
      }
    };

  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('Admin page load error:', error);
    throw redirect(303, '/dashboard?error=Unable to load admin dashboard');
  }
};