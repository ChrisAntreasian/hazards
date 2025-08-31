import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './types/database.js';

// Check if environment variables are set
const supabaseUrl = PUBLIC_SUPABASE_URL || 'your_supabase_project_url';
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key';

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'your_supabase_project_url' && supabaseAnonKey !== 'your_supabase_anon_key';
};

// Create browser client
export function createSupabaseLoadClient() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Please update your .env.local file.');
    return null;
  }
  
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Create server client
export function createSupabaseServerClient(event: any) {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => event.cookies.set(key, value, options),
      remove: (key, options) => event.cookies.delete(key, options),
    },
    global: {
      fetch: event.fetch,
    },
  });
}

// Enhanced auth helpers with better error handling
export const getCurrentUser = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  if (!supabase) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    return null;
  }
};

export const signOut = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  if (!supabase) return { error: new Error('Supabase not configured') };
  
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    // Clear local storage items that might persist
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    return { error };
  } catch (e: any) {
    console.error('Sign out error:', e);
    return { error: e };
  }
};

// Enhanced session helpers
export const getSessionWithRetry = async (
  supabase: ReturnType<typeof createSupabaseLoadClient>,
  maxRetries = 3,
  delay = 1000
) => {
  if (!supabase) return { session: null, user: null };

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn(`Session fetch attempt ${i + 1} failed:`, error);
        if (i === maxRetries - 1) return { session: null, user: null };
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const { data: { user } } = await supabase.auth.getUser();
      return { session, user };
    } catch (error) {
      console.warn(`Session fetch attempt ${i + 1} error:`, error);
      if (i === maxRetries - 1) return { session: null, user: null };
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { session: null, user: null };
};

// Validate session integrity
export const validateSession = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  if (!supabase) return false;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return !error && !!user;
  } catch {
    return false;
  }
};
