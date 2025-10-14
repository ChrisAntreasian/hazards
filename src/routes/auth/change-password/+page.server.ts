import { fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import { protectRoute } from '$lib/utils/routeProtection';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  try {
    // Protect this route - require auth and block during password reset
    const { user } = await protectRoute(event, {
      requireAuth: true,
      blockDuringPasswordReset: true,
      redirectTo: '/auth/log-in?returnUrl=/auth/change-password'
    });

    if (!user) {
      throw new Error('User should not be null after successful protection check');
    }

    const supabase = createSupabaseServerClient(event);
    if (!supabase) {
      return {
        session: null,
        user: null,
        error: 'Supabase not configured'
      };
    }

    const { data: { session } } = await supabase.auth.getSession();

    return {
      session,
      user,
      meta: {
        title: 'Change Password - Hazards App',
        description: 'Update your account password'
      }
    };

  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('Change password load error:', error);
    throw error;
  }
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.email) {
        return fail(401, { error: 'Not authenticated' });
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return fail(400, { error: 'Current password is incorrect' });
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Auth: Password update failed:', updateError.message);
        return fail(400, { error: updateError.message });
      }

      console.log('Auth: Password updated successfully');
      
      return {
        success: true,
        message: 'Password updated successfully!'
      };
      
    } catch (error) {
      console.error('Auth: Password change error:', error);
      return fail(500, { error: 'Unexpected error during password change' });
    }
  }
};
