/**
 * API endpoint for listing all available educational content
 * GET /api/content/list
 * 
 * Returns a structured list of all hazards with educational content
 * organized by category and subcategory.
 */

import { json, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAvailableContent } from '$lib/services/educationalContent';

export const GET: RequestHandler = async () => {
  try {
    const response = await listAvailableContent();

    if (response.error) {
      throw svelteError(500, response.error);
    }

    return json(response);
  } catch (err) {
    console.error('Error listing content:', err);
    
    if (err instanceof Response) {
      // Re-throw SvelteKit errors
      throw err;
    }

    throw svelteError(500, 'Internal server error while listing content');
  }
};
