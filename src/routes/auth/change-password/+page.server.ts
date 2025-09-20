import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad, Actions } from './$types';

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

export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;

    if (!currentPassword || !newPassword) {
      return fail(400, { error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return fail(400, { error: 'New password must be at least 6 characters long' });
    }

    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.email) {
        return fail(401, { error: 'Not authenticated' });
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return fail(400, { error: 'Current password is incorrect' });
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        return fail(400, { error: updateError.message });
      }

      console.log('✅ Password updated successfully for:', user.email);
      
      const result = {
        success: true,
        message: 'Password updated successfully!'
      };
      
      console.log('🔍 Returning result:', result);
      return result;
      
    } catch (error) {
      console.log('❌ Password change exception:', error);
      return fail(500, { error: 'Unexpected error during password change' });
    }
  }
};
