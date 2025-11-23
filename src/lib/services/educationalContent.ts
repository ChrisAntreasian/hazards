/**
 * @fileoverview Educational content service for fetching and managing hazard educational content.
 * Provides functions to retrieve markdown content from Supabase Storage with caching.
 * 
 * @module EducationalContentService
 * @author HazardTracker Development Team
 * @version 1.0.0
 */

import { createSupabaseLoadClient } from '$lib/supabase';
import type {
  EducationalContent,
  ContentFile,
  ContentFileType,
  RegionalContent,
  ContentResponse,
  ContentCacheEntry,
  ContentMetadata,
  ContentCategory,
  ContentSubcategory,
  USRegion
} from '$lib/types/educational';
import { CONTENT_FILE_TITLES, REGIONS } from '$lib/types/educational';

/**
 * Storage bucket name for educational content
 */
const BUCKET_NAME = 'hazard-educational-content';

/**
 * Cache TTL in milliseconds (15 minutes)
 */
const CACHE_TTL = 15 * 60 * 1000;

/**
 * In-memory cache for content
 * In production, consider using Redis or similar
 */
const contentCache = new Map<string, ContentCacheEntry<any>>();

/**
 * Get content from cache if valid
 */
function getCached<T>(key: string): T | null {
  const entry = contentCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.cachedAt.getTime() > entry.ttl) {
    // Cache expired
    contentCache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store content in cache
 */
function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  contentCache.set(key, {
    data,
    cachedAt: new Date(),
    ttl
  });
}

/**
 * Clear all cached content
 */
export function clearContentCache(): void {
  contentCache.clear();
}

/**
 * Clear specific cached content by key pattern
 */
export function clearCachePattern(pattern: string): void {
  const keys = Array.from(contentCache.keys());
  keys.forEach(key => {
    if (key.includes(pattern)) {
      contentCache.delete(key);
    }
  });
}

/**
 * Fetch a single markdown file from Storage
 */
async function fetchMarkdownFile(
  path: string
): Promise<ContentResponse<string>> {
  try {
    const supabase = createSupabaseLoadClient();
    if (!supabase) {
      return { error: 'Supabase client not initialized' };
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path);

    if (error) {
      console.error(`Failed to fetch ${path}:`, error);
      return { error: error.message };
    }

    if (!data) {
      return { error: 'No data returned from Storage' };
    }

    const content = await data.text();
    return { data: content };
  } catch (err) {
    console.error(`Error fetching ${path}:`, err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Parse regional content from regional_notes.md
 * Expected format:
 * ## Northeast
 * Content for northeast...
 * 
 * ## Southeast
 * Content for southeast...
 */
function parseRegionalContent(markdown: string): RegionalContent[] {
  const regionalContent: RegionalContent[] = [];
  const regionKeys = Object.keys(REGIONS) as USRegion[];

  regionKeys.forEach(regionId => {
    const regionInfo = REGIONS[regionId];
    // Match ## RegionName (case insensitive)
    const regex = new RegExp(`##\\s+${regionInfo.name}\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i');
    const match = markdown.match(regex);

    if (match && match[1]) {
      regionalContent.push({
        region: regionId,
        regionName: regionInfo.name,
        content: match[1].trim()
      });
    }
  });

  return regionalContent;
}

/**
 * List images in a hazard's images folder
 */
async function listHazardImages(
  category: ContentCategory,
  subcategory: ContentSubcategory,
  hazardSlug: string
): Promise<string[]> {
  try {
    const supabase = createSupabaseLoadClient();
    if (!supabase) {
      return [];
    }

    const folderPath = `${category}/${subcategory}/${hazardSlug}/images`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (error || !data) {
      return [];
    }

    // Filter out .gitkeep and get public URLs
    const imageFiles = data.filter(file => 
      !file.name.startsWith('.') && 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
    );

    // Get public URLs for images
    const imageUrls = imageFiles.map(file => {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(`${folderPath}/${file.name}`);
      return urlData.publicUrl;
    });

    return imageUrls;
  } catch (err) {
    console.error('Error listing images:', err);
    return [];
  }
}

/**
 * Fetch complete educational content for a hazard
 * 
 * @param category - Content category (plants, insects, terrain, animals)
 * @param subcategory - Content subcategory
 * @param hazardSlug - Hazard identifier (e.g., 'poison_ivy')
 * @param useCache - Whether to use cached content (default: true)
 * @returns Complete educational content or error
 */
export async function getEducationalContent(
  category: ContentCategory,
  subcategory: ContentSubcategory,
  hazardSlug: string,
  useCache: boolean = true
): Promise<ContentResponse<EducationalContent>> {
  const cacheKey = `content:${category}:${subcategory}:${hazardSlug}`;

  // Check cache first
  if (useCache) {
    const cached = getCached<EducationalContent>(cacheKey);
    if (cached) {
      return { data: cached, cached: true, cachedAt: new Date() };
    }
  }

  try {
    const basePath = `${category}/${subcategory}/${hazardSlug}`;
    const fileTypes: ContentFileType[] = [
      'overview',
      'identification',
      'symptoms',
      'treatment',
      'prevention',
      'regional_notes'
    ];

    // Fetch all content files in parallel
    const filePromises = fileTypes.map(async (type): Promise<ContentFile | null> => {
      const path = `${basePath}/${type}.md`;
      const response = await fetchMarkdownFile(path);

      if (response.error || !response.data) {
        console.warn(`Failed to fetch ${type} for ${hazardSlug}:`, response.error);
        return null;
      }

      return {
        type,
        title: CONTENT_FILE_TITLES[type],
        content: response.data,
        path
      };
    });

    const files = (await Promise.all(filePromises)).filter(
      (file): file is ContentFile => file !== null
    );

    if (files.length === 0) {
      return { error: 'No content files found' };
    }

    // Parse regional content from regional_notes.md
    const regionalNotesFile = files.find(f => f.type === 'regional_notes');
    const regionalContent = regionalNotesFile
      ? parseRegionalContent(regionalNotesFile.content)
      : [];

    // Get images
    const images = await listHazardImages(category, subcategory, hazardSlug);

    // Create display name from slug
    const displayName = hazardSlug
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const content: EducationalContent = {
      hazardSlug,
      category,
      subcategory,
      displayName,
      files,
      regionalContent,
      images,
      isPublished: true, // Content in Storage is considered published
      lastPublished: new Date()
    };

    // Cache the content
    setCache(cacheKey, content);

    return { data: content };
  } catch (err) {
    console.error('Error fetching educational content:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Fetch a single content file
 * 
 * @param category - Content category
 * @param subcategory - Content subcategory
 * @param hazardSlug - Hazard identifier
 * @param fileType - Type of content file to fetch
 * @param useCache - Whether to use cached content
 * @returns Content file or error
 */
export async function getContentFile(
  category: ContentCategory,
  subcategory: ContentSubcategory,
  hazardSlug: string,
  fileType: ContentFileType,
  useCache: boolean = true
): Promise<ContentResponse<ContentFile>> {
  const cacheKey = `file:${category}:${subcategory}:${hazardSlug}:${fileType}`;

  // Check cache
  if (useCache) {
    const cached = getCached<ContentFile>(cacheKey);
    if (cached) {
      return { data: cached, cached: true };
    }
  }

  const path = `${category}/${subcategory}/${hazardSlug}/${fileType}.md`;
  const response = await fetchMarkdownFile(path);

  if (response.error || !response.data) {
    return { error: response.error || 'Failed to fetch content file' };
  }

  const file: ContentFile = {
    type: fileType,
    title: CONTENT_FILE_TITLES[fileType],
    content: response.data,
    path
  };

  // Cache the file
  setCache(cacheKey, file);

  return { data: file };
}

/**
 * Fetch regional content for a specific region
 * 
 * @param category - Content category
 * @param subcategory - Content subcategory
 * @param hazardSlug - Hazard identifier
 * @param region - US region to fetch content for
 * @returns Regional content or error
 */
export async function getRegionalContent(
  category: ContentCategory,
  subcategory: ContentSubcategory,
  hazardSlug: string,
  region: USRegion
): Promise<ContentResponse<RegionalContent>> {
  // Fetch the regional_notes file
  const fileResponse = await getContentFile(
    category,
    subcategory,
    hazardSlug,
    'regional_notes'
  );

  if (fileResponse.error || !fileResponse.data) {
    return { error: fileResponse.error || 'Failed to fetch regional content' };
  }

  // Parse regional content
  const allRegionalContent = parseRegionalContent(fileResponse.data.content);
  const regionalContent = allRegionalContent.find(rc => rc.region === region);

  if (!regionalContent) {
    return { error: `No content found for region: ${region}` };
  }

  return { data: regionalContent };
}

/**
 * Get content metadata from database (hazard_templates table)
 * 
 * @param templateId - Template ID
 * @returns Content metadata or error
 */
export async function getContentMetadata(
  templateId: string
): Promise<ContentResponse<ContentMetadata>> {
  try {
    const supabase = createSupabaseLoadClient();
    if (!supabase) {
      return { error: 'Supabase client not initialized' };
    }

    const { data, error } = await supabase
      .from('hazard_templates')
      .select('id, storage_path, has_educational_content, last_published_at, published_by')
      .eq('id', templateId)
      .single();

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return { error: 'Template not found' };
    }

    const metadata: ContentMetadata = {
      id: data.id,
      storagePath: data.storage_path || '',
      hasEducationalContent: data.has_educational_content || false,
      lastPublishedAt: data.last_published_at ? new Date(data.last_published_at) : undefined,
      publishedBy: data.published_by || undefined
    };

    return { data: metadata };
  } catch (err) {
    console.error('Error fetching content metadata:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get educational content by template ID
 * Looks up storage_path in hazard_templates, then fetches content
 * 
 * @param templateId - Template ID
 * @param useCache - Whether to use cached content
 * @returns Educational content or error
 */
export async function getContentByTemplateId(
  templateId: string,
  useCache: boolean = true
): Promise<ContentResponse<EducationalContent>> {
  // Get metadata first
  const metadataResponse = await getContentMetadata(templateId);

  if (metadataResponse.error || !metadataResponse.data) {
    return { error: metadataResponse.error || 'Failed to fetch metadata' };
  }

  const metadata = metadataResponse.data;

  if (!metadata.hasEducationalContent || !metadata.storagePath) {
    return { error: 'No educational content available for this template' };
  }

  // Parse storage path (format: category/subcategory/hazard_slug)
  const pathParts = metadata.storagePath.split('/');
  if (pathParts.length !== 3) {
    return { error: 'Invalid storage path format' };
  }

  const [category, subcategory, hazardSlug] = pathParts as [
    ContentCategory,
    ContentSubcategory,
    string
  ];

  return getEducationalContent(category, subcategory, hazardSlug, useCache);
}

/**
 * Search/list all available educational content
 * 
 * @returns List of all available content slugs organized by category
 */
export async function listAvailableContent(): Promise<ContentResponse<{
  [K in ContentCategory]: {
    [S in ContentSubcategory]?: string[];
  };
}>> {
  try {
    const supabase = createSupabaseLoadClient();
    if (!supabase) {
      return { error: 'Supabase client not initialized' };
    }

    // List all folders in the bucket
    const structure: {
      [K in ContentCategory]: {
        [S in ContentSubcategory]?: string[];
      };
    } = {
      plants: {},
      insects: {},
      terrain: {},
      animals: {}
    };

    // This is a simplified version - in production you'd want to recursively
    // list all folders or maintain an index in the database
    const categories: ContentCategory[] = ['plants', 'insects', 'terrain', 'animals'];

    for (const category of categories) {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(category);

      if (!error && data) {
        // Each folder is a subcategory
        for (const folder of data) {
          if (folder.id) {
            const subcategory = folder.name as ContentSubcategory;
            const { data: hazards } = await supabase.storage
              .from(BUCKET_NAME)
              .list(`${category}/${subcategory}`);

            if (hazards) {
              structure[category][subcategory] = hazards
                .filter(h => h.id) // Only folders
                .map(h => h.name);
            }
          }
        }
      }
    }

    return { data: structure };
  } catch (err) {
    console.error('Error listing content:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
