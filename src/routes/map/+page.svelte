<script lang="ts">
  import type { PageData } from "./$types";
  import LazyLoad from "$lib/components/LazyLoad.svelte";
  import { page } from "$app/stores";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const hazards = $derived(data.hazards || []);

  // Lazy load the Map component to reduce initial bundle size
  const loadMap = () => import("$lib/components/Map.svelte");
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

  <div class="map-container">
    <LazyLoad
      loader={loadMap}
      componentProps={{ hazards, height: "600px", showUserLocation: true }}
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
