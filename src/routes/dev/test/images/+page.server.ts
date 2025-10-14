import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { url, locals, cookies } = event;
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return {
      session: null,
      user: null,
      meta: {
        title: 'Image Upload Test - Hazards App',
        description: 'Test image upload functionality'
      }
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // For test pages, we don't require authentication but provide it if available
  // This allows testing both authenticated and unauthenticated states
  return {
    session,
    user,
    meta: {
      title: 'Image Upload Test - Hazards App',
      description: 'Test image upload functionality'
    }
  };
};
