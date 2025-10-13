import { createSupabaseServerClient } from '$lib/supabase.js';
import type { ModerationItem, ModerationAction, ModerationStats, AutoModerationResult } from '$lib/types/moderation.js';

export class ModerationQueue {
  constructor(private event: any) {}

  private get supabase() {
    return createSupabaseServerClient(this.event);
  }

  /**
   * Get next moderation item for a moderator
   */
  async getNextItem(moderatorId: string): Promise<ModerationItem | null> {
    const supabase = this.supabase;
    if (!supabase) throw new Error('Supabase not configured');

    try {
      // Get highest priority, oldest item that's not assigned or assigned to this moderator
      const { data, error } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('status', 'pending')
        .or(`assigned_moderator.is.null,assigned_moderator.eq.${moderatorId}`)
        .order('priority', { ascending: false }) // urgent first
        .order('created_at', { ascending: true }) // oldest first
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No items found
        throw error;
      }

      // Assign to moderator if not already assigned
      if (!data.assigned_moderator) {
        await supabase
          .from('moderation_queue')
          .update({ assigned_moderator: moderatorId })
          .eq('id', data.id);
      }

      // Transform to ModerationItem format
      return await this.transformToModerationItem(data);

    } catch (error) {
      console.error('Error getting next moderation item:', error);
      throw error;
    }
  }

  /**
   * Get a specific moderation item by ID
   */
  async getSpecificItem(itemId: string, moderatorId: string): Promise<ModerationItem | null> {
    const supabase = this.supabase;
    if (!supabase) throw new Error('Supabase not configured');

    try {
      // Get the specific item
      const { data, error } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('id', itemId)
        .eq('status', 'pending')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Item not found
        throw error;
      }

      // Assign to moderator if not already assigned
      if (!data.assigned_moderator) {
        await supabase
          .from('moderation_queue')
          .update({ assigned_moderator: moderatorId })
          .eq('id', data.id);
      }

      // Transform to ModerationItem format
      return await this.transformToModerationItem(data);

    } catch (error) {
      console.error('Error getting specific moderation item:', error);
      throw error;
    }
  }

  /**
   * Add item to moderation queue
   */
  async addToQueue(item: Omit<ModerationItem, 'id' | 'created_at'>): Promise<void> {
    const supabase = this.supabase;
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { error } = await supabase
        .from('moderation_queue')
        .insert({
          type: item.type,
          content_id: item.content_id,
          submitted_by: item.submitted_by,
          flagged_reasons: item.flagged_reasons,
          priority: item.priority,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding to moderation queue:', error);
      throw error;
    }
  }

  /**
   * Process moderation action (approve/reject/flag)
   */
  async processAction(
    itemId: string, 
    action: ModerationAction, 
    moderatorId: string
  ): Promise<void> {
    const supabase = this.supabase;
    if (!supabase) throw new Error('Supabase not configured');

    try {
      // Update moderation queue item
      const updateData: any = {
        assigned_moderator: moderatorId,
        moderator_notes: action.notes,
      };

      // Only set resolved_at and status for approve/reject actions
      if (action.type === 'approve') {
        updateData.status = 'approved';
        updateData.resolved_at = new Date().toISOString();
      } else if (action.type === 'reject') {
        updateData.status = 'rejected';
        updateData.resolved_at = new Date().toISOString();
      } else if (action.type === 'flag') {
        // For flag action, keep status as 'pending' but add flagged reasons
        const flaggedReasons = [];
        if (action.reason) {
          flaggedReasons.push(action.reason);
        }
        if (action.notes) {
          flaggedReasons.push(action.notes);
        }
        if (flaggedReasons.length === 0) {
          flaggedReasons.push('Flagged for additional review');
        }
        updateData.flagged_reasons = flaggedReasons;
      }

      const { error: queueError } = await supabase
        .from('moderation_queue')
        .update(updateData)
        .eq('id', itemId);

      if (queueError) throw queueError;

      // Get the moderation item to update the actual content
      const { data: item, error: itemError } = await supabase
        .from('moderation_queue')
        .select('*')
        .eq('id', itemId)
        .single();

      if (itemError) throw itemError;

      // Update the actual content based on the action
      if (action.type === 'approve' || action.type === 'reject') {
        await this.updateContentStatus(item, action.type);
      }

    } catch (error) {
      console.error('Error processing moderation action:', error);
      throw error;
    }
  }

  /**
   * Calculate average review time in minutes from resolved items
   */
  private async calculateAverageReviewTime(supabase: any): Promise<number> {
    try {
      const { data: resolvedItems } = await supabase
        .from('moderation_queue')
        .select('created_at, resolved_at')
        .in('status', ['approved', 'rejected'])
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(100); // Sample recent 100 resolved items

      if (!resolvedItems || resolvedItems.length === 0) {
        return 0;
      }

      const totalMinutes = resolvedItems.reduce((sum: number, item: any) => {
        const created = new Date(item.created_at);
        const resolved = new Date(item.resolved_at);
        const diffMinutes = (resolved.getTime() - created.getTime()) / (1000 * 60);
        return sum + diffMinutes;
      }, 0);

      return Math.round(totalMinutes / resolvedItems.length);
    } catch (error) {
      console.error('Error calculating average review time:', error);
      return 0;
    }
  }

  /**
   * Get moderation statistics for dashboard
   */
  async getStats(): Promise<ModerationStats> {
    const supabase = this.supabase;
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get pending count
      const { count: pendingCount } = await supabase
        .from('moderation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get approved today
      const { count: approvedToday } = await supabase
        .from('moderation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('resolved_at', `${today}T00:00:00Z`);

      // Get rejected today
      const { count: rejectedToday } = await supabase
        .from('moderation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('resolved_at', `${today}T00:00:00Z`);

      // Get counts by priority
      const { data: priorityData } = await supabase
        .from('moderation_queue')
        .select('priority')
        .eq('status', 'pending');

      const priorityCounts = {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0
      };

      priorityData?.forEach(item => {
        priorityCounts[item.priority as keyof typeof priorityCounts]++;
      });

      return {
        pending_count: pendingCount || 0,
        approved_today: approvedToday || 0,
        rejected_today: rejectedToday || 0,
        avg_review_time_minutes: await this.calculateAverageReviewTime(supabase),
        items_by_priority: priorityCounts
      };

    } catch (error) {
      console.error('Error getting moderation stats:', error);
      throw error;
    }
  }

  /**
   * Get moderation queue with pagination
   */
  async getQueue(
    status?: 'pending' | 'approved' | 'rejected',
    limit = 20,
    offset = 0
  ): Promise<{ items: ModerationItem[]; totalCount: number }> {
    const supabase = this.supabase;
    if (!supabase) throw new Error('Supabase not configured');

    try {
      let query = supabase
        .from('moderation_queue')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      // Apply appropriate sorting based on status
      if (status === 'approved' || status === 'rejected') {
        // For completed items, sort by most recently resolved
        query = query.order('resolved_at', { ascending: false });
      } else {
        // For pending items, sort by priority then by creation date
        query = query
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true }); // Oldest pending first for fairness
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const items = await Promise.all(
        (data || []).map(item => this.transformToModerationItem(item))
      );

      return {
        items,
        totalCount: count || 0
      };

    } catch (error) {
      console.error('Error getting moderation queue:', error);
      throw error;
    }
  }

  /**
   * Transform database result to ModerationItem format
   */
  private async transformToModerationItem(data: any): Promise<ModerationItem> {
    const supabase = this.supabase;
    let contentPreview: any = {};
    let submitterEmail = '';

    // Fetch submitter email
    if (data.submitted_by) {
      const { data: userData } = await supabase!
        .from('users')
        .select('email')
        .eq('id', data.submitted_by)
        .single();
      submitterEmail = userData?.email || '';
    }

    // Fetch content preview based on type
    if (data.type === 'hazard' && data.content_id) {
      // Use the security definer function to bypass RLS for moderation
      const { data: hazardData, error: hazardError } = await supabase!
        .rpc('get_hazard_for_moderation', { hazard_id: data.content_id });
      
      // Also fetch images for this hazard
      const { data: imageData, error: imageError } = await supabase!
        .rpc('get_hazard_images_for_moderation_v2', { target_hazard_id: data.content_id });
      
      if (hazardData && hazardData.length > 0) {
        const hazard = hazardData[0];
        contentPreview = {
          title: hazard.title,
          description: hazard.description,
          severity_level: hazard.severity_level,
          location: {
            latitude: hazard.latitude,
            longitude: hazard.longitude
          },
          category: {
            name: hazard.category_name,
            icon: hazard.category_icon
          },
          reported_active_date: hazard.reported_active_date,
          is_seasonal: hazard.is_seasonal,
          created_at: hazard.created_at,
          images: imageData ? imageData.map((img: any) => ({
            id: img.id,
            image_url: img.original_url,
            thumbnail_url: img.thumbnail_url,
            uploaded_at: img.uploaded_at,
            vote_score: img.vote_score,
            metadata: img.metadata
          })) : []
        };
      } else {
        console.warn('No hazard data found for content_id:', data.content_id);
        contentPreview = {
          title: 'Unknown Hazard',
          description: 'Data not available',
          severity_level: 0,
          images: []
        };
      }
    } else if (data.type === 'image' && data.content_id) {
      const { data: imageData } = await supabase!
        .from('hazard_images')
        .select('image_url, hazard_id')
        .eq('id', data.content_id)
        .single();
      
      if (imageData) {
        contentPreview = {
          title: 'Image Upload',
          image_url: imageData.image_url,
          additional_data: { hazard_id: imageData.hazard_id }
        };
      }
    } else if (data.type === 'template' && data.content_id) {
      const { data: templateData } = await supabase!
        .from('hazard_templates')
        .select('name, scientific_name')
        .eq('id', data.content_id)
        .single();
      
      if (templateData) {
        contentPreview = {
          title: templateData.name,
          description: templateData.scientific_name
        };
      }
    }

    return {
      id: data.id,
      type: data.type,
      content_id: data.content_id,
      submitted_by: data.submitted_by,
      submitter_email: submitterEmail,
      flagged_reasons: data.flagged_reasons || [],
      priority: data.priority,
      status: data.status,
      assigned_moderator: data.assigned_moderator,
      moderator_notes: data.moderator_notes,
      created_at: data.created_at,
      resolved_at: data.resolved_at,
      content_preview: contentPreview
    };
  }

  /**
   * Update the actual content status based on moderation decision
   */
  private async updateContentStatus(item: any, action: 'approve' | 'reject'): Promise<void> {
    const supabase = this.supabase;
    if (!supabase) return;

    const status = action === 'approve' ? 'approved' : 'rejected';

    try {
      switch (item.type) {
        case 'hazard':
          await supabase
            .from('hazards')
            .update({ status })
            .eq('id', item.content_id);
          break;

        case 'image':
          await supabase
            .from('hazard_images')
            .update({ moderation_status: status })
            .eq('id', item.content_id);
          break;

        case 'template':
          await supabase
            .from('hazard_templates')
            .update({ status: action === 'approve' ? 'published' : 'rejected' })
            .eq('id', item.content_id);
          break;
      }
    } catch (error) {
      console.error('Error updating content status:', error);
      throw error;
    }
  }
}

/**
 * Automated pre-moderation screening
 */
export async function runAutomatedModeration(
  content: any,
  contentType: 'hazard' | 'image' | 'template'
): Promise<AutoModerationResult> {
  // Basic automated screening - can be enhanced with AI services later
  const result: AutoModerationResult = {
    action: 'review',
    confidence: 0,
    reasons: [],
    details: {}
  };

  try {
    if (contentType === 'hazard') {
      // Text content analysis
      const textScore = analyzeText(content.title + ' ' + (content.description || ''));
      result.details.text_analysis = textScore;

      // Location validation
      const locationScore = await analyzeLocation(content.latitude, content.longitude);
      result.details.location_analysis = locationScore;

      // Determine action based on analysis
      if (textScore.spam_score > 0.8 || !textScore.language_appropriate) {
        result.action = 'reject';
        result.confidence = 0.9;
        result.reasons.push('Content appears to be spam or inappropriate');
      } else if (!locationScore.valid_location || !locationScore.in_supported_region) {
        result.action = 'flag';
        result.confidence = 0.7;
        result.reasons.push('Location appears invalid or outside supported region');
      } else if (textScore.spam_score < 0.2 && textScore.language_appropriate) {
        result.action = 'approve';
        result.confidence = 0.6;
        result.reasons.push('Content appears legitimate');
      }
    }

    return result;

  } catch (error) {
    console.error('Automated moderation error:', error);
    return {
      action: 'review',
      confidence: 0,
      reasons: ['Error in automated analysis'],
      details: {}
    };
  }
}

/**
 * Basic text analysis for spam detection
 */
function analyzeText(text: string) {
  const lowerText = text.toLowerCase();
  
  // Simple spam indicators
  const spamWords = ['buy now', 'click here', 'free money', 'urgent', 'limited time'];
  const spamCount = spamWords.filter(word => lowerText.includes(word)).length;
  
  // Length analysis
  const tooShort = text.length < 10;
  const tooLong = text.length > 1000;
  
  // Repetitive characters
  const hasExcessiveRepeats = /(.)\1{5,}/.test(text);
  
  return {
    spam_score: Math.min(1, (spamCount * 0.3) + (tooShort ? 0.4 : 0) + (hasExcessiveRepeats ? 0.5 : 0)),
    sentiment: 0.5, // Neutral - could integrate sentiment analysis
    language_appropriate: !lowerText.match(/\b(fuck|shit|damn)\b/g) // Basic profanity check
  };
}

/**
 * Basic location validation
 */
async function analyzeLocation(lat: number, lng: number, supabase?: any) {
  // Check if coordinates are valid
  const validLat = lat >= -90 && lat <= 90;
  const validLng = lng >= -180 && lng <= 180;
  
  // Check if in Boston area (our supported region for MVP)
  const inBoston = lat >= 42.2 && lat <= 42.5 && lng >= -71.3 && lng <= -70.8;
  
  // Basic duplicate detection within 100 meters
  let duplicateNearby = false;
  if (supabase && validLat && validLng) {
    try {
      // Use PostGIS distance calculation (assuming postgis extension is enabled)
      const { data: nearbyHazards } = await supabase
        .rpc('find_nearby_hazards', { 
          target_lat: lat, 
          target_lng: lng, 
          radius_meters: 100 
        });
      
      duplicateNearby = nearbyHazards && nearbyHazards.length > 0;
    } catch (error) {
      // If RPC function doesn't exist, fall back to basic coordinate comparison
      const tolerance = 0.001; // Roughly 100 meters at Boston latitude
      const { data: similarHazards } = await supabase
        .from('hazards')
        .select('latitude, longitude')
        .gte('latitude', lat - tolerance)
        .lte('latitude', lat + tolerance)
        .gte('longitude', lng - tolerance)
        .lte('longitude', lng + tolerance)
        .limit(1);
      
      duplicateNearby = similarHazards && similarHazards.length > 0;
    }
  }
  
  return {
    valid_location: validLat && validLng,
    in_supported_region: inBoston,
    duplicate_nearby: duplicateNearby
  };
}
