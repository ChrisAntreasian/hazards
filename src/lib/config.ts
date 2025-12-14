import type { GeoBounds, GeoPoint } from './types/database.js';

export const APP_CONFIG = {
  name: 'Hazards App',
  version: '0.1.0',
  environment: 'development'
} as const;

export const BOSTON_REGION = {
  id: 'us_northeast_boston',
  name: "Greater Boston Area",
  center: { lat: 42.3601, lng: -71.0589 } satisfies GeoPoint,
  bounds: {
    north: 42.5,
    south: 42.2,
    east: -70.8,
    west: -71.3
  } satisfies GeoBounds,
  defaultZoom: 13,
  timezone: 'America/New_York'
} as const;

export const PERFORMANCE_CONFIG = {
  images: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.75,
    thumbnailSize: 200,
    minDimension: 640,
    maxFileSize: 2 * 1024 * 1024 // 2MB
  },
  maps: {
    initialZoom: 13,
    maxHazardsPerView: 200,      // Increased from 50, capped for performance
    clusteringThreshold: 8,      // Lowered from 10 - cluster earlier
    preloadRadius: 3000,         // Increased from 2000 meters
    // Viewport-based loading
    viewportBuffer: 0.2,         // Load 20% beyond visible area
    debounceMs: 150,             // Debounce map move events
    // Cluster visual settings
    clusterRadius: 80,           // Pixels for clustering
    disableClusteringAtZoom: 17  // Show individual markers when zoomed in
  },
  caching: {
    staticContent: '1y',
    hazardData: '1h',
    images: '30d'
  }
} as const;

export const MODERATION_CONFIG = {
  mode: 'manual' as const, // Start with manual, evolve to hybrid
  auto_approve_threshold: 500, // High trust score bar initially
  require_manual_review: {
    new_hazard_types: true,
    high_severity_reports: true,
    flagged_content: true
  },
  queue_limits: {
    max_pending_items: 50, // Manageable for manual review
    priority_review_hours: 24
  }
} as const;
