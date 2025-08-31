-- Fix public access to reference tables
-- Enable RLS on reference tables and create public read policies

-- Enable RLS on regions table
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on hazard_categories table  
ALTER TABLE hazard_categories ENABLE ROW LEVEL SECURITY;

-- Create public read policies for reference data

-- Public read access to regions (needed for location selection)
CREATE POLICY "Public read regions" ON regions
    FOR SELECT USING (true);

-- Public read access to hazard categories (needed for category selection)
CREATE POLICY "Public read hazard categories" ON hazard_categories  
    FOR SELECT USING (true);

-- Note: These are reference/lookup tables that should be publicly readable
-- so users can see available regions and hazard types without authentication
