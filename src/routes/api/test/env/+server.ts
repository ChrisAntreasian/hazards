import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Simple endpoint to check environment variables
export const GET: RequestHandler = async () => {
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return json({
    environment_check: {
      NODE_ENV: process.env.NODE_ENV,
      PUBLIC_SUPABASE_URL: PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? 'SET' : 'MISSING',
      // Show first few chars of URL for debugging (safe to show)
      url_preview: PUBLIC_SUPABASE_URL ? 
        PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 'MISSING',
      // Don't show the service key, just confirm if it exists
      key_length: serviceRoleKey ? serviceRoleKey.length : 0,
      // Debug info
      env_method: {
        public_from_static: PUBLIC_SUPABASE_URL ? 'found' : 'missing',
        service_from_dynamic: env.SUPABASE_SERVICE_ROLE_KEY ? 'found' : 'missing',
        service_from_process: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'found' : 'missing'
      }
    }
  });
};