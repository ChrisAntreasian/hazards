import type { Database } from '../types/database.js';
import type { User } from '@supabase/supabase-js';

// Admin category management types
export interface AdminCategoryData {
  id?: string;
  name: string;
  slug?: string;
  parent_id?: string;
  level?: number;
  path?: string;
  icon?: string;
  description?: string;
  short_description?: string;
  status?: 'active' | 'pending' | 'archived';
  created_at?: string;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug?: string;
  parent_id?: string;
  level: number;
  path: string[] | string;
  icon?: string;
  description?: string;
  short_description?: string;
  status?: string;
  created_at?: string;
  children: CategoryTreeNode[];
}

export interface CategorySectionConfig {
  id: string;
  category_id: string | null;
  section_id: string;
  section_title: string;
  is_universal: boolean;
  is_required: boolean;
  display_order: number;
  prompt_hint?: string;
}

export interface CategoryManagementState {
  categories: CategoryTreeNode[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: CategoryTreeNode | null;
  isEditing: boolean;
  isDragging: boolean;
}

// Admin user management types
export interface AdminUserData {
  id: string;
  email: string;
  role: UserRole;
  trust_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export type UserRole = 'new_user' | 'contributor' | 'trusted_user' | 'content_editor' | 'moderator' | 'admin' | 'banned';

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
  trust_score_required: number;
}

export type Permission = 
  | 'manage_users'
  | 'manage_categories' 
  | 'manage_system_config'
  | 'moderate_content'
  | 'create_templates'
  | 'delete_hazards'
  | 'edit_any_hazard'
  | 'access_admin_panel';

// System configuration types
export interface SystemConfiguration {
  moderation: ModerationConfig;
  validation: ValidationConfig;
  notifications: NotificationConfig;
  features: FeatureFlags;
}

export interface ModerationConfig {
  mode: 'manual' | 'automated' | 'hybrid';
  auto_approve_threshold: number;
  auto_reject_threshold: number;
  require_moderator_approval: boolean;
  trusted_user_bypass: boolean;
  max_pending_queue_size: number;
}

export interface ValidationConfig {
  strict_location_bounds: boolean;
  require_images: boolean;
  min_description_length: number;
  max_image_size_mb: number;
  allowed_file_types: string[];
  duplicate_detection_enabled: boolean;
  profanity_filter_enabled: boolean;
}

export interface NotificationConfig {
  email_notifications: boolean;
  real_time_updates: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
  notification_types: NotificationType[];
}

export type NotificationType = 
  | 'new_hazard_nearby'
  | 'moderation_status_change'
  | 'trust_score_change'
  | 'system_announcements'
  | 'weekly_digest';

export interface FeatureFlags {
  user_generated_templates: boolean;
  advanced_mapping: boolean;
  community_voting: boolean;
  hazard_comments: boolean;
  real_time_collaboration: boolean;
  ai_assisted_categorization: boolean;
}

// API response types
export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends AdminApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form validation types
export interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: string;
  icon: string;
  description: string;
  short_description: string;
}

export interface UserFormData {
  role: UserRole;
  trust_score: number;
  is_active: boolean;
  reason?: string;
}

// Export utility types
export type CategoryAction = 'create' | 'update' | 'delete' | 'reorder';
export type UserAction = 'update_role' | 'adjust_trust_score' | 'ban' | 'unban';
export type ConfigAction = 'update_moderation' | 'update_validation' | 'update_notifications' | 'update_features';