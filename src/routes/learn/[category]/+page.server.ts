import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Valid categories (even if content is empty)
const VALID_CATEGORIES = ['plants', 'insects', 'animals', 'terrain'];

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { category } = params;
  
  // Check if it's a valid category (even if empty)
  if (!VALID_CATEGORIES.includes(category)) {
    throw error(404, `Category "${category}" not found`);
  }
  
  try {
    // Fetch the list of all available educational content
    const response = await fetch('/api/content/list');
    
    let subcategories = {};
    
    if (response.ok) {
      const data = await response.json();
      // Get subcategories if they exist, otherwise empty object
      subcategories = data.data?.[category] || {};
    }
    
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    return {
      category,
      categoryName,
      subcategories
    };
  } catch (err) {
    console.error('Error loading category:', err);
    
    // Still return the page with empty content rather than error
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    return {
      category,
      categoryName,
      subcategories: {}
    };
  }
};
