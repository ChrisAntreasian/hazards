import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { Actions } from './$types';

export const actions: Actions = {
  signIn: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const returnUrl = formData.get('returnUrl') as string || '/dashboard';

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' });
    }

    try {
      console.log('🔍 Server-side login attempt for:', email);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.log('❌ Server login error:', authError);
        if (authError.message.includes("Email not confirmed")) {
          return fail(400, { 
            error: "Please check your email and click the confirmation link before signing in. Check your spam folder if you don't see it."
          });
        } else {
          return fail(400, { error: authError.message });
        }
      }

      if (!data.user || !data.session) {
        return fail(400, { error: 'Login failed - no user data received' });
      }

      // Verify user data by getting fresh user info from server for security
      const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !verifiedUser) {
        console.log('❌ User verification failed after login:', userError);
        await supabase.auth.signOut();
        return fail(400, { error: 'Login verification failed' });
      }

      if (!verifiedUser.email_confirmed_at) {
        // Sign out unconfirmed user
        await supabase.auth.signOut();
        return fail(400, { 
          error: "Please confirm your email address before signing in. Check your email for a confirmation link."
        });
      }

      console.log('✅ Server-side login successful for:', verifiedUser.email);
      
      // Return success with redirect URL instead of throwing redirect
      // This allows the client form enhancement to handle the navigation
      return {
        success: true,
        redirectUrl: returnUrl
      };
      
    } catch (error) {
      console.log('❌ Server login exception:', error);
      return fail(500, { error: 'Unexpected error during sign in' });
    }
  },

  signUp: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;

    if (!email || !password || !displayName) {
      return fail(400, {
        error: 'All fields are required',
        email,
        displayName
      });
    }

    if (password.length < 6) {
      return fail(400, {
        error: 'Password must be at least 6 characters long',
        email,
        displayName
      });
    }

    try {
      console.log('🔍 Server-side registration attempt for:', email);
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: `${event.url.origin}/auth/callback`,
        },
      });

      if (authError) {
        console.log('❌ Server registration error:', authError);
        return fail(400, {
          error: authError.message,
          email,
          displayName
        });
      }

      if (signUpData.user && !signUpData.session) {
        // Email confirmation required
        console.log('✅ Registration successful, confirmation required for:', email);
        return {
          success: true,
          message: 'Please check your email and click the confirmation link to complete registration.',
          email
        };
      }

      if (signUpData.user && signUpData.session) {
        // Auto sign-in successful
        console.log('✅ Registration and auto sign-in successful for:', email);
        throw redirect(303, '/dashboard');
      }

      return fail(400, {
        error: 'Registration failed - no user data received',
        email,
        displayName
      });

    } catch (error) {
      if (error instanceof Response) {
        throw error; // Re-throw redirects
      }
      
      console.log('❌ Server registration exception:', error);
      return fail(500, {
        error: 'Registration failed. Please try again.',
        email,
        displayName
      });
    }
  },

  changePassword: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;

    if (!currentPassword || !newPassword) {
      return fail(400, { error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return fail(400, { error: 'New password must be at least 6 characters long' });
    }

    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.email) {
        return fail(401, { error: 'Not authenticated' });
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return fail(400, { error: 'Current password is incorrect' });
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        return fail(400, { error: updateError.message });
      }

      console.log('✅ Password updated successfully for:', user.email);
      
      return {
        success: true,
        message: 'Password updated successfully!'
      };
      
    } catch (error) {
      console.log('❌ Password change exception:', error);
      return fail(500, { error: 'Unexpected error during password change' });
    }
  },

  signOut: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return fail(500, { error: 'Failed to sign out' });
      }
      
    } catch (error) {
      return fail(500, { error: 'Unexpected error during sign out' });
    }

    throw redirect(303, '/');
  },

  refreshSession: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return fail(401, { error: 'Failed to refresh session' });
      }

      return { session };
    } catch (error) {
      return fail(500, { error: 'Unexpected error during session refresh' });
    }
  },

  handleCallback: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const url = new URL(event.request.url);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');
    const type = url.searchParams.get('type');

    try {
      if (type === 'signup' || type === 'email_change') {
        // Email confirmation
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            return fail(400, { 
              error: 'Failed to confirm email',
              details: sessionError.message 
            });
          }

          console.log('✅ Email confirmed successfully for:', data.user?.email);
          throw redirect(303, '/dashboard');
        } else {
          return fail(400, { 
            error: 'Invalid confirmation link',
            details: 'Missing required parameters' 
          });
        }
      } else if (type === 'recovery') {
        // Password recovery - redirect to password reset page with session
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            return fail(400, { 
              error: 'Invalid password reset link',
              details: sessionError.message 
            });
          }

          throw redirect(303, '/auth/reset-password');
        } else {
          return fail(400, { 
            error: 'Invalid password reset link',
            details: 'Missing required parameters' 
          });
        }
      } else {
        // Generic callback - assume success and redirect
        throw redirect(303, '/dashboard');
      }
    } catch (error) {
      if (error instanceof Response) {
        throw error; // Re-throw redirects
      }
      
      console.error('❌ Callback handling error:', error);
      return fail(500, { 
        error: 'Authentication callback failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
