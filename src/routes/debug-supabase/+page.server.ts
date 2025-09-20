import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const currentOrigin = event.url.origin;
  const expectedRedirectUrl = `${currentOrigin}/auth/callback?type=recovery`;
  
  return {
    supabaseUrl: PUBLIC_SUPABASE_URL,
    anonKeyPreview: PUBLIC_SUPABASE_ANON_KEY ? PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'Missing',
    currentOrigin,
    expectedRedirectUrl,
    requiredDashboardUrls: [
      currentOrigin,
      `${currentOrigin}/auth/callback`,
      `${currentOrigin}/auth/callback?type=recovery`,
      // Common development URLs that should be configured
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000'
    ]
  };
};
