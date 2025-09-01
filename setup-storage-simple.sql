-- SIMPLIFIED SUPABASE STORAGE SETUP
-- Copy and paste this into your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/vmnutxcgbfomkrscwgcy/sql

BEGIN;

-- 1. Create the storage bucket for hazard images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hazard-images',
  'hazard-images', 
  true,  -- Public bucket for easier access
  52428800,  -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Create storage policies for the bucket

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hazard-images');

-- Allow authenticated users to update their own images  
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'hazard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own images
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'hazard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to all images
DROP POLICY IF EXISTS "Public can view all images" ON storage.objects;
CREATE POLICY "Public can view all images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hazard-images');

-- 3. Create the hazard_images table (simplified)
CREATE TABLE IF NOT EXISTS public.hazard_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID, -- Will link to hazards table when it exists
  user_id UUID NOT NULL, -- Links to auth.users.id
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  original_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  vote_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.hazard_images ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for hazard_images table

-- Allow authenticated users to insert images
DROP POLICY IF EXISTS "Authenticated users can upload image metadata" ON public.hazard_images;
CREATE POLICY "Authenticated users can upload image metadata"
ON public.hazard_images
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

-- Allow users to update their own image metadata
DROP POLICY IF EXISTS "Users can update their own image metadata" ON public.hazard_images;
CREATE POLICY "Users can update their own image metadata"
ON public.hazard_images
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Allow users to delete their own images
DROP POLICY IF EXISTS "Users can delete their own images" ON public.hazard_images;
CREATE POLICY "Users can delete their own images"
ON public.hazard_images
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Allow public read access to all image metadata
DROP POLICY IF EXISTS "Public can view all image metadata" ON public.hazard_images;
CREATE POLICY "Public can view all image metadata"
ON public.hazard_images
FOR SELECT
TO public
USING (true);

-- 5. Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_hazard_images_user_id ON public.hazard_images(user_id);
CREATE INDEX IF NOT EXISTS idx_hazard_images_uploaded_at ON public.hazard_images(uploaded_at DESC);

COMMIT;

-- Verify the setup
SELECT 'Storage bucket created:' as status, id, name, public from storage.buckets where id = 'hazard-images';
SELECT 'Table created:' as status, table_name from information_schema.tables where table_name = 'hazard_images';
