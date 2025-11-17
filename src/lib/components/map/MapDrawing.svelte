<script lang="ts">
  import { onMount } from "svelte";
  import { getMapContext } from "./context";
  import {
    autoSimplifyPolygon,
    type Point,
  } from "$lib/utils/map-simplification";
  import { logger } from "$lib/utils/logger";

  interface Props {
    initialArea?: GeoJSON.Polygon | null;
    enabled?: boolean;
    readonly?: boolean;
    autoSimplify?: boolean;
    autoFitBounds?: boolean; // Whether to automatically fit map to area bounds
    onAreaChange?: (area: GeoJSON.Polygon | null) => void;
    onAreaStats?: (
      stats: { vertices: number; originalVertices?: number } | null
    ) => void;
  }

  let {
    initialArea = null,
    enabled = true,
    readonly = false,
    autoSimplify = true,
    autoFitBounds = !readonly, // Default: fit bounds only when not readonly
    onAreaChange,
    onAreaStats,
  }: Props = $props();

  // Get map context - keep the object to maintain getter reactivity
  const context = getMapContext();
  const { addCleanup } = context;

  // Access map and L through derived values to maintain reactivity
  let map = $derived(context.map);
  let L = $derived(context.leaflet);

  // State
  let drawnItems: any = null;
  let currentArea = $state<GeoJSON.Polygon | null>(initialArea);
  let drawControl: any = null;
  let isDrawing = $state(false);

  /**
   * Load leaflet-draw library
   */
  async function loadLeafletDraw() {
    if (!L) {
      logger.warn("MapDrawing: Cannot load leaflet-draw, L is not available", {
        component: "MapDrawing",
      });
      return false;
    }

    try {
      // Check if already loaded
      if ((L as any).Draw) {
        logger.debug("MapDrawing: leaflet-draw already loaded", {
          component: "MapDrawing",
        });
        return true;
      }

      // Load leaflet-draw CSS
      const drawCss = document.createElement("link");
      drawCss.rel = "stylesheet";
      drawCss.href =
        "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css";
      document.head.appendChild(drawCss);

      // Make Leaflet globally available for leaflet-draw
      // leaflet-draw is a UMD module that expects window.L to exist
      if (typeof window !== "undefined" && !(window as any).L) {
        (window as any).L = L;
        console.log("MapDrawing: Set window.L", !!L, !!L.Draw);
      }

      // Load leaflet-draw JS - it will extend the global L object
      // Try npm package first, fallback to CDN if it fails
      try {
        // @ts-ignore - Dynamic import of UMD module that extends global L
        await import("leaflet-draw/dist/leaflet.draw.js");
        console.log(
          "MapDrawing: leaflet-draw imported from npm, checking for Draw...",
          !!(L as any).Draw,
          !!(window as any).L?.Draw
        );
      } catch (err) {
        console.warn("MapDrawing: npm import failed, trying CDN fallback", err);
        // Fallback to CDN
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js";
        document.head.appendChild(script);

        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        console.log(
          "MapDrawing: leaflet-draw loaded from CDN, checking for Draw...",
          !!(L as any).Draw,
          !!(window as any).L?.Draw
        );
      }

      // Longer delay to ensure the module has fully initialized
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify it loaded correctly by checking both our L and window.L
      const hasDrawPlugin = !!(L as any).Draw || !!(window as any).L?.Draw;
      console.log("MapDrawing: After delay, hasDrawPlugin:", hasDrawPlugin);

      logger.debug("MapDrawing: leaflet-draw load attempt completed", {
        component: "MapDrawing",
        metadata: {
          success: hasDrawPlugin,
          hasLocalDraw: !!(L as any).Draw,
          hasWindowDraw: !!(window as any).L?.Draw,
        },
      });

      return hasDrawPlugin;
    } catch (error) {
      logger.error(
        "MapDrawing: Failed to load leaflet-draw",
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Initialize drawing functionality
   */
  async function initializeDrawing() {
    if (!map || !L) {
      logger.warn("MapDrawing: Cannot initialize, map or L not available", {
        component: "MapDrawing",
        metadata: { hasMap: !!map, hasL: !!L },
      });
      return;
    }

    // Only load leaflet-draw if not in readonly mode
    if (!readonly) {
      const loadSuccess = await loadLeafletDraw();

      // Check if Draw is available on either L or window.L
      const LDraw = (L as any).Draw || (window as any).L?.Draw;

      if (!loadSuccess || !LDraw) {
        logger.error(
          "MapDrawing: leaflet-draw not available after load attempt",
          new Error("Missing leaflet-draw")
        );
        return;
      }

      // Use window.L if local L doesn't have Draw
      if (!(L as any).Draw && (window as any).L?.Draw) {
        console.log("MapDrawing: Using window.L for Draw plugin");
        (L as any).Draw = (window as any).L.Draw;
      }
    }

    // Create feature group for drawn items
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Set up drawing event handlers only if not readonly
    if (!readonly && (L as any).Draw && (L as any).Draw.Event) {
      map.on((L as any).Draw.Event.CREATED, handleDrawCreated);
      map.on((L as any).Draw.Event.EDITED, handleDrawEdited);
      map.on((L as any).Draw.Event.DELETED, handleDrawDeleted);
    }

    // Render initial area if provided (with a delay to ensure map is ready)
    if (currentArea) {
      // Use a longer delay for initial render to ensure map tiles have loaded
      setTimeout(() => {
        if (currentArea) {
          console.log("MapDrawing: Rendering initial area", currentArea);
          renderArea(currentArea);
        } else {
          console.log("MapDrawing: No initial area to render");
        }
      }, 200);
    }

    logger.debug("MapDrawing: Drawing initialized", {
      component: "MapDrawing",
      metadata: { readonly, hasInitialArea: !!currentArea, initialArea },
    });

    // If enabled prop is true when initialization completes, start drawing (only if not readonly)
    if (enabled && !readonly && !isDrawing) {
      startDrawing();
    }
  }

  /**
   * Render a polygon area on the map
   */
  function renderArea(area: GeoJSON.Polygon) {
    if (!map || !L || !drawnItems) return;

    try {
      // Clear existing layers
      drawnItems.clearLayers();

      // Create polygon layer
      const polygon = L.geoJSON(area, {
        style: {
          color: "#3b82f6",
          weight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
        },
      });

      drawnItems.addLayer(polygon);

      // Only auto-fit bounds if explicitly enabled
      // This preserves the user's chosen zoom level
      if (autoFitBounds) {
        const bounds = polygon.getBounds();
        if (bounds.isValid()) {
          // Use setTimeout to ensure the map has finished initializing
          setTimeout(() => {
            if (map) {
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
          }, 100);
        }
      }

      // Update stats
      if (area.coordinates && area.coordinates[0]) {
        const stats = {
          vertices: area.coordinates[0].length - 1,
        };
        if (onAreaStats) {
          onAreaStats(stats);
        }
      }

      logger.debug("MapDrawing: Area rendered", {
        component: "MapDrawing",
        metadata: { vertices: area.coordinates[0]?.length },
      });
    } catch (error) {
      logger.error(
        "MapDrawing: Failed to render area",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Start drawing mode
   */
  export function startDrawing() {
    if (!map || !L || !L.Draw || !drawnItems) {
      logger.warn("MapDrawing: Cannot start drawing - not fully initialized", {
        component: "MapDrawing",
        metadata: {
          hasMap: !!map,
          hasLeaflet: !!L,
          hasLeafletDraw: !!(L && L.Draw),
          hasDrawnItems: !!drawnItems,
        },
      });
      return;
    }

    // Stop any existing drawing first
    if (isDrawing && drawControl) {
      stopDrawing();
    }

    isDrawing = true;

    // Create polygon drawing tool
    const polygonDrawer = new L.Draw.Polygon(map as any, {
      allowIntersection: false,
      drawError: {
        color: "#e1e100",
        message: "<strong>Error:</strong> shape edges cannot cross!",
      },
      shapeOptions: {
        color: "#3b82f6",
        weight: 2,
        fillOpacity: 0.2,
      },
    });

    // Enable drawing
    polygonDrawer.enable();
    drawControl = polygonDrawer;

    logger.debug("MapDrawing: Drawing started", {
      component: "MapDrawing",
    });
  }

  /**
   * Stop drawing mode
   */
  export function stopDrawing() {
    if (drawControl) {
      if (drawControl.disable) {
        drawControl.disable();
      }
      drawControl = null;
    }
    isDrawing = false;

    logger.debug("MapDrawing: Drawing stopped", {
      component: "MapDrawing",
    });
  }

  /**
   * Clear the current area
   */
  export function clearArea() {
    if (drawnItems) {
      drawnItems.clearLayers();
    }
    currentArea = null;

    if (onAreaChange) {
      onAreaChange(null);
    }
    if (onAreaStats) {
      onAreaStats(null);
    }

    logger.debug("MapDrawing: Area cleared", {
      component: "MapDrawing",
    });
  }

  /**
   * Get the current drawn area
   */
  export function getArea(): GeoJSON.Polygon | null {
    return currentArea;
  }

  /**
   * Handle polygon created event
   */
  function handleDrawCreated(e: any) {
    if (!drawnItems) return;

    const layer = e.layer;

    // Clear existing drawn items
    drawnItems.clearLayers();

    // Convert to GeoJSON
    let geoJson = layer.toGeoJSON();
    const geometry = geoJson.geometry;

    if (
      !geometry ||
      !geometry.coordinates ||
      !geometry.coordinates[0] ||
      !Array.isArray(geometry.coordinates[0])
    ) {
      logger.error(
        "MapDrawing: Invalid GeoJSON structure",
        new Error("Invalid geometry")
      );
      return;
    }

    let finalGeoJson: GeoJSON.Polygon;
    let stats: { vertices: number; originalVertices?: number };

    // Apply auto-simplification if enabled
    if (autoSimplify) {
      const coordinates = geometry.coordinates[0];
      const points: Point[] = coordinates.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }));

      const simplificationResult = autoSimplifyPolygon(points);
      const simplifiedPoints = simplificationResult.simplified;

      // Update GeoJSON with simplified coordinates
      const simplifiedCoords = simplifiedPoints.map((p: Point) => [
        p.lng,
        p.lat,
      ]);
      simplifiedCoords.push(simplifiedCoords[0]); // Close the polygon

      finalGeoJson = {
        type: "Polygon",
        coordinates: [simplifiedCoords],
      } as GeoJSON.Polygon;

      stats = {
        vertices: simplifiedPoints.length,
        originalVertices:
          coordinates.length !== simplifiedPoints.length
            ? coordinates.length
            : undefined,
      };

      logger.info("MapDrawing: Area created and simplified", {
        component: "MapDrawing",
        metadata: {
          original: coordinates.length,
          simplified: simplifiedPoints.length,
        },
      });
    } else {
      finalGeoJson = {
        type: "Polygon",
        coordinates: geometry.coordinates,
      } as GeoJSON.Polygon;

      stats = {
        vertices: geometry.coordinates[0].length - 1,
      };

      logger.info("MapDrawing: Area created", {
        component: "MapDrawing",
        metadata: { vertices: stats.vertices },
      });
    }

    currentArea = finalGeoJson;

    // Create permanent polygon layer
    const permanentPolygon = L!.geoJSON(finalGeoJson, {
      style: {
        color: "#3b82f6",
        weight: 3,
        fillOpacity: 0.3,
        fillColor: "#3b82f6",
      },
    });

    drawnItems.addLayer(permanentPolygon);

    // Stop drawing mode
    stopDrawing();

    // Notify callbacks
    if (onAreaChange) {
      onAreaChange(finalGeoJson);
    }
    if (onAreaStats) {
      onAreaStats(stats);
    }
  }

  /**
   * Handle polygon edited event
   */
  function handleDrawEdited(e: any) {
    logger.debug("MapDrawing: Polygon edited", {
      component: "MapDrawing",
      metadata: { event: e },
    });
    // Could add edit handling here if needed
  }

  /**
   * Handle polygon deleted event
   */
  function handleDrawDeleted(e: any) {
    logger.debug("MapDrawing: Polygon deleted", {
      component: "MapDrawing",
    });

    clearArea();
  }

  // Track if we've already initialized
  let initialized = $state(false);

  // Initialize when map and L are ready
  $effect(() => {
    if (map && L && !initialized) {
      initialized = true;
      initializeDrawing();
    }
  });

  // Cleanup on unmount
  onMount(() => {
    return () => {
      stopDrawing();
      if (map && drawnItems) {
        map.removeLayer(drawnItems);
      }
    };
  });

  // Start/stop drawing when enabled prop changes
  $effect(() => {
    if (enabled && !readonly && drawnItems && !isDrawing) {
      startDrawing();
    } else if ((!enabled || readonly) && isDrawing) {
      stopDrawing();
    }
  });

  // React to initialArea changes
  $effect(() => {
    // Check if initialArea has changed (comparing by JSON to handle object equality)
    const initialAreaJson = initialArea ? JSON.stringify(initialArea) : null;
    const currentAreaJson = currentArea ? JSON.stringify(currentArea) : null;

    if (initialAreaJson !== currentAreaJson) {
      currentArea = initialArea;
      if (initialArea && drawnItems) {
        renderArea(initialArea);
      } else if (!initialArea && drawnItems) {
        // Clear the area if initialArea is now null
        drawnItems.clearLayers();
      }
    }
  });

  // Register cleanup
  if (addCleanup) {
    addCleanup(() => {
      stopDrawing();
      if (map && drawnItems) {
        map.removeLayer(drawnItems);
      }
    });
  }
</script>

<!-- No visual markup needed - this is a behavior-only plugin -->
