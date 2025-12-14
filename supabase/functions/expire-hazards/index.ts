/**
 * Su/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface ExpiredHazard {ase Edge Function: Expire Hazards
 * 
 * Purpose: Automatically expire auto_expire type hazards that have passed their expires_at timestamp
 * Schedule: Run hourly via cron (0 * * * *)
 * 
 * @author Hazards App
 * @date November 17, 2025
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface ExpiredHazard {
  id: string;
  title: string;
  expires_at: string;
  extended_count: number;
  user_id: string;
}

Deno.serve(async (req) => {
  try {
    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current timestamp
    const now = new Date();
    console.log(`[${now.toISOString()}] Starting auto-expire job`);

    // Find all expired hazards that haven't been resolved yet
    const { data: expiredHazards, error: queryError } = await supabase
      .from('hazards')
      .select('id, title, expires_at, extended_count, user_id')
      .eq('expiration_type', 'auto_expire')
      .not('resolved_at', 'is', null) // NOT resolved yet
      .lte('expires_at', now.toISOString()) // Expired
      .is('resolved_at', null) // Double check not resolved
      .order('expires_at', { ascending: true })
      .returns<ExpiredHazard[]>();

    if (queryError) {
      console.error('Error querying expired hazards:', queryError);
      throw queryError;
    }

    const expiredCount = expiredHazards?.length || 0;
    console.log(`Found ${expiredCount} expired hazards to process`);

    if (!expiredHazards || expiredCount === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No expired hazards to process',
          expired_count: 0,
          processed_at: now.toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Process each expired hazard
    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[]
    };

    for (const hazard of expiredHazards) {
      try {
        // Calculate how long ago it expired
        const expiredAt = new Date(hazard.expires_at);
        const hoursExpired = Math.floor((now.getTime() - expiredAt.getTime()) / (1000 * 60 * 60));

        // Update hazard to resolved
        const { error: updateError } = await supabase
          .from('hazards')
          .update({
            resolved_at: now.toISOString(),
            resolution_note: `Automatically expired after ${hoursExpired} hour${hoursExpired !== 1 ? 's' : ''} past expiration time. Extended ${hazard.extended_count} time${hazard.extended_count !== 1 ? 's' : ''}.`,
            updated_at: now.toISOString()
          })
          .eq('id', hazard.id);

        if (updateError) {
          console.error(`Failed to expire hazard ${hazard.id}:`, updateError);
          results.failed.push({ id: hazard.id, error: updateError.message });
          continue;
        }

        // Log to audit trail
        const { error: auditError } = await supabase
          .from('expiration_audit_log')
          .insert({
            hazard_id: hazard.id,
            action: 'auto_expired',
            performed_by: null, // System action
            previous_state: {
              resolved_at: null,
              expires_at: hazard.expires_at,
              extended_count: hazard.extended_count
            },
            new_state: {
              resolved_at: now.toISOString(),
              hours_past_expiration: hoursExpired
            },
            reason: `Auto-expired ${hoursExpired} hours past expiration`
          });

        if (auditError) {
          console.warn(`Failed to log audit for hazard ${hazard.id}:`, auditError);
          // Don't fail the whole operation for audit logging
        }

        console.log(`✓ Expired hazard ${hazard.id}: "${hazard.title}" (${hoursExpired}h past expiration)`);
        results.success.push(hazard.id);

      } catch (err) {
        console.error(`Error processing hazard ${hazard.id}:`, err);
        results.failed.push({ 
          id: hazard.id, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    // Return summary
    const response = {
      success: true,
      message: `Processed ${expiredCount} expired hazards`,
      expired_count: expiredCount,
      successfully_expired: results.success.length,
      failed: results.failed.length,
      hazard_ids: results.success,
      errors: results.failed.length > 0 ? results.failed : undefined,
      processed_at: now.toISOString()
    };

    console.log(`[${now.toISOString()}] Completed: ${results.success.length} succeeded, ${results.failed.length} failed`);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Fatal error in expire-hazards function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed_at: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
