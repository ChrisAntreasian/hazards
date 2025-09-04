import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw redirect(303, '/auth/log-in');
  }

  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ Dashboard access denied - no valid session');
      throw redirect(303, '/auth/log-in');
    }

    console.log('✅ Dashboard access granted for:', user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name || 'User',
        profileImageUrl: user.user_metadata?.profile_image_url || null,
        emailConfirmed: !!user.email_confirmed_at,
        createdAt: user.created_at,
        // Include full user metadata for compatibility
        user_metadata: user.user_metadata
      }
    };

  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('Dashboard load error:', error);
    throw redirect(303, '/auth/log-in');
  }
};
