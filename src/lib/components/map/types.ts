/**
 * Type definitions for the unified map component system
 */

import type { Map as LeafletMap, TileLayer, LatLngExpression } from "leaflet";

/**
 * Tile layer configuration
 */
export interface TileLayerConfig {
  id: string;
  name: string;
  icon: string;
  url: string;
  attribution: string;
  maxZoom?: number;
  minZoom?: number;
}

/**
 * Map initialization options
 */
export interface MapOptions {
  center?: LatLngExpression;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomControl?: boolean;
  scrollWheelZoom?: boolean;
  dragging?: boolean;
  touchZoom?: boolean;
  doubleClickZoom?: boolean;
  boxZoom?: boolean;
  keyboard?: boolean;
  attributionControl?: boolean;
}

/**
 * BaseMap component props
 */
export interface BaseMapProps {
  // Map positioning
  center?: LatLngExpression;
  zoom?: number;
  height?: string;

  // Tile layers
  defaultLayer?: string;
  availableLayers?: TileLayerConfig[];

  // Behavior
  readonly?: boolean;
  zoomControl?: boolean;
  scrollWheelZoom?: boolean;
  dragging?: boolean;

  // Callbacks
  onReady?: (map: LeafletMap) => void;
  onClick?: (event: any) => void;
  onMoveEnd?: () => void;
  onZoomEnd?: () => void;
}

/**
 * Map context provided to child components
 */
export interface MapContext {
  map: LeafletMap | null;
  leaflet: typeof import("leaflet") | null;
  addCleanup: (cleanup: () => void) => void;
}

/**
 * Marker data for MapMarkers component
 */
export interface MarkerData {
  id?: string | number;
  latitude?: string | number;
  longitude?: string | number;
  category?: string;
  category_name?: string;
  title?: string;
  description?: string;
  created_at?: string;
  [key: string]: any;
}

/**
 * Map markers component props
 */
export interface MapMarkersProps {
  markers: MarkerData[];
  enableClustering?: boolean;
  clusterOptions?: any;
  categoryColors?: Record<string, string>;
  categoryIcons?: Record<string, string>;
  popupTemplate?: (marker: MarkerData) => string;
  onMarkerClick?: (marker: MarkerData) => void;
}

/**
 * Drawing mode for MapDrawing component
 */
export type DrawMode = "view" | "draw" | "edit";

/**
 * Map drawing component props
 */
export interface MapDrawingProps {
  area?: GeoJSON.Polygon | null;
  mode?: DrawMode;
  autoSimplify?: boolean;
  simplifyTolerance?: number;
  maxVertices?: number;
  drawColor?: string;
  fillOpacity?: number;
  onAreaChange?: (area: GeoJSON.Polygon | null) => void;
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

/**
 * Location picker mode
 */
export type LocationMode = "view" | "reposition";

/**
 * Location for MapLocationPicker component
 */
export interface Location {
  lat: number;
  lng: number;
}

/**
 * Map location picker component props
 */
export interface MapLocationPickerProps {
  location: Location;
  mode?: LocationMode;
  draggable?: boolean;
  markerIcon?: any;
  onLocationChange?: (location: Location) => void;
}

/**
 * Map controls component props
 */
export interface MapControlsProps {
  showLayerSwitcher?: boolean;
  showGeolocation?: boolean;
  showSearch?: boolean;
  showZoom?: boolean;
  layers?: TileLayerConfig[];
  defaultLayer?: string;
  searchPlaceholder?: string;
  searchCountry?: string;
  onSearchResult?: (result: GeocodingResult) => void;
}

/**
 * Geocoding result from search
 */
export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  boundingBox?: [number, number, number, number];
}
