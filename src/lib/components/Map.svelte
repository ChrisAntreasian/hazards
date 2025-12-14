<script lang="ts">
  import type { Map as LeafletMap } from "leaflet";
  import {
    BaseMap,
    MapMarkers,
    MapLayerSwitcher,
    MapUserLocation,
  } from "$lib/components/map";

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
    onMapReady?: (mapInstance: LeafletMap) => void;
  }

  let {
    hazards = [],
    height = "400px",
    center = [42.3601, -71.0589], // Default to Boston area
    zoom = 10,
    showUserLocation = true,
    showLayerSwitcher = false,
    onMapReady,
  }: Props = $props();
</script>

<BaseMap {height} {center} {zoom}>
  <MapUserLocation {showUserLocation} {onMapReady} />
  <MapMarkers markers={hazards} />
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
