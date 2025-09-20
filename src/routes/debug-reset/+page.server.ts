import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return {
      error: 'Supabase not configured'
    };
  }

  const testEmail = 'test@example.com';
  const redirectUrl = `${event.url.origin}/auth/callback?type=recovery`;
  
  console.log('🔍 Debug - Testing password reset URL generation');
  console.log('🔍 Test email:', testEmail);
  console.log('🔍 Redirect URL:', redirectUrl);
  console.log('🔍 Origin:', event.url.origin);
  console.log('🔍 Full URL:', event.url);

  return {
    testEmail,
    redirectUrl,
    origin: event.url.origin,
    fullUrl: event.url.href
  };
};
