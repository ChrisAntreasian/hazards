import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad } from './$types';

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

  // Handle errors from the callback URL
  if (error) {
    return {
      status: 'error',
      message: 'Authentication failed',
      error: errorDescription || error
    };
  }

  try {
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
    } else if (type === 'recovery') {
      // Password recovery - set session and redirect to reset password page
      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          return {
            status: 'error',
            message: 'Invalid password reset link',
            error: sessionError.message
          };
        }

        // Redirect immediately for password recovery
        throw redirect(303, '/auth/reset-password');
      } else {
        return {
          status: 'error',
          message: 'Invalid password reset link',
          error: 'Missing required parameters'
        };
      }
    } else {
      // Generic callback - assume success and redirect
      return {
        status: 'success',
        message: 'Authentication callback processed.',
        redirectTo: '/dashboard'
      };
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
