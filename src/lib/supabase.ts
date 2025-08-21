import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './types/database.js';

export function createSupabaseLoadClient() {
  return createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}

export function createSupabaseServerClient(fetch: typeof globalThis.fetch) {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => {
        // This will be implemented when we set up the server hooks
        return '';
      },
      set: (key, value, options) => {
        // This will be implemented when we set up the server hooks
      },
      remove: (key, options) => {
        // This will be implemented when we set up the server hooks
      },
    },
    global: {
      fetch,
    },
  });
}

// Helper functions for common operations
export const getCurrentUser = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signOut = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  const { error } = await supabase.auth.signOut();
  return { error };
};
