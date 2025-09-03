import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
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

    console.log('🔍 Server-side login attempt for:', email);
    console.log('🔍 Return URL:', returnUrl);
    
    // Sign in with password
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('🔍 Auth response data:', JSON.stringify(data, null, 2));
    console.log('🔍 Auth response error:', JSON.stringify(authError, null, 2));

    if (authError) {
      console.log('❌ Server login error:', authError);
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
      console.log('❌ No user or session data received');
      return fail(400, { 
        error: 'Login failed - no user data received',
        email
      });
    }

    console.log('✅ Initial login successful');
    console.log('✅ User:', data.user?.email);
    console.log('✅ Session exists:', !!data.session);

    // Skip the extra verification for now to isolate the issue
    // TODO: Re-enable verification once basic login works
    /*
    // Verify user data by getting fresh user info from server for security
    const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
    
    console.log('🔍 Verified user:', JSON.stringify(verifiedUser, null, 2));
    console.log('🔍 User error:', JSON.stringify(userError, null, 2));
    
    if (userError || !verifiedUser) {
      console.log('❌ User verification failed after login:', userError);
      await supabase.auth.signOut();
      return fail(400, { 
        error: 'Login verification failed',
        email
      });
    }

    if (!verifiedUser.email_confirmed_at) {
      console.log('❌ User email not confirmed');
      // Sign out unconfirmed user
      await supabase.auth.signOut();
      return fail(400, { 
        error: "Please confirm your email address before signing in. Check your email for a confirmation link.",
        email
      });
    }
    */

    console.log('✅ Server-side login successful for:', data.user.email);
    console.log('🔀 Redirecting to:', returnUrl);
    
    // Use redirect for successful login - proper SvelteKit pattern
    redirect(303, returnUrl);
  }
};
