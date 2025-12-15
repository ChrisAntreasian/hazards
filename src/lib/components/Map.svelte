<script lang="ts">
  import type { Map as LeafletMap } from "leaflet";
  import {
    BaseMap,
    MapMarkers,
    MapLayerSwitcher,
    MapUserLocation,
  } from "$lib/components/map";
  import {
    filterMarkersInViewport,
    getViewportBounds,
    debounce,
    hasSignificantMovement,
    type ViewportBounds,
  } from "$lib/utils/mapPerformance";
  import { PERFORMANCE_CONFIG } from "$lib/config";

  // Type definitions for hazard data structure
  interface HazardMapData {
    id?: string | number;
    title?: string;
    description?: string;
    latitude?: string | number;
    longitude?: string | number;
    category_name?: string;
    created_at?: string;
  }

  interface Props {
    hazards?: HazardMapData[];
    height?: string;
    center?: [number, number];
    zoom?: number;
    showUserLocation?: boolean;
    showLayerSwitcher?: boolean;
    enableViewportFiltering?: boolean;
    onMapReady?: (mapInstance: LeafletMap) => void;
  }

  let {
    hazards = [],
    height = "400px",
    center = [42.3601, -71.0589], // Default to Boston area
    zoom = 10,
    showUserLocation = true,
    showLayerSwitcher = false,
    enableViewportFiltering = true,
    onMapReady,
  }: Props = $props();

  // Internal map state for viewport filtering
  let mapInstance = $state<LeafletMap | null>(null);
  let currentBounds = $state<ViewportBounds | null>(null);
  let visibleHazards = $state<HazardMapData[]>([]);

  // Config values
  const { viewportBuffer, debounceMs, maxHazardsPerView } = PERFORMANCE_CONFIG.maps;

  // Update visible hazards based on viewport
  function updateVisibleHazards() {
    if (!mapInstance || !enableViewportFiltering) {
      visibleHazards = hazards;
      return;
    }

    const bounds = getViewportBounds(mapInstance);

    // Only update if significant movement
    if (!hasSignificantMovement(currentBounds, bounds, 0.05)) {
      return;
    }

    currentBounds = bounds;
    visibleHazards = filterMarkersInViewport(
      hazards,
      bounds,
      viewportBuffer,
      maxHazardsPerView
    );
  }

  // Debounced update for map move events
  const debouncedUpdate = debounce(updateVisibleHazards, debounceMs);

  // Handle map ready
  function handleMapReady(map: LeafletMap) {
    mapInstance = map;

    // Initial viewport filter
    updateVisibleHazards();

    // Listen for map movement
    map.on("moveend", debouncedUpdate);
    map.on("zoomend", debouncedUpdate);

    // Call parent callback if provided
    if (onMapReady) {
      onMapReady(map);
    }
  }

  // Derived: markers to display
  let displayMarkers = $derived(
    enableViewportFiltering ? visibleHazards : hazards
  );

  // Update when hazards change
  $effect(() => {
    if (hazards && mapInstance) {
      updateVisibleHazards();
    }
  });
</script>

<BaseMap {height} {center} {zoom}>
  <MapUserLocation {showUserLocation} onMapReady={handleMapReady} />
  <MapMarkers markers={displayMarkers} />
  {#if showLayerSwitcher}
    <MapLayerSwitcher />
  {/if}
</BaseMap>

<style>
  :global(.user-location-marker) {
    background: transparent !important;
    border: none !important;
  }
</style>
