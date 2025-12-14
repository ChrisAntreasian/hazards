<script lang="ts">
  import {
    BaseMap,
    MapLocationMarker,
    MapDrawing,
    MapLayerSwitcher,
  } from "$lib/components/map";
  import type { Location } from "$lib/components/map/types";

  interface Props {
    initialLocation: { lat: number; lng: number };
    initialArea?: GeoJSON.Polygon | null;
    height?: string;
    zoom?: number;
    readonly?: boolean;
    onLocationChange?: (location: { lat: number; lng: number }) => void;
    onAreaChange?: (area: GeoJSON.Polygon | null) => void;
    onZoomChange?: (zoom: number) => void;
  }

  let {
    initialLocation,
    initialArea = null,
    height = "600px",
    zoom = 13,
    readonly = false,
    onLocationChange,
    onAreaChange,
    onZoomChange,
  }: Props = $props();

  let mapMode = $state<"view" | "reposition" | "draw">("view");
  let currentLocation = $state<Location>(initialLocation);
  let currentArea = $state<GeoJSON.Polygon | null>(initialArea);
  let showAreaSaved = $state(false);
  let mapLocationMarkerRef = $state<any>(null);
  let mapDrawingRef = $state<any>(null);

  // Store initial center separately so it doesn't react to location changes during repositioning
  let initialCenter = $state<[number, number]>([
    initialLocation.lat,
    initialLocation.lng,
  ]);
  let prevZoom = $state(zoom);

  // Watch for external location changes (only update if it's a significant external change)
  $effect(() => {
    if (
      initialLocation &&
      (initialLocation.lat !== currentLocation.lat ||
        initialLocation.lng !== currentLocation.lng)
    ) {
      // Only update if this appears to be an external change (not from user interaction)
      // Check if the marker ref doesn't exist yet or if the change is significant
      const isSignificantChange =
        Math.abs(initialLocation.lat - currentLocation.lat) > 0.001 ||
        Math.abs(initialLocation.lng - currentLocation.lng) > 0.001;

      if (isSignificantChange) {
        currentLocation = initialLocation;
        initialCenter = [initialLocation.lat, initialLocation.lng];

        if (mapLocationMarkerRef) {
          mapLocationMarkerRef.setLocation(initialLocation);
          // Check if zoom changed - if so, use the new zoom
          if (zoom !== prevZoom) {
            mapLocationMarkerRef.panToMarkerWithZoom(zoom);
            prevZoom = zoom;
          } else {
            mapLocationMarkerRef.panToMarker();
          }
        }
      }
    }
  });

  // Watch for external area changes
  $effect(() => {
    if (initialArea !== currentArea) {
      currentArea = initialArea;
    }
  });

  // Handle mode changes
  function setMode(mode: "view" | "reposition" | "draw") {
    mapMode = mode;

    // MapLocationMarker automatically reacts to repositionMode prop change
    // MapDrawing automatically reacts to enabled prop change
  }

  // Handle location change from MapLocationMarker
  function handleLocationChange(location: Location) {
    currentLocation = location;
    if (onLocationChange) {
      onLocationChange(location);
    }
  }

  // Handle area change from MapDrawing
  function handleAreaChange(area: GeoJSON.Polygon | null) {
    currentArea = area;
    if (onAreaChange) {
      onAreaChange(area);
    }

    // Show confirmation message
    if (area) {
      showAreaSaved = true;
      setTimeout(() => {
        showAreaSaved = false;
      }, 3000);
    }
  }

  // Handle zoom change from BaseMap
  function handleZoomChange(event: any) {
    const newZoom = event.target.getZoom();
    console.log(
      "MapLocationPicker: Zoom changed to",
      newZoom,
      "readonly:",
      readonly
    );
    if (onZoomChange) {
      onZoomChange(newZoom);
    }
  }

  // Clear area
  function clearArea() {
    if (mapDrawingRef) {
      mapDrawingRef.clearArea();
    }
    currentArea = null;
    if (onAreaChange) {
      onAreaChange(null);
    }
  }
</script>

<div class="map-location-picker">
  {#if !readonly}
    <div class="mode-controls">
      <button
        class="mode-btn"
        class:active={mapMode === "view"}
        onclick={() => setMode("view")}
        type="button"
      >
        👁️ View
      </button>
      <button
        class="mode-btn"
        class:active={mapMode === "reposition"}
        onclick={() => setMode("reposition")}
        type="button"
      >
        📍 Reposition Marker
      </button>
      <button
        class="mode-btn"
        class:active={mapMode === "draw"}
        onclick={() => setMode("draw")}
        type="button"
      >
        ✏️ Draw Area
      </button>
    </div>
  {/if}

  <BaseMap
    {height}
    center={initialCenter}
    {zoom}
    {readonly}
    dragging={!readonly}
    zoomControl={!readonly}
    onZoomEnd={handleZoomChange}
  >
    <MapLocationMarker
      bind:this={mapLocationMarkerRef}
      initialLocation={currentLocation}
      enabled={true}
      draggable={!readonly}
      repositionMode={mapMode === "reposition"}
      onLocationChange={handleLocationChange}
    />

    <MapDrawing
      bind:this={mapDrawingRef}
      initialArea={currentArea}
      enabled={!readonly && mapMode === "draw"}
      {readonly}
      autoSimplify={true}
      autoFitBounds={false}
      onAreaChange={handleAreaChange}
    />

    {#if !readonly}
      <MapLayerSwitcher />
    {/if}
  </BaseMap>

  {#if !readonly && currentArea}
    <div class="area-info">
      <div class="area-stats">
        <span class="stat-label">Area defined</span>
        {#if currentArea.coordinates && currentArea.coordinates[0]}
          <span class="stat-value">
            {currentArea.coordinates[0].length - 1} vertices
          </span>
        {/if}
      </div>
      <button class="btn-clear" onclick={clearArea} type="button">
        🗑️ Clear Area
      </button>
    </div>
  {/if}

  {#if showAreaSaved}
    <div class="save-notification">✅ Area saved successfully!</div>
  {/if}
</div>

<style>
  .map-location-picker {
    position: relative;
    width: 100%;
  }

  .mode-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .mode-btn {
    padding: 0.75rem 1.5rem;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mode-btn:hover {
    border-color: #1976d2;
    background: #f5f9ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
  }

  .mode-btn.active {
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    border-color: #1976d2;
    color: white;
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
  }

  .area-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    padding: 1rem;
    background: #f5f9ff;
    border-radius: 8px;
    border: 1px solid #e3f2fd;
  }

  .area-stats {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.85rem;
    color: #666;
    font-weight: 500;
  }

  .stat-value {
    font-size: 1.1rem;
    color: #1976d2;
    font-weight: 600;
  }

  .btn-clear {
    padding: 0.5rem 1rem;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-clear:hover {
    background: #d32f2f;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
  }

  .save-notification {
    position: absolute;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #4caf50;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    font-weight: 500;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @media (max-width: 768px) {
    .mode-controls {
      flex-direction: column;
    }

    .mode-btn {
      width: 100%;
      justify-content: center;
    }

    .area-info {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .btn-clear {
      width: 100%;
      justify-content: center;
    }
  }
</style>
