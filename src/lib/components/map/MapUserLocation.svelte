<script lang="ts">
  import { getMapContext } from "$lib/components/map/context";
  import { logger } from "$lib/utils/logger";
  import { onMount } from "svelte";

  interface Props {
    showUserLocation?: boolean;
    onMapReady?: (map: any) => void;
  }

  let { showUserLocation = false, onMapReady }: Props = $props();

  const { map, leaflet: L, addCleanup } = getMapContext();
  let userLocationMarker: any = null;

  onMount(() => {
    if (!map || !L) {
      logger.warn("MapUserLocation: Map or Leaflet not available", {
        component: "MapUserLocation",
      });
      return;
    }

    // Call onMapReady callback if provided
    if (onMapReady && map) {
      onMapReady(map);
    }

    // Get user location if enabled
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          if (!L || !map) return;

          // Add user location marker
          userLocationMarker = L.marker([userLat, userLng], {
            icon: L.divIcon({
              className: "user-location-marker",
              html: '<div style="background: #2196f3; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3);"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          }).addTo(map);

          // Register cleanup
          addCleanup(() => {
            if (userLocationMarker) {
              userLocationMarker.remove();
            }
          });

          // Center map on user location
          map.setView([userLat, userLng], 12);

          logger.debug("MapUserLocation: User location marker added", {
            component: "MapUserLocation",
            metadata: { lat: userLat, lng: userLng },
          });
        },
        (error) => {
          logger.warn("MapUserLocation: Could not get user location", {
            component: "MapUserLocation",
            metadata: {
              errorCode: error.code,
              errorMessage: error.message,
            },
          });
        }
      );
    }
  });
</script>

<!-- This component doesn't render anything -->
