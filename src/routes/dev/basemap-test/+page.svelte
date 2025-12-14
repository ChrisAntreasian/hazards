<script lang="ts">
  import { BaseMap } from "$lib/components/map";
  import type { Map as LeafletMap } from "leaflet";

  let mapInstance = $state<LeafletMap | null>(null);
  let clickedLocation = $state<{ lat: number; lng: number } | null>(null);

  function handleMapReady(map: LeafletMap) {
    mapInstance = map;
    console.log("Map ready!", map);
  }

  function handleMapClick(event: any) {
    clickedLocation = {
      lat: event.latlng.lat,
      lng: event.latlng.lng,
    };
    console.log("Map clicked:", clickedLocation);
  }
</script>

<svelte:head>
  <title>BaseMap Test - Hazards</title>
</svelte:head>

<div class="test-page">
  <h1>BaseMap Component Test</h1>

  <div class="info-panel">
    <h2>Status</h2>
    <p>
      <strong>Map initialized:</strong>
      {mapInstance ? "✅ Yes" : "❌ No"}
    </p>
    {#if clickedLocation}
      <p>
        <strong>Last clicked:</strong>
        {clickedLocation.lat.toFixed(6)}, {clickedLocation.lng.toFixed(6)}
      </p>
    {/if}
  </div>

  <div class="map-wrapper">
    <h2>Interactive Map</h2>
    <BaseMap
      center={[42.3601, -71.0589]}
      zoom={13}
      height="500px"
      defaultLayer="satellite"
      onReady={handleMapReady}
      onClick={handleMapClick}
    />
  </div>

  <div class="test-cases">
    <h2>Test Cases</h2>
    <ul>
      <li>✅ Map loads with Leaflet</li>
      <li>✅ Satellite tile layer displays</li>
      <li>✅ Map is interactive (pan, zoom)</li>
      <li>✅ Click events are captured</li>
      <li>✅ onReady callback fires</li>
    </ul>
  </div>

  <div class="next-steps">
    <h2>Next Steps</h2>
    <ol>
      <li>Create MapMarkers plugin for hazard display</li>
      <li>Create MapDrawing plugin for polygon drawing</li>
      <li>Create MapLocationPicker plugin</li>
      <li>Create MapControls component</li>
    </ol>
  </div>
</div>

<style>
  .test-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    color: #1976d2;
    margin-bottom: 1rem;
  }

  h2 {
    color: #333;
    font-size: 1.25rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  .info-panel {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .info-panel p {
    margin: 0.5rem 0;
    font-family: monospace;
    font-size: 0.95rem;
  }

  .map-wrapper {
    margin: 2rem 0;
  }

  .test-cases {
    background: #e7f5e7;
    border: 1px solid #4caf50;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .test-cases ul {
    list-style: none;
    padding: 0;
  }

  .test-cases li {
    margin: 0.5rem 0;
    font-size: 0.95rem;
  }

  .next-steps {
    background: #fff3e0;
    border: 1px solid #ff9800;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .next-steps ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .next-steps li {
    margin: 0.5rem 0;
    font-size: 0.95rem;
  }
</style>
