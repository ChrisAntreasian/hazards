import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from '@sveltejs/kit';

// Simple test endpoint to check admin access to users
export const GET: RequestHandler = async () => {
  try {
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ 
        error: 'Missing environment variables',
        env_check: {
          has_url: !!supabaseUrl,
          has_service_key: !!serviceRoleKey,
          url_value: supabaseUrl ? 'SET' : 'MISSING',
          key_value: serviceRoleKey ? 'SET' : 'MISSING'
        }
      }, { status: 500 });
    }

    // Create admin client
    const adminSupabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test query to get all users
    const { data: users, error, count } = await adminSupabase
      .from('users')
      .select('id, email, role', { count: 'exact' })
      .limit(10);

    if (error) {
      console.error('Admin user query error:', error);
      return json({ 
        error: error.message, 
        details: error,
        env_check: {
          has_url: !!process.env.PUBLIC_SUPABASE_URL,
          has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      }, { status: 500 });
    }

    return json({ 
      success: true, 
      userCount: count,
      users: users,
      env_check: {
        has_url: !!process.env.PUBLIC_SUPABASE_URL,
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (err) {
    console.error('Test admin users error:', err);
    return json({ 
      error: err instanceof Error ? err.message : 'Unknown error',
      env_check: {
        has_url: !!process.env.PUBLIC_SUPABASE_URL,
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }, { status: 500 });
  }
};