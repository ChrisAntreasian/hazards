/**
 * @fileoverview Content initialization utilities for creating empty markdown sections
 * when new templates or categories are created.
 */

import { createSupabaseLoadClient } from '$lib/supabase';

const BUCKET_NAME = 'hazard-educational-content';

/** Section configuration from database */
export interface SectionConfig {
  section_id: string;
  section_title: string;
  is_universal: boolean;
  is_required: boolean;
  display_order: number;
  prompt_hint: string | null;
}

/**
 * Get the effective sections for a category (universal + inherited + own)
 */
export async function getCategorySections(categoryId: string): Promise<SectionConfig[]> {
  const supabase = createSupabaseLoadClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Use the database function we created
  const { data, error } = await supabase.rpc('get_category_sections', {
    target_category_id: categoryId
  });

  if (error) {
    console.error('Error getting category sections:', error);
    throw error;
  }

  return (data || []).sort((a: SectionConfig, b: SectionConfig) => a.display_order - b.display_order);
}

/**
 * Generate placeholder markdown content for a section
 */
export function generatePlaceholderContent(
  sectionId: string,
  sectionTitle: string,
  templateName: string,
  isUniversal: boolean
): string {
  if (sectionId === 'overview') {
    return `# ${templateName}

*Detailed information coming soon.*

## Quick Facts

- **Danger Level:** TBD
- **Common Locations:** TBD
- **Active Season:** TBD

---

*This content is being developed. Check back soon for comprehensive safety information.*
`;
  }

  if (sectionId === 'description') {
    return `# About ${templateName}

*Detailed description coming soon.*

---

*This content is being developed. Check back soon for comprehensive safety information.*
`;
  }

  // For non-universal sections, we create a simpler placeholder
  return `# ${sectionTitle}

*Content coming soon.*

---

*This section will contain detailed ${sectionTitle.toLowerCase()} information for ${templateName}.*
`;
}

/**
 * Initialize empty markdown files for a new template
 */
export async function initializeTemplateContent(
  storagePath: string,
  templateName: string,
  sections: SectionConfig[]
): Promise<{ success: boolean; filesCreated: string[]; errors: string[] }> {
  const supabase = createSupabaseLoadClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const filesCreated: string[] = [];
  const errors: string[] = [];

  for (const section of sections) {
    const filePath = `${storagePath}/${section.section_id}.md`;
    const content = generatePlaceholderContent(
      section.section_id,
      section.section_title,
      templateName,
      section.is_universal
    );

    try {
      // Check if file already exists
      const { data: existingFile } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (existingFile) {
        // File exists, skip
        continue;
      }
    } catch {
      // File doesn't exist, which is expected
    }

    // Upload the placeholder content
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, new Blob([content], { type: 'text/markdown' }), {
        contentType: 'text/markdown',
        upsert: false
      });

    if (error) {
      errors.push(`Failed to create ${filePath}: ${error.message}`);
    } else {
      filesCreated.push(filePath);
    }
  }

  return {
    success: errors.length === 0,
    filesCreated,
    errors
  };
}

/**
 * Create storage folder structure for a category
 */
export async function initializeCategoryFolder(categoryPath: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseLoadClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Supabase Storage creates folders implicitly when files are uploaded
  // We'll create a .gitkeep file to ensure the folder exists
  const keepFilePath = `${categoryPath}/.gitkeep`;
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(keepFilePath, new Blob([''], { type: 'text/plain' }), {
      contentType: 'text/plain',
      upsert: true
    });

  if (error && !error.message.includes('already exists')) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check which sections have content vs placeholder
 */
export async function checkSectionStatus(
  storagePath: string,
  sections: SectionConfig[]
): Promise<{ sectionId: string; hasContent: boolean; isPlaceholder: boolean }[]> {
  const supabase = createSupabaseLoadClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const results = [];

  for (const section of sections) {
    const filePath = `${storagePath}/${section.section_id}.md`;
    
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (error || !data) {
        results.push({ sectionId: section.section_id, hasContent: false, isPlaceholder: false });
        continue;
      }

      const content = await data.text();
      const isPlaceholder = content.includes('*Content coming soon.*') || 
                            content.includes('*Detailed information coming soon.*') ||
                            content.includes('*Detailed description coming soon.*');

      results.push({
        sectionId: section.section_id,
        hasContent: true,
        isPlaceholder
      });
    } catch {
      results.push({ sectionId: section.section_id, hasContent: false, isPlaceholder: false });
    }
  }

  return results;
}
