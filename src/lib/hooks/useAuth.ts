import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { createSupabaseLoadClient, signOut as supabaseSignOut } from '$lib/supabase.js';
import { authStore, user, session, loading, initialized } from '$lib/stores/auth.js';
import type { UseAuthReturn, RouteGuardOptions } from '$lib/types/auth.js';

/**
 * Auth hook for managing authentication state in components
 */
export const useAuth = (): UseAuthReturn => {
  const supabase = createSupabaseLoadClient();

  const signOut = async () => {
    if (!supabase) return;
    
    authStore.setLoading(true);
    const { error } = await supabaseSignOut(supabase);
    
    if (!error) {
      authStore.clearAuthState();
      goto('/');
    } else {
      authStore.setLoading(false);
      console.error('Sign out error:', error);
    }
  };

  const refreshAuth = async () => {
    if (!supabase) return;
    
    authStore.setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        authStore.clearAuthState();
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        authStore.initialize(user, session);
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      authStore.clearAuthState();
    }
  };

  return {
    user: get(user),
    session: get(session),
    loading: get(loading),
    initialized: get(initialized),
    signOut,
    refreshAuth
  };
};

/**
 * Route guard hook for protecting pages
 */
export const useRouteGuard = (options: RouteGuardOptions = {}) => {
  const {
    requireAuth = true,
    redirectTo = '/auth/log-in',
    allowedRoles = []
  } = options;

  const checkAccess = (currentUser: any, currentSession: any) => {
    // Check if authentication is required
    if (requireAuth && !currentSession) {
      goto(`${redirectTo}?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }

    // Check role-based access
    if (allowedRoles.length > 0 && currentUser) {
      const userRole = currentUser.user_metadata?.role || 'new_user';
      if (!allowedRoles.includes(userRole)) {
        goto('/dashboard'); // Redirect to safe page
        return false;
      }
    }

    return true;
  };

  return { checkAccess };
};

/**
 * Initialize auth state from server data
 */
export const initializeAuth = (serverSession: any, serverUser: any = null) => {
  authStore.initialize(serverUser, serverSession);
};
