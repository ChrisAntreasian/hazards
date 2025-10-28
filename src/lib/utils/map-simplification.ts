/**
 * Map simplification utilities for polygon drawing
 * Implements Douglas-Peucker algorithm for cost-efficient area storage
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface SimplificationConfig {
  small: { maxArea: number; maxVertices: number; tolerance: number };
  medium: { maxArea: number; maxVertices: number; tolerance: number };
  large: { maxVertices: number; tolerance: number };
}

export const DEFAULT_SIMPLIFICATION_CONFIG: SimplificationConfig = {
  small: { maxArea: 0.1, maxVertices: 8, tolerance: 0.0001 },
  medium: { maxArea: 1.0, maxVertices: 12, tolerance: 0.0005 },
  large: { maxVertices: 15, tolerance: 0.001 }
};

/**
 * Calculate the area of a polygon in square kilometers
 * Uses the Shoelace formula for polygon area calculation
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const earthRadius = 6371; // Earth's radius in kilometers

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    
    const lat1 = points[i].lat * Math.PI / 180;
    const lat2 = points[j].lat * Math.PI / 180;
    const lng1 = points[i].lng * Math.PI / 180;
    const lng2 = points[j].lng * Math.PI / 180;
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area) * earthRadius * earthRadius / 2;
  return area;
}

/**
 * Calculate perpendicular distance from point to line segment
 * Used in Douglas-Peucker algorithm
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  
  if (dx === 0 && dy === 0) {
    // Line start and end are the same point
    return Math.sqrt(
      Math.pow(point.lng - lineStart.lng, 2) + 
      Math.pow(point.lat - lineStart.lat, 2)
    );
  }
  
  const t = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (dx * dx + dy * dy);
  
  let projection: Point;
  if (t < 0) {
    projection = lineStart;
  } else if (t > 1) {
    projection = lineEnd;
  } else {
    projection = {
      lng: lineStart.lng + t * dx,
      lat: lineStart.lat + t * dy
    };
  }
  
  return Math.sqrt(
    Math.pow(point.lng - projection.lng, 2) + 
    Math.pow(point.lat - projection.lat, 2)
  );
}

/**
 * Douglas-Peucker algorithm for polygon simplification
 * Reduces the number of vertices while preserving shape
 */
export function simplifyPolygon(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  function douglasPeucker(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance from the line
    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = perpendicularDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftPoints = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const rightPoints = douglasPeucker(points.slice(maxIndex), tolerance);
      
      // Combine results, removing duplicate point at junction
      return [...leftPoints.slice(0, -1), ...rightPoints];
    }

    // If no point exceeds tolerance, return just start and end
    return [start, end];
  }

  // For closed polygons, we need special handling
  const simplified = douglasPeucker(points, tolerance);
  
  // Ensure polygon is closed
  if (simplified.length > 0 && 
      (simplified[0].lat !== simplified[simplified.length - 1].lat || 
       simplified[0].lng !== simplified[simplified.length - 1].lng)) {
    simplified.push(simplified[0]);
  }

  return simplified;
}

/**
 * Get appropriate simplification settings based on polygon area
 */
export function getSimplificationSettings(
  area: number, 
  config: SimplificationConfig = DEFAULT_SIMPLIFICATION_CONFIG
): { maxVertices: number; tolerance: number } {
  if (area <= config.small.maxArea) {
    return { maxVertices: config.small.maxVertices, tolerance: config.small.tolerance };
  } else if (area <= config.medium.maxArea) {
    return { maxVertices: config.medium.maxVertices, tolerance: config.medium.tolerance };
  } else {
    return { maxVertices: config.large.maxVertices, tolerance: config.large.tolerance };
  }
}

/**
 * Automatically simplify polygon based on area and vertex count
 * This is the main function to be used by the map component
 */
export function autoSimplifyPolygon(
  points: Point[], 
  config: SimplificationConfig = DEFAULT_SIMPLIFICATION_CONFIG
): { simplified: Point[]; area: number; originalVertices: number; finalVertices: number } {
  const originalVertices = points.length;
  const area = calculatePolygonArea(points);
  const settings = getSimplificationSettings(area, config);
  
  let simplified = points;
  let tolerance = settings.tolerance;

  // Iteratively increase tolerance until we're within vertex limits
  while (simplified.length > settings.maxVertices && tolerance < 0.01) {
    simplified = simplifyPolygon(points, tolerance);
    tolerance *= 1.5; // Increase tolerance gradually
  }

  // If still too many vertices, use a more aggressive approach
  if (simplified.length > settings.maxVertices) {
    // Keep every nth point to force vertex limit
    const step = Math.ceil(simplified.length / settings.maxVertices);
    const forcedSimplified: Point[] = [];
    
    for (let i = 0; i < simplified.length; i += step) {
      forcedSimplified.push(simplified[i]);
    }
    
    // Ensure polygon is closed
    if (forcedSimplified.length > 0 && 
        (forcedSimplified[0].lat !== forcedSimplified[forcedSimplified.length - 1].lat || 
         forcedSimplified[0].lng !== forcedSimplified[forcedSimplified.length - 1].lng)) {
      forcedSimplified.push(forcedSimplified[0]);
    }
    
    simplified = forcedSimplified;
  }

  return {
    simplified,
    area,
    originalVertices,
    finalVertices: simplified.length
  };
}

/**
 * Convert polygon points to GeoJSON format for database storage
 */
export function pointsToGeoJSON(points: Point[]): GeoJSON.Polygon {
  const coordinates = points.map(p => [p.lng, p.lat]);
  
  // Ensure polygon is closed
  if (coordinates.length > 0 && 
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
       coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
    coordinates.push(coordinates[0]);
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates]
  };
}

/**
 * Convert GeoJSON polygon to points array
 */
export function geoJSONToPoints(geoJSON: GeoJSON.Polygon): Point[] {
  if (!geoJSON.coordinates || !geoJSON.coordinates[0]) {
    return [];
  }

  return geoJSON.coordinates[0].map(coord => ({
    lng: coord[0],
    lat: coord[1]
  }));
}