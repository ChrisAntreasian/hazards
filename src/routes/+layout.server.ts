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
    // Get session data with better error handling
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session fetch error:', sessionError);
      return { session: null, user: null };
    }

    // If we have a session, get the user data as well
    let user = null;
    if (session) {
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      if (!userError && userData) {
        user = userData;
      }
    }

    return {
      session,
      user,
    };
  } catch (error) {
    console.error('Unexpected error in layout load:', error);
    return {
      session: null,
      user: null,
    };
  }
};
