/**
 * @fileoverview API endpoint for confirming or disputing resolution reports.
 * Allows users to vote on whether they agree a hazard has been resolved.
 * 
 * @endpoint POST /api/hazards/[id]/resolution-confirmation
 * @endpoint DELETE /api/hazards/[id]/resolution-confirmation
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CreateConfirmationRequest } from '$lib/types/database';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const { id: hazardId } = params;
  const supabase = locals.supabase;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw error(401, 'You must be logged in to confirm or dispute a resolution');
  }

  // Parse request body
  let body: CreateConfirmationRequest;
  try {
    body = await request.json();
  } catch (e) {
    throw error(400, 'Invalid request body');
  }

  // Validate confirmation type
  if (!body.confirmation_type || !['confirmed', 'disputed'].includes(body.confirmation_type)) {
    throw error(400, 'Invalid confirmation type. Must be "confirmed" or "disputed"');
  }

  // Validate note length if provided
  if (body.note && body.note.length > 500) {
    throw error(400, 'Note must be 500 characters or less');
  }

  // Verify hazard exists
  const { data: hazard, error: hazardError } = await supabase
    .from('hazards')
    .select('id, user_id, resolved_at')
    .eq('id', hazardId)
    .single();

  if (hazardError || !hazard) {
    throw error(404, 'Hazard not found');
  }

  // Check if hazard is already resolved
  if (hazard.resolved_at) {
    throw error(400, 'This hazard has already been marked as resolved');
  }

  // Verify a resolution report exists
  const { data: report } = await supabase
    .from('hazard_resolution_reports')
    .select('id, reported_by')
    .eq('hazard_id', hazardId)
    .single();

  if (!report) {
    throw error(404, 'No resolution report exists for this hazard. Please submit one first.');
  }

  // Prevent users from confirming their own resolution reports
  if (report.reported_by === user.id) {
    throw error(400, 'You cannot confirm or dispute your own resolution report');
  }

  // Prevent hazard owner from confirming (to avoid conflicts of interest)
  if (hazard.user_id === user.id) {
    throw error(400, 'Hazard owners cannot confirm or dispute resolutions');
  }

  // Check if user already has a confirmation
  const { data: existingConfirmation } = await supabase
    .from('hazard_resolution_confirmations')
    .select('id, confirmation_type')
    .eq('hazard_id', hazardId)
    .eq('user_id', user.id)
    .single();

  if (existingConfirmation) {
    // Update existing confirmation if different
    if (existingConfirmation.confirmation_type === body.confirmation_type) {
      throw error(400, `You have already ${body.confirmation_type === 'confirmed' ? 'confirmed' : 'disputed'} this resolution`);
    }

    // Update to new type
    const { data: updated, error: updateError } = await supabase
      .from('hazard_resolution_confirmations')
      .update({
        confirmation_type: body.confirmation_type,
        note: body.note?.trim() || null,
      })
      .eq('id', existingConfirmation.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating confirmation:', updateError);
      throw error(500, 'Failed to update confirmation');
    }

    // Log to audit trail
    await supabase
      .from('expiration_audit_log')
      .insert({
        hazard_id: hazardId,
        action: 'resolution_confirmation_changed',
        performed_by: user.id,
        reason: `Changed from ${existingConfirmation.confirmation_type} to ${body.confirmation_type}`,
      });

    // Get updated counts
    const { data: confirmations } = await supabase
      .from('hazard_resolution_confirmations')
      .select('confirmation_type')
      .eq('hazard_id', hazardId);

    const confirmedCount = confirmations?.filter(c => c.confirmation_type === 'confirmed').length ?? 0;
    const disputedCount = confirmations?.filter(c => c.confirmation_type === 'disputed').length ?? 0;

    return json({
      success: true,
      confirmation: updated,
      counts: {
        confirmed: confirmedCount,
        disputed: disputedCount,
      },
      message: `Confirmation changed to ${body.confirmation_type}`,
    });
  }

  // Create new confirmation
  const { data: confirmation, error: confirmationError } = await supabase
    .from('hazard_resolution_confirmations')
    .insert({
      hazard_id: hazardId,
      user_id: user.id,
      confirmation_type: body.confirmation_type,
      note: body.note?.trim() || null,
    })
    .select()
    .single();

  if (confirmationError) {
    console.error('Error creating confirmation:', confirmationError);
    throw error(500, 'Failed to create confirmation');
  }

  // Log to audit trail
  await supabase
    .from('expiration_audit_log')
    .insert({
      hazard_id: hazardId,
      action: `resolution_${body.confirmation_type}`,
      performed_by: user.id,
      reason: body.note?.trim() || null,
    });

  // Get updated counts
  const { data: confirmations } = await supabase
    .from('hazard_resolution_confirmations')
    .select('confirmation_type')
    .eq('hazard_id', hazardId);

  const confirmedCount = confirmations?.filter(c => c.confirmation_type === 'confirmed').length ?? 0;
  const disputedCount = confirmations?.filter(c => c.confirmation_type === 'disputed').length ?? 0;

  return json({
    success: true,
    confirmation,
    counts: {
      confirmed: confirmedCount,
      disputed: disputedCount,
    },
    message: body.confirmation_type === 'confirmed' 
      ? 'Resolution confirmed successfully' 
      : 'Resolution disputed successfully',
  });
};

/**
 * Remove user's confirmation/dispute
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const { id: hazardId } = params;
  const supabase = locals.supabase;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw error(401, 'You must be logged in to remove a confirmation');
  }

  // Find user's confirmation
  const { data: confirmation } = await supabase
    .from('hazard_resolution_confirmations')
    .select('id, confirmation_type')
    .eq('hazard_id', hazardId)
    .eq('user_id', user.id)
    .single();

  if (!confirmation) {
    throw error(404, 'No confirmation found to remove');
  }

  // Delete confirmation
  const { error: deleteError } = await supabase
    .from('hazard_resolution_confirmations')
    .delete()
    .eq('id', confirmation.id);

  if (deleteError) {
    console.error('Error deleting confirmation:', deleteError);
    throw error(500, 'Failed to delete confirmation');
  }

  // Log to audit trail
  await supabase
    .from('expiration_audit_log')
    .insert({
      hazard_id: hazardId,
      action: 'resolution_confirmation_removed',
      performed_by: user.id,
      reason: `Removed ${confirmation.confirmation_type} confirmation`,
    });

  // Get updated counts
  const { data: confirmations } = await supabase
    .from('hazard_resolution_confirmations')
    .select('confirmation_type')
    .eq('hazard_id', hazardId);

  const confirmedCount = confirmations?.filter(c => c.confirmation_type === 'confirmed').length ?? 0;
  const disputedCount = confirmations?.filter(c => c.confirmation_type === 'disputed').length ?? 0;

  return json({
    success: true,
    counts: {
      confirmed: confirmedCount,
      disputed: disputedCount,
    },
    message: 'Confirmation removed successfully',
  });
};
