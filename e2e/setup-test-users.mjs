/**
 * Setup script to create test users via Supabase Auth API
 * This uses the sign-up flow which is publicly accessible
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmnutxcgbfomkrscwgcy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbnV0eGNnYmZvbWtyc2N3Z2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTI0NjIsImV4cCI6MjA3MTkyODQ2Mn0.gm7XpDjNNUNAlU2mk4xTv2rDV4Z4DCuXeZZC2juBJ8s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testUsers = [
  { email: 'playwright-test1@testmail.app', password: 'password123', name: 'Test User 1' },
  { email: 'playwright-test2@testmail.app', password: 'password123', name: 'Test User 2' },
  { email: 'playwright-test3@testmail.app', password: 'password123', name: 'Test User 3' },
  { email: 'playwright-test4@testmail.app', password: 'password123', name: 'Test User 4' },
  { email: 'playwright-test5@testmail.app', password: 'password123', name: 'Test User 5' },
];

async function createTestUsers() {
  console.log('🚀 Setting up test users for E2E testing...\n');

  for (const user of testUsers) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            display_name: user.name
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          console.log(`⚠️  ${user.email} - Already exists (skipping)`);
        } else {
          console.error(`❌ ${user.email} - Error: ${error.message}`);
        }
      } else if (data.user) {
        console.log(`✅ ${user.email} - Created successfully`);
        console.log(`   User ID: ${data.user.id}`);
        if (data.user.identities && data.user.identities.length === 0) {
          console.log(`   ⚠️  Account exists but not confirmed`);
        }
      }
    } catch (err) {
      console.error(`❌ ${user.email} - Unexpected error:`, err.message);
    }
  }

  console.log('\n✨ Test user setup complete!');
  console.log('\n📝 Test credentials:');
  console.log('   Emails: test@example.com through test5@example.com');
  console.log('   Password: password123');
  console.log('\n⚠️  Note: If email confirmation is required, users may need to be confirmed in Supabase dashboard.');
}

createTestUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
