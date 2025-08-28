import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './types/database.js';

// Check if environment variables are set
const supabaseUrl = PUBLIC_SUPABASE_URL || 'your_supabase_project_url';
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key';

export function createSupabaseLoadClient() {
  // Only create client if we have real credentials
  if (supabaseUrl === 'your_supabase_project_url' || supabaseAnonKey === 'your_supabase_anon_key') {
    console.warn('Supabase not configured. Please update your .env.local file.');
    return null;
  }
  
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createSupabaseServerClient(fetch: typeof globalThis.fetch) {
  // Only create client if we have real credentials
  if (supabaseUrl === 'your_supabase_project_url' || supabaseAnonKey === 'your_supabase_anon_key') {
    return null;
  }
  
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
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
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signOut = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'your_supabase_project_url' && supabaseAnonKey !== 'your_supabase_anon_key';
};
