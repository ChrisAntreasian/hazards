import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { category, subcategory, hazard } = params;
  
  try {
    // Fetch educational content for this specific hazard
    const contentResponse = await fetch(`/api/content/${category}/${subcategory}/${hazard}`);
    
    if (!contentResponse.ok) {
      throw error(404, 'Hazard guide not found');
    }
    
    const contentData = await contentResponse.json();
    
    if (!contentData.success) {
      throw error(404, 'Hazard guide not found');
    }
    
    // Fetch list to get related hazards
    const listResponse = await fetch('/api/content/list');
    const listData = await listResponse.json();
    
    const relatedHazards = listData.success && listData.data[category]?.[subcategory] 
      ? listData.data[category][subcategory] 
      : [];
    
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    const subcategoryName = subcategory.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    return {
      category,
      categoryName,
      subcategory,
      subcategoryName,
      hazard,
      content: contentData.data,
      relatedHazards
    };
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    console.error('Error loading hazard guide:', err);
    throw error(500, 'Failed to load hazard guide');
  }
};
