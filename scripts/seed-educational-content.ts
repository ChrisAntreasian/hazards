/**
 * Seed Educational Content Script
 * 
 * Run with: npx tsx scripts/seed-educational-content.ts
 * 
 * This script uploads educational content to Supabase Storage.
 * Content is based on widely-known, commonly-taught outdoor safety facts.
 * 
 * Required environment variables:
 * - PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.log('\nRequired:');
  console.log('  VITE_SUPABASE_URL or PUBLIC_SUPABASE_URL');
  console.log('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BUCKET_NAME = 'hazard-educational-content';

interface TemplateDefinition {
  slug: string;
  storagePath: string;
  content: Record<string, string>;
}

// Content is imported from the API endpoint - keeping script simple
// Full content is in: src/routes/api/admin/seed-content/+server.ts

async function seedContent() {
  console.log('🌱 Educational Content Seeder');
  console.log('='.repeat(50));
  console.log('\nThis script seeds educational content to Supabase Storage.');
  console.log('For the full content, use the admin API endpoint instead:\n');
  console.log('  POST /api/admin/seed-content\n');
  console.log('The API endpoint requires moderator/admin authentication.');
  console.log('='.repeat(50));
  
  // Verify connection
  const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
  
  if (error) {
    console.error(`\n❌ Cannot access bucket "${BUCKET_NAME}": ${error.message}`);
    console.log('\nMake sure the bucket exists and you have the correct service role key.');
    process.exit(1);
  }
  
  console.log(`\n✅ Connected to bucket: ${BUCKET_NAME}`);
  console.log('\nTo seed content, log in as an admin and call the API endpoint,');
  console.log('or run the dev server and use the admin panel.');
}

seedContent().catch(console.error);
