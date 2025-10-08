import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';
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
  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Handle errors from the callback URL
  if (error) {
    console.log('Auth: Callback error -', error);
    return {
      status: 'error',
      message: 'Authentication failed',
      error: errorDescription || error
    };
  }

  // Handle authorization code flow
  if (code && !accessToken && !refreshToken) {
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Auth: Code exchange failed -', exchangeError.message);
        
        if (exchangeError.message?.includes('flow_state_expired') || exchangeError.code === 'flow_state_expired') {
          return {
            status: 'error',
            message: 'Password reset link has expired. Please request a new password reset.',
            error: 'The reset link has expired. Links are only valid for a few minutes after being generated.'
          };
        }
        
        return {
          status: 'error',
          message: 'Failed to process authentication code',
          error: exchangeError.message
        };
      }

      console.log('Auth: Code exchange successful for', data.user?.email);
      
      if (type === 'recovery') {
        return {
          status: 'success',
          message: 'Password recovery authenticated successfully',
          redirectTo: '/auth/reset-password'
        };
      } else {
        return {
          status: 'success',
          message: 'Authentication successful',
          redirectTo: '/dashboard'
        };
      }
      
    } catch (error) {
      // Re-throw redirects
      if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
        throw error;
      }
      
      if (error instanceof Response) {
        throw error;
      }
      
      console.error('Auth: Code exchange exception -', error instanceof Error ? error.message : String(error));
      
      return {
        status: 'error',
        message: 'Authentication processing failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // If no tokens and no code in query params, check for client-side processing
  // Supabase might send tokens in URL fragments instead of query params
  if (!accessToken && !refreshToken && !code) {
    // Check various indicators that this might be a password recovery flow
    const isLikelyRecovery = type === 'recovery' || 
                            url.searchParams.has('recovery') ||
                            url.searchParams.get('type') === 'recovery' ||
                            event.request.referrer?.includes('forgot-password') ||
                            url.pathname.includes('recovery');
    
    if (isLikelyRecovery) {
      console.log('⚠️ Password recovery detected but no tokens/code in query params - processing client-side');
      return {
        status: 'redirect',
        message: 'Processing password recovery...',
        needsClientProcessing: true,
        isRecovery: true
      };
    } else {
      console.log('⚠️ No tokens/code in query params, redirecting for client-side processing');
      return {
        status: 'redirect',
        message: 'Processing authentication...',
        needsClientProcessing: true
      };
    }
  }

  try {
    // Check if this is a password recovery flow
    // Supabase may not always set type=recovery, so check multiple indicators
    const isPasswordRecovery = type === 'recovery' || 
                              url.searchParams.get('type') === 'recovery' ||
                              url.pathname.includes('recovery') ||
                              url.searchParams.has('recovery') ||
                              event.request.referrer?.includes('forgot-password');
    
    console.log('🔍 Authentication type analysis:', { 
      type, 
      isPasswordRecovery, 
      referrer: event.request.referrer,
      hasTokens: { accessToken: !!accessToken, refreshToken: !!refreshToken }
    });

    if (type === 'signup' || type === 'email_change') {
      // Email confirmation
      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('❌ Email confirmation session error:', sessionError);
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
    } else if (isPasswordRecovery) {
      // Password recovery - ensure we have tokens
      if (accessToken && refreshToken) {
        console.log('🔍 Setting session for password recovery...');
        
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('❌ Password recovery session error:', sessionError);
          return {
            status: 'error',
            message: 'Invalid password reset link. Please request a new password reset.',
            error: sessionError.message
          };
        }

        console.log('✅ Password recovery session established for:', data.user?.email);
        
        // Return redirect for password recovery
        return {
          status: 'success',
          message: 'Password recovery authenticated successfully',
          redirectTo: '/auth/reset-password'
        };
      } else {
        console.log('❌ Missing tokens for password recovery');
        return {
          status: 'error',
          message: 'Invalid password reset link. Please request a new password reset.',
          error: 'Missing authentication tokens'
        };
      }
    } else if (accessToken && refreshToken) {
      // Generic callback with tokens
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error('❌ Generic callback session error:', sessionError);
        return {
          status: 'error',
          message: 'Authentication failed',
          error: sessionError.message
        };
      }
      
      console.log('✅ Generic authentication successful for:', data.user?.email);
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
  } catch (error) {
    if (error instanceof Response) {
      throw error; // Re-throw redirects
    }
    
    console.error('❌ Callback handling error:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error?.constructor?.name);
    console.error('❌ Full error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      code: (error as any)?.code,
      status: (error as any)?.status
    });
    
    return {
      status: 'error',
      message: 'An unexpected error occurred during authentication',
      error: error instanceof Error ? error.message : String(error),
      debug: {
        type: typeof error,
        constructor: error?.constructor?.name,
        details: error instanceof Error ? error.stack?.split('\n')[0] : String(error)
      }
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

      // Check if this is a recovery/password reset flow
      if (type === 'recovery') {
        console.log('🔄 Password recovery flow - redirecting to reset password');
        return {
          status: 'success',
          redirectTo: '/auth/reset-password'
        };
      } else {
        console.log('🔄 Regular auth flow - redirecting to dashboard');
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
