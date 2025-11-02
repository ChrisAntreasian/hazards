/**
 * Centralized tile layer configurations for the map system
 */

import type { TileLayerConfig } from "./types";

/**
 * Available tile layer configurations
 */
export const TILE_LAYERS: Record<string, TileLayerConfig> = {
  satellite: {
    id: "satellite",
    name: "Earth View",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "© Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 19,
  },
  street: {
    id: "street",
    name: "Street View",
    icon: "🚗",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  terrain: {
    id: "terrain",
    name: "Terrain View",
    icon: "⛰️",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap contributors",
    maxZoom: 19,
  },
};

/**
 * Default tile layer ID
 */
export const DEFAULT_LAYER_ID = "satellite";

/**
 * Get tile layer configuration by ID
 */
export function getTileLayer(id: string): TileLayerConfig | undefined {
  return TILE_LAYERS[id];
}

/**
 * Get all available tile layers as an array
 */
export function getAllTileLayers(): TileLayerConfig[] {
  return Object.values(TILE_LAYERS);
}

/**
 * Get default tile layer configuration
 */
export function getDefaultTileLayer(): TileLayerConfig {
  return TILE_LAYERS[DEFAULT_LAYER_ID];
}
