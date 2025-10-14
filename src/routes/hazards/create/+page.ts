import { createSupabaseLoadClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { session, user } = await parent();
  const supabase = createSupabaseLoadClient();
  
  let categories: any[] = [];
  
  if (!supabase) {
    logger.error('Supabase client not available for loading categories');
    return {
      session,
      user,
      categories: []
    };
  }

  try {
    // Load categories for the hazard creation form
    const { data: categoryData, error: categoryError } = await supabase
      .from('hazard_categories')
      .select('id, name, path, icon, level')
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (categoryError) {
      logger.dbError('load categories', new Error(categoryError.message || 'Failed to load categories'));
    } else {
      categories = categoryData || [];
    }
  } catch (error) {
    logger.error('Exception while loading categories', error instanceof Error ? error : new Error(String(error)));
  }
  
  return {
    session,
    user,
    categories
  };
};
