import { createSupabaseLoadClient } from '$lib/supabase.js';
import { authStore } from '$lib/stores/auth.js';

/**
 * Validates current session and refreshes if needed
 */
export async function validateAndRefreshSession() {
  const supabase = createSupabaseLoadClient();
  if (!supabase) return false;

  try {
    // Check if we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (sessionError || userError || !session || !user) {
      return false;
    }

    // Update auth store with fresh data
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
 * Ensures auth state is preserved across page refreshes
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
