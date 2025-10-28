/**
 * @fileoverview Utility functions for saving and loading hazard location and area data
 * Provides type-safe functions for persisting MapLocationPicker data to Supabase
 * 
 * @module HazardLocationUtils
 * @author HazardTracker Development Team
 * @version 1.0.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { logger } from '$lib/utils/logger';

export interface HazardLocationData {
  latitude: number;
  longitude: number;
  area?: GeoJSON.Polygon | null;
}

export interface CreateHazardWithLocationParams {
  title: string;
  description: string;
  category_id: string;
  severity_level: 1 | 2 | 3 | 4 | 5;
  location: HazardLocationData;
  reported_active_date?: string | null;
  is_seasonal?: boolean;
}

export interface UpdateHazardLocationParams {
  hazard_id: string;
  location: HazardLocationData;
}

/**
 * Creates a new hazard with location and optional area data
 */
export async function createHazardWithLocation(
  supabase: SupabaseClient<Database>,
  params: CreateHazardWithLocationParams
): Promise<{ success: boolean; hazard_id?: string; error?: string }> {
  try {
    const { data: result, error } = await supabase.rpc('create_hazard', {
      p_title: params.title,
      p_description: params.description,
      p_category_id: params.category_id,
      p_latitude: params.location.latitude,
      p_longitude: params.location.longitude,
      p_severity_level: params.severity_level,
      p_reported_active_date: params.reported_active_date || null,
      p_is_seasonal: params.is_seasonal || false,
      p_area: params.location.area || null
    });

    if (error) {
      logger.dbError('create hazard with location', new Error(error.message));
      return { success: false, error: error.message };
    }

    if (!result?.success) {
      const errorMessage = result?.error_message || 'Failed to create hazard';
      logger.dbError('create hazard with location', new Error(errorMessage));
      return { success: false, error: errorMessage };
    }

    return { success: true, hazard_id: result.hazard_id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    logger.error('Failed to create hazard with location', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates the location and area data for an existing hazard
 */
export async function updateHazardLocation(
  supabase: SupabaseClient<Database>,
  params: UpdateHazardLocationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('hazards')
      .update({
        latitude: params.location.latitude,
        longitude: params.location.longitude,
        area: params.location.area || null
      })
      .eq('id', params.hazard_id);

    if (error) {
      logger.dbError('update hazard location', new Error(error.message));
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    logger.error('Failed to update hazard location', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: errorMessage };
  }
}

/**
 * Loads location and area data for an existing hazard
 */
export async function loadHazardLocation(
  supabase: SupabaseClient<Database>,
  hazard_id: string
): Promise<{ success: boolean; location?: HazardLocationData; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('hazards')
      .select('latitude, longitude, area')
      .eq('id', hazard_id)
      .single();

    if (error) {
      logger.dbError('load hazard location', new Error(error.message));
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Hazard not found' };
    }

    return {
      success: true,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        area: data.area
      }
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    logger.error('Failed to load hazard location', err instanceof Error ? err : new Error(String(err)));
    return { success: false, error: errorMessage };
  }
}

/**
 * Validates that area data is properly structured GeoJSON
 */
export function validateAreaData(area: any): area is GeoJSON.Polygon {
  if (!area || typeof area !== 'object') return false;
  
  return (
    area.type === 'Polygon' &&
    Array.isArray(area.coordinates) &&
    area.coordinates.length > 0 &&
    Array.isArray(area.coordinates[0]) &&
    area.coordinates[0].length >= 4 // Minimum 4 points for a closed polygon
  );
}

/**
 * Calculates approximate area in square kilometers from GeoJSON polygon
 * Uses simple approximation - for precise calculations, use PostGIS functions
 */
export function calculateApproximateArea(polygon: GeoJSON.Polygon): number {
  if (!polygon.coordinates?.[0]) return 0;
  
  const coords = polygon.coordinates[0];
  if (coords.length < 4) return 0;
  
  // Simple approximation using shoelace formula
  // This is not accurate for large areas due to Earth curvature
  let area = 0;
  const n = coords.length - 1; // Exclude closing point
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  
  area = Math.abs(area) / 2;
  
  // Convert from degrees to approximate km² (very rough)
  // At latitude ~42° (Boston area), 1 degree ≈ 111 km
  const kmPerDegree = 111;
  return area * kmPerDegree * kmPerDegree;
}