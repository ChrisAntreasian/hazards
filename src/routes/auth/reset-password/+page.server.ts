import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('Auth: No authenticated user for password reset');
      return {
        user: null,
        error: 'Authentication required. Please click the password reset link from your email again.'
      };
    }

    console.log('Auth: User authenticated for password reset -', user.email);
    return {
      user: {
        id: user.id,
        email: user.email
      },
      error: null
    };
  } catch (error) {
    console.error('Auth: Reset password page load error:', error);
    return {
      user: null,
      error: 'Failed to verify authentication status. Please try the password reset link again.'
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('Auth: No authenticated user for password update');
        return fail(401, { 
          error: 'Authentication session expired. Please request a new password reset link.',
          sessionExpired: true
        });
      }

      console.log('Auth: Updating password for', user.email);

      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Auth: Password reset error -', updateError.message);
        if (updateError.message.includes('session')) {
          return fail(401, { 
            error: 'Session expired. Please request a new password reset link.',
            sessionExpired: true
          });
        }
        return fail(400, { error: updateError.message });
      }

      console.log('Auth: Password reset successful for', user.email);
      
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.warn('Auth: Sign out failed after password reset:', signOutError.message);
      }
      
      throw redirect(303, '/auth/log-in?message=Password updated successfully! Please sign in with your new password.');
      
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
        throw error;
      }
      
      if (error instanceof Response) {
        throw error;
      }
      
      console.error('Auth: Password reset error:', error instanceof Error ? error.message : String(error));
      
      return fail(500, { error: 'Unexpected error during password reset. Please try again.' });
    }
  }
};
