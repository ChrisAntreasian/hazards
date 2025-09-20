import { createSupabaseServerClient } from '$lib/supabase.js';
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
      return { session: null, user: null };
    }

    // Return user data - session is not needed for most use cases
    return { session: null, user };
  } catch (error) {
    console.error('Layout auth load error:', error);
    return { session: null, user: null };
  }
};
