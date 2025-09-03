import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const url = new URL(event.request.url);
  
  // Simulate typical Supabase password reset callback parameters
  const testParams = {
    access_token: url.searchParams.get('access_token') || 'test_access_token',
    refresh_token: url.searchParams.get('refresh_token') || 'test_refresh_token',
    expires_in: url.searchParams.get('expires_in') || '3600',
    token_type: url.searchParams.get('token_type') || 'bearer',
    type: url.searchParams.get('type') || 'recovery'
  };

  // Generate a test callback URL
  const callbackUrl = new URL('/auth/callback', event.url.origin);
  Object.entries(testParams).forEach(([key, value]) => {
    callbackUrl.searchParams.set(key, value);
  });

  return {
    originalUrl: event.request.url,
    testCallbackUrl: callbackUrl.toString(),
    parameters: testParams
  };
};
