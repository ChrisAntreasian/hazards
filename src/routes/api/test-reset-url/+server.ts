import { json } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase.js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const POST = async (event: any) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { email } = await event.request.json();
  
  if (!email) {
    return json({ error: 'Email required' }, { status: 400 });
  }

  const redirectUrl = `${event.url.origin}/auth/callback?type=recovery`;
  
  console.log('🔍 TEST - Password reset URL generation:');
  console.log('   - Email:', email);
  console.log('   - Origin:', event.url.origin);
  console.log('   - Redirect URL:', redirectUrl);
  console.log('   - Supabase URL:', PUBLIC_SUPABASE_URL);

  try {
    // This is a DRY RUN - we're not actually sending the email
    // Just testing the URL generation
    console.log('🔍 This would generate a reset email with redirect URL:', redirectUrl);
    
    return json({
      success: true,
      email,
      redirectUrl,
      supabaseUrl: PUBLIC_SUPABASE_URL,
      origin: event.url.origin,
      message: 'URL generation test successful - no email sent',
      instructions: [
        'Make sure this redirect URL is configured in your Supabase dashboard',
        'Go to Supabase Dashboard → Authentication → URL Configuration',
        `Add "${redirectUrl}" to the Redirect URLs list`,
        `Also add "${event.url.origin}" as the Site URL`
      ]
    });
    
  } catch (error) {
    console.error('🔍 TEST ERROR:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      redirectUrl,
      origin: event.url.origin
    }, { status: 500 });
  }
};
