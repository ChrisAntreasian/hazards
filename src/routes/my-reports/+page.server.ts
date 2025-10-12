import { protectRoute } from '$lib/utils/routeProtection.js';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  try {
    // Protect this route - require auth and block during password reset
    const { user, authenticated } = await protectRoute(event, {
      requireAuth: true,
      blockDuringPasswordReset: true
    });

    console.log('✅ My Reports access granted for:', user?.email);

    // User is guaranteed to be non-null due to protectRoute check
    if (!user) {
      throw new Error('User should not be null after successful protection check');
    }

    // Create Supabase client to fetch user's hazards
    const supabase = createSupabaseServerClient(event);
    
    let userHazards: any[] = [];
    let hazardStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    if (supabase) {
      try {
        console.log('🔍 Fetching hazards for my-reports page for user:', user.id);
        
        // Use PostgreSQL function to get user's hazards (bypasses RLS issues)
        const { data: hazardResults, error: hazardsError } = await supabase
          .rpc('get_user_hazards', { p_user_id: user.id });

        if (hazardsError) {
          console.error('❌ Error fetching user hazards in my-reports:', hazardsError);
        } else {
          // Transform the results to match expected structure
          userHazards = (hazardResults || []).map((hazard: any) => ({
            ...hazard,
            hazard_categories: {
              name: hazard.category_name,
              icon: hazard.category_icon
            }
          }));
          
          console.log('✅ Found hazards for my-reports:', userHazards.length, 'hazards for user', user.id);
          
          // Calculate stats
          hazardStats.total = userHazards.length;
          hazardStats.pending = userHazards.filter(h => h.status === 'pending').length;
          hazardStats.approved = userHazards.filter(h => h.status === 'approved').length;
          hazardStats.rejected = userHazards.filter(h => h.status === 'rejected').length;
          
          console.log('📊 My Reports Stats:', hazardStats);
        }
      } catch (err) {
        console.error('💥 Error in my-reports hazards query:', err);
      }
    }

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
      },
      userHazards,
      hazardStats
    };

  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('My Reports load error:', error);
    // If protectRoute didn't handle it, something is wrong
    throw error;
  }
};