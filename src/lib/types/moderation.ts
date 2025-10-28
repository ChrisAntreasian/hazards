export interface ModerationItem {
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
  
  // Populated data for display
  submitter_email?: string;
  content_preview?: ContentPreview;
}

export interface ContentPreview {
  title: string;
  description?: string;
  image_url?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  area?: GeoJSON.Polygon | null;
  severity_level?: number;
  category?: {
    name: string;
    icon?: string;
  };
  reported_active_date?: string;
  is_seasonal?: boolean;
  images?: Array<{
    id: string;
    image_url: string;
    thumbnail_url?: string;
    uploaded_at: string;
    vote_score?: number;
    metadata?: {
      alt_text?: string;
      file_size?: number;
    };
  }>;
  additional_data?: Record<string, any>;
}

export interface ModerationConfig {
  mode: 'manual' | 'hybrid' | 'automated';
  auto_approve_threshold: number; // Trust score for auto-approval
  require_manual_review: {
    new_hazard_types: boolean;
    high_severity_reports: boolean;
    flagged_content: boolean;
  };
  queue_limits: {
    max_pending_items: number;
    priority_review_hours: number;
  };
}

export interface ModerationStats {
  pending_count: number;
  approved_today: number;
  rejected_today: number;
  avg_review_time_minutes: number;
  items_by_priority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ModerationAction {
  type: 'approve' | 'reject' | 'flag' | 'escalate';
  reason?: string;
  notes?: string;
  escalate_to?: string; // User ID for escalation
}

export interface AutoModerationResult {
  action: 'approve' | 'reject' | 'review' | 'flag';
  confidence: number;
  reasons: string[];
  details: {
    text_analysis?: {
      spam_score: number;
      sentiment: number;
      language_appropriate: boolean;
    };
    image_analysis?: {
      appropriate_content: boolean;
      contains_hazard: boolean;
      image_quality: number;
    };
    location_analysis?: {
      valid_location: boolean;
      in_supported_region: boolean;
      duplicate_nearby: boolean;
    };
  };
}

export const MODERATION_CONFIG: ModerationConfig = {
  mode: 'manual', // Start with manual, evolve to hybrid
  auto_approve_threshold: 500, // High bar initially
  require_manual_review: {
    new_hazard_types: true,
    high_severity_reports: true,
    flagged_content: true
  },
  queue_limits: {
    max_pending_items: 50, // Manageable for manual review
    priority_review_hours: 24
  }
};

export const FLAGGING_REASONS = [
  'Inappropriate content',
  'False information',
  'Spam or duplicate',
  'Poor image quality',
  'Wrong location',
  'Not a real hazard',
  'Offensive language',
  'Privacy violation',
  'Copyright infringement',
  'Other'
] as const;

export type FlaggingReason = typeof FLAGGING_REASONS[number];
