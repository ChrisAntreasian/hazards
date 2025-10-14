import { createSupabaseLoadClient } from '$lib/supabase.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { session, user } = await parent();
  const supabase = createSupabaseLoadClient();
  
  console.log('🔍 Loading categories for hazard creation form');
  console.log('🔍 User:', user?.email || 'No user');
  console.log('🔍 Session:', !!session ? 'Present' : 'Missing');
  console.log('🔍 Supabase client:', !!supabase ? 'Created' : 'Failed to create');
  
  let categories: any[] = [];
  
  if (!supabase) {
    console.error('❌ Supabase client not available for loading categories');
    return {
      session,
      user,
      categories: []
    };
  }

  if (!user) {
    console.warn('⚠️ No authenticated user - categories may not load due to RLS');
  }

  try {
    console.log('🔍 Attempting to load categories from database...');
    // Load categories for the hazard creation form
    const { data: categoryData, error: categoryError } = await supabase
      .from('hazard_categories')
      .select('id, name, path, icon, level')
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    console.log('🔍 Raw Supabase response:');
    console.log('  - Data:', categoryData);
    console.log('  - Error:', categoryError);

    if (categoryError) {
      console.error('❌ Failed to load categories:', categoryError);
      console.error('❌ Error details:', JSON.stringify(categoryError, null, 2));
    } else {
      categories = categoryData || [];
      console.log('✅ Successfully loaded categories:', categories.length);
      if (categories.length > 0) {
        console.log('✅ First few categories:', categories.slice(0, 3));
      }
    }
  } catch (error) {
    console.error('❌ Exception while loading categories:', error);
  }
  
  return {
    session,
    user,
    categories
  };
};
