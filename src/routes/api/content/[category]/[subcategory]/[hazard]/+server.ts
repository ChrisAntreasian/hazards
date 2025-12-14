/**
 * API endpoint for fetching educational content by category/subcategory/hazard
 * GET /api/content/[category]/[subcategory]/[hazard]
 * 
 * Query parameters:
 * - fileType: Fetch specific content file (overview, identification, etc.)
 * - region: Fetch regional content for specific US region
 * - nocache: Skip cache and fetch fresh content
 */

import { json, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getEducationalContent,
  getContentFile,
  getRegionalContent
} from '$lib/services/educationalContent';
import type {
  ContentCategory,
  ContentSubcategory,
  ContentFileType,
  USRegion
} from '$lib/types/educational';

export const GET: RequestHandler = async ({ params, url }) => {
  const { category, subcategory, hazard } = params;

  // Validate category
  const validCategories: ContentCategory[] = ['plants', 'insects', 'terrain', 'animals'];
  if (!validCategories.includes(category as ContentCategory)) {
    throw svelteError(400, `Invalid category: ${category}`);
  }

  // Validate subcategory
  const validSubcategories: ContentSubcategory[] = [
    'poisonous', 'thorns', 'ticks', 'stinging', 'biting',
    'unstable_ground', 'water', 'bears', 'snakes'
  ];
  if (!validSubcategories.includes(subcategory as ContentSubcategory)) {
    throw svelteError(400, `Invalid subcategory: ${subcategory}`);
  }

  // Check query parameters
  const fileType = url.searchParams.get('fileType') as ContentFileType | null;
  const region = url.searchParams.get('region') as USRegion | null;
  const nocache = url.searchParams.has('nocache');

  try {
    // Fetch specific file type
    if (fileType) {
      const validFileTypes: ContentFileType[] = [
        'overview', 'identification', 'symptoms', 'treatment', 'prevention', 'regional_notes'
      ];
      if (!validFileTypes.includes(fileType)) {
        throw svelteError(400, `Invalid file type: ${fileType}`);
      }

      const response = await getContentFile(
        category as ContentCategory,
        subcategory as ContentSubcategory,
        hazard,
        fileType,
        !nocache
      );

      if (response.error) {
        throw svelteError(404, response.error);
      }

      return json(response);
    }

    // Fetch regional content
    if (region) {
      const validRegions: USRegion[] = ['northeast', 'southeast', 'midwest', 'southwest', 'west'];
      if (!validRegions.includes(region)) {
        throw svelteError(400, `Invalid region: ${region}`);
      }

      const response = await getRegionalContent(
        category as ContentCategory,
        subcategory as ContentSubcategory,
        hazard,
        region
      );

      if (response.error) {
        throw svelteError(404, response.error);
      }

      return json(response);
    }

    // Fetch complete content
    const response = await getEducationalContent(
      category as ContentCategory,
      subcategory as ContentSubcategory,
      hazard,
      !nocache
    );

    if (response.error) {
      throw svelteError(404, response.error);
    }

    return json(response);
  } catch (err) {
    console.error('Error in content API:', err);
    
    if (err instanceof Response) {
      // Re-throw SvelteKit errors
      throw err;
    }

    throw svelteError(500, 'Internal server error while fetching content');
  }
};
