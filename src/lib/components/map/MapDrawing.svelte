<script lang="ts">
  import { onMount } from "svelte";
  import { getMapContext } from "./context";
  import { autoSimplifyPolygon, type Point } from "$lib/utils/map-simplification";
  import { logger } from "$lib/utils/logger";

  interface Props {
    initialArea?: GeoJSON.Polygon | null;
    enabled?: boolean;
    autoSimplify?: boolean;
    onAreaChange?: (area: GeoJSON.Polygon | null) => void;
    onAreaStats?: (stats: { vertices: number; originalVertices?: number } | null) => void;
  }

  let {
    initialArea = null,
    enabled = true,
    autoSimplify = true,
    onAreaChange,
    onAreaStats,
  }: Props = $props();

  // Get map context
  const { map, leaflet: L, addCleanup } = getMapContext();

  // State
  let drawnItems: any = null;
  let currentArea = $state<GeoJSON.Polygon | null>(initialArea);
  let drawControl: any = null;
  let isDrawing = $state(false);

  /**
   * Load leaflet-draw library
   */
  async function loadLeafletDraw() {
    if (!L) return null;

    try {
      // Load leaflet-draw CSS
      const drawCss = document.createElement("link");
      drawCss.rel = "stylesheet";
      drawCss.href = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css";
      document.head.appendChild(drawCss);

      // Make Leaflet globally available for leaflet-draw
      if (typeof window !== "undefined") {
        (window as any).L = L;
      }

      // Load leaflet-draw JS - it will extend the global L object
      await import("leaflet-draw");

      logger.debug("MapDrawing: leaflet-draw loaded successfully", {
        component: "MapDrawing",
      });

      return L;
    } catch (error) {
      logger.error(
        "MapDrawing: Failed to load leaflet-draw",
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * Initialize drawing functionality
   */
  async function initializeDrawing() {
    if (!map || !L) return;

    const leaflet = await loadLeafletDraw();
    if (!leaflet || !leaflet.Draw) {
      logger.error(
        "MapDrawing: leaflet-draw not available",
        new Error("Missing leaflet-draw")
      );
      return;
    }

    // Create feature group for drawn items
    drawnItems = new leaflet.FeatureGroup();
    map.addLayer(drawnItems);

    // Set up drawing event handlers
    if (leaflet.Draw && leaflet.Draw.Event) {
      map.on(leaflet.Draw.Event.CREATED, handleDrawCreated);
      map.on(leaflet.Draw.Event.EDITED, handleDrawEdited);
      map.on(leaflet.Draw.Event.DELETED, handleDrawDeleted);
    }

    // Render initial area if provided
    if (currentArea) {
      renderArea(currentArea);
    }

    logger.debug("MapDrawing: Drawing initialized", {
      component: "MapDrawing",
    });

    // If enabled prop is true when initialization completes, start drawing
    if (enabled && !isDrawing) {
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

      // Fit map bounds to show the polygon
      const bounds = polygon.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
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
      const simplifiedCoords = simplifiedPoints.map((p: Point) => [p.lng, p.lat]);
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

  // Initialize on mount
  onMount(() => {
    // Always initialize drawing functionality (even if not enabled yet)
    initializeDrawing();

    // Cleanup
    return () => {
      stopDrawing();
      if (map && drawnItems) {
        map.removeLayer(drawnItems);
      }
    };
  });

  // Start/stop drawing when enabled prop changes
  $effect(() => {
    if (enabled && drawnItems && !isDrawing) {
      startDrawing();
    } else if (!enabled && isDrawing) {
      stopDrawing();
    }
  });

  // React to initialArea changes
  $effect(() => {
    if (initialArea && initialArea !== currentArea) {
      currentArea = initialArea;
      if (drawnItems) {
        renderArea(initialArea);
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
