import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { createSupabaseLoadClient, signOut as supabaseSignOut } from '$lib/supabase';
import { authStore, user, session, loading, initialized } from '$lib/stores/auth';
import type { UseAuthReturn, RouteGuardOptions } from '$lib/types/auth';

/**
 * Auth hook for managing authentication state
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
    }
  };

  const refreshAuth = async () => {
    console.warn('refreshAuth disabled - client auth methods hang. Use server-side auth state instead.');
    return;
    
    /* DISABLED - Client auth methods hang
    if (!supabase) return;
    
    authStore.setLoading(true);
    try {
      // Get fresh session and user data
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (sessionError || userError || !session || !user) {
        authStore.clearAuthState();
      } else {
        authStore.dispatch({ 
          type: 'REFRESH_SESSION', 
          payload: { user, session } 
        });
      }
    } catch (error) {
      authStore.clearAuthState();
    }
    */
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
    if (requireAuth && !currentSession) {
      goto(`${redirectTo}?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }

    if (allowedRoles.length > 0 && currentUser) {
      const userRole = currentUser.user_metadata?.role || 'new_user';
      if (!allowedRoles.includes(userRole)) {
        goto('/dashboard');
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
