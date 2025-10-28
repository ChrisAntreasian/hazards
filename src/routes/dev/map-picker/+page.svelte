<script lang="ts">
  import type { PageData } from "./$types";
  import MapLocationPicker from "$lib/components/MapLocationPicker.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  // Component state for map modes
  let mapMode = $state<'view' | 'reposition' | 'draw'>('view');
  let currentLocation = $state(data.initialLocation);
  let currentArea = $state<GeoJSON.Polygon | null>(null);

  // Event handlers for MapLocationPicker
  const handleLocationChange = (newLocation: { lat: number; lng: number }) => {
    currentLocation = newLocation;
    console.log('Location updated:', newLocation);
  };

  const handleAreaChange = (area: GeoJSON.Polygon | null) => {
    currentArea = area;
    console.log('Area updated:', area);
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          });
        }
      );

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      currentLocation = newLocation;
      console.log('Current location acquired:', newLocation);
    } catch (err: any) {
      console.error('Failed to get location:', err.message);
      // Keep default Boston location
    }
  };
</script>

<svelte:head>
  <title>Map Location Picker - Development</title>
  <meta name="description" content="Development testing for interactive map location picker" />
</svelte:head>

<div class="dev-page">
  <div class="dev-header">
    <h1>🗺️ Map Location Picker Development</h1>
    <p class="dev-description">
      Testing interactive map location and area drawing functionality
    </p>
    
    <div class="dev-info">
      <strong>Current Location:</strong> {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
      <br>
      <strong>Has Area:</strong> {currentArea ? 'Yes' : 'No'}
      {#if currentArea}
        <br>
        <strong>Area Vertices:</strong> {currentArea.coordinates[0]?.length || 0}
      {/if}
    </div>
  </div>

  <div class="location-controls">
    <button
      class="btn btn-secondary"
      onclick={getCurrentLocation}
    >
      📍 Get Current Location
    </button>
    
    <button
      class="btn btn-primary"
      onclick={() => console.log('Debug: Map element', document.querySelector('.map-container'))}
    >
      🐛 Debug Map Container
    </button>
  </div>

  <div class="map-container">
    <MapLocationPicker 
      initialLocation={currentLocation}
      initialArea={currentArea}
      height="600px"
      onLocationChange={handleLocationChange}
      onAreaChange={handleAreaChange}
    />
  </div>

  <div class="dev-status">
    <h3>Development Status</h3>
    <div class="phase-checklist">
      <div class="phase-item current">
        <span class="phase-status">✅</span>
        <strong>Phase 1: Development Setup</strong> - Complete
        <ul>
          <li>✅ leaflet-draw package installed</li>
          <li>✅ Dev route created (/dev/map-picker)</li>
          <li>✅ Basic component shell with mode buttons</li>
        </ul>
      </div>
      <div class="phase-item current">
        <span class="phase-status">🚧</span>
        <strong>Phase 2A: Core Component Structure</strong> - In Progress
        <ul>
          <li>✅ MapLocationPicker component created</li>
          <li>✅ Map simplification utilities implemented</li>
          <li>✅ State management for view/reposition/draw modes</li>
          <li>🚧 Testing interactive functionality</li>
        </ul>
      </div>
      <div class="phase-item">
        <span class="phase-status">⏳</span>
        <strong>Phase 2B: View Mode</strong> - Pending
      </div>
    </div>
  </div>
</div>

<style>
  .dev-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .dev-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e2e8f0;
  }

  .dev-header h1 {
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .dev-description {
    color: #64748b;
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .dev-info {
    background: #f8fafc;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    text-align: left;
    max-width: 400px;
    margin: 0 auto;
    font-family: monospace;
    font-size: 0.9rem;
  }

  .location-controls {
    margin: 2rem 0;
    text-align: center;
  }

  .map-container {
    margin: 2rem 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .dev-status {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 2px solid #e2e8f0;
  }

  .dev-status h3 {
    margin-bottom: 1.5rem;
    color: #1e293b;
  }

  .phase-checklist {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .phase-item {
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
  }

  .phase-item.current {
    border-color: #3b82f6;
    background: #f0f9ff;
  }

  .phase-status {
    margin-right: 0.5rem;
    font-size: 1.2rem;
  }

  .phase-item ul {
    margin: 0.5rem 0 0 1.5rem;
    font-size: 0.9rem;
  }

  .phase-item li {
    margin-bottom: 0.25rem;
    color: #6b7280;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-secondary:hover {
    background: #4b5563;
  }

  @media (max-width: 768px) {
    .dev-page {
      padding: 1rem;
    }
  }
</style>