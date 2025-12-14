<script lang="ts">
  import { onMount } from "svelte";
  import { setMapContext } from "./context";
  import { getDefaultTileLayer, getTileLayer } from "./layers";
  import { logger } from "$lib/utils/logger";
  import type { Map as LeafletMap, TileLayer } from "leaflet";
  import type { BaseMapProps, MapContext, TileLayerConfig } from "./types";

  interface Props extends BaseMapProps {
    children?: any;
  }

  let {
    // Map positioning
    center = [42.3601, -71.0589], // Default to Boston
    zoom = 10,
    height = "400px",

    // Tile layers
    defaultLayer = "satellite",
    availableLayers,

    // Behavior
    readonly = false,
    zoomControl = true,
    scrollWheelZoom = true,
    dragging = true,

    // Callbacks
    onReady,
    onClick,
    onMoveEnd,
    onZoomEnd,

    // Slots
    children,
  }: Props = $props();

  // Component state
  let mapElement: HTMLDivElement;
  let map = $state<LeafletMap | null>(null);
  let L = $state<typeof import("leaflet") | null>(null);
  let currentTileLayer = $state<TileLayer | null>(null);
  let currentLayerId = $state(defaultLayer);
  let cleanupFunctions: (() => void)[] = [];

  // Create map context immediately (before onMount)
  // The map and leaflet values will be null initially, then populated in onMount
  const context: MapContext = {
    get map() {
      return map;
    },
    get leaflet() {
      return L;
    },
    addCleanup: (cleanup: () => void) => {
      cleanupFunctions.push(cleanup);
    },
  };

  // Set context during component initialization (not in onMount)
  setMapContext(context);

  /**
   * Initialize the map
   */
  onMount(() => {
    // Async initialization
    (async () => {
      try {
        // Dynamic import of Leaflet to avoid SSR issues
        L = await import("leaflet");

        // Load Leaflet CSS
        if (typeof window !== "undefined") {
          const leafletLink = document.createElement("link");
          leafletLink.rel = "stylesheet";
          leafletLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(leafletLink);
        }

        // Configure map options based on readonly mode
        const mapOptions: any = {
          zoomControl: readonly ? false : zoomControl,
          scrollWheelZoom: readonly ? false : scrollWheelZoom,
          dragging: readonly ? false : dragging,
        };

        // If readonly, disable all interactions
        if (readonly) {
          mapOptions.touchZoom = false;
          mapOptions.doubleClickZoom = false;
          mapOptions.boxZoom = false;
          mapOptions.keyboard = false;
          mapOptions.attributionControl = false;
        }

        // Initialize map
        map = L.map(mapElement, mapOptions).setView(center, zoom);

        // Add initial tile layer
        const layerConfig =
          getTileLayer(currentLayerId) || getDefaultTileLayer();
        currentTileLayer = L.tileLayer(layerConfig.url, {
          attribution: layerConfig.attribution,
          maxZoom: layerConfig.maxZoom || 19,
        }).addTo(map);

        // Set up event handlers
        if (onClick) {
          map.on("click", onClick);
        }
        if (onMoveEnd) {
          map.on("moveend", onMoveEnd);
        }
        if (onZoomEnd) {
          map.on("zoomend", onZoomEnd);
        }

        // Call onReady callback
        if (onReady && map) {
          onReady(map);
        }

        logger.debug("BaseMap: Map initialized successfully", {
          component: "BaseMap",
          metadata: { center, zoom, readonly },
        });
      } catch (error) {
        logger.error(
          "BaseMap: Failed to initialize map",
          error instanceof Error ? error : new Error(String(error))
        );
      }
    })();

    // Cleanup on unmount (synchronous)
    return () => {
      // Run plugin cleanup functions
      cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          logger.warn("BaseMap: Cleanup function failed", {
            component: "BaseMap",
            metadata: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      });

      // Remove map
      if (map) {
        map.remove();
        map = null;
      }
    };
  });

  /**
   * Switch to a different tile layer
   */
  export function switchLayer(layerId: string): void {
    if (!map || !L) {
      logger.warn("BaseMap: Cannot switch layer, map not initialized", {
        component: "BaseMap",
      });
      return;
    }

    const layerConfig = getTileLayer(layerId);
    if (!layerConfig) {
      logger.warn("BaseMap: Unknown layer ID", {
        component: "BaseMap",
        metadata: { layerId },
      });
      return;
    }

    // Remove current tile layer
    if (currentTileLayer) {
      map.removeLayer(currentTileLayer);
    }

    // Add new tile layer
    currentTileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom || 19,
    }).addTo(map);

    currentLayerId = layerId;

    logger.debug("BaseMap: Switched tile layer", {
      component: "BaseMap",
      metadata: { layerId, layerName: layerConfig.name },
    });
  }

  /**
   * Get the current map instance
   */
  export function getMap(): LeafletMap | null {
    return map;
  }

  /**
   * Get the Leaflet library
   */
  export function getLeaflet(): typeof import("leaflet") | null {
    return L;
  }

  /**
   * Pan to a location
   */
  export function panTo(latlng: [number, number], options?: any): void {
    if (map) {
      map.panTo(latlng, options);
    }
  }

  /**
   * Set map view (center and zoom)
   */
  export function setView(
    latlng: [number, number],
    zoom: number,
    options?: any
  ): void {
    if (map) {
      map.setView(latlng, zoom, options);
    }
  }

  /**
   * Fit map to bounds
   */
  export function fitBounds(bounds: any, options?: any): void {
    if (map) {
      map.fitBounds(bounds, options);
    }
  }

  // Update map view when center or zoom props change
  $effect(() => {
    if (map) {
      map.setView(center, zoom);
    }
  });
</script>

<div
  bind:this={mapElement}
  style="height: {height}; width: 100%;"
  class="base-map-container"
>
  <!-- Map will be rendered here -->
</div>

{#if map && L}
  <!-- Render child components (plugins) -->
  {@render children?.()}
{/if}

<style>
  .base-map-container {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Ensure Leaflet controls are visible */
  :global(.base-map-container .leaflet-control) {
    z-index: 800;
  }

  /* Leaflet popup styling */
  :global(.base-map-container .leaflet-popup-content-wrapper) {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :global(.base-map-container .leaflet-popup-tip) {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  :global(.base-map-container .leaflet-popup-content) {
    margin: 14px 16px;
  }
</style>
