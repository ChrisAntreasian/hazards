/**
 * @fileoverview Core database type definitions for HazardTracker application.
 * Provides comprehensive TypeScript interfaces matching Supabase database schema
 * with support for type-safe queries, mutations, and RPC function results.
 * 
 * @module DatabaseTypes
 * @author HazardTracker Development Team
 * @version 2.0.0
 * 
 * @description
 * These types are designed to be compatible with Supabase's generated types
 * while providing additional business logic types and computed interfaces.
 * All interfaces include proper temporal fields (created_at, updated_at) and
 * follow consistent naming conventions across the application.
 * 
 * @security
 * - All user-facing content includes moderation status tracking
 * - Geographic data includes multiple indexing strategies (geohash, geo_cell)
 * - Permission-based access control through UserRole enumeration
 * - Content ownership tracking for Row Level Security (RLS) policies
 */

/**
 * Root database interface providing type-safe access to all Supabase tables.
 * Extends Supabase's generated Database type with custom business logic interfaces.
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<User>;
      };
      hazard_categories: {
        Row: HazardCategory;
        Insert: Omit<HazardCategory, 'id' | 'created_at'>;
        Update: Partial<HazardCategory>;
      };
      hazard_templates: {
        Row: HazardTemplate;
        Insert: Omit<HazardTemplate, 'id' | 'created_at'>;
        Update: Partial<HazardTemplate>;
      };
      hazards: {
        Row: Hazard;
        Insert: Omit<Hazard, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Hazard>;
      };
      hazard_images: {
        Row: HazardImage;
        Insert: Omit<HazardImage, 'id' | 'created_at'>;
        Update: Partial<HazardImage>;
      };
      hazard_votes: {
        Row: HazardVote;
        Insert: Omit<HazardVote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<HazardVote>;
      };
      hazard_resolution_reports: {
        Row: ResolutionReport;
        Insert: Omit<ResolutionReport, 'id' | 'created_at'>;
        Update: Partial<ResolutionReport>;
      };
      hazard_resolution_confirmations: {
        Row: ResolutionConfirmation;
        Insert: Omit<ResolutionConfirmation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ResolutionConfirmation>;
      };
      expiration_settings: {
        Row: ExpirationSettings;
        Insert: Omit<ExpirationSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ExpirationSettings>;
      };
      expiration_audit_log: {
        Row: ExpirationAuditLog;
        Insert: Omit<ExpirationAuditLog, 'id' | 'created_at'>;
        Update: never; // Audit logs are append-only
      };
      regions: {
        Row: Region;
        Insert: Omit<Region, 'id' | 'created_at'>;
        Update: Partial<Region>;
      };
      moderation_queue: {
        Row: ModerationItem;
        Insert: Omit<ModerationItem, 'id' | 'created_at'>;
        Update: Partial<ModerationItem>;
      };
    };
  };
}

/**
 * User account information with gamification and permission tracking.
 * Trust scores enable community-driven content quality through user reputation.
 */
export interface User {
  /** Unique user identifier matching Supabase Auth user ID */
  id: string;
  /** Email address for authentication and notifications */
  email: string;
  /** Computed trust score based on contribution quality and community feedback (0-1000+) */
  trust_score: number;
  /** Total number of hazards, images, and ratings contributed by user */
  total_contributions: number;
  /** Permission level determining available actions and moderation capabilities */
  role: UserRole;
  /** Account creation timestamp in ISO 8601 format */
  created_at: string;
  /** Last profile update timestamp for tracking account changes */
  updated_at: string;
}

export interface HazardCategory {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  path: string; // "plants/poisonous/poison_ivy"
  icon: string;
  created_at: string;
}

export interface HazardTemplate {
  id: string;
  category_id: string;
  name: string;
  scientific_name?: string;
  cms_content_id: string | null;
  regional_data: RegionalHazardData[];
  is_user_generated: boolean;
  needs_cms_content: boolean;
  status: 'draft' | 'published' | 'needs_review';
  created_by: string;
  created_at: string;
}

/**
 * Core hazard report containing location, description, and community validation data.
 * Supports both template-based reporting and custom hazard submissions with geographic indexing.
 */
export interface Hazard {
  /** Unique hazard identifier for referencing and sharing */
  id: string;
  /** Optional reference to HazardTemplate for standardized hazard types */
  template_id: string | null;
  /** User who submitted the hazard report (null for system-generated) */
  user_id: string | null;
  /** User-provided title describing the specific hazard instance */
  title: string;
  /** Detailed description of hazard location, characteristics, and risks */
  description: string;
  /** Risk level from 1 (low) to 5 (extreme) affecting map display and filtering */
  severity_level: 1 | 2 | 3 | 4 | 5;
  /** GPS latitude coordinate for precise hazard positioning */
  latitude: number;
  /** GPS longitude coordinate for precise hazard positioning */
  longitude: number;
  /** GeoJSON polygon representing the affected area (optional) */
  area: GeoJSON.Polygon | null;
  /** Map zoom level at which the hazard was reported (1-18, default 13) */
  zoom: number;
  /** Geographic cell identifier for efficient spatial queries and clustering */
  geo_cell: string;
  /** Geohash string enabling proximity searches and geographic indexing */
  geohash: string;
  /** Regional identifier for timezone, seasonal data, and local context */
  region_id: string;
  /** Moderation status controlling public visibility and map inclusion */
  status: 'pending' | 'approved' | 'active' | 'flagged' | 'removed';
  /** Computed reliability score based on reporter trust and community verification */
  trust_score: number;
  /** Number of users who have verified this hazard's accuracy and current status */
  verification_count: number;
  /** Whether hazard follows seasonal patterns requiring temporal filtering */
  is_seasonal: boolean;
  /** When hazard was last observed active (null if status unknown) */
  reported_active_date: string | null;
  /** Total number of upvotes received from community */
  votes_up: number;
  /** Total number of downvotes received from community */
  votes_down: number;
  /** Net vote score (votes_up - votes_down) for sorting and display */
  vote_score: number;
  /** Type of expiration for this hazard */
  expiration_type: ExpirationType;
  /** When this hazard will automatically expire (for auto_expire type) */
  expires_at: string | null;
  /** Number of times expiration has been extended */
  extended_count: number;
  /** When this hazard was marked as resolved */
  resolved_at: string | null;
  /** User who created the resolution report */
  resolved_by: string | null;
  /** Note explaining how hazard was resolved */
  resolution_note: string | null;
  /** Seasonal pattern for seasonal hazards */
  seasonal_pattern: SeasonalPattern | null;
  /** When expiration warning notification was last sent */
  expiration_notified_at: string | null;
  /** Initial submission timestamp for chronological ordering */
  created_at: string;
  /** Last modification timestamp tracking status changes and edits */
  updated_at: string;
}

export interface HazardImage {
  id: string;
  hazard_id: string;
  image_url: string;
  thumbnail_url: string;
  uploaded_by: string;
  upload_date: string;
  votes_up: number;
  votes_down: number;
  moderation_status: 'pending' | 'approved' | 'rejected';
}

/**
 * User vote (upvote/downvote) on a hazard report.
 * Users can vote once per hazard to indicate agreement or disagreement.
 * Users cannot vote on their own hazards.
 */
export interface HazardVote {
  /** Unique vote identifier */
  id: string;
  /** Reference to the hazard being voted on */
  hazard_id: string;
  /** User who cast the vote */
  user_id: string;
  /** Type of vote: 'up' for upvote, 'down' for downvote */
  vote_type: 'up' | 'down';
  /** When the vote was originally cast */
  created_at: string;
  /** When the vote was last changed (if user changes vote) */
  updated_at: string;
}

export interface Region {
  id: string;
  name: string;
  bounds: GeoBounds;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface ModerationItem {
  id: string;
  type: 'hazard' | 'image' | 'template' | 'user_report';
  content_id: string;
  submitted_by: string;
  flagged_reasons: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  assigned_moderator?: string;
  created_at: string;
}

export interface RegionalHazardData {
  region_code: string;
  seasonal_info: {
    active_months: number[];
    peak_months: number[];
    severity_multiplier: number;
  };
  regional_notes?: string;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type UserRole = 'new_user' | 'contributor' | 'trusted_user' | 'content_editor' | 'moderator' | 'admin';
export type Permission = 
  | 'view_hazards'
  | 'create_hazard' 
  | 'upload_images'
  | 'rate_hazards'
  | 'edit_own_content'
  | 'edit_templates'
  | 'moderate_content'
  | 'manage_users';

export type HazardType = 
  | 'poison_ivy'
  | 'dangerous_animal'
  | 'unstable_terrain'
  | 'thorns'
  | 'insects'
  | 'water_hazard'
  | 'other';

/**
 * Result types for Supabase RPC (Remote Procedure Call) functions.
 * These interfaces define the shape of data returned by custom database functions
 * that perform complex queries, joins, or computed operations.
 */

/**
 * Enriched hazard data returned by user-specific RPC functions.
 * Combines hazard details with category information for dashboard displays.
 * 
 * @example
 * ```typescript
 * // RPC function: get_user_hazards(user_id UUID)
 * const { data } = await supabase.rpc('get_user_hazards', { user_id });
 * const hazards: UserHazardRpcResult[] = data;
 * ```
 */
export interface UserHazardRpcResult {
  /** Hazard unique identifier */
  id: string;
  /** User-provided hazard title */
  title: string;
  /** Detailed hazard description */
  description: string;
  /** Risk level from 1 (low) to 5 (extreme) affecting map display and filtering */
  severity_level: 1 | 2 | 3 | 4 | 5;
  /** GPS latitude coordinate */
  latitude: string;
  /** GPS longitude coordinate */
  longitude: string;
  /** User who submitted the hazard report */
  user_id: string;
  /** Current moderation/approval status */
  status: 'pending' | 'approved' | 'rejected';
  /** Hazard creation timestamp */
  created_at: string;
  /** When hazard was last observed active (null if status unknown) */
  reported_active_date: string | null;
  /** Whether hazard follows seasonal patterns requiring temporal filtering */
  is_seasonal: boolean;
  /** Human-readable category name (e.g., "Poison Ivy") */
  category_name: string;
  /** Icon identifier for category display */
  category_icon: string;
}

/**
 * Response from voting status query indicating user's vote state for a hazard.
 */
export interface VoteStatusResult {
  /** Whether the user has voted on this hazard */
  has_voted: boolean;
  /** Type of vote if user has voted, null otherwise */
  vote_type?: 'up' | 'down' | null;
  /** Whether user is allowed to vote (false if they own the hazard) */
  can_vote: boolean;
}

/**
 * Request body for casting or changing a vote on a hazard.
 */
export interface VoteRequest {
  /** Type of vote to cast */
  vote_type: 'up' | 'down';
}

/**
 * Response after successfully casting or changing a vote.
 */
export interface VoteResponse {
  /** Success status */
  success: boolean;
  /** The created or updated vote record */
  vote: HazardVote;
  /** Updated vote counts for the hazard */
  hazard_votes: {
    votes_up: number;
    votes_down: number;
    vote_score: number;
  };
}

/**
 * ============================================================================
 * EXPIRATION SYSTEM TYPES
 * ============================================================================
 */

/**
 * Types of hazard expiration behavior.
 */
export type ExpirationType = 
  | 'auto_expire'      // Automatically expires after a set duration (e.g., weather hazards)
  | 'user_resolvable'  // Requires user-submitted resolution report (e.g., road closure)
  | 'permanent'        // Never expires (e.g., terrain features)
  | 'seasonal';        // Only active during specific months (e.g., bee nests)

/**
 * Current expiration/resolution status of a hazard.
 */
export type ExpirationStatus = 
  | 'active'             // Hazard is currently active
  | 'expiring_soon'      // Expires within 24 hours (auto_expire only)
  | 'expired'            // Past expiration time (auto_expire only)
  | 'dormant'            // Outside active season (seasonal only)
  | 'pending_resolution' // Resolution report submitted with confirmations
  | 'resolved';          // Marked as resolved

/**
 * Seasonal activity pattern for seasonal hazards.
 */
export interface SeasonalPattern {
  /** Array of active months (1-12) when hazard is present */
  active_months: number[];
}

/**
 * Detailed resolution report for a hazard.
 * Only one resolution report per hazard is allowed.
 */
export interface ResolutionReport {
  /** Unique report identifier */
  id: string;
  /** Reference to the hazard being reported as resolved */
  hazard_id: string;
  /** User who submitted the resolution report */
  reported_by: string;
  /** Detailed explanation of how hazard was resolved */
  resolution_note: string;
  /** Optional URL to photo evidence of resolution */
  evidence_url: string | null;
  /** Reporter's trust score at time of report (for audit) */
  trust_score_at_report: number | null;
  /** When the report was submitted */
  created_at: string;
}

/**
 * User confirmation or dispute of a resolution report.
 * Users vote whether they confirm the hazard is resolved or dispute it.
 */
export interface ResolutionConfirmation {
  /** Unique confirmation identifier */
  id: string;
  /** Reference to the hazard */
  hazard_id: string;
  /** User casting the confirmation/dispute */
  user_id: string;
  /** Type of confirmation: confirmed = agrees resolved, disputed = says still exists */
  confirmation_type: 'confirmed' | 'disputed';
  /** Optional note explaining the confirmation/dispute */
  note: string | null;
  /** When the confirmation was cast */
  created_at: string;
  /** When the confirmation was last changed */
  updated_at: string;
}

/**
 * Admin-configurable default expiration settings per hazard category.
 */
export interface ExpirationSettings {
  /** Unique settings identifier */
  id: string;
  /** Reference to hazard category (null for default settings) */
  category_id: string | null;
  /** Category path (e.g., "weather/thunderstorm") */
  category_path: string;
  /** Default expiration type for this category */
  default_expiration_type: ExpirationType;
  /** Default duration for auto_expire type (e.g., "6 hours", "2 days") */
  auto_expire_duration: string | null;
  /** Default seasonal pattern for seasonal type */
  seasonal_pattern: SeasonalPattern | null;
  /** Number of confirmations needed to auto-resolve a hazard */
  confirmation_threshold: number;
  /** Whether users can override the default expiration type */
  allow_user_override: boolean;
  /** Admin who last updated these settings */
  updated_by: string | null;
  /** When settings were last updated */
  updated_at: string;
  /** When settings were created */
  created_at: string;
}

/**
 * Audit log entry for expiration-related actions.
 */
export interface ExpirationAuditLog {
  /** Unique log entry identifier */
  id: string;
  /** Reference to the hazard */
  hazard_id: string;
  /** Action performed (e.g., 'auto_expired', 'manually_resolved', 'extended') */
  action: string;
  /** User who performed the action (null for system actions) */
  performed_by: string | null;
  /** Previous state before action (JSON) */
  previous_state: Record<string, any> | null;
  /** New state after action (JSON) */
  new_state: Record<string, any> | null;
  /** Reason or description of the action */
  reason: string | null;
  /** When the action occurred */
  created_at: string;
}

/**
 * Request body for creating a resolution report.
 */
export interface CreateResolutionReportRequest {
  /** Detailed explanation of resolution */
  resolution_note: string;
  /** Optional URL to evidence photo */
  evidence_url?: string;
}

/**
 * Request body for confirming/disputing a resolution.
 */
export interface CreateConfirmationRequest {
  /** Type of confirmation */
  confirmation_type: 'confirmed' | 'disputed';
  /** Optional explanation */
  note?: string;
}

/**
 * Request body for extending hazard expiration.
 */
export interface ExtendExpirationRequest {
  /** New expiration time (ISO 8601 timestamp) */
  expires_at: string;
  /** Reason for extension */
  reason?: string;
}

/**
 * Response from expiration status query.
 */
export interface ExpirationStatusResponse {
  /** Hazard ID */
  hazard_id: string;
  /** Current expiration status */
  status: ExpirationStatus;
  /** Time remaining until expiration (seconds, null if not applicable) */
  time_remaining: number | null;
  /** Resolution report if one exists */
  resolution_report: ResolutionReport | null;
  /** Confirmation/dispute counts */
  confirmations: {
    confirmed: number;
    disputed: number;
  };
  /** Whether current user can extend expiration */
  can_extend: boolean;
  /** Whether current user can submit resolution report */
  can_resolve: boolean;
}
