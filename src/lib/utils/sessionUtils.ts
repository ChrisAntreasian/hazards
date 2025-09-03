import { createSupabaseLoadClient } from '$lib/supabase.js';
import { authStore, session as sessionStore, user as userStore } from '$lib/stores/auth.js';
import { get } from 'svelte/store';
import type { AuthState } from '$lib/types/auth.js';

/**
 * Validates current session and refreshes if needed
 * Note: Client auth methods hang, so this is now disabled - session validation happens server-side only
 */
export async function validateAndRefreshSession() {
  // Session validation is now handled entirely server-side via +layout.server.ts
  // Client-side validation is disabled because Supabase client auth methods hang
  
  // Just check if we have session data in our store (no client calls)
  const currentAuth = get(authStore);
  return !!currentAuth.user && !!currentAuth.session;
}

/**
 * Refreshes user data after profile updates
 * Note: Client auth methods hang, so this now relies on server-side data updates
 */
export async function refreshUserData() {
  // Client auth methods hang, so we can't refresh user data client-side
  // User data refresh should be handled by server-side actions and page reloads
  console.log('refreshUserData: Client auth methods disabled, use server-side refresh instead');
  
  // Just check current store state
  const currentAuth = get(authStore);
  return !!currentAuth.user && !!currentAuth.session;
}

/**
 * Ensures session is synchronized between auth store and Supabase client
 * Note: Client auth methods hang, so this now just checks store state
 */
export async function ensureSessionSync() {
  console.log("=== Session Sync Started (client methods disabled) ===");
  
  try {
    // Get the current session from our auth store
    const currentSession = get(sessionStore);
    console.log("Auth store session:", { 
      hasSession: !!currentSession, 
      hasAccessToken: !!currentSession?.access_token 
    });
    
    if (!currentSession?.access_token) {
      console.log("No valid session in auth store");
      return false;
    }

    // Client auth methods hang, so we just trust the store state
    console.log("Session sync successful (using store data only)");
    return true;
  } catch (error) {
    console.error("Session sync error:", error);
    return false;
  }
}

/**
 * Session preservation (disabled in favor of server-side auth)
 * Note: Client-side session validation is disabled because auth methods hang
 */
export function preserveAuthState() {
  if (typeof window === 'undefined') return;

  // Session preservation is now handled entirely server-side
  // Client-side event listeners are disabled to prevent hanging auth method calls
  console.log('preserveAuthState: Client-side session preservation disabled, using server-side auth only');
  
  // No event listeners - auth state is managed purely server-side via:
  // 1. +layout.server.ts loads fresh session data on every page load
  // 2. Form actions handle auth state changes 
  // 3. Redirects force page reloads with fresh server data
}
