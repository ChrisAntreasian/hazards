/**
 * @fileoverview API endpoint for getting hazard expiration status.
 * Returns detailed information about expiration state, resolution reports, and confirmations.
 * 
 * @endpoint GET /api/hazards/[id]/expiration-status
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ExpirationStatusResponse, ExpirationStatus } from '$lib/types/database';

/**
 * Calculate expiration status based on hazard data
 */
function calculateExpirationStatus(hazard: any, confirmations: any): ExpirationStatus {
  // Check if manually resolved
  if (hazard.resolved_at) {
    return 'resolved';
  }

  const now = new Date();

  switch (hazard.expiration_type) {
    case 'permanent':
      return 'active';

    case 'auto_expire':
      if (!hazard.expires_at) {
        return 'active';
      }
      const expiresAt = new Date(hazard.expires_at);
      const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (expiresAt <= now) {
        return 'expired';
      } else if (hoursUntilExpiration <= 24) {
        return 'expiring_soon';
      } else {
        return 'active';
      }

    case 'seasonal':
      if (!hazard.seasonal_pattern?.active_months) {
        return 'active';
      }
      const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
      if (hazard.seasonal_pattern.active_months.includes(currentMonth)) {
        return 'active';
      } else {
        return 'dormant';
      }

    case 'user_resolvable':
      // Check if there's a resolution report with confirmations
      const confirmedCount = confirmations.filter((c: any) => c.confirmation_type === 'confirmed').length;
      const disputedCount = confirmations.filter((c: any) => c.confirmation_type === 'disputed').length;
      
      if (confirmedCount >= 3 && confirmedCount > disputedCount) {
        return 'pending_resolution';
      }
      return 'active';

    default:
      return 'active';
  }
}

/**
 * Calculate time remaining in seconds (null if not applicable)
 */
function calculateTimeRemaining(hazard: any): number | null {
  if (hazard.expiration_type !== 'auto_expire' || !hazard.expires_at) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(hazard.expires_at);
  const remainingMs = expiresAt.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.floor(remainingMs / 1000); // Return seconds
}

export const GET: RequestHandler = async ({ params, locals }) => {
  const { id: hazardId } = params;
  const supabase = locals.supabase;

  // Get current user (optional for this endpoint)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get hazard details
  const { data: hazard, error: hazardError } = await supabase
    .from('hazards')
    .select('*')
    .eq('id', hazardId)
    .single();

  if (hazardError || !hazard) {
    throw error(404, 'Hazard not found');
  }

  // Get resolution report if exists
  const { data: resolutionReport } = await supabase
    .from('hazard_resolution_reports')
    .select('*')
    .eq('hazard_id', hazardId)
    .single();

  // Get all confirmations
  const { data: confirmations } = await supabase
    .from('hazard_resolution_confirmations')
    .select('*')
    .eq('hazard_id', hazardId);

  const confirmationsList = confirmations || [];
  const confirmedCount = confirmationsList.filter(c => c.confirmation_type === 'confirmed').length;
  const disputedCount = confirmationsList.filter(c => c.confirmation_type === 'disputed').length;

  // Calculate status
  const status = calculateExpirationStatus(hazard, confirmationsList);
  const timeRemaining = calculateTimeRemaining(hazard);

  // Determine user permissions
  let canExtend = false;
  let canResolve = false;

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = hazard.user_id === user.id;
    const isModerator = userData?.role && ['moderator', 'admin'].includes(userData.role);

    // Can extend if owner or moderator, for auto_expire or user_resolvable types
    canExtend = (isOwner || isModerator) && 
                ['auto_expire', 'user_resolvable'].includes(hazard.expiration_type) &&
                !hazard.resolved_at;

    // Can submit resolution report if no report exists yet and hazard not resolved
    canResolve = !resolutionReport && !hazard.resolved_at;
  }

  const response: ExpirationStatusResponse = {
    hazard_id: hazardId,
    status,
    time_remaining: timeRemaining,
    resolution_report: resolutionReport || null,
    confirmations: {
      confirmed: confirmedCount,
      disputed: disputedCount,
    },
    can_extend: canExtend,
    can_resolve: canResolve,
  };

  return json(response);
};
