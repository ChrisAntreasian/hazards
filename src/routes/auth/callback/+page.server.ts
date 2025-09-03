import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return {
      status: 'error',
      message: 'Authentication service not available',
      error: 'Supabase not configured'
    };
  }

  const url = new URL(event.request.url);
  const accessToken = url.searchParams.get('access_token');
  const refreshToken = url.searchParams.get('refresh_token');
  const type = url.searchParams.get('type');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  console.log('🔍 Callback URL:', event.request.url);
  console.log('🔍 Callback parameters:', {
    accessToken: accessToken ? 'present' : 'missing',
    refreshToken: refreshToken ? 'present' : 'missing', 
    type,
    error,
    allParams: Object.fromEntries(url.searchParams)
  });

  // Handle errors from the callback URL
  if (error) {
    console.log('❌ Callback error:', error, errorDescription);
    return {
      status: 'error',
      message: 'Authentication failed',
      error: errorDescription || error
    };
  }

  // If no tokens in query params, redirect to handle client-side processing
  // This handles the case where Supabase uses URL fragments instead of query params
  if (!accessToken || !refreshToken) {
    console.log('⚠️ No tokens in query params, redirecting for client-side processing');
    return {
      status: 'redirect',
      message: 'Processing authentication...',
      needsClientProcessing: true
    };
  }

  try {
    // Check if this is a password recovery flow
    // Supabase may not always set type=recovery, so check multiple indicators
    const isPasswordRecovery = type === 'recovery' || 
                              url.pathname.includes('recovery') ||
                              url.searchParams.has('recovery') ||
                              event.request.referrer?.includes('forgot-password');
    
    console.log('🔍 Is password recovery:', isPasswordRecovery);

    if (type === 'signup' || type === 'email_change') {
      // Email confirmation
      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          return {
            status: 'error',
            message: 'Failed to confirm email',
            error: sessionError.message
          };
        }

        console.log('✅ Email confirmed successfully for:', data.user?.email);
        
        return {
          status: 'success',
          message: 'Email confirmed successfully! Welcome to Hazards App.',
          redirectTo: '/dashboard'
        };
      } else {
        return {
          status: 'error',
          message: 'Invalid confirmation link',
          error: 'Missing required parameters'
        };
      }
    } else if (isPasswordRecovery || (accessToken && refreshToken)) {
      // Password recovery - set session and redirect to reset password page
      if (accessToken && refreshToken) {
        console.log('🔍 Setting session for password recovery...');
        
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.log('❌ Session error:', sessionError);
          return {
            status: 'error',
            message: 'Invalid password reset link',
            error: sessionError.message
          };
        }

        console.log('✅ Password recovery session established for:', data.user?.email);
        
        // Redirect immediately for password recovery
        throw redirect(303, '/auth/reset-password');
      } else {
        console.log('❌ Missing tokens for password recovery');
        return {
          status: 'error',
          message: 'Invalid password reset link',
          error: 'Missing required parameters'
        };
      }
    } else {
      // Generic callback - check if we have tokens
      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          return {
            status: 'error',
            message: 'Authentication failed',
            error: sessionError.message
          };
        }
        
        return {
          status: 'success',
          message: 'Authentication successful.',
          redirectTo: '/dashboard'
        };
      } else {
        return {
          status: 'error',
          message: 'Invalid authentication link',
          error: 'Missing required parameters'
        };
      }
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('❌ Callback handling error:', error);
    return {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return {
        status: 'error',
        error: 'Supabase not configured'
      };
    }

    const body = await event.request.json();
    const { access_token, refresh_token, type } = body;

    console.log('🔍 POST callback with tokens:', { 
      hasAccessToken: !!access_token, 
      hasRefreshToken: !!refresh_token, 
      type 
    });

    if (!access_token || !refresh_token) {
      return {
        status: 'error',
        error: 'Missing authentication tokens'
      };
    }

    try {
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        console.log('❌ Session error:', sessionError);
        return {
          status: 'error',
          error: sessionError.message
        };
      }

      console.log('✅ Session established for:', data.user?.email);

      if (type === 'recovery') {
        return {
          status: 'success',
          redirectTo: '/auth/reset-password'
        };
      } else {
        return {
          status: 'success', 
          redirectTo: '/dashboard'
        };
      }

    } catch (error) {
      console.error('❌ Session setup error:', error);
      return {
        status: 'error',
        error: 'Failed to establish session'
      };
    }
  }
};
