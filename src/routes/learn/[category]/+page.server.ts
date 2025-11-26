import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { category } = params;
  
  try {
    // Fetch the list of all available educational content
    const response = await fetch('/api/content/list');
    
    if (!response.ok) {
      throw error(404, 'Content not found');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data[category]) {
      throw error(404, `Category "${category}" not found`);
    }
    
    const subcategories = data.data[category];
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    return {
      category,
      categoryName,
      subcategories
    };
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    console.error('Error loading category:', err);
    throw error(500, 'Failed to load category content');
  }
};
