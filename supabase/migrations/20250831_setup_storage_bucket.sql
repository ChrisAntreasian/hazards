-- Create storage bucket for hazard images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hazard-images',
  'hazard-images', 
  true,  -- Make bucket public for easier access
  52428800,  -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']  -- Allowed image types
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for hazard-images bucket

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hazard-images');

-- Policy: Allow authenticated users to update their own images  
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'hazard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'hazard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow public read access to all images in the bucket
CREATE POLICY "Public can view all images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hazard-images');

-- Create hazard_images table to track image metadata
CREATE TABLE IF NOT EXISTS public.hazard_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID, -- Remove foreign key constraint for now since hazards table may not exist
  user_id UUID NOT NULL, -- Reference to auth.users.id but without foreign key constraint
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  original_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  vote_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on hazard_images table
ALTER TABLE public.hazard_images ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert images
CREATE POLICY "Authenticated users can upload image metadata"
ON public.hazard_images
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own image metadata
CREATE POLICY "Users can update their own image metadata"
ON public.hazard_images
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON public.hazard_images
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow public read access to all image metadata
CREATE POLICY "Public can view all image metadata"
ON public.hazard_images
FOR SELECT
TO public
USING (true);

-- Create image_votes table for voting system
CREATE TABLE IF NOT EXISTS public.image_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES public.hazard_images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Reference to auth.users.id but without foreign key constraint
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(image_id, user_id)
);

-- Enable RLS on image_votes table
ALTER TABLE public.image_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to vote
CREATE POLICY "Authenticated users can vote on images"
ON public.image_votes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own votes
CREATE POLICY "Users can update their own votes"
ON public.image_votes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow users to delete their own votes
CREATE POLICY "Users can delete their own votes" 
ON public.image_votes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow public read access to votes for vote counting
CREATE POLICY "Public can view vote counts"
ON public.image_votes
FOR SELECT
TO public
USING (true);

-- Function to update vote scores when votes change
CREATE OR REPLACE FUNCTION update_image_vote_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the vote score for the affected image
  UPDATE public.hazard_images 
  SET vote_score = (
    SELECT COALESCE(SUM(CASE 
      WHEN vote_type = 'up' THEN 1 
      WHEN vote_type = 'down' THEN -1 
      ELSE 0 
    END), 0)
    FROM public.image_votes 
    WHERE image_id = COALESCE(NEW.image_id, OLD.image_id)
  )
  WHERE id = COALESCE(NEW.image_id, OLD.image_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote scores
DROP TRIGGER IF EXISTS trigger_update_image_vote_score ON public.image_votes;
CREATE TRIGGER trigger_update_image_vote_score
  AFTER INSERT OR UPDATE OR DELETE ON public.image_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_image_vote_score();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hazard_images_hazard_id ON public.hazard_images(hazard_id);
CREATE INDEX IF NOT EXISTS idx_hazard_images_user_id ON public.hazard_images(user_id);
CREATE INDEX IF NOT EXISTS idx_hazard_images_vote_score ON public.hazard_images(vote_score DESC);
CREATE INDEX IF NOT EXISTS idx_hazard_images_uploaded_at ON public.hazard_images(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_votes_image_id ON public.image_votes(image_id);
CREATE INDEX IF NOT EXISTS idx_image_votes_user_id ON public.image_votes(user_id);
