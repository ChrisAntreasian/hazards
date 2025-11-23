<script lang="ts">
  import { BaseMap, MapMarkers } from "$lib/components/map";
  import type { Map as LeafletMap } from "leaflet";
  import type { MarkerData } from "$lib/components/map/types";

  // Sample hazard data for testing
  const sampleHazards: MarkerData[] = [
    {
      id: 1,
      latitude: 42.3601,
      longitude: -71.0589,
      category: "Animals",
      title: "Coyote Sighting",
      description: "Multiple coyotes spotted in the area, especially at dusk.",
      created_at: "2025-10-15T10:30:00",
    },
    {
      id: 2,
      latitude: 42.3615,
      longitude: -71.0575,
      category: "Plants",
      title: "Poison Ivy Patch",
      description: "Large patch of poison ivy near the trail entrance.",
      created_at: "2025-10-20T14:15:00",
    },
    {
      id: 3,
      latitude: 42.3625,
      longitude: -71.0595,
      category: "Terrain",
      title: "Unstable Slope",
      description: "Recent landslide area, avoid hiking here.",
      created_at: "2025-10-25T09:00:00",
    },
    {
      id: 4,
      latitude: 42.3595,
      longitude: -71.061,
      category: "Water",
      title: "Flooded Trail Section",
      description: "Trail is flooded after recent heavy rain.",
      created_at: "2025-10-28T16:45:00",
    },
    {
      id: 5,
      latitude: 42.3608,
      longitude: -71.0582,
      category: "Infrastructure",
      title: "Damaged Bridge",
      description: "Wooden bridge has rotted planks, use with caution.",
      created_at: "2025-10-30T11:20:00",
    },
    // Cluster test: Add several markers close together
    {
      id: 6,
      latitude: 42.365,
      longitude: -71.062,
      category: "Insects",
      title: "Bee Nest",
      description: "Active bee nest in tree hollow.",
      created_at: "2025-11-01T08:00:00",
    },
    {
      id: 7,
      latitude: 42.3652,
      longitude: -71.0622,
      category: "Insects",
      title: "Wasp Nest",
      description: "Large wasp nest near picnic area.",
      created_at: "2025-11-01T09:00:00",
    },
    {
      id: 8,
      latitude: 42.3654,
      longitude: -71.0618,
      category: "Insects",
      title: "Mosquito Swarm",
      description: "Heavy mosquito activity near water.",
      created_at: "2025-11-01T10:00:00",
    },
  ];

  let mapInstance = $state<LeafletMap | null>(null);
  let showClustering = $state(true);
  let selectedCategory = $state<string>("all");

  // Filter hazards by category
  const filteredHazards = $derived(
    selectedCategory === "all"
      ? sampleHazards
      : sampleHazards.filter((h) => h.category === selectedCategory)
  );

  // Get unique categories
  const categories = $derived([
    "all",
    ...Array.from(new Set(sampleHazards.map((h) => h.category))),
  ]);

  function handleMapReady(map: LeafletMap) {
    mapInstance = map;
    console.log("Map ready with markers!");
  }

  function handleMarkerClick(marker: MarkerData) {
    console.log("Marker clicked:", marker);
    alert(`Clicked: ${marker.title}`);
  }
</script>

<svelte:head>
  <title>MapMarkers Test - Hazards</title>
</svelte:head>

<div class="test-page">
  <h1>MapMarkers Plugin Test</h1>

  <div class="controls">
    <div class="control-group">
      <label>
        <input type="checkbox" bind:checked={showClustering} />
        Enable Marker Clustering
      </label>
    </div>

    <div class="control-group">
      <label for="category-filter">Filter by Category:</label>
      <select id="category-filter" bind:value={selectedCategory}>
        {#each categories as category}
          <option value={category}>
            {category === "all" ? "All Categories" : category}
          </option>
        {/each}
      </select>
    </div>

    <div class="stats">
      <strong>Showing:</strong>
      {filteredHazards.length} of {sampleHazards.length} hazards
    </div>
  </div>

  <div class="map-wrapper">
    <BaseMap
      center={[42.3615, -71.0595]}
      zoom={14}
      height="600px"
      defaultLayer="satellite"
      onReady={handleMapReady}
    >
      <MapMarkers
        markers={filteredHazards}
        enableClustering={showClustering}
        onMarkerClick={handleMarkerClick}
      />
    </BaseMap>
  </div>

  <div class="test-info">
    <h2>Test Features</h2>
    <ul>
      <li>✅ Multiple hazard markers with different categories</li>
      <li>✅ Category-based colors and icons</li>
      <li>✅ Marker clustering (toggle on/off)</li>
      <li>✅ Custom popups with hazard details</li>
      <li>✅ Filter by category</li>
      <li>✅ Click events</li>
      <li>✅ Cluster visualization (small/medium/large)</li>
    </ul>

    <h3>Test Cluster Behavior</h3>
    <p>
      Three insect hazards are clustered together in the northeast area. Zoom in
      to see them separate or zoom out to see them cluster.
    </p>

    <h3>Categories Tested</h3>
    <div class="category-legend">
      <div class="legend-item">
        <span class="color-box" style="background: #d32f2f;">🐻</span>
        Animals
      </div>
      <div class="legend-item">
        <span class="color-box" style="background: #388e3c;">🌿</span>
        Plants
      </div>
      <div class="legend-item">
        <span class="color-box" style="background: #6d4c41;">⛰️</span>
        Terrain
      </div>
      <div class="legend-item">
        <span class="color-box" style="background: #0277bd;">💧</span>
        Water
      </div>
      <div class="legend-item">
        <span class="color-box" style="background: #f57f17;">🏗️</span>
        Infrastructure
      </div>
      <div class="legend-item">
        <span class="color-box" style="background: #e57373;">🐛</span>
        Insects
      </div>
    </div>
  </div>

  <div class="api-example">
    <h2>Usage Example</h2>
    <pre><code
        >&lt;script&gt;
  import &#123; BaseMap, MapMarkers &#125; from "$lib/components/map";
  
  const hazards = [
    &#123;
      id: 1,
      latitude: 42.3601,
      longitude: -71.0589,
      category: "Animals",
      title: "Coyote Sighting",
      description: "Multiple coyotes spotted...",
    &#125;,
    // ... more hazards
  ];
&lt;/script&gt;

&lt;BaseMap center=&#123;[42.3601, -71.0589]&#125; zoom=&#123;13&#125;&gt;
  &lt;MapMarkers 
    markers=&#123;hazards&#125; 
    enableClustering=&#123;true&#125;
    onMarkerClick=&#123;(marker) => console.log(marker)&#125; /&gt;
&lt;/BaseMap&gt;</code
      ></pre>
  </div>
</div>

<style>
  .test-page {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  h1 {
    color: #1976d2;
    margin-bottom: 1.5rem;
  }

  h2 {
    color: #333;
    font-size: 1.25rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  h3 {
    color: #666;
    font-size: 1.1rem;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .controls {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 2rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .control-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .control-group select {
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .stats {
    margin-left: auto;
    padding: 0.5rem 1rem;
    background: #e3f2fd;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .map-wrapper {
    margin: 2rem 0;
  }

  .test-info {
    background: #e7f5e7;
    border: 1px solid #4caf50;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .test-info ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }

  .test-info li {
    margin: 0.5rem 0;
    font-size: 0.95rem;
  }

  .test-info p {
    margin: 0.5rem 0;
    color: #555;
    font-size: 0.95rem;
  }

  .category-legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .color-box {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  .api-example {
    background: #fff3e0;
    border: 1px solid #ff9800;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .api-example pre {
    background: #263238;
    color: #aed581;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .api-example code {
    font-family: "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1.6;
  }
</style>
