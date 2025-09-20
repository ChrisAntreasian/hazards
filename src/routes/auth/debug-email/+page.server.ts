import { createSupabaseServerClient } from '$lib/supabase.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return {
      error: 'Debug page not available in production'
    };
  }

  return {
    environment: process.env.NODE_ENV,
    url: event.url.origin
  };
};

export const actions: Actions = {
  testEmail: async (event) => {
    if (process.env.NODE_ENV === 'production') {
      return fail(403, { error: 'Debug actions not available in production' });
    }

    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    const formData = await event.request.formData();
    const testEmail = formData.get('testEmail') as string;

    if (!testEmail) {
      return fail(400, { error: 'Email address is required' });
    }

    try {
      console.log('🧪 Testing password reset email to:', testEmail);
      console.log('🧪 Origin:', event.url.origin);
      console.log('🧪 Redirect URL will be:', `${event.url.origin}/auth/callback?type=recovery`);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: `${event.url.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        console.error('❌ Test email error:', error);
        return {
          success: false,
          error: error.message,
          details: {
            email: testEmail,
            redirectUrl: `${event.url.origin}/auth/callback?type=recovery`,
            timestamp: new Date().toISOString()
          }
        };
      }

      console.log('✅ Test email sent successfully');
      console.log('🧪 Response data:', data);
      
      return {
        success: true,
        message: 'Password reset email sent successfully',
        details: {
          email: testEmail,
          redirectUrl: `${event.url.origin}/auth/callback?type=recovery`,
          timestamp: new Date().toISOString(),
          response: data
        }
      };
      
    } catch (error) {
      console.error('❌ Test email exception:', error);
      return fail(500, { 
        error: 'Failed to send test email',
        details: {
          email: testEmail,
          exception: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  checkConfig: async (event) => {
    if (process.env.NODE_ENV === 'production') {
      return fail(403, { error: 'Debug actions not available in production' });
    }

    const supabase = createSupabaseServerClient(event);
    
    if (!supabase) {
      return fail(500, { error: 'Supabase not configured' });
    }

    try {
      // Try to get the current session (should be null for this debug page)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      return {
        success: true,
        config: {
          supabaseConfigured: !!supabase,
          hasSession: !!session,
          sessionError: sessionError?.message || null,
          environment: process.env.NODE_ENV,
          origin: event.url.origin,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      return fail(500, {
        error: 'Failed to check configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
