import { createSupabaseServerClient } from '$lib/supabase';
import { logger } from '$lib/utils/logger';
import type { ModerationItem, ModerationAction, ModerationStats, AutoModerationResult, ContentPreview } from '$lib/types/moderation';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Core moderation queue management class for handling content review workflows.
 * Provides comprehensive CRUD operations for moderation items, automated screening,
 * and statistical reporting for administrative oversight.
 * 
 * @example
 * ```typescript
 * // Initialize moderation queue in a SvelteKit load function
 * const moderationQueue = new ModerationQueue(event);
 * 
 * // Get next item for review
 * const nextItem = await moderationQueue.getNextItem(moderatorId);
 * 
 * // Process moderation decision
 * await moderationQueue.processAction(itemId, {
 *   type: 'approve',
 *   notes: 'Content meets guidelines'
 * }, moderatorId);
 * ```
 */
export class ModerationQueue {
  /**
   * Creates a new ModerationQueue instance with SvelteKit event context.
   * @param event - SvelteKit RequestEvent containing cookies and request context
   */
  constructor(private event: RequestEvent) {}

  /**
   * Gets authenticated Supabase client from the current request context.
   * @private
   * @returns Supabase client configured with user session
   * @throws {Error} When Supabase client cannot be created
   */
  private get supabase(): SupabaseClient<Database> {
    const client = createSupabaseServerClient(this.event);
    if (!client) {
      throw new Error('Failed to create Supabase client - invalid request context');
    }
    return client;
  }

  /**
   * Retrieves the next highest-priority moderation item for a specific moderator.
   * Implements intelligent queue management by prioritizing urgent items and ensuring
   * fair distribution of oldest pending items among moderators.
   * 
   * @param moderatorId - Unique identifier of the moderator requesting work
   * @returns Promise resolving to the next ModerationItem or null if queue is empty
   * @throws {Error} When Supabase client is not configured or database error occurs
   * 
   * @example
   * ```typescript
   * const nextItem = await moderationQueue.getNextItem('mod-123');
   * if (nextItem) {
   *   console.log(`Assigned ${nextItem.type} item: ${nextItem.content_preview.title}`);
   * }
   * ```
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
      logger.dbError('get_next_moderation_item', error as Error, { 
        metadata: { moderatorId } 
      });
      throw error;
    }
  }

  /**
   * Retrieves a specific moderation item by its unique identifier.
   * Automatically assigns the item to the requesting moderator if unassigned,
   * enabling deep-link access to specific moderation cases.
   * 
   * @param itemId - Unique identifier of the moderation item to retrieve
   * @param moderatorId - ID of the moderator requesting the specific item
   * @returns Promise resolving to ModerationItem or null if not found/not pending
   * @throws {Error} When Supabase client is not configured or database error occurs
   * 
   * @example
   * ```typescript
   * // Direct access to specific moderation case
   * const item = await moderationQueue.getSpecificItem('mod-item-456', 'moderator-123');
   * ```
   */

  /**
   * Retrieves a specific moderation item by ID and assigns it to a moderator.
   * Useful for direct access to items from links, notifications, or escalations.
   * 
   * @param itemId - Unique identifier of the moderation item to retrieve
   * @param moderatorId - ID of moderator requesting access to this specific item
   * @returns Promise resolving to the ModerationItem or null if not found/accessible
   * @throws {Error} When database error occurs or item is not in pending status
   * 
   * @example
   * ```typescript
   * // Access specific item from notification link
   * const item = await moderationQueue.getSpecificItem('mod_123', 'moderator_456');
   * if (item) {
   *   console.log(`Assigned item: ${item.content_preview.title}`);
   * } else {
   *   console.log('Item not found or already processed');
   * }
   * ```
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
      logger.dbError('get_specific_moderation_item', error as Error, { 
        metadata: { itemId, moderatorId } 
      });
      throw error;
    }
  }

  /**
   * Adds new content to the moderation queue for review.
   * Accepts hazard reports, image uploads, or template submissions that require
   * human review before publication to the platform.
   * 
   * @param item - Moderation item data excluding auto-generated fields (id, created_at)
   * @throws {Error} When Supabase client is not configured or database insertion fails
   * 
   * @example
   * ```typescript
   * await moderationQueue.addToQueue({
   *   type: 'hazard',
   *   content_id: 'hazard-789',
   *   submitted_by: 'user-123',
   *   flagged_reasons: ['Automated screening flagged location'],
   *   priority: 'high'
   * });
   * ```
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
      logger.dbError('add_to_moderation_queue', error as Error, { 
        metadata: { content_id: item.content_id, type: item.type } 
      });
      throw error;
    }
  }

  /**
   * Processes a moderation decision for a specific queue item.
   * Handles three action types: approve (publish content), reject (hide content),
   * or flag (mark for additional review). Updates both queue status and actual content.
   * 
   * @param itemId - Unique identifier of the moderation item being reviewed
   * @param action - Moderation decision containing type, reason, and notes
   * @param moderatorId - ID of the moderator making the decision
   * @throws {Error} When Supabase client is not configured or database update fails
   * 
   * @example
   * ```typescript
   * // Approve content for publication
   * await moderationQueue.processAction('item-123', {
   *   type: 'approve',
   *   notes: 'Verified hazard location and severity level'
   * }, 'moderator-456');
   * 
   * // Reject inappropriate content
   * await moderationQueue.processAction('item-456', {
   *   type: 'reject',
   *   reason: 'spam',
   *   notes: 'Content violates community guidelines'
   * }, 'moderator-456');
   * ```
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
      const updateData: {
        assigned_moderator: string;
        moderator_notes?: string;
        status?: 'approved' | 'rejected' | 'pending' | 'needs_review';
        resolved_at?: string;
        flagged_reasons?: string[];
      } = {
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
      logger.dbError('process_moderation_action', error as Error, { 
        metadata: { action: action.type, item_id: itemId } 
      });
      throw error;
    }
  }

  /**
   * Calculates the average time moderators take to review and resolve items.
   * Samples the most recent 100 resolved items to compute meaningful statistics
   * for performance monitoring and workload assessment.
   * 
   * @private
   * @param supabase - Authenticated Supabase client for database queries
   * @returns Promise resolving to average review time in minutes (rounded)
   * 
   * @example
   * // Internal usage in getStats()
   * const avgTime = await this.calculateAverageReviewTime(supabase);
   * // Result: 23 (minutes average review time)
   */
  private async calculateAverageReviewTime(supabase: SupabaseClient<Database>): Promise<number> {
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

      const totalMinutes = resolvedItems.reduce((sum: number, item: { created_at: string; resolved_at: string }) => {
        const created = new Date(item.created_at);
        const resolved = new Date(item.resolved_at);
        const diffMinutes = (resolved.getTime() - created.getTime()) / (1000 * 60);
        return sum + diffMinutes;
      }, 0);

      return Math.round(totalMinutes / resolvedItems.length);
    } catch (error) {
      logger.dbError('calculate_average_review_time', error as Error);
      return 0;
    }
  }

  /**
   * Retrieves comprehensive moderation statistics for administrative dashboards.
   * Provides real-time metrics including queue depth, daily activity, performance
   * indicators, and priority distribution for operational oversight.
   * 
   * @returns Promise resolving to ModerationStats object with current metrics
   * @throws {Error} When Supabase client is not configured or query fails
   * 
   * @example
   * ```typescript
   * const stats = await moderationQueue.getStats();
   * console.log(`Pending: ${stats.pending_count}, Avg Review: ${stats.avg_review_time_minutes}min`);
   * // Output: "Pending: 15, Avg Review: 23min"
   * ```
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
   * Retrieves paginated moderation queue with optional status filtering.
   * Implements intelligent sorting: pending items by priority/age, resolved items
   * by recency. Essential for building moderation dashboard interfaces.
   * 
   * @param status - Optional filter for item status ('pending', 'approved', 'rejected')
   * @param limit - Maximum number of items per page (default: 20)
   * @param offset - Number of items to skip for pagination (default: 0)
   * @returns Promise resolving to paginated results with total count
   * @throws {Error} When Supabase client is not configured or query fails
   * 
   * @example
   * ```typescript
   * // Get first page of pending items
   * const { items, totalCount } = await moderationQueue.getQueue('pending', 10, 0);
   * 
   * // Get second page of all items (any status)
   * const page2 = await moderationQueue.getQueue(undefined, 10, 10);
   * ```
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
   * Transforms raw database moderation queue records into structured ModerationItem objects.
   * Enriches items with content previews, submitter information, and associated media
   * for comprehensive moderation review interfaces.
   * 
   * @private
   * @param data - Raw moderation queue record from database
   * @returns Promise resolving to fully populated ModerationItem object
   * 
   * @example
   * // Internal transformation process
   * const rawRecord = { id: '123', type: 'hazard', content_id: '456', ... };
   * const moderationItem = await this.transformToModerationItem(rawRecord);
   * // Result includes content_preview with hazard details and images
   */
  private async transformToModerationItem(data: {
    id: string;
    type: 'hazard' | 'image' | 'template' | 'user_report';
    content_id: string;
    submitted_by: string;
    flagged_reasons: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'approved' | 'rejected' | 'needs_review';
    assigned_moderator?: string;
    moderator_notes?: string;
    created_at: string;
    resolved_at?: string;
  }): Promise<ModerationItem> {
    const supabase = this.supabase;
    let contentPreview: ContentPreview = {
      title: '',  // Will be set based on content type
    };
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
          additional_data: {
            created_at: hazard.created_at
          },
          images: imageData ? imageData.map((img: {
            id: string;
            original_url: string;
            thumbnail_url?: string;
            uploaded_at: string;
            vote_score?: number;
            metadata?: { alt_text?: string; file_size?: number };
          }) => ({
            id: img.id,
            image_url: img.original_url,
            thumbnail_url: img.thumbnail_url,
            uploaded_at: img.uploaded_at,
            vote_score: img.vote_score,
            metadata: img.metadata
          })) : []
        };
      } else {
        logger.warn('No hazard data found for content_id', { 
          metadata: { content_id: data.content_id } 
        });
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
   * Updates the actual content record status based on moderation decisions.
   * Applies approved/rejected status to hazards, images, or templates in their
   * respective tables to control public visibility and platform inclusion.
   * 
   * @private
   * @param item - Moderation queue item containing content type and ID
   * @param action - Moderation decision: 'approve' or 'reject'
   * @throws {Error} When database update fails for the target content
   * 
   * @example
   * // Internal usage after moderation decision
   * await this.updateContentStatus(moderationItem, 'approve');
   * // Updates hazards.status = 'approved' for public visibility
   */
  private async updateContentStatus(item: {
    type: 'hazard' | 'image' | 'template' | 'user_report';
    content_id: string;
  }, action: 'approve' | 'reject'): Promise<void> {
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
 * Performs automated pre-moderation screening using rule-based analysis.
 * Analyzes content for spam indicators, location validity, and appropriateness
 * to determine if content can be auto-approved, auto-rejected, or needs human review.
 * 
 * @param content - Content object to analyze (hazard, image, or template data)
 * @param contentType - Type of content being screened for appropriate analysis
 * @returns Promise resolving to AutoModerationResult with action recommendation
 * 
 * @example
 * ```typescript
 * // Screen new hazard report before human moderation
 * const result = await runAutomatedModeration({
 *   title: 'Pothole on Main St',
 *   description: 'Large pothole causing tire damage',
 *   latitude: 42.3601,
 *   longitude: -71.0589
 * }, 'hazard');
 * 
 * if (result.action === 'approve') {
 *   // Auto-publish high-confidence good content
 * } else if (result.action === 'reject') {
 *   // Auto-reject obvious spam/inappropriate content  
 * } else {
 *   // Queue for human review
 * }
 * ```
 */
export async function runAutomatedModeration(
  content: {
    title?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    severity_level?: number;
    image_url?: string;
    file_size?: number;
    [key: string]: any;
  },
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
      let locationScore;
      if (typeof content.latitude === 'number' && typeof content.longitude === 'number') {
        locationScore = await analyzeLocation(content.latitude, content.longitude);
      } else {
        locationScore = { valid_location: false, in_supported_region: false, duplicate_nearby: false };
      }
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
 * Analyzes text content for spam indicators and inappropriate language.
 * Uses rule-based detection for common spam patterns, length validation,
 * and basic profanity filtering to compute content quality scores.
 * 
 * @param text - Combined text content (title + description) to analyze
 * @returns Analysis object with spam score, sentiment, and language appropriateness
 * 
 * @example
 * ```typescript
 * const analysis = analyzeText('Click here for free money now!!!');
 * // Returns: { spam_score: 0.8, sentiment: 0.5, language_appropriate: true }
 * 
 * const legitAnalysis = analyzeText('Pothole causing flat tires on Main Street');
 * // Returns: { spam_score: 0.1, sentiment: 0.5, language_appropriate: true }
 * ```
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
 * Validates geographic coordinates and checks for potential duplicate reports.
 * Ensures coordinates are within valid ranges, fall within supported regions
 * (currently Boston area), and detects nearby existing hazards to prevent spam.
 * 
 * @param lat - Latitude coordinate to validate
 * @param lng - Longitude coordinate to validate  
 * @param supabase - Optional Supabase client for duplicate detection queries
 * @returns Promise resolving to location analysis with validity flags
 * 
 * @example
 * ```typescript
 * // Validate Boston-area coordinates
 * const result = await analyzeLocation(42.3601, -71.0589, supabase);
 * // Returns: { 
 * //   valid_location: true, 
 * //   in_supported_region: true, 
 * //   duplicate_nearby: false 
 * // }
 * 
 * // Invalid coordinates outside supported region
 * const invalid = await analyzeLocation(40.7589, -73.9851); // NYC coords
 * // Returns: { valid_location: true, in_supported_region: false, duplicate_nearby: false }
 * ```
 */
async function analyzeLocation(lat: number, lng: number, supabase?: SupabaseClient<Database>) {
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
      
      duplicateNearby = Boolean(nearbyHazards && nearbyHazards.length > 0);
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
      
      duplicateNearby = Boolean(similarHazards && similarHazards.length > 0);
    }
  }
  
  return {
    valid_location: validLat && validLng,
    in_supported_region: inBoston,
    duplicate_nearby: duplicateNearby
  };
}
