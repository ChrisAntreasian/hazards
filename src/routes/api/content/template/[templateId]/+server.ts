/**
 * API endpoint for fetching educational content by template ID
 * GET /api/content/template/[templateId]
 * 
 * This endpoint looks up the storage_path in hazard_templates table
 * and returns the corresponding educational content.
 * 
 * Query parameters:
 * - nocache: Skip cache and fetch fresh content
 */

import { json, error as svelteError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getContentByTemplateId,
  getContentMetadata
} from '$lib/services/educationalContent';

export const GET: RequestHandler = async ({ params, url }) => {
  const { templateId } = params;

  if (!templateId) {
    throw svelteError(400, 'Template ID is required');
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(templateId)) {
    throw svelteError(400, 'Invalid template ID format');
  }

  const nocache = url.searchParams.has('nocache');
  const metadataOnly = url.searchParams.has('metadata');

  try {
    // Return only metadata
    if (metadataOnly) {
      const response = await getContentMetadata(templateId);

      if (response.error) {
        throw svelteError(404, response.error);
      }

      return json(response);
    }

    // Fetch complete content
    const response = await getContentByTemplateId(templateId, !nocache);

    if (response.error) {
      throw svelteError(404, response.error);
    }

    return json(response);
  } catch (err) {
    console.error('Error in template content API:', err);
    
    if (err instanceof Response) {
      // Re-throw SvelteKit errors
      throw err;
    }

    throw svelteError(500, 'Internal server error while fetching content');
  }
};
