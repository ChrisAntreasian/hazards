import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw redirect(303, '/auth/log-in');
  }

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw redirect(303, '/auth/log-in');
    }

    // Fetch regions data that was previously loaded client-side
    const { data: regions, error: regionsError } = await supabase
      .from('regions')
      .select('*')
      .order('name');

    if (regionsError) {
      console.error('Failed to load regions:', regionsError);
      // Don't throw - just return empty regions
    }

    // Fetch user profile data if you have a profiles table
    // const { data: profile, error: profileError } = await supabase
    //   .from('profiles')
    //   .select('*')
    //   .eq('id', user.id)
    //   .single();

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name || 'User',
        emailConfirmed: !!user.email_confirmed_at,
        createdAt: user.created_at
      },
      regions: regions || [],
      // profile: profile || null
    };

  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('Profile load error:', error);
    throw redirect(303, '/auth/log-in');
  }
};

export const actions: Actions = {
  updateProfile: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return fail(401, { error: 'Not authenticated' });
      }

      const formData = await event.request.formData();
      const displayName = formData.get('displayName') as string;

      if (!displayName?.trim()) {
        return fail(400, { error: 'Display name is required' });
      }

      // Update user metadata
      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim()
        }
      });

      if (updateError) {
        console.error('Profile update error:', updateError);
        return fail(400, { error: updateError.message });
      }

      console.log('✅ Profile updated successfully for:', user.email);
      
      return {
        success: true,
        message: 'Profile updated successfully!',
        user: {
          id: updatedUser.user?.id,
          email: updatedUser.user?.email,
          displayName: updatedUser.user?.user_metadata?.display_name || displayName,
          emailConfirmed: !!updatedUser.user?.email_confirmed_at,
          createdAt: updatedUser.user?.created_at
        }
      };
      
    } catch (error) {
      console.log('❌ Profile update exception:', error);
      return fail(500, { error: 'Unexpected error during profile update' });
    }
  }
};
