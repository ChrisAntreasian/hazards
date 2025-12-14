/**
 * @fileoverview Type definitions for educational content management system.
 * Provides TypeScript interfaces for educational content stored in Supabase Storage.
 * 
 * @module EducationalTypes
 * @author HazardTracker Development Team
 * @version 1.0.0
 * 
 * @description
 * These types define the structure of educational content for hazards,
 * including markdown files, regional variations, and content metadata.
 * Content is stored in the 'hazard-educational-content' Supabase Storage bucket.
 */

/**
 * Types of markdown content files available for each hazard
 */
export type ContentFileType = 
  | 'overview'
  | 'identification'
  | 'symptoms'
  | 'treatment'
  | 'prevention'
  | 'regional_notes';

/**
 * US regions for regional content variations
 */
export type USRegion = 
  | 'northeast'
  | 'southeast'
  | 'midwest'
  | 'southwest'
  | 'west';

/**
 * Content structure categories matching Storage bucket organization
 */
export type ContentCategory = 'plants' | 'insects' | 'terrain' | 'animals';

/**
 * Content subcategories by category
 */
export type ContentSubcategory = 
  | 'poisonous'      // plants
  | 'thorns'         // plants
  | 'ticks'          // insects
  | 'stinging'       // insects
  | 'biting'         // insects
  | 'unstable_ground' // terrain
  | 'water'          // terrain
  | 'bears'          // animals
  | 'snakes';        // animals

/**
 * Region metadata with state mappings
 */
export interface RegionInfo {
  /** Region identifier */
  id: USRegion;
  /** Display name */
  name: string;
  /** States included in this region */
  states: string[];
  /** Short description */
  description: string;
}

/**
 * Individual content file metadata and content
 */
export interface ContentFile {
  /** Type of content file */
  type: ContentFileType;
  /** Display title for the content section */
  title: string;
  /** Markdown content */
  content: string;
  /** Last modified timestamp from Storage */
  lastModified?: Date;
  /** File size in bytes */
  size?: number;
  /** Storage path */
  path: string;
}

/**
 * Regional content variation
 */
export interface RegionalContent {
  /** Region this content applies to */
  region: USRegion;
  /** Region display name */
  regionName: string;
  /** Markdown content specific to this region */
  content: string;
}

/**
 * Complete educational content for a hazard
 */
export interface EducationalContent {
  /** Hazard identifier (slug format: poison_ivy, deer_tick, etc.) */
  hazardSlug: string;
  /** Category the hazard belongs to */
  category: ContentCategory;
  /** Subcategory within the category */
  subcategory: ContentSubcategory;
  /** Display name of the hazard */
  displayName: string;
  /** All content files for this hazard */
  files: ContentFile[];
  /** Regional content variations (parsed from regional_notes.md) */
  regionalContent: RegionalContent[];
  /** Image URLs from the /images folder */
  images: string[];
  /** Whether this content has been published */
  isPublished: boolean;
  /** Last published timestamp */
  lastPublished?: Date;
}

/**
 * Content metadata from database (hazard_templates table)
 */
export interface ContentMetadata {
  /** Template ID */
  id: string;
  /** Storage path to content folder */
  storagePath: string;
  /** Whether educational content exists */
  hasEducationalContent: boolean;
  /** Last published timestamp */
  lastPublishedAt?: Date;
  /** User who published the content */
  publishedBy?: string;
}

/**
 * Content draft from CMS (cms_content_drafts table)
 */
export interface ContentDraft {
  /** Draft ID */
  id: string;
  /** Associated template ID */
  templateId: string;
  /** Draft files in JSONB format */
  draftFiles: Record<ContentFileType, string>;
  /** How the content was generated */
  generationMethod: 'ai_generated' | 'manual' | 'imported';
  /** AI model used (if ai_generated) */
  aiModel?: string;
  /** AI confidence score (0-1) */
  confidenceScore?: number;
  /** Draft status */
  status: 'pending_review' | 'approved' | 'rejected' | 'published';
  /** Assigned reviewer user ID */
  assignedReviewer?: string;
  /** Review notes */
  reviewNotes?: string;
  /** Review timestamp */
  reviewedAt?: Date;
  /** Whether draft has been published to Storage */
  publishedToStorage: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Content service response wrapper
 */
export interface ContentResponse<T> {
  /** Response data */
  data?: T;
  /** Error message if request failed */
  error?: string;
  /** Whether content was served from cache */
  cached?: boolean;
  /** Cache timestamp */
  cachedAt?: Date;
}

/**
 * Content cache entry
 */
export interface ContentCacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  cachedAt: Date;
  /** TTL in milliseconds */
  ttl: number;
}

/**
 * Content search/filter options
 */
export interface ContentSearchOptions {
  /** Filter by category */
  category?: ContentCategory;
  /** Filter by subcategory */
  subcategory?: ContentSubcategory;
  /** Filter by region */
  region?: USRegion;
  /** Only published content */
  publishedOnly?: boolean;
  /** Search query string */
  query?: string;
}

/**
 * Storage bucket configuration
 */
export interface StorageBucketConfig {
  /** Bucket name */
  name: string;
  /** Whether bucket is public */
  isPublic: boolean;
  /** Base URL for public access */
  baseUrl: string;
}

/**
 * Region information mapping
 */
export const REGIONS: Record<USRegion, RegionInfo> = {
  northeast: {
    id: 'northeast',
    name: 'Northeast',
    states: ['MA', 'ME', 'NH', 'VT', 'RI', 'CT', 'NY', 'PA', 'NJ'],
    description: 'New England and Mid-Atlantic states'
  },
  southeast: {
    id: 'southeast',
    name: 'Southeast',
    states: ['VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'LA', 'AR'],
    description: 'Southern Atlantic and Gulf Coast states'
  },
  midwest: {
    id: 'midwest',
    name: 'Midwest',
    states: ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
    description: 'Great Lakes and Great Plains states'
  },
  southwest: {
    id: 'southwest',
    name: 'Southwest',
    states: ['TX', 'OK', 'NM', 'AZ'],
    description: 'Southwestern desert and plains states'
  },
  west: {
    id: 'west',
    name: 'West',
    states: ['CO', 'WY', 'MT', 'ID', 'UT', 'NV', 'CA', 'OR', 'WA', 'AK', 'HI'],
    description: 'Rocky Mountain, Pacific, and non-contiguous states'
  }
};

/**
 * Content file display titles
 */
export const CONTENT_FILE_TITLES: Record<ContentFileType, string> = {
  overview: 'Overview',
  identification: 'How to Identify',
  symptoms: 'Signs & Symptoms',
  treatment: 'Treatment',
  prevention: 'Prevention',
  regional_notes: 'Regional Information'
};

/**
 * Storage bucket configuration constant
 */
export const CONTENT_BUCKET: StorageBucketConfig = {
  name: 'hazard-educational-content',
  isPublic: true,
  baseUrl: '' // Will be set from environment
};
