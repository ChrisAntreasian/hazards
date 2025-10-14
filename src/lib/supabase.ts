import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { RequestEvent } from '@sveltejs/kit';
import type { Database } from './types/database.js';

// Check if environment variables are set
const supabaseUrl = PUBLIC_SUPABASE_URL || 'your_supabase_project_url';
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key';

// Export the configuration values
export { supabaseUrl, supabaseAnonKey };

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'your_supabase_project_url' && supabaseAnonKey !== 'your_supabase_anon_key';
};

// Singleton instance to prevent multiple clients
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Create browser client using singleton pattern with SSR package
export function createSupabaseLoadClient() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Please update your .env.local file.');
    return null;
  }
  
  // Return existing instance if it exists
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Create new instance with configuration that works with server-side sessions
  supabaseInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: isBrowser() ? window.localStorage : undefined,
      autoRefreshToken: false, // Disable since server handles this
      persistSession: false,   // Let server manage sessions
      detectSessionInUrl: false,
      flowType: 'implicit'
    }
  });
  
  return supabaseInstance;
}

// Function to fix auth state mismatch
export const fixAuthStateMismatch = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  if (!supabase) return;
  
  console.log('🔧 Attempting to fix auth state mismatch...');
  
  // Clear localStorage completely
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Reset the Supabase client singleton to force recreation
  supabaseInstance = null;
  
  console.log('✅ Cleared localStorage and reset client');
  return true;
};

// Create server client with enhanced cookie handling
export function createSupabaseServerClient(event: RequestEvent) {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => {
        event.cookies.set(key, value, {
          ...options,
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        });
      },
      remove: (key, options) => {
        event.cookies.delete(key, {
          ...options,
          path: '/'
        });
      },
    },
    global: {
      fetch: event.fetch,
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}

// Enhanced auth helpers with better error handling - DISABLED to prevent hanging
export const getCurrentUser = async () => {
  console.warn('getCurrentUser disabled - client auth methods hang. Use server-side auth instead.');
  return null;
  
  /* DISABLED - Client auth methods hang
  if (!supabase) return null;
  
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }, error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error('getUser timeout')), 5000)
      )
    ]);
    
    if (result.error) {
      console.error('getCurrentUser error:', result.error);
      return null;
    }
    return result.data.user;
  } catch (error) {
    console.error('getCurrentUser failed:', error);
    return null;
  }
  */
};

// Deep diagnostic function - DISABLED to prevent hanging
export const diagnoseSupabaseIssues = async () => {
  console.warn('diagnoseSupabaseIssues disabled - contains hanging client auth methods. Use server-side auth diagnostics instead.');
  return;
  
  /* DISABLED - Contains hanging client auth method calls
  Original function contained supabase.auth.getSession() calls that hang
  */
};

// Manual session management - DISABLED to prevent hanging
export const getSessionManually = async () => {
  console.warn('getSessionManually disabled - manual session access can cause issues. Use server-side auth instead.');
  return { session: null, user: null, error: 'Function disabled' };
  
  /* DISABLED - Manual localStorage access and direct API calls
  Original function accessed localStorage directly and made API calls
  that could hang or cause security issues
  */
};

// Manual sign out since auth.signOut() hangs
export const signOutManually = async () => {
  try {
    // Clear localStorage
    const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
    const sessionData = localStorage.getItem(storageKey);
    
    if (sessionData) {
      const parsedSession = JSON.parse(sessionData);
      
      // Try to notify Supabase about the logout (but don't wait for it)
      fetch(`${supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${parsedSession.access_token}`
        }
      }).catch(() => {
        // Ignore errors - we're logging out anyway
      });
    }
    
    // Clear all auth-related localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    
    return { error: null };
    
  } catch (error) {
    console.error('Manual sign out failed:', error);
    return { error: error as Error };
  }
};

// Backward-compatible signOut function that works with server sessions
export const signOut = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  console.log('🔍 Attempting logout...');
  
  try {
    // Use SvelteKit's built-in form action for server-side logout
    const response = await fetch('/auth?/signOut', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('✅ Server logout successful');
      return { error: null };
    } else {
      console.log('❌ Server logout failed:', response.status);
      // Try alternative logout method
      return await fallbackLogout();
    }
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Try alternative logout method
    return await fallbackLogout();
  }
};

// Fallback logout that clears everything locally
async function fallbackLogout() {
  console.log('🔍 Using fallback logout...');
  
  // Clear all auth-related storage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear session storage too
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('✅ Local session cleared');
  return { error: null };
}

// Enhanced session helpers - DISABLED to prevent hanging
export const getSessionWithRetry = async () => {
  console.warn('getSessionWithRetry disabled - client auth methods hang. Use server-side auth instead.');
  return { session: null, user: null };

  /* DISABLED - Client auth methods hang
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
  */
};

// Validate session integrity - DISABLED to prevent hanging
export const validateSession = async () => {
  console.warn('validateSession disabled - client auth methods hang. Use server-side auth instead.');
  return false;

  /* DISABLED - Client auth methods hang
  if (!supabase) return false;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return !error && !!user;
  } catch {
    return false;
  }
  */
};
