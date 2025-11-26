import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    // Fetch the list of all available educational content
    const response = await fetch('/api/content/list');
    
    if (!response.ok) {
      throw new Error('Failed to fetch content list');
    }
    
    const data = await response.json();
    
    return {
      contentList: data.success ? data.data : {}
    };
  } catch (err) {
    console.error('Error loading educational content list:', err);
    // Return empty structure rather than throwing error
    return {
      contentList: {}
    };
  }
};
