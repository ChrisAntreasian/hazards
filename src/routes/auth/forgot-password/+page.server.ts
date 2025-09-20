import { createSupabaseServerClient } from '$lib/supabase.js';
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
      console.log('🔍 Environment:', process.env.NODE_ENV);
      console.log('🔍 Origin:', event.url.origin);
      console.log('🔍 Supabase URL:', PUBLIC_SUPABASE_URL);
      
      // Use a more specific redirect URL for password reset
      const redirectUrl = `${event.url.origin}/auth/callback?type=recovery`;
      console.log('🔍 Redirect URL:', redirectUrl);
      console.log('🔍 IMPORTANT: This redirect URL must be configured in your Supabase dashboard under Authentication > URL Configuration');
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          status: error.status,
          code: error.code || 'unknown'
        });
        return fail(400, { 
          error: error.message,
          email
        });
      }

      console.log('✅ Password reset email sent to:', email);
      console.log('🔍 Supabase response:', data);
      console.log('🔍 Expected email link format: [Reset Link]?type=recovery#access_token=...&refresh_token=...');
      console.log('🔍 Alternative format (Auth Code): [Reset Link]?code=...&type=recovery');
      
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
