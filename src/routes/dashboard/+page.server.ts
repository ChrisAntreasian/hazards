import { protectRoute } from '$lib/utils/routeProtection.js';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  // Add dependency for invalidation when trust scores change
  event.depends('trust-score-data');
  
  try {
    // Protect this route - require auth and block during password reset
    const { user, authenticated } = await protectRoute(event, {
      requireAuth: true,
      blockDuringPasswordReset: true
    });

    console.log('✅ Dashboard access granted for:', user?.email);

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
    let userTrustScore = 0;
    let recentActivity: any[] = [];

    if (supabase) {
      try {
        // Fetch user's trust score from database
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('trust_score')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('❌ Error fetching user profile:', profileError);
        } else {
          userTrustScore = userProfile?.trust_score || 0;
          console.log('✅ User trust score loaded:', userTrustScore);
        }

        console.log('🔍 Fetching hazards for user:', user.id);
        
        // Use PostgreSQL function to get user's hazards (bypasses RLS issues)
        console.log('🔧 About to call RPC function get_user_hazards with params:', { p_user_id: user.id });
        const { data: hazardResults, error: hazardsError } = await supabase
          .rpc('get_user_hazards', { p_user_id: user.id });

        console.log('🔧 RPC call result:', { data: hazardResults, error: hazardsError });

        if (hazardsError) {
          console.error('❌ Error fetching user hazards:', hazardsError);
        } else {
          // Transform the results to match expected structure
          userHazards = (hazardResults || []).map((hazard: any) => ({
            ...hazard,
            hazard_categories: {
              name: hazard.category_name,
              icon: hazard.category_icon
            }
          }));
          
          console.log('✅ Found hazards:', userHazards.length, 'hazards for user', user.id);
          
          // Calculate stats
          hazardStats.total = userHazards.length;
          hazardStats.pending = userHazards.filter(h => h.status === 'pending').length;
          hazardStats.approved = userHazards.filter(h => h.status === 'approved').length;
          hazardStats.rejected = userHazards.filter(h => h.status === 'rejected').length;
          
          console.log('📊 Stats:', hazardStats);
        }

        // Fetch recent activity (including moderation decisions)
        const { data: activityData, error: activityError } = await supabase
          .from('moderation_queue')
          .select(`
            id,
            status,
            resolved_at,
            created_at,
            moderator_notes,
            hazards:content_id (
              id,
              title,
              status
            )
          `)
          .eq('submitted_by', user.id)
          .eq('type', 'hazard')
          .order('resolved_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (activityError) {
          console.error('❌ Error fetching recent activity:', activityError);
        } else {
          recentActivity = activityData || [];
          console.log('✅ Recent activity loaded:', recentActivity.length, 'items');
        }
      } catch (err) {
        console.error('💥 Error in hazards query:', err);
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
        trustScore: userTrustScore,
        // Include full user metadata for compatibility
        user_metadata: user.user_metadata
      },
      userHazards,
      hazardStats,
      recentActivity: recentActivity || []
    };

  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('Dashboard load error:', error);
    // If protectRoute didn't handle it, something is wrong
    throw error;
  }
};
