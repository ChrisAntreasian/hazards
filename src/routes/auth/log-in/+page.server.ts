import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const message = url.searchParams.get('message');
  
  return {
    message
  };
};

export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const returnUrl = formData.get('returnUrl') as string || '/dashboard';

    if (!email || !password) {
      return fail(400, { 
        error: 'Email and password are required',
        email
      });
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Auth: Login failed:', authError.message);
      if (authError.message.includes("Email not confirmed")) {
        return fail(400, { 
          error: "Please check your email and click the confirmation link before signing in. Check your spam folder if you don't see it.",
          email
        });
      } else {
        return fail(400, { 
          error: authError.message,
          email
        });
      }
    }

    if (!data.user || !data.session) {
      console.error('Auth: No user or session data received');
      return fail(400, { 
        error: 'Login failed - no user data received',
        email
      });
    }

    console.log('Auth: Login successful for', data.user.email);

    redirect(303, returnUrl);
  }
};
