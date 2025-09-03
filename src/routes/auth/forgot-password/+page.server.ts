import { createSupabaseServerClient } from '$lib/supabase.js';
import { redirect, fail } from '@sveltejs/kit';
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, { 
        error: 'Please enter a valid email address',
        email
      });
    }

    try {
      console.log('🔍 Sending password reset email to:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${event.url.origin}/auth/callback`,
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        return fail(400, { 
          error: error.message,
          email
        });
      }

      console.log('✅ Password reset email sent to:', email);
      
      return {
        success: true,
        message: 'Password reset link sent! Check your email and follow the instructions to reset your password.'
      };
      
    } catch (error) {
      console.error('❌ Password reset exception:', error);
      return fail(500, { 
        error: 'Failed to send password reset email. Please try again.',
        email
      });
    }
  }
};
