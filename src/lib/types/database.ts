// Core database types will be generated from Supabase
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

export interface User {
  id: string;
  email: string;
  trust_score: number;
  total_contributions: number;
  role: UserRole;
  created_at: string;
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

export interface Hazard {
  id: string;
  template_id: string | null;
  user_id: string | null;
  title: string;
  description: string;
  severity_level: 1 | 2 | 3 | 4 | 5;
  latitude: number;
  longitude: number;
  geo_cell: string;
  geohash: string;
  region_id: string;
  status: 'pending' | 'approved' | 'flagged' | 'removed';
  trust_score: number;
  verification_count: number;
  is_seasonal: boolean;
  reported_active_date: string | null;
  created_at: string;
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
