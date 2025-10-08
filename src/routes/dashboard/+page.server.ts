import { protectRoute } from '$lib/utils/routeProtection.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
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
    // If protectRoute didn't handle it, something is wrong
    throw error;
  }
};
