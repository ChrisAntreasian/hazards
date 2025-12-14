-- Add image_url field to hazard_templates table
-- This allows each template to have an associated image for the learn pages

ALTER TABLE hazard_templates 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_alt field for accessibility
ALTER TABLE hazard_templates 
ADD COLUMN IF NOT EXISTS image_alt TEXT;

-- Update existing templates with default images
UPDATE hazard_templates 
SET image_url = '/images/hazards/poison-ivy.jpg',
    image_alt = 'Poison ivy plant with characteristic three-leaf clusters'
WHERE slug = 'poison_ivy';

UPDATE hazard_templates 
SET image_url = '/images/hazards/yellow-jacket.jpg',
    image_alt = 'Yellow jacket wasp on a flower'
WHERE slug = 'yellow_jacket';

UPDATE hazard_templates 
SET image_url = '/images/hazards/loose-rock-scree.jpg',
    image_alt = 'Hikers traversing loose rocky mountain terrain'
WHERE slug = 'loose_rock_scree';

-- Add comment for documentation
COMMENT ON COLUMN hazard_templates.image_url IS 'URL or path to the hazard template image (local path like /images/hazards/x.jpg or full URL)';
COMMENT ON COLUMN hazard_templates.image_alt IS 'Alt text for accessibility describing the image';
