import { createSupabaseLoadClient } from '$lib/supabase.js';
import { authStore, session as sessionStore, user as userStore } from '$lib/stores/auth.js';
import { get } from 'svelte/store';
import type { AuthState } from '$lib/types/auth.js';

/**
 * Validates current session and refreshes if needed
 * Note: Client auth methods hang, so this now relies on server-side session data
 */
export async function validateAndRefreshSession() {
  // Client auth methods hang, so we can't validate session client-side
  // Session validation should be done server-side via +layout.server.ts
  console.warn('validateAndRefreshSession: Client auth methods hang, using server session data instead');
  
  // Check if we already have valid session data from server
  const currentAuth = get(authStore);
  return !!currentAuth.user;
}

/**
 * Refreshes user data after profile updates
 */
export async function refreshUserData() {
  const supabase = createSupabaseLoadClient();
  if (!supabase) return false;

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (userError || sessionError || !user || !session) {
      return false;
    }

    // Update auth store with fresh user data
    authStore.dispatch({
      type: 'REFRESH_SESSION',
      payload: { user, session }
    });

    return true;
  } catch (error) {
    return false;
  }
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
 * Ensures session is synchronized between auth store and Supabase client
 */
export function preserveAuthState() {
  if (typeof window === 'undefined') return;

  // Listen for page visibility changes
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      // Page became visible - validate session
      await validateAndRefreshSession();
    }
  });

  // Listen for focus events
  window.addEventListener('focus', async () => {
    await validateAndRefreshSession();
  });
}
