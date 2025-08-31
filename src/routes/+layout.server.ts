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
    // Get session and user data
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return { session: null, user: null };
    }

    // Always get fresh user data if we have a session
    let user = null;
    if (session) {
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      if (!userError && userData) {
        user = userData;
      }
    }

    return { session, user };
  } catch (error) {
    return { session: null, user: null };
  }
};
