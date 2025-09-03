import { createSupabaseServerClient } from '$lib/supabase.js';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  resetPassword: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const email = formData.get('email') as string;

    if (!email) {
      return fail(400, { error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, { error: 'Please enter a valid email address' });
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${event.url.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        return fail(400, { error: error.message });
      }

      return {
        success: true,
        message: 'Password reset email sent! Check your inbox for instructions.'
      };
    } catch (error) {
      console.error('Unexpected password reset error:', error);
      return fail(500, { error: 'An unexpected error occurred' });
    }
  }
};
