// External library imports
import { get } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';

// SvelteKit framework imports
import { goto } from '$app/navigation';

// Internal utility imports
import { createSupabaseLoadClient, signOut as supabaseSignOut } from '$lib/supabase';
import { authStore, user, session, loading, initialized } from '$lib/stores/auth';

// Type-only imports
import type { UseAuthReturn, RouteGuardOptions } from '$lib/types/auth';

/**
 * Comprehensive authentication hook providing sign out functionality and auth state management.
 * Handles Supabase authentication with safe client operations and proper error handling.
 * 
 * @returns UseAuthReturn object containing authentication methods and state
 * 
 * @example
 * ```typescript
 * // In a Svelte component
 * import { useAuth } from '$lib/hooks/useAuth';
 * 
 * const auth = useAuth();
 * 
 * // Sign out user safely
 * const handleSignOut = async () => {
 *   await auth.signOut();
 *   console.log('User signed out');
 * };
 * ```
 * 
 * @see {@link initializeAuth} For server-side auth initialization
 * @see {@link createRouteGuard} For route protection utilities
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
 * Route protection hook for implementing authentication and role-based access control.
 * Provides client-side route guards with configurable authentication requirements
 * and role-based permissions for sensitive pages.
 * 
 * @param options - Configuration object for route protection requirements
 * @param options.requireAuth - Whether authentication is required (default: true)
 * @param options.redirectTo - URL to redirect unauthenticated users (default: '/auth/log-in')
 * @param options.allowedRoles - Array of roles permitted to access the route (default: all roles)
 * @returns Object containing access control functions
 * 
 * @example
 * ```typescript
 * // Protect admin-only page
 * const guard = useRouteGuard({
 *   requireAuth: true,
 *   allowedRoles: ['admin', 'moderator'],
 *   redirectTo: '/auth/log-in'
 * });
 * 
 * // Check access in page component
 * onMount(() => {
 *   if (!guard.checkAccess($user, $session)) {
 *     console.log('Access denied - redirecting');
 *   }
 * });
 * ```
 * 
 * @see {@link RouteGuardOptions} For complete configuration options
 */
export const useRouteGuard = (options: RouteGuardOptions = {}) => {
  const {
    requireAuth = true,
    redirectTo = '/auth/log-in',
    allowedRoles = []
  } = options;

  const checkAccess = (currentUser: User | null, currentSession: Session | null) => {
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
 * Initializes client-side authentication state with data from server-side rendering.
 * Must be called in the root layout to establish auth state before page components mount.
 * Prevents auth state mismatches between server and client during hydration.
 * 
 * @param serverSession - Session object from server-side auth check (may be null)
 * @param serverUser - User object from server-side auth check (may be null)
 * 
 * @example
 * ```typescript
 * // In +layout.server.ts
 * export const load = async ({ locals }) => {
 *   return {
 *     session: locals.session,
 *     user: locals.user
 *   };
 * };
 * 
 * // In +layout.svelte
 * import { initializeAuth } from '$lib/hooks/useAuth';
 * 
 * export let data;
 * 
 * onMount(() => {
 *   initializeAuth(data.session, data.user);
 * });
 * ```
 * 
 * @see {@link useAuth} For client-side auth operations after initialization
 */
export const initializeAuth = (serverSession: Session | null, serverUser: User | null = null) => {
  authStore.initialize(serverUser, serverSession);
};
