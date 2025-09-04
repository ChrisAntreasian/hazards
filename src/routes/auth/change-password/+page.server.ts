import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies }) => {
  const supabase = createSupabaseServerClient({ url, cookies });
  
  if (!supabase) {
    return {
      session: null,
      user: null,
      error: 'Supabase not configured'
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require authentication for password change
  if (!session || !user) {
    throw redirect(303, '/auth/log-in?returnUrl=/auth/change-password');
  }

  return {
    session,
    user,
    meta: {
      title: 'Change Password - Hazards App',
      description: 'Update your account password'
    }
  };
};
