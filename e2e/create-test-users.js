/**
 * Script to create test users for E2E testing
 * 
 * Usage:
 *   Set environment variables first, then run:
 *   $env:PUBLIC_SUPABASE_URL="your-url"; $env:SUPABASE_SERVICE_ROLE_KEY="your-key"; node e2e/create-test-users.js
 * 
 * Or get them from your .env file and run:
 *   node e2e/create-test-users.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Try to load from .env file if it exists
let supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// If not in env, try to read from .env file
if (!supabaseUrl || !supabaseServiceKey) {
  try {
    const envFile = readFileSync('.env', 'utf-8');
    const lines = envFile.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        
        if (key === 'PUBLIC_SUPABASE_URL') {
          supabaseUrl = value;
        } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
          supabaseServiceKey = value;
        }
      }
    }
  } catch (err) {
    // .env file doesn't exist, that's okay
  }
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUsers = [
  { email: 'test@example.com', password: 'password123', name: 'Test User 1' },
  { email: 'test2@example.com', password: 'password123', name: 'Test User 2' },
  { email: 'test3@example.com', password: 'password123', name: 'Test User 3' },
  { email: 'test4@example.com', password: 'password123', name: 'Test User 4' },
  { email: 'test5@example.com', password: 'password123', name: 'Test User 5' },
];

async function createTestUsers() {
  console.log('🚀 Creating test users for E2E testing...\n');

  for (const user of testUsers) {
    try {
      // Create user with email confirmation already done
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          display_name: user.name
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  ${user.email} - Already exists (skipping)`);
        } else {
          console.error(`❌ ${user.email} - Error: ${error.message}`);
        }
      } else {
        console.log(`✅ ${user.email} - Created successfully`);
        console.log(`   User ID: ${data.user.id}`);
      }
    } catch (err) {
      console.error(`❌ ${user.email} - Unexpected error:`, err.message);
    }
  }

  console.log('\n✨ Test user creation complete!');
  console.log('\n📝 Test credentials:');
  console.log('   Email: test@example.com through test5@example.com');
  console.log('   Password: password123');
}

createTestUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
