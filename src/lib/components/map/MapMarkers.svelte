<script lang="ts">
  import { onMount } from "svelte";
  import { getMapContext } from "./context";
  import { createDivIcon } from "./utils";
  import { logger } from "$lib/utils/logger";
  import type { MapMarkersProps, MarkerData } from "./types";

  interface Props extends MapMarkersProps {}

  let {
    markers = [],
    enableClustering = true,
    clusterOptions = {},
    categoryColors = {},
    categoryIcons = {},
    popupTemplate,
    onMarkerClick,
  }: Props = $props();

  // Get map context - keep the object to maintain getter reactivity
  const context = getMapContext();
  const { addCleanup } = context;

  // Access map and L through derived values to maintain reactivity
  let map = $derived(context.map);
  let L = $derived(context.leaflet);

  // State
  let markerInstances: any[] = [];
  let markerClusterGroup: any = null;

  // Default category colors
  const defaultCategoryColors: Record<string, string> = {
    Animals: "#d32f2f",
    "Large Mammals": "#d32f2f",
    Biting: "#c62828",
    Insects: "#e57373",
    Reptiles: "#f44336",
    Stinging: "#ef5350",
    wolves: "#b71c1c",
    Plants: "#388e3c",
    Thorns: "#2e7d32",
    Poisonous: "#689f38",
    Terrain: "#6d4c41",
    Unstable: "#5d4037",
    ice: "#81c784",
    Weather: "#1976d2",
    Water: "#0277bd",
    "Water Hazards": "#0277bd",
    Infrastructure: "#f57f17",
    Chemical: "#9c27b0",
    Other: "#424242",
  };

  // Default category icons
  const defaultCategoryIcons: Record<string, string> = {
    Animals: "🐻",
    "Large Mammals": "🦌",
    Biting: "🦷",
    Insects: "🐛",
    Reptiles: "🐍",
    Stinging: "🐝",
    wolves: "🐺",
    Plants: "🌿",
    Thorns: "🌹",
    Poisonous: "☠️",
    Terrain: "⛰️",
    Unstable: "🪨",
    ice: "🧊",
    Weather: "🌩️",
    Water: "💧",
    "Water Hazards": "🌊",
    Infrastructure: "🏗️",
    Chemical: "⚠️",
    Other: "❗",
  };

  // Merge default and custom colors/icons
  const colors = $derived({ ...defaultCategoryColors, ...categoryColors });
  const icons = $derived({ ...defaultCategoryIcons, ...categoryIcons });

  // Default popup template
  const defaultPopupTemplate = (marker: MarkerData): string => {
    const category = marker.category || marker.category_name;
    return `
      <div class="hazard-popup">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
          ${marker.title || "Untitled"}
        </h3>
        ${
          category
            ? `
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
            <strong>Category:</strong> ${category}
          </p>
        `
            : ""
        }
        ${
          marker.description
            ? `
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #444;">
            ${marker.description}
          </p>
        `
            : ""
        }
        ${
          marker.created_at
            ? `
          <p style="margin: 0 0 12px 0; font-size: 11px; color: #888;">
            Reported: ${new Date(marker.created_at).toLocaleDateString()}
          </p>
        `
            : ""
        }
        ${
          marker.id
            ? `
          <a href="/hazards/${marker.id}" 
             style="display: inline-block; padding: 6px 12px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500;">
            📍 View Details
          </a>
        `
            : ""
        }
      </div>
    `;
  };

  /**
   * Get marker icon for a category
   */
  function getMarkerIcon(category: string): string {
    return icons[category] || icons["Other"];
  }

  /**
   * Get marker color for a category
   */
  function getMarkerColor(category: string): string {
    return colors[category] || colors["Other"];
  }

  /**
   * Create a marker instance
   */
  function createMarker(markerData: MarkerData): any {
    if (!map || !L) return null;

    const category = markerData.category || markerData.category_name || "Other";
    const color = getMarkerColor(category);
    const icon = getMarkerIcon(category);

    // Normalize coordinates to numbers
    const lat =
      typeof markerData.latitude === "string"
        ? parseFloat(markerData.latitude)
        : markerData.latitude || 0;
    const lng =
      typeof markerData.longitude === "string"
        ? parseFloat(markerData.longitude)
        : markerData.longitude || 0;

    const markerIcon = createDivIcon(
      L,
      `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">${icon}</div>`,
      "hazard-marker",
      [24, 24]
    );

    const marker = L.marker([lat, lng], {
      icon: markerIcon,
    });

    // Add popup
    const template = popupTemplate || defaultPopupTemplate;
    const popupContent = template(markerData);
    marker.bindPopup(popupContent, {
      maxWidth: 250,
      className: "hazard-popup-container",
    });

    // Add click handler
    if (onMarkerClick) {
      marker.on("click", () => onMarkerClick(markerData));
    }

    return marker;
  }

  /**
   * Update markers
   */
  function updateMarkers() {
    if (!map || !L) {
      logger.warn("MapMarkers: Cannot update markers, map not ready", {
        component: "MapMarkers",
      });
      return;
    }

    // Clear existing markers
    if (markerClusterGroup) {
      markerClusterGroup.clearLayers();
    } else {
      markerInstances.forEach((marker) => marker.remove());
    }
    markerInstances = [];

    // Create new markers
    markers.forEach((markerData, index) => {
      try {
        if (markerData.latitude && markerData.longitude) {
          // Normalize lat/lng to numbers
          const normalizedData = {
            ...markerData,
            latitude:
              typeof markerData.latitude === "string"
                ? parseFloat(markerData.latitude)
                : markerData.latitude,
            longitude:
              typeof markerData.longitude === "string"
                ? parseFloat(markerData.longitude)
                : markerData.longitude,
          };

          const marker = createMarker(normalizedData);

          if (marker) {
            if (markerClusterGroup) {
              markerClusterGroup.addLayer(marker);
            } else {
              marker.addTo(map);
            }
            markerInstances.push(marker);
          }
        }
      } catch (error) {
        logger.componentError("MapMarkers", error as Error, {
          action: "create_marker",
          metadata: { markerIndex: index, markerId: markerData.id },
        });
      }
    });

    // Refresh cluster groups
    if (markerClusterGroup) {
      markerClusterGroup.refreshClusters();
    }

    logger.debug("MapMarkers: Markers updated", {
      component: "MapMarkers",
      metadata: { markerCount: markerInstances.length },
    });
  }

  // Track if we've already initialized
  let initialized = $state(false);

  // Initialize clustering and markers when map and L are ready
  $effect(() => {
    if (map && L && !initialized) {
      initialized = true;
      initializeClustering();
    }
  });

  async function initializeClustering() {
    if (!map || !L) return;

    // Initialize marker clustering if enabled
    if (enableClustering) {
      try {
        // Import MarkerCluster plugin
        await import("leaflet.markercluster");

        // Load cluster CSS
        if (typeof window !== "undefined") {
          const clusterLink = document.createElement("link");
          clusterLink.rel = "stylesheet";
          clusterLink.href =
            "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
          document.head.appendChild(clusterLink);

          const clusterDefaultLink = document.createElement("link");
          clusterDefaultLink.rel = "stylesheet";
          clusterDefaultLink.href =
            "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
          document.head.appendChild(clusterDefaultLink);
        }

        // Check if markerClusterGroup is available
        if ((L as any).markerClusterGroup) {
          const defaultClusterOptions = {
            maxClusterRadius: 60,
            disableClusteringAtZoom: 16,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            spiderfyDistanceMultiplier: 1.2,
            iconCreateFunction: function (cluster: any) {
              const childCount = cluster.getChildCount();
              let className = "marker-cluster-";
              let size = 30;

              if (childCount < 5) {
                className += "small";
                size = 30;
              } else if (childCount < 15) {
                className += "medium";
                size = 40;
              } else {
                className += "large";
                size = 50;
              }

              return L!.divIcon({
                html: `<div><span>${childCount}</span></div>`,
                className: `marker-cluster ${className}`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              });
            },
          };

          markerClusterGroup = (L as any).markerClusterGroup({
            ...defaultClusterOptions,
            ...clusterOptions,
          });

          map.addLayer(markerClusterGroup);

          logger.debug("MapMarkers: Clustering enabled", {
            component: "MapMarkers",
          });
        } else {
          logger.warn(
            "MapMarkers: MarkerCluster plugin not available, using regular markers",
            { component: "MapMarkers" }
          );
        }
      } catch (error) {
        logger.componentError("MapMarkers", error as Error, {
          action: "initialize_clustering",
        });
      }
    }

    // Initial marker update
    updateMarkers();
  }

  // Register cleanup
  onMount(() => {
    return () => {
      if (markerClusterGroup && map) {
        map.removeLayer(markerClusterGroup);
      }
      markerInstances.forEach((marker) => marker.remove());
      markerInstances = [];
    };
  });

  // Watch for marker changes
  $effect(() => {
    if (map && L && markers) {
      updateMarkers();
    }
  });
</script>

<!-- No template needed - markers are added directly to the map -->

<style>
  :global(.hazard-marker) {
    background: transparent !important;
    border: none !important;
  }

  :global(.hazard-popup-container .leaflet-popup-content-wrapper) {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :global(.hazard-popup-container .leaflet-popup-tip) {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  :global(.hazard-popup-container .leaflet-popup-content) {
    margin: 14px 16px;
  }

  :global(.hazard-popup a) {
    box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);
    transition: all 0.2s;
  }

  :global(.hazard-popup a:hover) {
    box-shadow: 0 4px 8px rgba(25, 118, 210, 0.4);
    transform: translateY(-1px);
    background: #1565c0 !important;
  }

  /* Enhanced marker cluster styling */
  :global(.marker-cluster) {
    border-radius: 50%;
    text-align: center;
    color: white;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 3px solid rgba(255, 255, 255, 0.9);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  :global(.marker-cluster:hover) {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  :global(.marker-cluster div) {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 12px;
    font-weight: 700;
  }

  :global(.marker-cluster-small) {
    background: linear-gradient(135deg, #4caf50, #45a049);
  }

  :global(.marker-cluster-medium) {
    background: linear-gradient(135deg, #ff9800, #f57c00);
  }

  :global(.marker-cluster-medium div) {
    font-size: 14px;
  }

  :global(.marker-cluster-large) {
    background: linear-gradient(135deg, #f44336, #d32f2f);
  }

  :global(.marker-cluster-large div) {
    font-size: 16px;
  }
</style>
