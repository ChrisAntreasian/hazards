import { createSupabaseServerClient } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const email = formData.get('email') as string;

    if (!email) {
      return fail(400, { 
        error: 'Email address is required',
        email: ''
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, { 
        error: 'Please enter a valid email address',
        email
      });
    }

    try {
      const redirectUrl = `${event.url.origin}/auth/callback?type=recovery`;
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Auth: Password reset failed:', error.message);
        return fail(400, { 
          error: error.message,
          email
        });
      }

      console.log('Auth: Password reset email sent successfully');
      
      return {
        success: true,
        message: 'Password reset link sent! Check your email and follow the instructions to reset your password.'
      };
      
    } catch (error) {
      console.error('Auth: Password reset error:', error);
      return fail(500, { 
        error: 'Failed to send password reset email. Please try again.',
        email
      });
    }
  }
};
