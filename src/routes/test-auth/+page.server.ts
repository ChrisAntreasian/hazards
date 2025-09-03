import { createSupabaseServerClient } from '$lib/supabase.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  
  if (!supabase) {
    return {
      error: 'Supabase not configured'
    };
  }

  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test connection with a simple auth status check
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('✅ Supabase connection test successful');
    console.log('🔍 Current user:', user?.email || 'None');
    console.log('🔍 Error:', error?.message || 'None');
    
    return {
      connected: true,
      user: user?.email || null,
      error: error?.message || null
    };
    
  } catch (testError) {
    console.log('❌ Supabase connection test failed:', testError);
    
    return {
      connected: false,
      error: testError instanceof Error ? testError.message : 'Unknown error'
    };
  }
};
