import { redirect, fail } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const displayName = formData.get('displayName') as string;

    // Server-side validation
    if (!email || !password || !confirmPassword || !displayName) {
      return fail(400, {
        error: 'All fields are required',
        email,
        displayName
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, {
        error: 'Please enter a valid email address',
        email,
        displayName
      });
    }

    // Password validation
    if (password.length < 6) {
      return fail(400, {
        error: 'Password must be at least 6 characters long',
        email,
        displayName
      });
    }

    if (password !== confirmPassword) {
      return fail(400, {
        error: 'Passwords do not match',
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
        
        // Handle specific error cases with user-friendly messages
        if (authError.message.includes('User already registered') || 
            authError.message.includes('already registered') ||
            authError.message.includes('already exists') ||
            authError.message.includes('duplicate') ||
            authError.message.includes('email address is already in use')) {
          return fail(400, {
            error: 'An account with this email address already exists. Please try signing in instead.',
            email,
            displayName
          });
        }
        
        if (authError.message.includes('Invalid email')) {
          return fail(400, {
            error: 'Please enter a valid email address.',
            email,
            displayName
          });
        }
        
        if (authError.message.includes('Password should be at least')) {
          return fail(400, {
            error: 'Password must be at least 6 characters long.',
            email,
            displayName
          });
        }
        
        if (authError.message.includes('weak password') || authError.message.includes('password strength')) {
          return fail(400, {
            error: 'Please choose a stronger password. Use a mix of letters, numbers, and symbols.',
            email,
            displayName
          });
        }
        
        // Default to the original error message for other cases
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
        redirect(303, '/dashboard');
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
  }
};
