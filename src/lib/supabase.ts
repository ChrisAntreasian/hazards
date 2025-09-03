import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
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
export function createSupabaseServerClient(event: any) {
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

// Enhanced auth helpers with better error handling
export const getCurrentUser = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
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
};

// Deep diagnostic function to understand why auth methods hang
export const diagnoseSupabaseIssues = async (supabase: ReturnType<typeof createSupabaseLoadClient>) => {
  if (!supabase) {
    console.log('❌ No Supabase client');
    return;
  }

  console.log('🔍 DEEP SUPABASE DIAGNOSTICS');
  console.log('============================');
  
  // Check environment
  console.log('Environment:');
  console.log('- URL:', supabaseUrl);
  console.log('- Key length:', supabaseAnonKey.length);
  console.log('- Browser:', navigator.userAgent.split(' ').slice(-2).join(' '));
  
  // Check internal client state
  console.log('\nClient State:');
  try {
    const clientInternal = supabase as any;
    console.log('- Client exists:', !!clientInternal);
    console.log('- Auth exists:', !!clientInternal.auth);
    console.log('- Auth URL:', clientInternal.auth?.url);
    console.log('- Storage key:', clientInternal.auth?.storageKey);
    console.log('- Auto refresh:', clientInternal.auth?.autoRefreshToken);
  } catch (e) {
    console.log('- Error accessing client internals:', e);
  }

  // Test network directly to auth endpoint
  console.log('\nDirect Network Tests:');
  
  // Test 1: Basic auth endpoint
  try {
    const authEndpoint = `${supabaseUrl}/auth/v1/settings`;
    console.log('Testing:', authEndpoint);
    
    const start = Date.now();
    const response = await Promise.race([
      fetch(authEndpoint, {
        headers: { 'apikey': supabaseAnonKey }
      }),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
    ]);
    const duration = Date.now() - start;
    
    console.log(`✅ Auth endpoint responded in ${duration}ms:`, response.status);
    
    if (response.ok) {
      const settings = await response.json();
      console.log('- Settings received:', Object.keys(settings));
    }
  } catch (e) {
    console.log('❌ Auth endpoint failed:', e);
  }

  // Test 2: Session endpoint
  try {
    const sessionEndpoint = `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`;
    console.log('Testing session endpoint connectivity...');
    
    const start = Date.now();
    const response = await Promise.race([
      fetch(sessionEndpoint, {
        method: 'POST',
        headers: { 
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: 'test' })
      }),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      )
    ]);
    const duration = Date.now() - start;
    
    console.log(`✅ Session endpoint responded in ${duration}ms:`, response.status);
  } catch (e) {
    console.log('❌ Session endpoint failed:', e);
  }

  // Test 3: Check localStorage
  console.log('\nLocalStorage Check:');
  try {
    const storageKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'));
    console.log('- Supabase keys found:', storageKeys.length);
    storageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`  - ${key}: ${value ? `${value.length} chars` : 'null'}`);
    });
  } catch (e) {
    console.log('- LocalStorage error:', e);
  }

  // Test 4: Try to trace what happens during getSession
  console.log('\nTracing getSession call:');
  
  const originalFetch = window.fetch;
  const fetchCalls: string[] = [];
  
  try {
    console.log('- Calling getSession...');
    
    // Add some logging to see if we can catch where it hangs
    window.fetch = (url: RequestInfo | URL, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      fetchCalls.push(`FETCH: ${urlString}`);
      console.log(`📡 Fetch called: ${urlString}`);
      return originalFetch(url, options);
    };

    const sessionPromise = supabase.auth.getSession();
    
    // Wait a bit to see what fetch calls are made
    setTimeout(() => {
      console.log('- Fetch calls so far:', fetchCalls);
    }, 1000);

    const result = await Promise.race([
      sessionPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('traced timeout')), 2000)
      )
    ]);
    
    console.log('✅ getSession succeeded!', result);
    
  } catch (e) {
    console.log('❌ getSession trace failed:', e);
  } finally {
    // Always restore original fetch
    window.fetch = originalFetch;
  }

  // Test 5: Check if we can force a localStorage clear and retry
  console.log('\nTesting localStorage clear fix:');
  try {
    // Clear any potential corrupted localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        console.log(`- Removing: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    console.log('- Cleared localStorage, testing getSession again...');
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('still timeout after clear')), 3000)
      )
    ]);
    
    console.log('✅ getSession works after localStorage clear!', result);
    
  } catch (e) {
    console.log('❌ Still fails after localStorage clear:', e);
  }
};

// Manual session management since auth methods hang
export const getSessionManually = async () => {
  try {
    // Get the session from localStorage directly
    const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
    const sessionData = localStorage.getItem(storageKey);
    
    if (!sessionData) {
      return { session: null, user: null, error: null };
    }
    
    const parsedSession = JSON.parse(sessionData);
    
    // Check if session is expired
    if (parsedSession.expires_at && parsedSession.expires_at * 1000 < Date.now()) {
      return { session: null, user: null, error: 'Session expired' };
    }
    
    // Get user data via direct API call since getUser() hangs
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${parsedSession.access_token}`
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      return { 
        session: parsedSession, 
        user: userData, 
        error: null 
      };
    } else {
      return { session: null, user: null, error: 'User fetch failed' };
    }
    
  } catch (error) {
    console.error('Manual session fetch failed:', error);
    return { session: null, user: null, error: error as Error };
  }
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
