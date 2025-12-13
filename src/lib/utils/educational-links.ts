/**
 * @fileoverview Educational linking utility for hazards
 * Implements Smart Fallback linking strategy:
 * 1. If hazard has template_id with educational content → link to that content
 * 2. If hazard has category_id → fallback to category browse page
 * 3. If neither → link to general learn page
 * 
 * @module educational-links
 */

import { createSupabaseLoadClient } from '$lib/supabase';

/**
 * Educational link information
 */
export interface EducationalLink {
  /** Full URL to the educational content */
  href: string;
  /** Human-readable link text */
  label: string;
  /** Type of link (specific, category, or general) */
  type: 'specific' | 'category' | 'general';
  /** Whether educational content actually exists */
  hasContent: boolean;
  /** Icon to display with the link */
  icon: string;
  /** Brief description of what the link leads to */
  description: string;
  /** Storage path for specific content (if available) */
  storagePath?: string;
}

/**
 * Hazard data needed to generate educational link
 */
export interface HazardLinkInput {
  /** Optional template ID for specific educational content */
  template_id?: string | null;
  /** Category path (e.g., "plants/poisonous") */
  category_path?: string | null;
  /** Category name */
  category_name?: string | null;
  /** Category icon */
  category_icon?: string | null;
  /** Hazard title for context */
  title?: string;
}

/**
 * Template metadata from database
 */
interface TemplateMetadata {
  id: string;
  name: string;
  storage_path: string | null;
  has_educational_content: boolean;
  category_id: string;
}

/**
 * Category metadata from database
 */
interface CategoryMetadata {
  id: string;
  name: string;
  path: string;
  icon: string;
  level: number;
}

/**
 * Get educational link for a hazard
 * Uses smart fallback: specific content → category → general
 * 
 * @param hazard - Hazard data with template_id and/or category info
 * @returns Educational link information
 */
export async function getEducationalLink(hazard: HazardLinkInput): Promise<EducationalLink> {
  // Try specific content first (if template_id exists)
  if (hazard.template_id) {
    const templateLink = await getTemplateLink(hazard.template_id);
    if (templateLink) {
      return templateLink;
    }
  }

  // Fallback to category page
  if (hazard.category_path) {
    return getCategoryLink(
      hazard.category_path,
      hazard.category_name || 'This Category',
      hazard.category_icon || '📚'
    );
  }

  // Ultimate fallback to general learn page
  return getGeneralLink();
}

/**
 * Get link to specific template educational content
 */
async function getTemplateLink(templateId: string): Promise<EducationalLink | null> {
  try {
    const supabase = createSupabaseLoadClient();
    if (!supabase) return null;

    const { data: template, error } = await supabase
      .from('hazard_templates')
      .select(`
        id,
        name,
        storage_path,
        has_educational_content,
        category_id,
        hazard_categories (
          id,
          name,
          path,
          icon
        )
      `)
      .eq('id', templateId)
      .single();

    if (error || !template) return null;

    // Check if template has actual educational content
    if (template.has_educational_content && template.storage_path) {
      // Parse storage path: category/subcategory/hazard_slug
      const pathParts = template.storage_path.split('/');
      
      if (pathParts.length >= 3) {
        const [category, subcategory, hazardSlug] = pathParts;
        
        return {
          href: `/learn/${category}/${subcategory}/${hazardSlug}`,
          label: `Learn about ${template.name}`,
          type: 'specific',
          hasContent: true,
          icon: '📖',
          description: `View detailed safety information, identification tips, and first aid for ${template.name}`,
          storagePath: template.storage_path
        };
      }
    }

    // Template exists but no content - fallback to category
    const category = template.hazard_categories as unknown as CategoryMetadata;
    if (category?.path) {
      return getCategoryLink(
        category.path,
        category.name,
        category.icon || '📚'
      );
    }

    return null;
  } catch (error) {
    console.error('Error getting template link:', error);
    return null;
  }
}

/**
 * Get link to category browse page
 */
function getCategoryLink(
  categoryPath: string,
  categoryName: string,
  categoryIcon: string
): EducationalLink {
  // Extract root category from path (e.g., "plants/poisonous" → "plants")
  const rootCategory = categoryPath.split('/')[0];
  
  return {
    href: `/learn/${rootCategory}`,
    label: `Browse ${categoryName} Guides`,
    type: 'category',
    hasContent: true, // Category page always exists
    icon: categoryIcon,
    description: `Explore safety guides and educational content for ${categoryName.toLowerCase()} hazards`
  };
}

/**
 * Get link to general learn page
 */
function getGeneralLink(): EducationalLink {
  return {
    href: '/learn',
    label: 'Browse Safety Guides',
    type: 'general',
    hasContent: true,
    icon: '📚',
    description: 'Explore our library of hazard safety guides and educational content'
  };
}

/**
 * Synchronous version for when we already have category info
 * (No database lookup needed)
 */
export function getEducationalLinkSync(hazard: HazardLinkInput): EducationalLink {
  // If we have category path, link to category page
  if (hazard.category_path) {
    return getCategoryLink(
      hazard.category_path,
      hazard.category_name || 'This Category',
      hazard.category_icon || '📚'
    );
  }

  // Fallback to general learn page
  return getGeneralLink();
}

/**
 * Check if a hazard has specific educational content
 * (Useful for conditional rendering)
 */
export async function hasSpecificEducationalContent(templateId: string | null): Promise<boolean> {
  if (!templateId) return false;

  try {
    const supabase = createSupabaseLoadClient();
    if (!supabase) return false;

    const { data, error } = await supabase
      .from('hazard_templates')
      .select('has_educational_content')
      .eq('id', templateId)
      .single();

    if (error || !data) return false;
    return data.has_educational_content === true;
  } catch {
    return false;
  }
}

/**
 * Get multiple educational links for a list of hazards
 * (Useful for hazard list views)
 */
export function getEducationalLinksSync(hazards: HazardLinkInput[]): Map<string, EducationalLink> {
  const links = new Map<string, EducationalLink>();

  for (const hazard of hazards) {
    const key = hazard.template_id || hazard.category_path || 'general';
    
    // Only compute once per unique key
    if (!links.has(key)) {
      links.set(key, getEducationalLinkSync(hazard));
    }
  }

  return links;
}

/**
 * Build educational link URL from storage path
 */
export function buildLinkFromStoragePath(storagePath: string): string {
  // Storage path format: category/subcategory/hazard_slug
  const parts = storagePath.split('/');
  
  if (parts.length >= 3) {
    const [category, subcategory, hazardSlug] = parts;
    return `/learn/${category}/${subcategory}/${hazardSlug}`;
  } else if (parts.length === 2) {
    const [category, subcategory] = parts;
    return `/learn/${category}/${subcategory}`;
  } else if (parts.length === 1) {
    return `/learn/${parts[0]}`;
  }
  
  return '/learn';
}
