import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { validateHazardSubmission, validateField } from '$lib/validation/hazard-validation';
import { ContentPreScreening } from '$lib/validation/content-prescreening';
import { createSupabaseServerClient } from '$lib/supabase';

/**
 * API endpoint for real-time field validation
 * POST /api/validation/field
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { field, value, context } = await request.json();

    if (!field || value === undefined) {
      return json({
        success: false,
        error: 'Field name and value are required'
      }, { status: 400 });
    }

    // Validate single field
    const validationError = validateField(field, value);

    if (validationError) {
      return json({
        success: false,
        error: validationError.message,
        code: validationError.code,
        field: validationError.field
      });
    }

    return json({
      success: true,
      message: 'Field validation passed'
    });

  } catch (error) {
    console.error('Field validation error:', error);
    return json({
      success: false,
      error: 'Internal validation error'
    }, { status: 500 });
  }
};