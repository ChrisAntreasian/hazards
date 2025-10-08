import { createSupabaseServerClient } from '$lib/supabase';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return {
      session: null,
      user: null,
    };
  }

  try {
    // Use getUser() instead of getSession() for security
    // This authenticates the user data by contacting the Supabase Auth server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { session: null, user: null, userRole: null };
    }

    // Fetch user role and permissions
    let userRole = null;
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profileError && userProfile) {
        userRole = userProfile.role;
      }
    } catch (error) {
      console.log('Could not fetch user role (user may be new):', error);
    }

    // Create a minimal session object for auth store compatibility
    // The auth store requires both session and user to be truthy for isAuthenticated
    const minimalSession = {
      user,
      access_token: 'server-validated',
      refresh_token: '',
      expires_in: 3600,
      token_type: 'bearer'
    };

    return { session: minimalSession, user, userRole };
  } catch (error) {
    console.error('Layout auth load error:', error);
    return { session: null, user: null };
  }
};
