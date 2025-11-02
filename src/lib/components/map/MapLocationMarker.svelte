<script lang="ts">
  import { onMount } from "svelte";
  import { getMapContext } from "./context";
  import { logger } from "$lib/utils/logger";

  interface Location {
    lat: number;
    lng: number;
  }

  interface Props {
    initialLocation: Location;
    enabled?: boolean;
    draggable?: boolean;
    repositionMode?: boolean;
    markerIcon?: string;
    markerColor?: string;
    onLocationChange?: (location: Location) => void;
  }

  let {
    initialLocation,
    enabled = true,
    draggable = false,
    repositionMode = false,
    markerIcon = "📍",
    markerColor = "#1976d2",
    onLocationChange,
  }: Props = $props();

  // Get map context
  const { map, leaflet: L, addCleanup } = getMapContext();

  // State
  let marker: any = null;
  let currentLocation = $state<Location>(initialLocation);
  let isRepositioning = $state(repositionMode);

  /**
   * Create custom marker icon
   */
  function createMarkerIcon() {
    if (!L) return null;

    return L.divIcon({
      html: `<div style="
        background: ${markerColor};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        cursor: ${draggable || isRepositioning ? 'move' : 'pointer'};
      ">${markerIcon}</div>`,
      className: "custom-location-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  /**
   * Initialize location marker
   */
  function initializeMarker() {
    if (!map || !L || marker) return;

    const icon = createMarkerIcon();
    if (!icon) return;

    // Create marker
    marker = L.marker([currentLocation.lat, currentLocation.lng], {
      icon,
      draggable: draggable || isRepositioning,
    }).addTo(map);

    // Set up drag event handler
    if (draggable) {
      marker.on("dragend", handleMarkerDrag);
    }

    logger.debug("MapLocationMarker: Marker initialized", {
      component: "MapLocationMarker",
      metadata: { location: currentLocation, draggable },
    });
  }

  /**
   * Update marker position
   */
  function updateMarkerPosition(location: Location) {
    if (!marker) return;

    marker.setLatLng([location.lat, location.lng]);
    currentLocation = location;

    logger.debug("MapLocationMarker: Marker position updated", {
      component: "MapLocationMarker",
      metadata: { location },
    });
  }

  /**
   * Handle marker drag event
   */
  function handleMarkerDrag(e: any) {
    const latlng = e.target.getLatLng();
    const newLocation = { lat: latlng.lat, lng: latlng.lng };

    currentLocation = newLocation;

    if (onLocationChange) {
      onLocationChange(newLocation);
    }

    logger.debug("MapLocationMarker: Marker dragged", {
      component: "MapLocationMarker",
      metadata: { location: newLocation },
    });
  }

  /**
   * Handle map click event (for reposition mode)
   */
  function handleMapClick(e: any) {
    if (!isRepositioning) return;

    const { lat, lng } = e.latlng;
    const newLocation = { lat, lng };

    currentLocation = newLocation;
    updateMarkerPosition(newLocation);

    if (onLocationChange) {
      onLocationChange(newLocation);
    }

    logger.debug("MapLocationMarker: Location repositioned via click", {
      component: "MapLocationMarker",
      metadata: { location: newLocation },
    });
  }

  /**
   * Enable reposition mode
   */
  export function enableRepositionMode() {
    isRepositioning = true;

    if (map) {
      const container = map.getContainer();
      container.style.cursor = "crosshair";
    }

    if (marker) {
      marker.setIcon(createMarkerIcon());
      marker.dragging?.enable();
    }

    logger.debug("MapLocationMarker: Reposition mode enabled", {
      component: "MapLocationMarker",
    });
  }

  /**
   * Disable reposition mode
   */
  export function disableRepositionMode() {
    isRepositioning = false;

    if (map) {
      const container = map.getContainer();
      container.style.cursor = "";
    }

    if (marker && !draggable) {
      marker.dragging?.disable();
      marker.setIcon(createMarkerIcon());
    }

    logger.debug("MapLocationMarker: Reposition mode disabled", {
      component: "MapLocationMarker",
    });
  }

  /**
   * Get current location
   */
  export function getLocation(): Location {
    return currentLocation;
  }

  /**
   * Set location programmatically
   */
  export function setLocation(location: Location) {
    currentLocation = location;
    updateMarkerPosition(location);

    if (onLocationChange) {
      onLocationChange(location);
    }
  }

  /**
   * Pan map to current marker location
   */
  export function panToMarker() {
    if (map && currentLocation) {
      map.setView([currentLocation.lat, currentLocation.lng], map.getZoom(), {
        animate: true,
      });
    }
  }

  /**
   * Pan map to current marker location with specified zoom
   */
  export function panToMarkerWithZoom(zoom: number) {
    if (map && currentLocation) {
      map.setView([currentLocation.lat, currentLocation.lng], zoom, {
        animate: true,
      });
    }
  }

  // Initialize on mount
  onMount(() => {
    if (enabled) {
      initializeMarker();

      // Add map click handler if reposition mode is enabled
      if (map && isRepositioning) {
        map.on("click", handleMapClick);
      }
    }

    // Cleanup
    return () => {
      if (map) {
        map.off("click", handleMapClick);
      }
      if (marker) {
        marker.remove();
      }
    };
  });

  // React to enabled prop changes
  $effect(() => {
    if (enabled && map && !marker) {
      initializeMarker();
    } else if (!enabled && marker) {
      marker.remove();
      marker = null;
    }
  });

  // React to initialLocation changes
  $effect(() => {
    if (initialLocation && initialLocation !== currentLocation) {
      currentLocation = initialLocation;
      if (marker) {
        updateMarkerPosition(initialLocation);
      }
    }
  });

  // React to repositionMode prop changes
  $effect(() => {
    if (repositionMode !== isRepositioning) {
      if (repositionMode) {
        enableRepositionMode();
      } else {
        disableRepositionMode();
      }
    }
  });

  // Handle reposition mode and map click handler
  $effect(() => {
    if (!map) return;

    if (isRepositioning) {
      map.on("click", handleMapClick);
      const container = map.getContainer();
      container.style.cursor = "crosshair";

      return () => {
        map.off("click", handleMapClick);
        container.style.cursor = "";
      };
    } else {
      map.off("click", handleMapClick);
    }
  });

  // Update marker icon when properties change
  $effect(() => {
    if (marker && (markerIcon || markerColor || isRepositioning || draggable)) {
      marker.setIcon(createMarkerIcon());
    }
  });

  // Register cleanup
  if (addCleanup) {
    addCleanup(() => {
      if (map) {
        map.off("click", handleMapClick);
      }
      if (marker) {
        marker.remove();
      }
    });
  }
</script>

<!-- No visual markup needed - this is a behavior-only plugin -->
