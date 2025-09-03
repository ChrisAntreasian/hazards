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
    // Get session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { session: null, user: null };
    }

    // Always use getUser() instead of session.user for security
    // This authenticates the user data by contacting the Supabase Auth server
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // If user verification fails, clear the session
      return { session: null, user: null };
    }

    return { session, user };
  } catch (error) {
    console.error('Layout auth load error:', error);
    return { session: null, user: null };
  }
};
