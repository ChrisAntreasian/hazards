/**
 * Unified map component system
 * Export all components, types, and utilities
 */

// Core component
export { default as BaseMap } from "./BaseMap.svelte";

// Plugin components
export { default as MapMarkers } from "./MapMarkers.svelte";

// Context
export { setMapContext, getMapContext, tryGetMapContext } from "./context";

// Tile layer configurations
export {
  TILE_LAYERS,
  DEFAULT_LAYER_ID,
  getTileLayer,
  getAllTileLayers,
  getDefaultTileLayer,
} from "./layers";

// Utilities
export {
  formatCoordinates,
  calculateDistance,
  getCurrentLocation,
  geocodeAddress,
  isValidPolygon,
  createDivIcon,
  waitFor,
} from "./utils";

// Types
export type {
  TileLayerConfig,
  MapOptions,
  BaseMapProps,
  MapContext,
  MarkerData,
  MapMarkersProps,
  DrawMode,
  MapDrawingProps,
  LocationMode,
  Location,
  MapLocationPickerProps,
  MapControlsProps,
  GeocodingResult,
} from "./types";
