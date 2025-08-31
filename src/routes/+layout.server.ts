import { createSupabaseServerClient } from '$lib/supabase.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return {
      session: null,
    };
  }

  // Get session data
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    session,
  };
};
