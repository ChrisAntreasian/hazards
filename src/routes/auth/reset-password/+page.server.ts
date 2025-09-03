import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return {
      user: null,
      error: 'Supabase not configured'
    };
  }

  try {
    // Check if user is authenticated via password reset flow
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        user: null,
        error: 'Not authenticated. Please use the password reset link from your email.'
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email
      },
      error: null
    };
  } catch (error) {
    console.error('❌ Reset password page load error:', error);
    return {
      user: null,
      error: 'Failed to verify authentication status'
    };
  }
};

export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!newPassword || !confirmPassword) {
      return fail(400, { error: 'Please fill in all fields' });
    }

    if (newPassword !== confirmPassword) {
      return fail(400, { error: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return fail(400, { error: 'Password must be at least 6 characters long' });
    }

    try {
      // Get the current user (should be authenticated via password reset flow)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return fail(401, { error: 'Not authenticated. Please use the password reset link from your email.' });
      }

      console.log('🔍 Attempting password reset for user:', user.email);

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('❌ Password reset error:', updateError);
        return fail(400, { error: updateError.message });
      }

      console.log('✅ Password reset successfully for:', user.email);
      
      // Use redirect for successful password reset
      redirect(303, '/auth/log-in?message=Password updated successfully! Please sign in with your new password.');
      
    } catch (error) {
      if (error instanceof Response) {
        throw error; // Re-throw redirects
      }
      console.log('❌ Password reset exception:', error);
      return fail(500, { error: 'Unexpected error during password reset' });
    }
  }
};
