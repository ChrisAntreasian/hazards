import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
import type { RequestEvent } from '@sveltejs/kit';

export interface RouteProtectionOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  blockDuringPasswordReset?: boolean;
  resetRedirectTo?: string;
}

/**
 * Reusable route protection logic for server-side load functions
 * Use this in +page.server.ts load functions to protect routes
 */
export async function protectRoute(
  event: RequestEvent, 
  options: RouteProtectionOptions = {}
) {
  const {
    requireAuth = true,
    redirectTo = '/auth/log-in',
    blockDuringPasswordReset = true,
    resetRedirectTo = '/auth/reset-password'
  } = options;

  const supabase = createSupabaseServerClient(event);
  
  if (!supabase && requireAuth) {
    throw redirect(303, redirectTo);
  }

  let user = null;
  let authenticated = false;

  if (supabase) {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (!error && authUser) {
        user = authUser;
        authenticated = true;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }

  // If route requires auth and user is not authenticated
  if (requireAuth && !authenticated) {
    throw redirect(303, redirectTo);
  }

  // Check if user is in password reset flow
  const inPasswordReset = detectPasswordResetContext(event.url.pathname);
  
  // If user is in password reset flow and route should be blocked
  if (blockDuringPasswordReset && inPasswordReset && authenticated) {
    throw redirect(303, resetRedirectTo);
  }

  return { user, authenticated, inPasswordReset };
}

/**
 * Auto-detect password reset context from current path
 * Call this in layouts to automatically set reset state
 */
export function detectPasswordResetContext(pathname: string): boolean {
  return pathname === '/auth/reset-password' || pathname.startsWith('/auth/reset-password');
}

/**
 * Route protection middleware for server-side load functions
 * Returns a function that can be used in load functions
 */
export function createRouteGuard(options: RouteProtectionOptions = {}) {
  return (event: RequestEvent) => protectRoute(event, options);
}
