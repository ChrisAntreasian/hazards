#!/usr/bin/env node
/**
 * E2E Test Setup Script
 * 
 * This script prepares the environment for E2E testing by:
 * 1. Verifying test admin user exists in Supabase
 * 2. Ensuring test database has required seed data
 * 3. Validating environment variables are set
 * 
 * Run this before executing E2E tests:
 *   node scripts/setup-e2e-tests.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const REQUIRED_ENV_VARS = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'TEST_ADMIN_EMAIL',
  'TEST_ADMIN_PASSWORD'
];

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

console.log('🔧 E2E Test Setup Starting...\n');

// Validate environment variables
function validateEnv() {
  console.log('✓ Checking environment variables...');
  const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these in your .env file or environment.');
    process.exit(1);
  }
  
  console.log('  ✓ All required environment variables present\n');
}

// Check test admin user
async function checkTestAdmin() {
  console.log('✓ Checking test admin user...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Check if user exists
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', TEST_ADMIN_EMAIL)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (!users) {
      console.log('  ⚠ Test admin user does not exist');
      console.log(`  📝 To create test admin user manually:`);
      console.log(`     1. Sign up at your Supabase app: ${SUPABASE_URL}`);
      console.log(`     2. Use email: ${TEST_ADMIN_EMAIL}`);
      console.log(`     3. Run SQL in Supabase SQL Editor:`);
      console.log(`        UPDATE users SET role = 'admin' WHERE email = '${TEST_ADMIN_EMAIL}';`);
      console.log(`\n  ⚠ Tests will fail until admin user is created.\n`);
      return false;
    }
    
    if (users.role !== 'admin') {
      console.log(`  ⚠ User exists but role is '${users.role}', not 'admin'`);
      console.log(`  📝 Run this SQL in Supabase SQL Editor:`);
      console.log(`     UPDATE users SET role = 'admin' WHERE email = '${TEST_ADMIN_EMAIL}';`);
      return false;
    }
    
    console.log(`  ✓ Test admin user found: ${TEST_ADMIN_EMAIL} (role: ${users.role})\n`);
    return true;
  } catch (err) {
    console.error('  ❌ Error checking test admin:', err.message);
    return false;
  }
}

// Check test categories exist
async function checkTestData() {
  console.log('✓ Checking test data...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const { data: categories, error } = await supabase
      .from('hazard_categories')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('  ⚠ Could not query categories:', error.message);
      return false;
    }
    
    if (!categories || categories.length === 0) {
      console.log('  ⚠ No categories found in database');
      console.log('  📝 Run seed script: npm run setup:educational-content');
      return false;
    }
    
    console.log(`  ✓ Found ${categories.length > 0 ? 'categories' : 'no categories'} in database\n`);
    return true;
  } catch (err) {
    console.error('  ❌ Error checking test data:', err.message);
    return false;
  }
}

// Main setup function
async function setup() {
  validateEnv();
  
  const adminReady = await checkTestAdmin();
  const dataReady = await checkTestData();
  
  console.log('📊 Setup Summary:');
  console.log(`   Environment Variables: ✓`);
  console.log(`   Test Admin User: ${adminReady ? '✓' : '⚠'}`);
  console.log(`   Test Data: ${dataReady ? '✓' : '⚠'}`);
  
  if (adminReady && dataReady) {
    console.log('\n✅ E2E test environment is ready!\n');
    console.log('Run tests with:');
    console.log('  npm run test:e2e              # All tests');
    console.log('  npm run test:e2e:headed       # Watch in browser');
    console.log('  npm run test:e2e:ui           # Playwright UI mode');
    process.exit(0);
  } else {
    console.log('\n⚠️  E2E test environment needs setup (see warnings above)\n');
    process.exit(1);
  }
}

// Run setup
setup().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
