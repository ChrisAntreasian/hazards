import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { Actions } from './$types';

export const actions: Actions = {
  signOut: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return fail(500, { error: 'Failed to sign out' });
      }
      
    } catch (error) {
      return fail(500, { error: 'Unexpected error during sign out' });
    }

    throw redirect(303, '/');
  },

  refreshSession: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return fail(401, { error: 'Failed to refresh session' });
      }

      return { session };
    } catch (error) {
      return fail(500, { error: 'Unexpected error during session refresh' });
    }
  }
};
