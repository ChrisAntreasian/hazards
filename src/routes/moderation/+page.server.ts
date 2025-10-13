import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    throw redirect(303, '/auth/log-in?message=Supabase not configured');
  }

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw redirect(303, '/auth/log-in?returnUrl=/moderation');
    }

    // Get user role and permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, trust_score, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw redirect(303, '/dashboard?error=Unable to verify permissions - Profile not found');
    }

    // Check if user has moderation permissions
    const allowedRoles = ['moderator', 'admin'];
    
    if (!userProfile || !allowedRoles.includes(userProfile.role)) {
      throw redirect(303, '/dashboard?error=Insufficient permissions for moderation');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: userProfile.role,
        trust_score: userProfile.trust_score
      }
    };

  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('Moderation page load error:', error);
    throw redirect(303, '/dashboard?error=Unable to load moderation dashboard');
  }
};
