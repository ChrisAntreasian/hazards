/**
 * @fileoverview Navigation utilities for the learn/educational content section.
 * Handles breadcrumb building, origin tracking via sessionStorage, and path parsing.
 */

import { browser } from '$app/environment';

/** Origin types for breadcrumb tracking */
export type LearnOriginType = 'dashboard' | 'hazard' | 'map' | 'search' | 'direct';

/** Origin data stored in sessionStorage */
export interface LearnOrigin {
  type: LearnOriginType;
  title: string;
  url: string;
}

/** Breadcrumb item */
export interface BreadcrumbItem {
  label: string;
  href: string | null;
  isCurrentPage?: boolean;
}

/** Category data from database */
export interface CategoryInfo {
  id: string;
  name: string;
  path: string;
  icon: string;
  description: string | null;
  short_description: string | null;
  level: number;
  parent_id: string | null;
}

/** Template/hazard data from database */
export interface TemplateInfo {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  danger_level: number | null;
  category_id: string;
  storage_path: string | null;
  has_educational_content: boolean;
}

/** Page type determination result */
export interface PageTypeResult {
  type: 'root' | 'category' | 'hazard' | 'not_found';
  category?: CategoryInfo;
  parentCategories?: CategoryInfo[];
  template?: TemplateInfo;
  childCategories?: CategoryInfo[];
  templates?: TemplateInfo[];
}

const ORIGIN_STORAGE_KEY = 'learn_origin';

/**
 * Store the origin page when navigating to learn section
 */
export function setLearnOrigin(origin: LearnOrigin): void {
  if (!browser) return;
  sessionStorage.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(origin));
}

/**
 * Get the stored origin page
 */
export function getLearnOrigin(): LearnOrigin | null {
  if (!browser) return null;
  const stored = sessionStorage.getItem(ORIGIN_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as LearnOrigin;
  } catch {
    return null;
  }
}

/**
 * Clear the stored origin
 */
export function clearLearnOrigin(): void {
  if (!browser) return;
  sessionStorage.removeItem(ORIGIN_STORAGE_KEY);
}

/**
 * Build breadcrumb items from path segments and category chain
 */
export function buildBreadcrumbs(
  pathSegments: string[],
  categoryChain: CategoryInfo[],
  currentPageTitle: string,
  includeOrigin: boolean = true
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [];
  
  // Add origin if available and requested
  if (includeOrigin) {
    const origin = getLearnOrigin();
    if (origin) {
      crumbs.push({
        label: origin.title,
        href: origin.url
      });
    }
  }
  
  // Add "Learning Center" root
  crumbs.push({
    label: 'Learning Center',
    href: '/learn'
  });
  
  // Add each category in the chain
  let currentPath = '/learn';
  for (const category of categoryChain) {
    // Build path from category's path segments
    const pathParts = category.path.split('/');
    currentPath = '/learn/' + pathParts.join('/');
    
    crumbs.push({
      label: category.name,
      href: currentPath
    });
  }
  
  // Mark current page (last item has no link)
  if (crumbs.length > 0) {
    const lastCrumb = crumbs[crumbs.length - 1];
    if (lastCrumb.label === currentPageTitle) {
      lastCrumb.href = null;
      lastCrumb.isCurrentPage = true;
    } else {
      // Add the current page as final crumb
      crumbs.push({
        label: currentPageTitle,
        href: null,
        isCurrentPage: true
      });
    }
  }
  
  return crumbs;
}

/**
 * Generate a slug from text (for template creation)
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '_')         // Spaces to underscores
    .replace(/-+/g, '_')          // Hyphens to underscores
    .replace(/_+/g, '_')          // Multiple underscores to single
    .replace(/^_|_$/g, '');       // Trim underscores
}

/**
 * Format a slug or path segment for display
 */
export function formatForDisplay(slug: string): string {
  return slug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get danger level info
 */
export interface DangerLevelInfo {
  level: number;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

export const DANGER_LEVELS: Record<number, DangerLevelInfo> = {
  1: {
    level: 1,
    label: 'Low',
    icon: '🟢',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Nuisance, minor discomfort'
  },
  2: {
    level: 2,
    label: 'Moderate',
    icon: '🟡',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'Minor injury, self-treatable'
  },
  3: {
    level: 3,
    label: 'Significant',
    icon: '🟠',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    description: 'May require medical attention'
  },
  4: {
    level: 4,
    label: 'High',
    icon: '🔴',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Requires medical care'
  },
  5: {
    level: 5,
    label: 'Severe',
    icon: '☠️',
    color: 'text-red-900',
    bgColor: 'bg-red-200',
    description: 'Life-threatening emergency'
  }
};

export function getDangerLevel(level: number | null): DangerLevelInfo | null {
  if (!level || level < 1 || level > 5) return null;
  return DANGER_LEVELS[level];
}
