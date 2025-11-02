<script lang="ts">
  import type { PageData } from "./$types";
  import LazyLoad from "$lib/components/LazyLoad.svelte";
  import { page } from "$app/stores";
  import type { Map as LeafletMap, TileLayer } from "leaflet";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const hazards = $derived(data.hazards || []);

  // Map state
  let mapInstance = $state<LeafletMap | null>(null);
  let currentTileLayer = $state<TileLayer | null>(null);
  let selectedLayer = $state<'road' | 'satellite' | 'terrain'>('satellite'); // Default to satellite/earth view
  let searchAddress = $state('');
  let searchError = $state('');
  let isSearching = $state(false);
  let showLayerMenu = $state(false);
  let layerMenuElement = $state<HTMLDivElement>();

  // Tile layer URLs
  const tileLayers = {
    road: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '© Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
    terrain: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
    },
  };

  // Handle map ready callback
  function handleMapReady(map: LeafletMap) {
    mapInstance = map;
    // Get initial tile layer
    import('leaflet').then((L) => {
      map.eachLayer((layer) => {
        if ((layer as any).getTileUrl) {
          currentTileLayer = layer as TileLayer;
        }
      });
    });
  }

  // Toggle layer menu
  function toggleLayerMenu() {
    showLayerMenu = !showLayerMenu;
  }

  // Close layer menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (showLayerMenu && layerMenuElement && !layerMenuElement.contains(event.target as Node)) {
      const layerButton = document.querySelector('.layer-control-button');
      if (layerButton && !layerButton.contains(event.target as Node)) {
        showLayerMenu = false;
      }
    }
  }

  // Switch map layers
  async function switchLayer(layerType: 'road' | 'satellite' | 'terrain') {
    if (!mapInstance) return;
    
    const L = await import('leaflet');
    
    // Remove current tile layer
    if (currentTileLayer) {
      mapInstance.removeLayer(currentTileLayer);
    }

    // Add new tile layer
    const newLayer = tileLayers[layerType];
    currentTileLayer = L.tileLayer(newLayer.url, {
      attribution: newLayer.attribution,
      maxZoom: 19,
    }).addTo(mapInstance);

    selectedLayer = layerType;
    showLayerMenu = false; // Close menu after selection
  }

  // Center map on user's location
  function showMyLocation() {
    if (!mapInstance) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          mapInstance!.setView([lat, lng], 14, { animate: true });
        },
        (error) => {
          alert('Unable to retrieve your location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  // Geocode address using Nominatim (OpenStreetMap)
  async function searchLocation(event: SubmitEvent) {
    event.preventDefault();
    
    if (!searchAddress.trim()) {
      searchError = 'Please enter an address or zip code';
      return;
    }

    if (!mapInstance) {
      searchError = 'Map is not ready yet';
      return;
    }

    isSearching = true;
    searchError = '';

    try {
      // Use Nominatim geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchAddress)}&` +
        `format=json&` +
        `limit=1&` +
        `countrycodes=us` // Limit to US for better results
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Center map on found location
        mapInstance.setView([lat, lng], 13, { animate: true });
        searchError = '';
      } else {
        searchError = 'Location not found. Please try a different address or zip code.';
      }
    } catch (error) {
      searchError = 'Error searching for location. Please try again.';
      console.error('Geocoding error:', error);
    } finally {
      isSearching = false;
    }
  }

  // Lazy load the Map component to reduce initial bundle size
  const loadMap = () => import("$lib/components/Map.svelte");

  // Handle click outside to close layer menu
  $effect(() => {
    if (showLayerMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<svelte:head>
  <title>Hazard Map - Interactive Safety Overview</title>
  <meta
    name="description"
    content="Interactive map showing reported hazards in your area. View real-time safety information and plan safer routes."
  />
</svelte:head>

<div class="map-page">
  <div class="map-header">
    <h1>Hazard Map</h1>
    <p class="map-description">
      Interactive map showing {hazards.length} active hazards in your area. Click
      on markers to view details.
    </p>
  </div>

  <div class="map-controls">
    <div class="map-stats">
      <div class="stat-item">
        <span class="stat-number">{hazards.length}</span>
        <span class="stat-label">Active Hazards</span>
      </div>
      <div class="stat-item">
        <span class="stat-number"
          >{new Set(hazards.map((h) => h.category_name)).size}</span
        >
        <span class="stat-label">Categories</span>
      </div>
    </div>

    <div class="legend">
      <h3>Hazard Categories</h3>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-marker" style="background: #d32f2f;">🐻</div>
          <span>Animals</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker" style="background: #388e3c;">🌿</div>
          <span>Plants</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker" style="background: #6d4c41;">⛰️</div>
          <span>Terrain</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker" style="background: #1976d2;">🌩️</div>
          <span>Weather</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker" style="background: #0277bd;">💧</div>
          <span>Water</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker" style="background: #f57f17;">🏗️</div>
          <span>Infrastructure</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker" style="background: #9c27b0;">⚠️</div>
          <span>Chemical</span>
        </div>
        <div class="legend-item">
          <div class="legend-marker" style="background: #424242;">❗</div>
          <span>Other</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Map Controls -->
  <div class="map-controls-panel">
    <!-- Layer Switcher moved to floating button on map -->
    <div class="layer-switcher" style="display: none;">
      <div class="layer-buttons">
        <button
          class="layer-btn"
          class:active={selectedLayer === 'satellite'}
          onclick={() => switchLayer('satellite')}
          type="button"
          title="View real satellite imagery"
        >
          <span class="layer-icon">�️</span>
          <span class="layer-name">Earth View</span>
          <span class="layer-detail">Satellite imagery</span>
        </button>
        <button
          class="layer-btn"
          class:active={selectedLayer === 'road'}
          onclick={() => switchLayer('road')}
          type="button"
          title="View street map with roads and labels"
        >
          <span class="layer-icon">�</span>
          <span class="layer-name">Street View</span>
          <span class="layer-detail">Roads & labels</span>
        </button>
        <button
          class="layer-btn"
          class:active={selectedLayer === 'terrain'}
          onclick={() => switchLayer('terrain')}
          type="button"
          title="View topographic terrain map"
        >
          <span class="layer-icon">⛰️</span>
          <span class="layer-name">Terrain View</span>
          <span class="layer-detail">Topography</span>
        </button>
      </div>
    </div>

    <!-- Location Controls -->
    <div class="location-controls">
      <button
        class="btn btn-location"
        onclick={showMyLocation}
        type="button"
        title="Center map on my location"
      >
        📍 Show My Location
      </button>

      <!-- Address Search -->
      <form class="address-search" onsubmit={searchLocation}>
        <input
          type="text"
          placeholder="Enter address or zip code..."
          bind:value={searchAddress}
          class="address-input"
          disabled={isSearching}
        />
        <button 
          type="submit" 
          class="btn btn-search"
          disabled={isSearching}
        >
          {isSearching ? '🔍 Searching...' : '🔍 Search'}
        </button>
      </form>
      {#if searchError}
        <p class="search-error">{searchError}</p>
      {/if}
    </div>
  </div>

  <div class="map-container" style="position: relative;">
    <!-- Floating Layer Control Button -->
    <button
      class="layer-control-button"
      onclick={toggleLayerMenu}
      type="button"
      title="Change map layer"
    >
      🗺️
    </button>

    <!-- Layer Menu Popup -->
    {#if showLayerMenu}
      <div 
        bind:this={layerMenuElement}
        class="layer-menu-popup"
      >
        <div class="layer-menu-header">
          <span>Map Layers</span>
          <button 
            class="close-btn"
            onclick={() => showLayerMenu = false}
            type="button"
          >✕</button>
        </div>
        <button
          class="layer-menu-item"
          class:active={selectedLayer === 'satellite'}
          onclick={() => switchLayer('satellite')}
          type="button"
        >
          <span class="layer-emoji">🛰️</span>
          <span class="layer-text">
            <strong>Earth View</strong>
            <small>Satellite imagery</small>
          </span>
        </button>
        <button
          class="layer-menu-item"
          class:active={selectedLayer === 'road'}
          onclick={() => switchLayer('road')}
          type="button"
        >
          <span class="layer-emoji">🚗</span>
          <span class="layer-text">
            <strong>Street View</strong>
            <small>Roads & labels</small>
          </span>
        </button>
        <button
          class="layer-menu-item"
          class:active={selectedLayer === 'terrain'}
          onclick={() => switchLayer('terrain')}
          type="button"
        >
          <span class="layer-emoji">⛰️</span>
          <span class="layer-text">
            <strong>Terrain View</strong>
            <small>Topography</small>
          </span>
        </button>
      </div>
    {/if}

    <LazyLoad
      loader={loadMap}
      componentProps={{ 
        hazards, 
        height: "600px", 
        showUserLocation: true,
        onMapReady: handleMapReady
      }}
      loadingText="Loading interactive map..."
    />
  </div>

  <div class="map-footer">
    <p class="help-text">
      💡 <strong>Tip:</strong> Allow location access to center the map on your current
      position. Click markers to see hazard details and report dates.
    </p>

    <div class="action-buttons">
      <a href="/hazards/create" class="btn btn-primary">
        ➕ Report New Hazard
      </a>
      <a href="/my-reports" class="btn btn-secondary"> 📋 My Reports </a>
    </div>
  </div>
</div>

<style>
  .map-page {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .map-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .map-header h1 {
    color: #333;
    margin-bottom: 0.5rem;
    font-size: 2.5rem;
  }

  .map-description {
    color: #666;
    font-size: 1.1rem;
    margin: 0;
  }

  .map-controls {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .map-stats {
    display: flex;
    gap: 1rem;
  }

  .stat-item {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    flex: 1;
  }

  .stat-number {
    display: block;
    font-size: 2rem;
    font-weight: bold;
    color: #1976d2;
  }

  .stat-label {
    color: #666;
    font-size: 0.9rem;
  }

  .legend {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .legend h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.1rem;
  }

  .legend-items {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .legend-marker {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
  }

  .map-controls-panel {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Floating Layer Control Button */
  .layer-control-button {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    width: 44px;
    height: 44px;
    background: white;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transition: all 0.2s;
  }

  .layer-control-button:hover {
    background: #f5f5f5;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  /* Layer Menu Popup */
  .layer-menu-popup {
    position: absolute;
    top: 60px;
    right: 10px;
    z-index: 1000;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    min-width: 220px;
    overflow: hidden;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .layer-menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    font-weight: 600;
    font-size: 0.9rem;
    color: #333;
  }

  .layer-menu-header .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .layer-menu-header .close-btn:hover {
    background: #e0e0e0;
    color: #333;
  }

  .layer-menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
  }

  .layer-menu-item:last-child {
    border-bottom: none;
  }

  .layer-menu-item:hover {
    background: #f8f9fa;
  }

  .layer-menu-item.active {
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: white;
  }

  .layer-menu-item.active small {
    color: rgba(255, 255, 255, 0.9);
  }

  .layer-emoji {
    font-size: 24px;
    line-height: 1;
    flex-shrink: 0;
  }

  .layer-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .layer-text strong {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .layer-text small {
    font-size: 0.75rem;
    color: #666;
    font-weight: normal;
  }

  /* Old layer switcher styles removed - now using floating button */

  .location-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .btn-location {
    padding: 0.75rem 1.5rem;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-location:hover {
    background: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }

  .btn-location:active {
    transform: translateY(0);
  }

  .address-search {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    min-width: 300px;
  }

  .address-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid #ddd;
    border-radius: 6px;
    font-size: 0.95rem;
    transition: border-color 0.2s;
  }

  .address-input:focus {
    outline: none;
    border-color: #1976d2;
  }

  .address-input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .btn-search {
    padding: 0.75rem 1.5rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-search:hover:not(:disabled) {
    background: #1565c0;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
  }

  .btn-search:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .search-error {
    width: 100%;
    color: #d32f2f;
    font-size: 0.9rem;
    margin: 0.5rem 0 0 0;
    padding: 0.5rem;
    background: #ffebee;
    border-radius: 4px;
    border-left: 3px solid #d32f2f;
  }

  .map-container {
    margin-bottom: 2rem;
  }

  .map-footer {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    align-items: center;
  }

  .help-text {
    color: #666;
    margin: 0;
    font-size: 0.95rem;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn-primary {
    background: #1976d2;
    color: white;
  }

  .btn-secondary {
    background: white;
    color: #333;
    border: 1px solid #ddd;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .map-page {
      padding: 0.5rem;
    }

    .map-header h1 {
      font-size: 2rem;
    }

    .map-controls {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .map-stats {
      justify-content: center;
    }

    .legend-items {
      grid-template-columns: repeat(2, 1fr);
    }

    .map-controls-panel {
      padding: 1rem;
    }

    .location-controls {
      flex-direction: column;
      width: 100%;
    }

    .btn-location {
      width: 100%;
    }

    .address-search {
      width: 100%;
      min-width: unset;
    }

    .layer-control-button {
      width: 40px;
      height: 40px;
      font-size: 18px;
    }

    .layer-menu-popup {
      right: 5px;
      top: 55px;
      min-width: 200px;
    }

    .map-footer {
      grid-template-columns: 1fr;
      gap: 1rem;
      text-align: center;
    }

    .action-buttons {
      justify-content: center;
    }
  }
</style>
