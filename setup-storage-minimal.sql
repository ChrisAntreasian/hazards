-- ULTRA-SIMPLIFIED SUPABASE STORAGE SETUP
-- Copy and paste this into your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/vmnutxcgbfomkrscwgcy/sql

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hazard-images',
  'hazard-images', 
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create storage policies
CREATE POLICY "Anyone can upload to hazard-images bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'hazard-images');

CREATE POLICY "Anyone can view hazard-images" ON storage.objects
FOR SELECT USING (bucket_id = 'hazard-images');

CREATE POLICY "Users can update own images in hazard-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'hazard-images');

CREATE POLICY "Users can delete own images in hazard-images" ON storage.objects
FOR DELETE USING (bucket_id = 'hazard-images');

-- Step 3: Create the table
CREATE TABLE public.hazard_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID,
  user_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  original_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  vote_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Enable RLS on the table
ALTER TABLE public.hazard_images ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple table policies
CREATE POLICY "Anyone can insert images" ON public.hazard_images
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view images" ON public.hazard_images
FOR SELECT USING (true);

CREATE POLICY "Anyone can update images" ON public.hazard_images
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete images" ON public.hazard_images
FOR DELETE USING (true);

-- Step 6: Create indexes
CREATE INDEX idx_hazard_images_user_id ON public.hazard_images(user_id);
CREATE INDEX idx_hazard_images_uploaded_at ON public.hazard_images(uploaded_at DESC);

-- Verification
SELECT 'Bucket created' as status, * FROM storage.buckets WHERE id = 'hazard-images';
SELECT 'Table created' as status, table_name FROM information_schema.tables WHERE table_name = 'hazard_images';
