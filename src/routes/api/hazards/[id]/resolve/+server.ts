/**
 * @fileoverview API endpoint for submitting resolution reports on hazards.
 * Allows authenticated users to report that a hazard has been resolved with a detailed note.
 * Only one resolution report per hazard is allowed.
 * 
 * @endpoint POST /api/hazards/[id]/resolve
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CreateResolutionReportRequest } from '$lib/types/database';

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const { id: hazardId } = params;
  const supabase = locals.supabase;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw error(401, 'You must be logged in to submit a resolution report');
  }

  // Parse request body
  let body: CreateResolutionReportRequest;
  try {
    body = await request.json();
  } catch (e) {
    throw error(400, 'Invalid request body');
  }

  // Validate required fields
  if (!body.resolution_note || body.resolution_note.trim().length === 0) {
    throw error(400, 'Resolution note is required');
  }

  if (body.resolution_note.length > 1000) {
    throw error(400, 'Resolution note must be 1000 characters or less');
  }

  // Verify hazard exists and is not already resolved
  const { data: hazard, error: hazardError } = await supabase
    .from('hazards')
    .select('id, user_id, resolved_at, title')
    .eq('id', hazardId)
    .single();

  if (hazardError || !hazard) {
    throw error(404, 'Hazard not found');
  }

  if (hazard.resolved_at) {
    throw error(400, 'This hazard has already been marked as resolved');
  }

  // Check if a resolution report already exists
  const { data: existingReport } = await supabase
    .from('hazard_resolution_reports')
    .select('id')
    .eq('hazard_id', hazardId)
    .single();

  if (existingReport) {
    throw error(400, 'A resolution report already exists for this hazard. Please confirm or dispute it instead.');
  }

  // Get user's current trust score
  const { data: userData } = await supabase
    .from('users')
    .select('trust_score')
    .eq('id', user.id)
    .single();

  const trustScore = userData?.trust_score ?? 0;

  // Create resolution report
  const { data: report, error: reportError } = await supabase
    .from('hazard_resolution_reports')
    .insert({
      hazard_id: hazardId,
      reported_by: user.id,
      resolution_note: body.resolution_note.trim(),
      evidence_url: body.evidence_url || null,
      trust_score_at_report: trustScore,
    })
    .select()
    .single();

  if (reportError) {
    console.error('Error creating resolution report:', reportError);
    throw error(500, 'Failed to create resolution report');
  }

  // Log to audit trail
  await supabase
    .from('expiration_audit_log')
    .insert({
      hazard_id: hazardId,
      action: 'resolution_reported',
      performed_by: user.id,
      reason: `Resolution report submitted: "${body.resolution_note.substring(0, 100)}${body.resolution_note.length > 100 ? '...' : ''}"`,
    });

  return json({
    success: true,
    report,
    message: 'Resolution report submitted successfully. Other users can now confirm or dispute this report.',
  });
};

/**
 * Update an existing resolution report (by the original reporter only)
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  const { id: hazardId } = params;
  const supabase = locals.supabase;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw error(401, 'You must be logged in to update a resolution report');
  }

  // Parse request body
  let body: Partial<CreateResolutionReportRequest>;
  try {
    body = await request.json();
  } catch (e) {
    throw error(400, 'Invalid request body');
  }

  // Get existing report
  const { data: existingReport, error: reportError } = await supabase
    .from('hazard_resolution_reports')
    .select('*')
    .eq('hazard_id', hazardId)
    .single();

  if (reportError || !existingReport) {
    throw error(404, 'Resolution report not found');
  }

  // Check ownership
  if (existingReport.reported_by !== user.id) {
    throw error(403, 'You can only update your own resolution reports');
  }

  // Check if hazard is already resolved
  const { data: hazard } = await supabase
    .from('hazards')
    .select('resolved_at')
    .eq('id', hazardId)
    .single();

  if (hazard?.resolved_at) {
    throw error(400, 'Cannot update report for a resolved hazard');
  }

  // Build update object
  const updates: Partial<typeof existingReport> = {};
  
  if (body.resolution_note !== undefined) {
    if (!body.resolution_note.trim()) {
      throw error(400, 'Resolution note cannot be empty');
    }
    if (body.resolution_note.length > 1000) {
      throw error(400, 'Resolution note must be 1000 characters or less');
    }
    updates.resolution_note = body.resolution_note.trim();
  }

  if (body.evidence_url !== undefined) {
    updates.evidence_url = body.evidence_url || null;
  }

  // Update report
  const { data: updatedReport, error: updateError } = await supabase
    .from('hazard_resolution_reports')
    .update(updates)
    .eq('id', existingReport.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating resolution report:', updateError);
    throw error(500, 'Failed to update resolution report');
  }

  // Log to audit trail
  await supabase
    .from('expiration_audit_log')
    .insert({
      hazard_id: hazardId,
      action: 'resolution_report_updated',
      performed_by: user.id,
      reason: 'Resolution report updated',
    });

  return json({
    success: true,
    report: updatedReport,
    message: 'Resolution report updated successfully',
  });
};
