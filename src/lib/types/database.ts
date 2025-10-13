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
  /** Geographic cell identifier for efficient spatial queries and clustering */
  geo_cell: string;
  /** Geohash string enabling proximity searches and geographic indexing */
  geohash: string;
  /** Regional identifier for timezone, seasonal data, and local context */
  region_id: string;
  /** Moderation status controlling public visibility and map inclusion */
  status: 'pending' | 'approved' | 'flagged' | 'removed';
  /** Computed reliability score based on reporter trust and community verification */
  trust_score: number;
  /** Number of users who have verified this hazard's accuracy and current status */
  verification_count: number;
  /** Whether hazard follows seasonal patterns requiring temporal filtering */
  is_seasonal: boolean;
  /** When hazard was last observed active (null if status unknown) */
  reported_active_date: string | null;
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
  /** Formatted location string for display */
  location: string;
  /** GPS latitude coordinate */
  latitude: number;
  /** GPS longitude coordinate */
  longitude: number;
  /** Current moderation/approval status */
  status: 'pending' | 'approved' | 'rejected';
  /** Human-readable category name (e.g., "Poison Ivy") */
  category_name: string;
  /** Icon identifier for category display */
  category_icon: string;
  /** Hazard creation timestamp */
  created_at: string;
  /** Last modification timestamp */
  updated_at: string;
}
