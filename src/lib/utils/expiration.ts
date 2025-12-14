/**
 * Expiration utilities for lazy expiration (no cron needed)
 * 
 * These functions check and expire hazards on-demand when they're accessed.
 * This eliminates the need for a cron job while keeping the system efficient.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '$lib/utils/logger';

/**
 * Check if a hazard is expired (but not yet marked as resolved)
 */
export function isExpired(hazard: any): boolean {
  if (hazard.resolved_at) {
    return false; // Already resolved
  }

  if (hazard.expiration_type !== 'auto_expire' || !hazard.expires_at) {
    return false; // Not an auto-expire hazard
  }

  const now = new Date();
  const expiresAt = new Date(hazard.expires_at);
  
  return expiresAt <= now;
}

/**
 * Lazy expiration: Mark hazard as resolved if it's expired
 * Call this when loading a hazard detail page
 * 
 * @param supabase - Supabase client
 * @param hazard - Hazard object to check
 * @returns Promise<boolean> - True if hazard was expired
 */
export async function expireHazardIfNeeded(
  supabase: SupabaseClient,
  hazard: any
): Promise<boolean> {
  // Only auto-expire hazards need this check
  if (hazard.expiration_type !== 'auto_expire') {
    return false;
  }

  // Already resolved
  if (hazard.resolved_at) {
    return false;
  }

  // Check if expired
  if (!hazard.expires_at) {
    return false;
  }

  const now = new Date();
  const expiresAt = new Date(hazard.expires_at);

  if (expiresAt <= now) {
    // Expire it now
    const hoursExpired = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60));
    
    logger.info('Attempting to expire hazard', {
      metadata: { 
        hazard_id: hazard.id, 
        expires_at: hazard.expires_at,
        hours_expired: hoursExpired 
      }
    });
    
    try {
      const { error: updateError } = await supabase
        .from('hazards')
        .update({
          resolved_at: now.toISOString(),
          resolved_by: null, // NULL for system-triggered expiration
          resolution_note: `Auto-expired after ${hoursExpired} hour(s) past expiration time`
        })
        .eq('id', hazard.id);

      if (updateError) {
        logger.error('Failed to update hazard expiration', 
          new Error(JSON.stringify(updateError)), {
          metadata: { hazard_id: hazard.id, error: updateError }
        });
        console.error('[EXPIRATION ERROR]', updateError);
        return false;
      }
      
      logger.info('Successfully expired hazard', {
        metadata: { hazard_id: hazard.id }
      });

      // Update audit log
      const { error: auditError } = await supabase
        .from('expiration_audit_log')
        .insert({
          hazard_id: hazard.id,
          action: 'auto_expired',
          previous_state: { expires_at: hazard.expires_at },
          new_state: { resolved_at: now.toISOString() },
          reason: `Auto-expired on access after ${hoursExpired} hour(s)`
        });

      if (auditError) {
        logger.warn('Failed to log expiration to audit log', {
          metadata: { hazard_id: hazard.id, error: auditError }
        });
      }

      // Update local object so UI shows correct state
      hazard.resolved_at = now.toISOString();
      hazard.resolved_by = null;
      hazard.resolution_note = `Auto-expired after ${hoursExpired} hour(s) past expiration time`;

      logger.info('Hazard auto-expired on access', {
        metadata: { hazard_id: hazard.id, hours_expired: hoursExpired }
      });

      return true;
    } catch (err) {
      logger.error('Failed to auto-expire hazard', err instanceof Error ? err : new Error(String(err)), {
        metadata: { hazard_id: hazard.id }
      });
      return false;
    }
  }

  return false;
}

/**
 * Filter expired hazards from a list (for map/list views)
 * This is efficient - just checks dates, doesn't update database
 * 
 * @param hazards - Array of hazards
 * @returns Filtered array without expired hazards
 */
export function filterExpiredHazards<T extends { 
  resolved_at?: string | null;
  expiration_type?: string | null;
  expires_at?: string | null;
}>(hazards: T[]): T[] {
  const now = new Date();
  
  return hazards.filter(hazard => {
    // Filter out resolved hazards
    if (hazard.resolved_at) {
      return false;
    }
    
    // Filter out expired auto_expire hazards
    if (hazard.expiration_type === 'auto_expire' && hazard.expires_at) {
      const expiresAt = new Date(hazard.expires_at);
      if (expiresAt <= now) {
        return false; // Hide expired hazards
      }
    }
    
    return true;
  });
}

/**
 * Batch expire multiple hazards (useful for background tasks if needed)
 * Call this if you want to clean up expired hazards in bulk
 * 
 * @param supabase - Supabase client
 * @returns Number of hazards expired
 */
export async function expireAllExpiredHazards(
  supabase: SupabaseClient
): Promise<number> {
  try {
    const now = new Date();

    // Find all expired but not resolved hazards
    const { data: expiredHazards, error: fetchError } = await supabase
      .from('hazards')
      .select('id, title, expires_at')
      .eq('expiration_type', 'auto_expire')
      .lt('expires_at', now.toISOString())
      .is('resolved_at', null);

    if (fetchError) {
      logger.error('Failed to fetch expired hazards', new Error(fetchError.message));
      return 0;
    }

    if (!expiredHazards || expiredHazards.length === 0) {
      return 0;
    }

    let successCount = 0;

    // Process each expired hazard
    for (const hazard of expiredHazards) {
      const expiresAt = new Date(hazard.expires_at);
      const hoursExpired = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60));

      const { error: updateError } = await supabase
        .from('hazards')
        .update({
          resolved_at: now.toISOString(),
          resolved_by: null, // NULL for system-triggered expiration
          resolution_note: `Auto-expired after ${hoursExpired} hour(s) past expiration time`
        })
        .eq('id', hazard.id);

      if (!updateError) {
        // Log to audit trail
        await supabase
          .from('expiration_audit_log')
          .insert({
            hazard_id: hazard.id,
            action: 'auto_expired',
            previous_state: { expires_at: hazard.expires_at },
            new_state: { resolved_at: now.toISOString() },
            reason: `Batch expired after ${hoursExpired} hour(s)`
          });

        successCount++;
      } else {
        logger.error('Failed to expire hazard', new Error(updateError.message), {
          metadata: { hazard_id: hazard.id }
        });
      }
    }

    logger.info('Batch expired hazards', {
      metadata: { total: expiredHazards.length, success: successCount }
    });

    return successCount;
  } catch (err) {
    logger.error('Batch expiration failed', err instanceof Error ? err : new Error(String(err)));
    return 0;
  }
}
