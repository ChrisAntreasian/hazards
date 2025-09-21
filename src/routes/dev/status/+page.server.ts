import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const load = async (event: any) => {
  const currentTime = new Date().toISOString();
  const currentOrigin = event.url.origin;
  
  return {
    status: {
      timestamp: currentTime,
      supabase: {
        url: PUBLIC_SUPABASE_URL,
        configured: !!(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY),
        anonKeyPreview: PUBLIC_SUPABASE_ANON_KEY ? PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'Missing'
      },
      server: {
        origin: currentOrigin,
        port: event.url.port || 'unknown',
        environment: process.env.NODE_ENV || 'unknown'
      },
      endpoints: {
        forgotPassword: `${currentOrigin}/auth/forgot-password`,
        callback: `${currentOrigin}/auth/callback`,
        resetPassword: `${currentOrigin}/auth/reset-password`,
        diagnostic: `${currentOrigin}/api/diagnostic`
      },
      flow: {
        step1: 'User enters email on forgot password page',
        step2: 'Supabase sends email with reset link',
        step3: 'Link redirects to callback with authorization code',
        step4: 'Server exchanges code for session',
        step5: 'User redirected to reset password page',
        step6: 'User sets new password'
      }
    }
  };
};
