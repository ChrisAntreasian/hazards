-- =====================================================
-- ZOOM LEVEL MIGRATION - RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- This adds zoom tracking to hazards and creates the create_hazard function
-- Copy and paste this entire file into your Supabase SQL Editor and click RUN

-- Step 1: Add zoom column to hazards table
ALTER TABLE public.hazards 
ADD COLUMN IF NOT EXISTS zoom INTEGER DEFAULT 13 CHECK (zoom BETWEEN 1 AND 18);

-- Step 2: Add category_id column if it doesn't exist
ALTER TABLE public.hazards 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES hazard_categories(id);

-- Step 3: Add comments
COMMENT ON COLUMN public.hazards.zoom IS 'Map zoom level at which the hazard was reported (1-18)';
COMMENT ON COLUMN public.hazards.category_id IS 'Direct reference to hazard category';

-- Step 4: Update existing hazards
UPDATE public.hazards SET zoom = 13 WHERE zoom IS NULL;

-- Step 5: Create the create_hazard function
CREATE OR REPLACE FUNCTION public.create_hazard(
    p_title VARCHAR,
    p_description TEXT,
    p_category_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_severity_level INTEGER,
    p_reported_active_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_is_seasonal BOOLEAN DEFAULT FALSE,
    p_area JSONB DEFAULT NULL,
    p_zoom INTEGER DEFAULT 13
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_hazard_id UUID;
    v_geohash VARCHAR(20);
    v_geo_cell VARCHAR(50);
BEGIN
    -- Get the current user ID from auth context
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', 'User not authenticated',
            'error_code', 'AUTH_REQUIRED'
        );
    END IF;

    -- Generate geohash for the location (using first 12 characters for precision)
    v_geohash := ST_GeoHash(ST_Point(p_longitude, p_latitude), 12);
    
    -- Generate geo cell (simplified - using geohash prefix)
    v_geo_cell := substring(v_geohash from 1 for 4);

    -- Insert the hazard
    INSERT INTO public.hazards (
        user_id,
        title,
        description,
        category_id,
        severity_level,
        latitude,
        longitude,
        geohash,
        geo_cell,
        reported_active_date,
        is_seasonal,
        area,
        zoom,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_title,
        p_description,
        p_category_id,
        p_severity_level,
        p_latitude,
        p_longitude,
        v_geohash,
        v_geo_cell,
        p_reported_active_date,
        p_is_seasonal,
        p_area,
        p_zoom,
        'pending',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_hazard_id;

    -- Increment user's contribution count
    UPDATE public.users
    SET total_contributions = total_contributions + 1,
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'hazard_id', v_hazard_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;

-- Verification queries (optional - check these to confirm it worked)
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'hazards' AND column_name = 'zoom';

-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' AND routine_name = 'create_hazard';

