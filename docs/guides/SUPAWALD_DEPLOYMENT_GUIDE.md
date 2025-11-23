# Supawald CMS Deployment Guide

This guide walks you through deploying a Supawald CMS instance to manage educational content for the Hazards application.

## Overview

Supawald is a Next.js-based headless CMS specifically designed for Supabase Storage. It will:
- Provide a user-friendly interface for content editors
- Manage markdown files in the `hazard-educational-content` bucket
- Support file uploads, editing, and organization
- Handle image uploads to hazard-specific `/images` folders

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│   Hazards App       │         │   Supawald CMS       │
│   (SvelteKit)       │         │   (Next.js)          │
│   hazards-app.com   │         │   cms.hazards.com    │
│                     │         │                      │
│   - View content    │         │   - Edit content     │
│   - Display hazards │         │   - Upload images    │
│   - Public access   │         │   - Manage drafts    │
└──────────┬──────────┘         └───────────┬──────────┘
           │                                 │
           │                                 │
           └─────────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Supabase Backend   │
              │                      │
              │   Storage Bucket:    │
              │   hazard-educational-│
              │   content            │
              │                      │
              │   Database Tables:   │
              │   - hazard_templates │
              │   - cms_content_     │
              │     drafts           │
              │   - content_edit_    │
              │     history          │
              └──────────────────────┘
```

## Prerequisites

- GitHub account (for repository hosting)
- Vercel account (recommended for deployment)
- Access to Supabase project dashboard
- Node.js 18+ installed locally

## Phase 1: Fork and Clone Supawald

1. **Fork the Supawald Repository**
   ```bash
   # Visit: https://github.com/StructuredLabs/supawald
   # Click "Fork" button to create your own copy
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/supawald.git
   cd supawald
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Phase 2: Configure Supawald

### 2.1 Environment Variables

Create a `.env.local` file in the Supawald root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vmnutxcgbfomkrscwgcy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbnV0eGNnYmZvbWtyc2N3Z2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTI0NjIsImV4cCI6MjA3MTkyODQ2Mn0.gm7XpDjNNUNAlU2mk4xTv2rDV4Z4DCuXeZZC2juBJ8s

# Storage Bucket Configuration
NEXT_PUBLIC_STORAGE_BUCKET=hazard-educational-content

# Application Settings
NEXT_PUBLIC_APP_NAME=Hazards Educational Content CMS
NEXT_PUBLIC_APP_DESCRIPTION=Content management system for hazard educational resources

# Optional: Custom domain (after deployment)
# NEXT_PUBLIC_APP_URL=https://cms.hazards-app.com
```

### 2.2 Supawald Configuration File

Check if Supawald has a config file (typically `supawald.config.js` or `config/supawald.js`). If it exists, configure it to point to your bucket:

```javascript
// supawald.config.js (example - adjust based on actual Supawald structure)
export default {
  bucket: 'hazard-educational-content',
  allowedFileTypes: ['.md', '.jpg', '.jpeg', '.png', '.gif', '.svg'],
  maxFileSize: 10485760, // 10MB
  
  // Content structure (matches your storage structure)
  contentTypes: [
    {
      name: 'Plants',
      path: 'plants',
      subcategories: ['poisonous', 'thorns']
    },
    {
      name: 'Insects',
      path: 'insects',
      subcategories: ['ticks', 'stinging', 'biting']
    },
    {
      name: 'Terrain',
      path: 'terrain',
      subcategories: ['unstable_ground', 'water']
    },
    {
      name: 'Animals',
      path: 'animals',
      subcategories: ['bears', 'snakes']
    }
  ],
  
  // Template files for each hazard
  templates: [
    'overview.md',
    'identification.md',
    'symptoms.md',
    'treatment.md',
    'prevention.md',
    'regional_notes.md'
  ]
};
```

## Phase 3: Set Up Authentication

### 3.1 Configure User Roles in Supabase

Supawald needs authenticated users with the `content_editor` role:

1. **Option A: Create Editor Users via Supabase Dashboard**
   - Go to Authentication > Users
   - Click "Add User"
   - Set email and temporary password
   - Save the user ID

2. **Option B: Use Existing Users**
   - Identify users who should have editor access
   - Note their user IDs from the `users` table

### 3.2 Grant Editor Role

Update users to have `content_editor` role:

```sql
-- Run in Supabase SQL Editor
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"content_editor"'
)
WHERE email IN (
  'editor1@example.com',
  'editor2@example.com'
  -- Add more editor emails as needed
);
```

### 3.3 Verify RLS Policies

The migration already created RLS policies for the storage bucket. Verify they're active:

```sql
-- Check storage policies
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

Expected policies:
- **Public Read**: Anyone can read files from `hazard-educational-content`
- **Editor Write**: Users with `content_editor` role can upload/update/delete files

## Phase 4: Test Locally

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Access the CMS**
   - Open `http://localhost:3000` in your browser
   - You should see the Supawald login page

3. **Test Authentication**
   - Sign in with an editor account
   - Verify you can see the file browser

4. **Test File Operations**
   - Navigate to a hazard folder (e.g., `plants/poisonous/poison_ivy`)
   - Try editing `overview.md`
   - Try uploading an image to the `images/` folder
   - Verify changes appear in Supabase Storage

## Phase 5: Deploy to Vercel

### 5.1 Connect to Vercel

1. **Install Vercel CLI (optional)**
   ```bash
   npm install -g vercel
   ```

2. **Deploy via Vercel Dashboard**
   - Go to https://vercel.com/new
   - Import your forked Supawald repository
   - Select the repository from GitHub

### 5.2 Configure Environment Variables

In Vercel project settings, add the same environment variables from `.env.local`:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vmnutxcgbfomkrscwgcy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1...` (your anon key) |
| `NEXT_PUBLIC_STORAGE_BUCKET` | `hazard-educational-content` |
| `NEXT_PUBLIC_APP_NAME` | `Hazards Educational Content CMS` |

### 5.3 Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete (~2-3 minutes)
3. Vercel will provide a URL (e.g., `supawald-abc123.vercel.app`)

### 5.4 Set Up Custom Domain (Optional)

1. Go to Vercel project settings > Domains
2. Add custom domain: `cms.hazards-app.com`
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (~5 minutes)

## Phase 6: Configure Content Workflow

### 6.1 Set Up Draft Workflow

The `cms_content_drafts` table supports a review workflow:

```sql
-- Draft Status Flow:
-- 1. ai_generated → 2. editor_review → 3. approved → 4. published
```

To enable draft management in Supawald, you may need to:
1. Create custom UI components for draft review
2. Integrate with the `cms_content_drafts` table
3. Add approval workflows

**Note**: This may require extending Supawald with custom pages. See Phase 7.

### 6.2 Configure AI Content Generation (Future)

The system is designed to support AI-generated content drafts. This will be implemented in Phase 3 of the main project plan. For now, editors will manually create content.

## Phase 7: Customize Supawald (Optional)

Supawald is open-source and can be customized:

### 7.1 Add Custom Pages

Create Next.js pages for:
- Draft review dashboard (`pages/drafts.tsx`)
- Content approval workflow (`pages/approve/[draftId].tsx`)
- Bulk operations (`pages/bulk-edit.tsx`)

### 7.2 Integrate with Hazard Templates

Create a page to link storage paths to the `hazard_templates` table:

```typescript
// pages/link-templates.tsx
// Allow editors to associate markdown files with hazard template records
```

### 7.3 Add Regional Content Tools

Create UI for managing regional variations:
- Filter by US region (Northeast, Southeast, Midwest, Southwest, West)
- Edit region-specific sections in `regional_notes.md`
- Bulk update regional information

## Phase 8: User Training

### 8.1 Content Editor Guide

Create documentation for content editors:
1. How to log in to the CMS
2. How to navigate the file structure
3. How to edit markdown files
4. How to upload images
5. Markdown syntax reference
6. Content guidelines and standards

### 8.2 Image Guidelines

- **Format**: JPG or PNG
- **Size**: Max 10MB per file
- **Naming**: Use descriptive names (e.g., `poison_ivy_leaves_close_up.jpg`)
- **Organization**: Store in hazard-specific `/images/` folders
- **Alt Text**: Document alt text in image filenames or metadata

## Troubleshooting

### Issue: "Row-level security policy violation"

**Cause**: User doesn't have `content_editor` role

**Solution**:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"content_editor"'
)
WHERE email = 'user@example.com';
```

### Issue: "Bucket not found"

**Cause**: Bucket name mismatch or bucket doesn't exist

**Solution**:
1. Verify bucket name in Supabase Dashboard > Storage
2. Check `NEXT_PUBLIC_STORAGE_BUCKET` environment variable
3. Ensure bucket is `hazard-educational-content` (not `educational-content`)

### Issue: "Cannot upload files"

**Cause**: RLS policies not configured correctly

**Solution**:
```sql
-- Verify policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%hazard-educational-content%';

-- If missing, re-run the migration:
-- supabase/migrations/20251123_educational_content_cms_setup.sql
```

### Issue: "Images not displaying"

**Cause**: Bucket is not public or CORS not configured

**Solution**:
1. Verify bucket is public in Supabase Dashboard
2. Check CORS settings in Supabase Storage settings
3. Ensure bucket's `public` column is `true`

## Next Steps

After successful deployment:

1. ✅ **Test Content Editing**
   - Have editors test the workflow
   - Edit a few markdown files
   - Upload sample images

2. ✅ **Integrate with Main App**
   - Update Hazards app to fetch content from storage
   - Create content service layer (see `docs/planning/EDUCATIONAL_CONTENT_CMS_PLAN.md`)

3. ✅ **Set Up Content Review Process**
   - Define content standards and guidelines
   - Establish review workflow
   - Create content calendar

4. ✅ **Implement AI Content Generation** (Phase 3)
   - Create AI service for draft generation
   - Build review interface in Supawald
   - Set up approval workflows

## Resources

- **Supawald Repository**: https://github.com/StructuredLabs/supawald
- **Supawald Documentation**: Check README in the repository
- **Supabase Storage Docs**: https://supabase.com/docs/guides/storage
- **Next.js Deployment Docs**: https://nextjs.org/docs/deployment
- **Vercel Deployment Guide**: https://vercel.com/docs

## Security Considerations

1. **API Keys**: Never commit API keys to Git
2. **Service Role Key**: Keep service role key secure, never expose to client
3. **RLS Policies**: Always test policies thoroughly before allowing public access
4. **User Roles**: Regularly audit users with `content_editor` role
5. **File Uploads**: Validate file types and sizes on server side
6. **Content Review**: Implement review process before publishing sensitive content

## Support

For issues or questions:
1. Check Supawald GitHub issues
2. Review Supabase community forums
3. Consult the main project planning docs in `docs/planning/`
