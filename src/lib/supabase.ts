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

export function createSupabaseServerClient(event: any) {
  // Only create client if we have real credentials
  if (supabaseUrl === 'your_supabase_project_url' || supabaseAnonKey === 'your_supabase_anon_key') {
    return null;
  }
  
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (key) => {
        return event.cookies.get(key);
      },
      set: (key, value, options) => {
        event.cookies.set(key, value, options);
      },
      remove: (key, options) => {
        event.cookies.delete(key, options);
      },
    },
    global: {
      fetch: event.fetch,
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
  
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    // Also clear any local storage items that might persist
    if (typeof window !== 'undefined') {
      // Clear supabase auth tokens from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    return { error };
  } catch (e: any) {
    return { error: e };
  }
};

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'your_supabase_project_url' && supabaseAnonKey !== 'your_supabase_anon_key';
};
