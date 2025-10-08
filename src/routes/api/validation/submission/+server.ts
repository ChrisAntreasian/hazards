import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { validateHazardSubmission } from '$lib/validation/hazard-validation.js';
import { ContentPreScreening } from '$lib/validation/content-prescreening.js';
import { ModerationQueue } from '$lib/utils/moderation.js';
import { createSupabaseServerClient } from '$lib/supabase.js';

/**
 * API endpoint for full hazard submission validation and pre-screening
 * POST /api/validation/submission
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  try {
    // Get user session
    const supabase = createSupabaseServerClient({ cookies });
    if (!supabase) {
      return json({
        success: false,
        error: 'Database connection error'
      }, { status: 500 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Parse submission data
    const submissionData = await request.json();

    // 1. Schema validation
    const validationResult = validateHazardSubmission(submissionData);
    if (!validationResult.success) {
      return json({
        success: false,
        stage: 'validation',
        errors: validationResult.errors,
        message: 'Submission failed validation'
      }, { status: 400 });
    }

    // 2. Get user trust score
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('trust_score')
      .eq('id', user.id)
      .single();

    const trustScore = userProfile?.trust_score || 0;

    // 3. Run automated pre-screening
    const validData = validationResult.data!; // We know it exists because validation passed
    const preScreening = new ContentPreScreening();
    const screeningResult = await preScreening.screenHazardSubmission(
      validData,
      trustScore
    );

    // 4. Determine next steps based on screening result
    let nextAction = '';
    let requiresModeration = false;

    switch (screeningResult.action) {
      case 'approve':
        nextAction = 'auto_approve';
        requiresModeration = false;
        break;
      case 'reject':
        nextAction = 'auto_reject';
        requiresModeration = false;
        break;
      case 'flag':
        nextAction = 'flag_for_priority_review';
        requiresModeration = true;
        break;
      case 'review':
        nextAction = 'queue_for_review';
        requiresModeration = true;
        break;
    }

    // 5. If requires moderation, add to queue
    if (requiresModeration) {
      const moderationQueue = new ModerationQueue({ cookies });
      
      // Create a temporary hazard record for moderation
      const { data: tempHazard, error: hazardError } = await supabase
        .from('hazards')
        .insert({
          ...validData,
          user_id: user.id,
          status: 'pending_review',
          latitude: validData.location.latitude,
          longitude: validData.location.longitude,
          geo_cell: calculateGeoCell(validData.location),
          geohash: calculateGeohash(validData.location),
          region_id: 'us_northeast_boston'
        })
        .select()
        .single();

      if (hazardError) {
        throw hazardError;
      }

      // Add to moderation queue
      await moderationQueue.addToQueue({
        type: 'hazard',
        content_id: tempHazard.id,
        submitted_by: user.id,
        flagged_reasons: screeningResult.reasons,
        priority: screeningResult.risk_level === 'high' ? 'urgent' :
                 screeningResult.risk_level === 'medium' ? 'high' : 'medium',
        status: 'pending'
      });
    }

    return json({
      success: true,
      stage: 'complete',
      validation: {
        passed: true,
        warnings: validationResult.warnings || []
      },
      screening: {
        action: screeningResult.action,
        confidence: screeningResult.confidence,
        reasons: screeningResult.reasons,
        risk_level: screeningResult.risk_level,
        estimated_review_time: screeningResult.estimated_review_time
      },
      next_action: nextAction,
      requires_moderation: requiresModeration,
      message: getActionMessage(screeningResult.action, screeningResult.estimated_review_time)
    });

  } catch (error) {
    console.error('Submission validation error:', error);
    return json({
      success: false,
      stage: 'error',
      error: 'Internal server error during validation',
      message: 'Unable to process submission. Please try again.'
    }, { status: 500 });
  }
};

/**
 * Helper function to generate user-friendly messages
 */
function getActionMessage(action: string, estimatedTime?: number): string {
  switch (action) {
    case 'approve':
      return 'Your submission has been automatically approved and is now live!';
    case 'reject':
      return 'Your submission was rejected due to policy violations. Please review and resubmit.';
    case 'flag':
      return `Your submission has been flagged for priority review. Estimated review time: ${estimatedTime || 15} minutes.`;
    case 'review':
      return `Your submission is queued for review. Estimated review time: ${estimatedTime || 10} minutes.`;
    default:
      return 'Your submission is being processed.';
  }
}

/**
 * Calculate geo-cell for geographic partitioning
 */
function calculateGeoCell(location: { latitude: number; longitude: number }): string {
  const lat = Math.floor(location.latitude * 10) / 10;
  const lng = Math.floor(location.longitude * 10) / 10;
  return `us_northeast_${lat}_${lng}`;
}

/**
 * Calculate geohash for proximity queries
 */
function calculateGeohash(location: { latitude: number; longitude: number }): string {
  // Simple geohash implementation - in production, use a proper geohash library
  const lat = Math.round(location.latitude * 1000000);
  const lng = Math.round(location.longitude * 1000000);
  return `${lat}_${lng}`;
}