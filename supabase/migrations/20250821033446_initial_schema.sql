-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE user_role AS ENUM ('new_user', 'contributor', 'trusted_user', 'content_editor', 'moderator', 'admin');
CREATE TYPE hazard_status AS ENUM ('pending', 'approved', 'flagged', 'removed');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE moderation_type AS ENUM ('hazard', 'image', 'template', 'user_report');
CREATE TYPE moderation_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE template_status AS ENUM ('draft', 'published', 'needs_review');

-- ============================================================================
-- USERS AND AUTHENTICATION
-- ============================================================================

-- Extend the auth.users table with our custom user data
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    trust_score INTEGER DEFAULT 0,
    total_contributions INTEGER DEFAULT 0,
    role user_role DEFAULT 'new_user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GEOGRAPHIC REGIONS
-- ============================================================================

CREATE TABLE public.regions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bounds JSONB NOT NULL, -- {north, south, east, west}
    timezone VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Boston region
INSERT INTO public.regions (id, name, bounds, timezone) VALUES 
('us_northeast_boston', 'Greater Boston Area', 
 '{"north": 42.5, "south": 42.2, "east": -70.8, "west": -71.3}', 
 'America/New_York');

-- ============================================================================
-- HAZARD CATEGORIZATION SYSTEM
-- ============================================================================

CREATE TABLE public.hazard_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES hazard_categories(id),
    level INTEGER NOT NULL DEFAULT 0,
    path VARCHAR(500) NOT NULL, -- "plants/poisonous/poison_ivy"
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hierarchical hazard categories
INSERT INTO public.hazard_categories (name, parent_id, level, path, icon) VALUES 
-- Level 0 (Root categories)
('Plants', NULL, 0, 'plants', '🌿'),
('Insects', NULL, 0, 'insects', '🐛'),
('Animals', NULL, 0, 'animals', '🐻'),
('Terrain', NULL, 0, 'terrain', '🏔️'),
('Weather', NULL, 0, 'weather', '⛈️');

-- Level 1 (Subcategories) - We'll add these with proper parent_id references
WITH root_categories AS (
    SELECT id, path FROM hazard_categories WHERE level = 0
)
INSERT INTO public.hazard_categories (name, parent_id, level, path, icon) 
SELECT 'Poisonous', rc.id, 1, 'plants/poisonous', '☠️' FROM root_categories rc WHERE rc.path = 'plants'
UNION ALL
SELECT 'Thorns', rc.id, 1, 'plants/thorns', '🌹' FROM root_categories rc WHERE rc.path = 'plants'
UNION ALL
SELECT 'Stinging', rc.id, 1, 'insects/stinging', '🐝' FROM root_categories rc WHERE rc.path = 'insects'
UNION ALL
SELECT 'Biting', rc.id, 1, 'insects/biting', '🦟' FROM root_categories rc WHERE rc.path = 'insects'
UNION ALL
SELECT 'Large Mammals', rc.id, 1, 'animals/large_mammals', '🐻' FROM root_categories rc WHERE rc.path = 'animals'
UNION ALL
SELECT 'Reptiles', rc.id, 1, 'animals/reptiles', '🐍' FROM root_categories rc WHERE rc.path = 'animals'
UNION ALL
SELECT 'Unstable', rc.id, 1, 'terrain/unstable', '⚠️' FROM root_categories rc WHERE rc.path = 'terrain'
UNION ALL
SELECT 'Water Hazards', rc.id, 1, 'terrain/water', '🌊' FROM root_categories rc WHERE rc.path = 'terrain';

-- ============================================================================
-- HAZARD TEMPLATES (CMS-MANAGED EDUCATIONAL CONTENT)
-- ============================================================================

CREATE TABLE public.hazard_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES hazard_categories(id),
    name VARCHAR(200) NOT NULL,
    scientific_name VARCHAR(200),
    cms_content_id VARCHAR(100), -- Links to Supawald CMS
    regional_data JSONB DEFAULT '[]', -- Array of regional variations
    is_user_generated BOOLEAN DEFAULT false,
    needs_cms_content BOOLEAN DEFAULT false,
    status template_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USER-REPORTED HAZARD INSTANCES
-- ============================================================================

CREATE TABLE public.hazards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES hazard_templates(id),
    user_id UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 5) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_Point(longitude, latitude)) STORED,
    geo_cell VARCHAR(50) NOT NULL, -- For geographic partitioning
    geohash VARCHAR(20) NOT NULL,
    region_id VARCHAR(50) REFERENCES regions(id),
    status hazard_status DEFAULT 'pending',
    trust_score INTEGER DEFAULT 0,
    verification_count INTEGER DEFAULT 0,
    is_seasonal BOOLEAN DEFAULT false,
    reported_active_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- HAZARD IMAGES
-- ============================================================================

CREATE TABLE public.hazard_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hazard_id UUID NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    votes_up INTEGER DEFAULT 0,
    votes_down INTEGER DEFAULT 0,
    moderation_status moderation_status DEFAULT 'pending',
    metadata JSONB DEFAULT '{}' -- Store image metadata (dimensions, etc.)
);

-- ============================================================================
-- RATINGS AND VERIFICATION
-- ============================================================================

CREATE TABLE public.hazard_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hazard_id UUID NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    severity_rating INTEGER CHECK (severity_rating BETWEEN 1 AND 5),
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hazard_id, user_id) -- One rating per user per hazard
);

CREATE TABLE public.image_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES hazard_images(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    vote INTEGER CHECK (vote IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(image_id, user_id) -- One vote per user per image
);

-- ============================================================================
-- MODERATION SYSTEM
-- ============================================================================

CREATE TABLE public.moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type moderation_type NOT NULL,
    content_id UUID NOT NULL, -- References hazards.id, hazard_images.id, etc.
    submitted_by UUID NOT NULL REFERENCES users(id),
    flagged_reasons TEXT[] DEFAULT '{}',
    priority moderation_priority DEFAULT 'medium',
    status moderation_status DEFAULT 'pending',
    assigned_moderator UUID REFERENCES users(id),
    moderator_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Geographic indexes
CREATE INDEX idx_hazards_location ON hazards USING GIST (location);
CREATE INDEX idx_hazards_geo_cell ON hazards(geo_cell);
CREATE INDEX idx_hazards_region ON hazards(region_id);

-- Status and filtering indexes
CREATE INDEX idx_hazards_status ON hazards(status);
CREATE INDEX idx_hazards_severity ON hazards(severity_level);
CREATE INDEX idx_hazards_template ON hazards(template_id);
CREATE INDEX idx_hazards_user ON hazards(user_id);

-- Moderation indexes
CREATE INDEX idx_moderation_status ON moderation_queue(status);
CREATE INDEX idx_moderation_type ON moderation_queue(type);
CREATE INDEX idx_moderation_priority ON moderation_queue(priority);
CREATE INDEX idx_moderation_assigned ON moderation_queue(assigned_moderator);

-- User performance indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_trust_score ON users(trust_score);

-- Category hierarchy index
CREATE INDEX idx_hazard_categories_parent ON hazard_categories(parent_id);
CREATE INDEX idx_hazard_categories_path ON hazard_categories(path);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_templates ENABLE ROW LEVEL SECURITY;

-- Basic policies (will be refined in future iterations)

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data  
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Public read access to approved hazards
CREATE POLICY "Public read approved hazards" ON hazards
    FOR SELECT USING (status = 'approved');

-- Authenticated users can create hazards
CREATE POLICY "Authenticated users can create hazards" ON hazards
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own hazards
CREATE POLICY "Users can update own hazards" ON hazards
    FOR UPDATE USING (auth.uid() = user_id);

-- Public read access to approved images
CREATE POLICY "Public read approved images" ON hazard_images
    FOR SELECT USING (moderation_status = 'approved');

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload images" ON hazard_images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hazards_updated_at BEFORE UPDATE ON hazards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hazard_templates_updated_at BEFORE UPDATE ON hazard_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate geo_cell from coordinates
CREATE OR REPLACE FUNCTION calculate_geo_cell(lat DECIMAL, lng DECIMAL)
RETURNS VARCHAR(50) AS $$
BEGIN
    -- Simple geo-cell calculation (can be refined)
    RETURN CONCAT(
        'cell_',
        FLOOR(lat * 10)::TEXT, '_',
        FLOOR(lng * 10)::TEXT
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate geohash (simplified version)
CREATE OR REPLACE FUNCTION calculate_geohash(lat DECIMAL, lng DECIMAL)
RETURNS VARCHAR(20) AS $$
BEGIN
    -- Simplified geohash calculation
    -- In production, use a proper geohash library
    RETURN SUBSTR(MD5(CONCAT(lat::TEXT, lng::TEXT)), 1, 12);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate geo_cell and geohash
CREATE OR REPLACE FUNCTION set_hazard_location_data()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geo_cell = calculate_geo_cell(NEW.latitude, NEW.longitude);
    NEW.geohash = calculate_geohash(NEW.latitude, NEW.longitude);
    
    -- Set region based on coordinates (Boston area detection)
    IF NEW.latitude BETWEEN 42.2 AND 42.5 AND NEW.longitude BETWEEN -71.3 AND -70.8 THEN
        NEW.region_id = 'us_northeast_boston';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_hazard_location_trigger 
    BEFORE INSERT OR UPDATE ON hazards
    FOR EACH ROW EXECUTE FUNCTION set_hazard_location_data();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating user profiles
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert some common hazard templates for Boston area
WITH poison_category AS (
    SELECT id FROM hazard_categories WHERE path = 'plants/poisonous'
),
stinging_category AS (
    SELECT id FROM hazard_categories WHERE path = 'insects/stinging'
),
terrain_category AS (
    SELECT id FROM hazard_categories WHERE path = 'terrain/unstable'
)

INSERT INTO hazard_templates (category_id, name, scientific_name, needs_cms_content, status) 
SELECT pc.id, 'Poison Ivy', 'Toxicodendron radicans', true, 'needs_review'::template_status FROM poison_category pc
UNION ALL
SELECT sc.id, 'Yellow Jacket', 'Vespula species', true, 'needs_review'::template_status FROM stinging_category sc
UNION ALL
SELECT tc.id, 'Loose Rock/Scree', NULL, true, 'needs_review'::template_status FROM terrain_category tc;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
