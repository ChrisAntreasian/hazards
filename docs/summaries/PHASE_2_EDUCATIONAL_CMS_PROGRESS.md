# Phase 2: Educational Content CMS - Service Layer Implementation

**Status**: 🚧 IN PROGRESS (80% complete)  
**Date**: November 23, 2025

## Overview

Phase 2 focuses on creating the service layer and UI components to fetch and display educational content from the Supabase Storage bucket created in Phase 1.

## Completed Work

### 1. ✅ Type Definitions (`src/lib/types/educational.ts`)

Created comprehensive TypeScript interfaces for type-safe content handling:

**Core Types:**
- `ContentFileType` - 6 types: overview, identification, symptoms, treatment, prevention, regional_notes
- `USRegion` - 5 US regions: northeast, southeast, midwest, southwest, west
- `ContentCategory` - 4 categories: plants, insects, terrain, animals
- `ContentSubcategory` - 9 subcategories organized by type

**Interfaces:**
- `EducationalContent` - Complete educational content for a hazard
- `ContentFile` - Individual markdown file with metadata
- `RegionalContent` - Region-specific content variation
- `ContentMetadata` - Database metadata from hazard_templates
- `ContentDraft` - CMS draft content from cms_content_drafts table
- `ContentResponse<T>` - Service response wrapper with error handling
- `ContentCacheEntry<T>` - Cache entry structure
- `RegionInfo` - Region metadata with state mappings

**Constants:**
- `REGIONS` - Mapping of all 5 US regions with states
- `CONTENT_FILE_TITLES` - Display titles for each file type
- `CONTENT_BUCKET` - Storage bucket configuration

**File Size**: 290 lines

---

### 2. ✅ Content Service Module (`src/lib/services/educationalContent.ts`)

Built comprehensive service layer for fetching and caching educational content:

**Core Functions:**

1. **`getEducationalContent()`** - Fetch complete educational content
   - Fetches all 6 markdown files in parallel
   - Parses regional content from regional_notes.md
   - Lists hazard images from /images folder
   - Returns fully structured EducationalContent object
   - Implements caching with 15-minute TTL

2. **`getContentFile()`** - Fetch single content file
   - Fetches specific file type (overview, identification, etc.)
   - Returns ContentFile with metadata
   - Cached independently

3. **`getRegionalContent()`** - Fetch region-specific content
   - Extracts content for specific US region
   - Parses markdown sections by region header
   - Returns RegionalContent object

4. **`getContentByTemplateId()`** - Fetch content via template ID
   - Looks up storage_path in hazard_templates table
   - Fetches content from Storage
   - Integrates database metadata with Storage content

5. **`getContentMetadata()`** - Get database metadata only
   - Fetches from hazard_templates table
   - Returns publication status, storage path, timestamps

6. **`listAvailableContent()`** - List all educational content
   - Returns hierarchical structure of all content
   - Organized by category > subcategory > hazards

**Caching Layer:**
- In-memory cache with configurable TTL (default: 15 minutes)
- `getCached()` - Retrieve from cache with expiration check
- `setCache()` - Store in cache with TTL
- `clearContentCache()` - Clear all cached content
- `clearCachePattern()` - Clear specific cached entries

**Helper Functions:**
- `fetchMarkdownFile()` - Fetch single markdown file from Storage
- `parseRegionalContent()` - Parse regional sections from markdown
- `listHazardImages()` - List images in hazard's /images folder

**Features:**
- Error handling and logging
- Public URL generation for images
- Markdown content parsing
- Parallel file fetching for performance

**File Size**: 463 lines

---

### 3. ✅ API Endpoints

Created 3 SvelteKit API routes for content retrieval:

#### A. `/api/content/[category]/[subcategory]/[hazard]/+server.ts`

Main endpoint for fetching educational content by path.

**Query Parameters:**
- `fileType` - Fetch specific content file (optional)
- `region` - Fetch regional content for specific US region (optional)
- `nocache` - Skip cache and fetch fresh content (optional)

**Examples:**
```bash
# Get complete content
GET /api/content/plants/poisonous/poison_ivy

# Get specific file
GET /api/content/plants/poisonous/poison_ivy?fileType=overview

# Get regional content
GET /api/content/plants/poisonous/poison_ivy?region=northeast

# Force fresh fetch
GET /api/content/plants/poisonous/poison_ivy?nocache
```

**Validation:**
- Validates category against allowed values
- Validates subcategory against allowed values
- Validates fileType and region if provided
- Returns 400 for invalid parameters
- Returns 404 if content not found
- Returns 500 for server errors

#### B. `/api/content/template/[templateId]/+server.ts`

Endpoint for fetching educational content by template ID.

**Query Parameters:**
- `metadata` - Return only metadata (no content) (optional)
- `nocache` - Skip cache and fetch fresh content (optional)

**Examples:**
```bash
# Get content by template ID
GET /api/content/template/123e4567-e89b-12d3-a456-426614174000

# Get only metadata
GET /api/content/template/123e4567-e89b-12d3-a456-426614174000?metadata

# Force fresh fetch
GET /api/content/template/123e4567-e89b-12d3-a456-426614174000?nocache
```

**Validation:**
- Validates UUID format
- Checks if template has educational content
- Returns 404 if template or content not found

#### C. `/api/content/list/+server.ts`

Endpoint for listing all available educational content.

**Returns:**
```json
{
  "data": {
    "plants": {
      "poisonous": ["poison_ivy", "poison_oak", "poison_sumac"],
      "thorns": ["multiflora_rose", "blackberry", "wild_rose"]
    },
    "insects": {
      "ticks": ["deer_tick", "dog_tick", "lone_star_tick"],
      "stinging": ["yellow_jacket", "bald_faced_hornet", "paper_wasp"],
      "biting": ["mosquitos"]
    },
    // ... terrain, animals
  }
}
```

**Use Cases:**
- Content discovery
- Building navigation menus
- Search/autocomplete
- Admin dashboards

---

### 4. ✅ Svelte Components

Created 4 reusable Svelte components for displaying educational content:

#### A. `MarkdownRenderer.svelte`

Renders markdown content with proper HTML sanitization and styling.

**Features:**
- Uses `marked` library for markdown parsing
- Uses `isomorphic-dompurify` for XSS protection
- GitHub Flavored Markdown support
- Syntax highlighting ready
- Responsive typography
- Custom styles for all markdown elements

**Security:**
- Allowed tags: headers, paragraphs, lists, links, code, tables, images
- Allowed attributes: href, title, alt, src, id, class
- Sanitized with DOMPurify

**Styling:**
- Headers with hierarchy (h1-h6)
- Code blocks with syntax highlighting ready
- Tables with hover effects
- Blockquotes with visual indicators
- Responsive images
- Mobile-friendly typography

**File Size**: 241 lines

#### B. `RegionalContentSelector.svelte`

Interactive component for switching between US regional content.

**Features:**
- Tab navigation for 5 US regions
- Displays region name and included states
- Shows region-specific content
- Responsive design (mobile-friendly)
- Smooth transitions
- Tooltips with region descriptions

**Props:**
- `regionalContent` - Array of regional content
- `selectedRegion` - Currently selected region (default: northeast)
- `onRegionChange` - Callback when region changes

**UI Elements:**
- Region tabs (horizontal scrollable on mobile)
- Region header with name and states
- Content area with slot for markdown renderer
- No-content fallback message

**File Size**: 146 lines

#### C. `ContentNavigationTabs.svelte`

Tabbed navigation for different educational content sections.

**Features:**
- Tab navigation with icons and labels
- 6 content types: overview, identification, symptoms, treatment, prevention, regional_notes
- Icon mapping for each type (📋, 🔍, ⚠️, 🏥, 🛡️, 🗺️)
- Responsive design (icons only on mobile)
- Smooth tab transitions
- Accessible keyboard navigation

**Props:**
- `files` - Array of content files
- `activeFileType` - Currently active tab (default: overview)
- `onTabChange` - Callback when tab changes

**UI Elements:**
- Horizontal scrollable tabs
- Active tab highlighting
- Content area with slot for markdown renderer
- Fade-in animation on tab change

**File Size**: 192 lines

#### D. `EducationalContentCard.svelte`

Main component that combines all others into a complete educational content display.

**Features:**
- Header with hazard name and category badges
- Image gallery (optional, with lightbox-ready grid)
- Tabbed content navigation (excluding regional_notes)
- Regional content section (separate from main tabs)
- Footer with last updated timestamp
- Fully responsive design
- Smooth animations

**Props:**
- `content` - EducationalContent object
- `showImages` - Whether to display images (default: true)
- `defaultTab` - Initial active tab (default: overview)
- `defaultRegion` - Initial selected region (default: northeast)

**Sections:**
1. **Header** - Title + category/subcategory badges
2. **Images Gallery** - Grid of hazard photos (if available)
3. **Main Content** - Tabbed navigation (5 tabs excluding regional_notes)
4. **Regional Information** - Separate section with region selector
5. **Footer** - Last updated timestamp

**Styling:**
- Card-based layout with shadow
- Color-coded badges
- Responsive grid for images
- Mobile-optimized tabs
- Smooth transitions

**File Size**: 237 lines

---

## Architecture

### Data Flow

```
┌─────────────────────┐
│   Supabase Storage  │
│   hazard-educational│
│   -content bucket   │
└──────────┬──────────┘
           │
           │ fetch files
           ▼
┌─────────────────────┐
│  Content Service    │
│  educationalContent │
│  .ts                │
│  - Caching layer    │
│  - Parallel fetch   │
│  - Error handling   │
└──────────┬──────────┘
           │
           │ API calls
           ▼
┌─────────────────────┐
│   API Routes        │
│  /api/content/...   │
│  - Validation       │
│  - Query params     │
└──────────┬──────────┘
           │
           │ fetch data
           ▼
┌─────────────────────┐
│  Svelte Components  │
│  - Content Card     │
│  - Tabs/Regions     │
│  - Markdown render  │
└─────────────────────┘
```

### Component Hierarchy

```
EducationalContentCard (main)
  ├── ContentNavigationTabs (main content)
  │   └── MarkdownRenderer (each tab)
  └── RegionalContentSelector (regional)
      └── MarkdownRenderer (each region)
```

---

## Remaining Work (Phase 2)

### 5. 🚧 IN PROGRESS: Integration with Hazard Detail Pages

**Tasks:**
- [ ] Add educational content section to `src/routes/hazards/[id]/+page.svelte`
- [ ] Fetch content based on hazard's template_id
- [ ] Implement loading states (skeleton, spinner)
- [ ] Handle error states (no content, fetch failed)
- [ ] Add "Report Issue" button for content problems
- [ ] Implement lazy loading (only fetch when user scrolls to section)

**Integration Points:**
```typescript
// In hazard detail page server load function
export const load: PageServerLoad = async ({ params }) => {
  const hazard = await getHazardById(params.id);
  
  // Fetch educational content if hazard has template_id
  let educationalContent = null;
  if (hazard.template_id) {
    const contentResponse = await getContentByTemplateId(hazard.template_id);
    if (!contentResponse.error) {
      educationalContent = contentResponse.data;
    }
  }
  
  return { hazard, educationalContent };
};
```

### 6. ⏳ NOT STARTED: Testing & Validation

**Test Scenarios:**
- [ ] Test content retrieval for all 19 hazards
- [ ] Verify caching works (check cache hits)
- [ ] Test cache expiration (wait 15 minutes)
- [ ] Test error handling (invalid paths, missing files)
- [ ] Validate markdown rendering (all elements)
- [ ] Test regional content switching (all 5 regions)
- [ ] Test image loading and display
- [ ] Test mobile responsiveness
- [ ] Test accessibility (keyboard navigation, screen readers)
- [ ] Test performance (parallel fetching, lazy loading)

**Validation Checklist:**
- [ ] All API endpoints return correct data
- [ ] All components render without errors
- [ ] Markdown is properly sanitized (no XSS)
- [ ] Images load correctly with public URLs
- [ ] Regional content parses correctly
- [ ] Cache reduces redundant fetches
- [ ] Error messages are user-friendly
- [ ] Loading states provide feedback
- [ ] Mobile UI is usable
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

## Files Created

1. `src/lib/types/educational.ts` (290 lines)
2. `src/lib/services/educationalContent.ts` (463 lines)
3. `src/routes/api/content/[category]/[subcategory]/[hazard]/+server.ts` (95 lines)
4. `src/routes/api/content/template/[templateId]/+server.ts` (56 lines)
5. `src/routes/api/content/list/+server.ts` (32 lines)
6. `src/lib/components/MarkdownRenderer.svelte` (241 lines)
7. `src/lib/components/RegionalContentSelector.svelte` (146 lines)
8. `src/lib/components/ContentNavigationTabs.svelte` (192 lines)
9. `src/lib/components/EducationalContentCard.svelte` (237 lines)

**Total**: 9 files, ~1,752 lines of code

---

## Dependencies Required

Add these to `package.json`:

```json
{
  "dependencies": {
    "marked": "^11.1.0",
    "isomorphic-dompurify": "^2.9.0"
  },
  "devDependencies": {
    "@types/marked": "^6.0.0"
  }
}
```

**Installation Command:**
```bash
npm install marked isomorphic-dompurify
npm install -D @types/marked
```

---

## Next Steps

1. **Install Dependencies**
   ```bash
   npm install marked isomorphic-dompurify
   npm install -D @types/marked
   ```

2. **Test API Endpoints**
   - Start dev server: `npm run dev`
   - Test endpoint: `http://localhost:5173/api/content/plants/poisonous/poison_ivy`
   - Verify response structure

3. **Integrate with Hazard Detail Pages**
   - Update `src/routes/hazards/[id]/+page.server.ts`
   - Add EducationalContentCard to `+page.svelte`
   - Implement loading/error states

4. **Test Components**
   - Create test page: `src/routes/test-content/+page.svelte`
   - Import EducationalContentCard
   - Test with poison_ivy content

5. **Commit Phase 2 Work**
   ```bash
   git add src/lib/types/educational.ts
   git add src/lib/services/educationalContent.ts
   git add src/routes/api/content/
   git add src/lib/components/MarkdownRenderer.svelte
   git add src/lib/components/RegionalContentSelector.svelte
   git add src/lib/components/ContentNavigationTabs.svelte
   git add src/lib/components/EducationalContentCard.svelte
   git commit -m "feat: Phase 2 - Educational content service layer and UI components"
   ```

---

## Success Metrics

**Phase 2 will be complete when:**
- ✅ All service functions work correctly
- ✅ All API endpoints return valid data
- ✅ All components render without errors
- ✅ Content displays on hazard detail pages
- ✅ Caching reduces API calls by 80%+
- ✅ Mobile UI is fully responsive
- ✅ No security vulnerabilities (sanitized markdown)
- ✅ All 19 hazards have displayable content

---

## Notes

- **Security**: All markdown content is sanitized with DOMPurify to prevent XSS attacks
- **Performance**: Content is cached for 15 minutes to reduce Storage API calls
- **Accessibility**: Components use semantic HTML and ARIA labels
- **Responsive**: All components are mobile-first with tablet/desktop breakpoints
- **Extensible**: Easy to add new content types or regions in the future

---

**Status**: Ready for integration testing and hazard detail page implementation! 🚀
