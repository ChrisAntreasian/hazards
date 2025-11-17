-- Add zoom column to hazards table to save map zoom level
ALTER TABLE public.hazards 
ADD COLUMN IF NOT EXISTS zoom INTEGER DEFAULT 13 CHECK (zoom BETWEEN 1 AND 18);

-- Add category_id column if it doesn't exist (for direct category reference)
ALTER TABLE public.hazards 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES hazard_categories(id);

-- Add comment to explain the columns
COMMENT ON COLUMN public.hazards.zoom IS 'Map zoom level at which the hazard was reported (1-18)';
COMMENT ON COLUMN public.hazards.category_id IS 'Direct reference to hazard category';

-- Update existing hazards to have a default zoom level
UPDATE public.hazards SET zoom = 13 WHERE zoom IS NULL;

-- Create or replace the create_hazard function to include zoom parameter
CREATE OR REPLACE FUNCTION create_hazard(
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
