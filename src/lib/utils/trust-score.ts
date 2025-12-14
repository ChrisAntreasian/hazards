/**
 * Trust Score System - Backend Utilities
 * Provides functions for querying and managing trust scores
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// =====================================================
// TYPES
// =====================================================

export type TrustScoreTier = 
  | 'New User'
  | 'Contributor' 
  | 'Trusted'
  | 'Community Leader'
  | 'Expert'
  | 'Guardian';

export interface TrustScoreData {
  userId: string;
  score: number;
  tier: TrustScoreTier;
  tierIcon: string;
  tierColor: string;
  nextTier: TrustScoreTier | null;
  pointsToNextTier: number | null;
}

export interface TrustScoreEvent {
  id: string;
  userId: string;
  eventType: string;
  pointsChange: number;
  previousScore: number;
  newScore: number;
  relatedContentId: string | null;
  relatedContentType: string | null;
  notes: string | null;
  createdAt: string;
}

export interface TrustScoreBreakdown {
  eventType: string;
  eventCount: number;
  totalPoints: number;
  description?: string;
}

export interface TrustScoreConfig {
  id: string;
  actionKey: string;
  points: number;
  description: string;
  isActive: boolean;
  updatedAt: string;
}

// =====================================================
// TIER CONFIGURATION
// =====================================================

export const TRUST_SCORE_TIERS: Record<TrustScoreTier, { 
  minScore: number; 
  icon: string; 
  color: string;
  description: string;
}> = {
  'New User': {
    minScore: 0,
    icon: '🌱',
    color: '#9CA3AF',
    description: 'Just getting started'
  },
  'Contributor': {
    minScore: 50,
    icon: '🌿',
    color: '#10B981',
    description: 'Active community member'
  },
  'Trusted': {
    minScore: 200,
    icon: '🌳',
    color: '#3B82F6',
    description: 'Reliable contributor'
  },
  'Community Leader': {
    minScore: 500,
    icon: '🏅',
    color: '#F59E0B',
    description: 'Guiding the community'
  },
  'Expert': {
    minScore: 1000,
    icon: '🥈',
    color: '#C0C0C0',
    description: 'Exceptional knowledge'
  },
  'Guardian': {
    minScore: 2000,
    icon: '🥇',
    color: '#FFD700',
    description: 'Community guardian'
  }
};

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Get trust score tier based on score value
 */
export function getTrustScoreTier(score: number): TrustScoreTier {
  if (score >= 2000) return 'Guardian';
  if (score >= 1000) return 'Expert';
  if (score >= 500) return 'Community Leader';
  if (score >= 200) return 'Trusted';
  if (score >= 50) return 'Contributor';
  return 'New User';
}

/**
 * Get next tier and points needed
 */
function getNextTierInfo(currentScore: number): { 
  nextTier: TrustScoreTier | null; 
  pointsToNext: number | null 
} {
  const tiers = Object.entries(TRUST_SCORE_TIERS)
    .sort(([, a], [, b]) => a.minScore - b.minScore);
  
  for (const [tierName, tierData] of tiers) {
    if (currentScore < tierData.minScore) {
      return {
        nextTier: tierName as TrustScoreTier,
        pointsToNext: tierData.minScore - currentScore
      };
    }
  }
  
  return { nextTier: null, pointsToNext: null }; // Already at max tier
}

/**
 * Get complete trust score data for a user
 */
export async function getUserTrustScore(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TrustScoreData | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, trust_score')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Error fetching user trust score:', error);
      return null;
    }

    const score = user.trust_score || 0;
    const tier = getTrustScoreTier(score);
    const tierConfig = TRUST_SCORE_TIERS[tier];
    const { nextTier, pointsToNext } = getNextTierInfo(score);

    return {
      userId: user.id,
      score,
      tier,
      tierIcon: tierConfig.icon,
      tierColor: tierConfig.color,
      nextTier,
      pointsToNextTier: pointsToNext
    };
  } catch (error) {
    console.error('Error in getUserTrustScore:', error);
    return null;
  }
}

/**
 * Get trust score event history for a user
 */
export async function getTrustScoreHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit: number = 50
): Promise<TrustScoreEvent[]> {
  try {
    const { data, error } = await supabase
      .from('trust_score_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trust score history:', error);
      return [];
    }

    return (data || []).map(event => ({
      id: event.id,
      userId: event.user_id,
      eventType: event.event_type,
      pointsChange: event.points_change,
      previousScore: event.previous_score,
      newScore: event.new_score,
      relatedContentId: event.related_content_id,
      relatedContentType: event.related_content_type,
      notes: event.notes,
      createdAt: event.created_at
    }));
  } catch (error) {
    console.error('Error in getTrustScoreHistory:', error);
    return [];
  }
}

/**
 * Get trust score breakdown by event type
 */
export async function getTrustScoreBreakdown(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TrustScoreBreakdown[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_trust_score_breakdown', { p_user_id: userId });

    if (error) {
      console.error('Error fetching trust score breakdown:', error);
      return [];
    }

    // Also get config descriptions
    const { data: config } = await supabase
      .from('trust_score_config')
      .select('action_key, description');

    const configMap = new Map(
      (config || []).map(c => [c.action_key, c.description])
    );

    return (data || []).map(item => ({
      eventType: item.event_type,
      eventCount: Number(item.event_count),
      totalPoints: Number(item.total_points),
      description: configMap.get(item.event_type)
    }));
  } catch (error) {
    console.error('Error in getTrustScoreBreakdown:', error);
    return [];
  }
}

/**
 * Get trust score configuration (all action types and point values)
 */
export async function getTrustScoreConfig(
  supabase: SupabaseClient<Database>
): Promise<TrustScoreConfig[]> {
  try {
    const { data, error } = await supabase
      .from('trust_score_config')
      .select('*')
      .eq('is_active', true)
      .order('points', { ascending: false });

    if (error) {
      console.error('Error fetching trust score config:', error);
      return [];
    }

    return (data || []).map(config => ({
      id: config.id,
      actionKey: config.action_key,
      points: config.points,
      description: config.description,
      isActive: config.is_active,
      updatedAt: config.updated_at
    }));
  } catch (error) {
    console.error('Error in getTrustScoreConfig:', error);
    return [];
  }
}

/**
 * Manually adjust a user's trust score (Admin only)
 */
export async function adjustTrustScore(
  supabase: SupabaseClient<Database>,
  userId: string,
  points: number,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin permissions
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminError || !admin || admin.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get current score
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('trust_score')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return { success: false, error: 'User not found' };
    }

    const previousScore = user.trust_score || 0;
    const newScore = Math.max(0, previousScore + points); // Floor at 0

    // Update user's score
    const { error: updateError } = await supabase
      .from('users')
      .update({ trust_score: newScore, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: 'Failed to update trust score' };
    }

    // Create manual event record (bypasses trigger via service role)
    const { error: eventError } = await supabase
      .from('trust_score_events')
      .insert({
        user_id: userId,
        event_type: 'manual_adjustment',
        points_change: points,
        previous_score: previousScore,
        new_score: newScore,
        related_content_id: adminId,
        related_content_type: 'admin_adjustment',
        notes: reason
      });

    if (eventError) {
      console.error('Warning: Event record failed:', eventError);
      // Don't fail the whole operation if event logging fails
    }

    return { success: true };
  } catch (error) {
    console.error('Error in adjustTrustScore:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Update trust score configuration (Admin only)
 */
export async function updateTrustScoreConfig(
  supabase: SupabaseClient<Database>,
  actionKey: string,
  points: number,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify admin permissions
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminError || !admin || admin.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Update config
    const { error: updateError } = await supabase
      .from('trust_score_config')
      .update({ 
        points, 
        updated_at: new Date().toISOString(),
        updated_by: adminId
      })
      .eq('action_key', actionKey);

    if (updateError) {
      return { success: false, error: 'Failed to update config' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateTrustScoreConfig:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get leaderboard (top users by trust score)
 */
export async function getTrustScoreLeaderboard(
  supabase: SupabaseClient<Database>,
  limit: number = 100,
  timeframe: 'all_time' | 'month' | 'week' = 'all_time'
): Promise<Array<{
  userId: string;
  email: string;
  score: number;
  tier: TrustScoreTier;
  tierIcon: string;
  rank: number;
}>> {
  try {
    let query = supabase
      .from('users')
      .select('id, email, trust_score')
      .order('trust_score', { ascending: false })
      .limit(limit);

    // Note: Time-based filtering would require aggregating events
    // For now, showing all-time scores
    // TODO: Implement time-based filtering using trust_score_events

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return (data || []).map((user, index) => {
      const score = user.trust_score || 0;
      const tier = getTrustScoreTier(score);
      return {
        userId: user.id,
        email: user.email,
        score,
        tier,
        tierIcon: TRUST_SCORE_TIERS[tier].icon,
        rank: index + 1
      };
    });
  } catch (error) {
    console.error('Error in getTrustScoreLeaderboard:', error);
    return [];
  }
}

/**
 * Format trust score for display
 */
export function formatTrustScore(score: number): string {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return score.toString();
}

/**
 * Get tier description
 */
export function getTierDescription(tier: TrustScoreTier): string {
  return TRUST_SCORE_TIERS[tier].description;
}

/**
 * Get tier progress percentage (0-100)
 */
export function getTierProgress(score: number): number {
  const tiers = Object.values(TRUST_SCORE_TIERS).sort((a, b) => a.minScore - b.minScore);
  
  for (let i = 0; i < tiers.length - 1; i++) {
    const current = tiers[i];
    const next = tiers[i + 1];
    
    if (score >= current.minScore && score < next.minScore) {
      const range = next.minScore - current.minScore;
      const progress = score - current.minScore;
      return (progress / range) * 100;
    }
  }
  
  // At max tier
  if (score >= tiers[tiers.length - 1].minScore) {
    return 100;
  }
  
  return 0;
}
