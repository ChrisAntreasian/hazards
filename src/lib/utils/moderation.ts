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
      const { error: queueError } = await supabase
        .from('moderation_queue')
        .update({
          status: action.type === 'approve' ? 'approved' : 
                  action.type === 'reject' ? 'rejected' : 'needs_review',
          assigned_moderator: moderatorId,
          moderator_notes: action.notes,
          resolved_at: new Date().toISOString()
        })
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
        avg_review_time_minutes: 0, // TODO: Calculate from resolved items
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
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
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
      const { data: hazardData } = await supabase!
        .from('hazards')
        .select('title, description, severity_level, latitude, longitude')
        .eq('id', data.content_id)
        .single();
      
      if (hazardData) {
        contentPreview = {
          title: hazardData.title,
          description: hazardData.description,
          severity_level: hazardData.severity_level,
          location: {
            latitude: hazardData.latitude,
            longitude: hazardData.longitude
          }
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
      const locationScore = analyzeLocation(content.latitude, content.longitude);
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
function analyzeLocation(lat: number, lng: number) {
  // Check if coordinates are valid
  const validLat = lat >= -90 && lat <= 90;
  const validLng = lng >= -180 && lng <= 180;
  
  // Check if in Boston area (our supported region for MVP)
  const inBoston = lat >= 42.2 && lat <= 42.5 && lng >= -71.3 && lng <= -70.8;
  
  return {
    valid_location: validLat && validLng,
    in_supported_region: inBoston,
    duplicate_nearby: false // TODO: Implement duplicate detection
  };
}
