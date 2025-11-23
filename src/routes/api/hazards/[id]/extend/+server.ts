/**
 * @fileoverview API endpoint for extending hazard expiration time.
 * Allows users to extend the expiration of auto_expire hazards.
 * 
 * @endpoint POST /api/hazards/[id]/extend
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ExtendExpirationRequest } from '$lib/types/database';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const { id: hazardId } = params;
  const supabase = locals.supabase;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw error(401, 'You must be logged in to extend hazard expiration');
  }

  // Parse request body
  let body: ExtendExpirationRequest;
  try {
    body = await request.json();
  } catch (e) {
    throw error(400, 'Invalid request body');
  }

  // Validate expires_at
  if (!body.expires_at) {
    throw error(400, 'New expiration time is required');
  }

  const newExpiresAt = new Date(body.expires_at);
  if (isNaN(newExpiresAt.getTime())) {
    throw error(400, 'Invalid expiration date format');
  }

  const now = new Date();
  if (newExpiresAt <= now) {
    throw error(400, 'New expiration time must be in the future');
  }

  // Get hazard details
  const { data: hazard, error: hazardError } = await supabase
    .from('hazards')
    .select('*')
    .eq('id', hazardId)
    .single();

  if (hazardError || !hazard) {
    throw error(404, 'Hazard not found');
  }

  // Check if hazard can be extended
  if (hazard.expiration_type !== 'auto_expire' && hazard.expiration_type !== 'user_resolvable') {
    throw error(400, `Cannot extend ${hazard.expiration_type} type hazards`);
  }

  if (hazard.resolved_at) {
    throw error(400, 'Cannot extend a resolved hazard');
  }

  // Verify user is the owner or has permission
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const isOwner = hazard.user_id === user.id;
  const isModerator = userData?.role && ['moderator', 'admin'].includes(userData.role);

  if (!isOwner && !isModerator) {
    throw error(403, 'Only the hazard owner or moderators can extend expiration');
  }

  // Calculate extension duration for logging
  const oldExpiresAt = hazard.expires_at ? new Date(hazard.expires_at) : now;
  const extensionMs = newExpiresAt.getTime() - oldExpiresAt.getTime();
  const extensionHours = Math.round(extensionMs / (1000 * 60 * 60));

  // Update hazard
  const { data: updatedHazard, error: updateError } = await supabase
    .from('hazards')
    .update({
      expires_at: body.expires_at,
      extended_count: (hazard.extended_count ?? 0) + 1,
      expiration_notified_at: null, // Reset notification flag
    })
    .eq('id', hazardId)
    .select()
    .single();

  if (updateError) {
    console.error('Error extending expiration:', updateError);
    throw error(500, 'Failed to extend expiration');
  }

  // Log to audit trail
  await supabase
    .from('expiration_audit_log')
    .insert({
      hazard_id: hazardId,
      action: 'expiration_extended',
      performed_by: user.id,
      previous_state: { expires_at: hazard.expires_at, extended_count: hazard.extended_count },
      new_state: { expires_at: body.expires_at, extended_count: updatedHazard.extended_count },
      reason: body.reason || `Extended by ${extensionHours} hours`,
    });

  return json({
    success: true,
    hazard: updatedHazard,
    extension_info: {
      old_expiration: hazard.expires_at,
      new_expiration: body.expires_at,
      extension_hours: extensionHours,
      total_extensions: updatedHazard.extended_count,
    },
    message: `Expiration extended by approximately ${extensionHours} hours`,
  });
};
