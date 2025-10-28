-- Migration: Add area JSONB column to hazards table for polygon storage
-- Created: October 26, 2025

-- Add area column to store GeoJSON polygon data
ALTER TABLE public.hazards 
ADD COLUMN area JSONB;

-- Add a GIN index for efficient JSONB queries on area data
CREATE INDEX IF NOT EXISTS idx_hazards_area_gin ON public.hazards USING gin(area);

-- Add a partial index for hazards that have area data (non-null)
CREATE INDEX IF NOT EXISTS idx_hazards_with_area ON public.hazards(id) WHERE area IS NOT NULL;

-- Comment on the column for documentation
COMMENT ON COLUMN public.hazards.area IS 'GeoJSON Polygon representing the affected area. Structure: {"type": "Polygon", "coordinates": [[[lng,lat], ...]], "properties": {"vertices": number, "area_km2": number, "simplified": boolean}}';

-- Example of expected data structure:
-- {
--   "type": "Polygon",
--   "coordinates": [[[42.3601, -71.0589], [42.3602, -71.0590], [42.3603, -71.0589], [42.3601, -71.0589]]],
--   "properties": {
--     "vertices": 4,
--     "area_km2": 0.001,
--     "simplified": true,
--     "originalVertices": 12
--   }
-- }