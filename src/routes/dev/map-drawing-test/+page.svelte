<script lang="ts">
  import { BaseMap, MapDrawing, MapLayerSwitcher } from "$lib/components/map";

  let drawingComponent: any;
  let currentArea = $state<GeoJSON.Polygon | null>(null);
  let areaStats = $state<{ vertices: number; originalVertices?: number } | null>(null);
  let drawingEnabled = $state(true);

  function handleAreaChange(area: GeoJSON.Polygon | null) {
    currentArea = area;
    console.log("Area changed:", area);
  }

  function handleAreaStats(stats: { vertices: number; originalVertices?: number } | null) {
    areaStats = stats;
    console.log("Area stats:", stats);
  }

  function startDrawing() {
    if (drawingComponent) {
      drawingComponent.startDrawing();
    }
  }

  function stopDrawing() {
    if (drawingComponent) {
      drawingComponent.stopDrawing();
    }
  }

  function clearArea() {
    if (drawingComponent) {
      drawingComponent.clearArea();
    }
  }
</script>

<svelte:head>
  <title>Map Drawing Test - Hazards</title>
</svelte:head>

<div class="test-page">
  <h1>Map Drawing Plugin Test</h1>

  <div class="info">
    <p>
      The MapDrawing plugin provides polygon drawing functionality with automatic
      simplification:
    </p>
    <ul>
      <li>✅ Draw polygons on the map</li>
      <li>✅ Automatic polygon simplification</li>
      <li>✅ Area statistics (vertex count)</li>
      <li>✅ Clear and reset functionality</li>
      <li>✅ GeoJSON output</li>
      <li>✅ Initial area rendering</li>
    </ul>
  </div>

  <div class="controls">
    <h2>Drawing Controls</h2>
    <div class="button-group">
      <button onclick={startDrawing} class="btn btn-primary">
        ✏️ Start Drawing
      </button>
      <button onclick={stopDrawing} class="btn btn-secondary">
        🛑 Stop Drawing
      </button>
      <button onclick={clearArea} class="btn btn-danger">
        🗑️ Clear Area
      </button>
    </div>

    <div class="toggle">
      <label>
        <input type="checkbox" bind:checked={drawingEnabled} />
        Enable Drawing Plugin
      </label>
    </div>
  </div>

  <div class="map-container">
    <h2>Interactive Map</h2>
    <BaseMap center={[42.3601, -71.0589]} zoom={13} height="500px">
      <MapLayerSwitcher />
      <MapDrawing
        bind:this={drawingComponent}
        enabled={drawingEnabled}
        autoSimplify={true}
        onAreaChange={handleAreaChange}
        onAreaStats={handleAreaStats}
      />
    </BaseMap>
  </div>

  {#if areaStats}
    <div class="stats">
      <h2>Area Statistics</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Vertices</div>
          <div class="stat-value">{areaStats.vertices}</div>
        </div>
        {#if areaStats.originalVertices}
          <div class="stat-card">
            <div class="stat-label">Original Vertices</div>
            <div class="stat-value">{areaStats.originalVertices}</div>
          </div>
          <div class="stat-card highlight">
            <div class="stat-label">Simplified</div>
            <div class="stat-value">
              {Math.round(
                ((areaStats.originalVertices - areaStats.vertices) /
                  areaStats.originalVertices) *
                  100
              )}% reduction
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if currentArea}
    <div class="geojson">
      <h2>GeoJSON Output</h2>
      <pre><code>{JSON.stringify(currentArea, null, 2)}</code></pre>
    </div>
  {/if}

  <div class="usage">
    <h2>Usage Example</h2>
    <pre><code>&lt;script&gt;
  import &#123; BaseMap, MapDrawing &#125; from "$lib/components/map";

  let drawingRef;
  let area = $state(null);
  let stats = $state(null);

  function handleAreaChange(newArea) &#123;
    area = newArea;
  &#125;

  function handleStats(newStats) &#123;
    stats = newStats;
  &#125;
&lt;/script&gt;

&lt;BaseMap center=&#123;[42.3601, -71.0589]&#125; zoom=&#123;13&#125;&gt;
  &lt;MapDrawing
    bind:this=&#123;drawingRef&#125;
    enabled=&#123;true&#125;
    autoSimplify=&#123;true&#125;
    onAreaChange=&#123;handleAreaChange&#125;
    onAreaStats=&#123;handleStats&#125;
  /&gt;
&lt;/BaseMap&gt;

&lt;!-- Control buttons --&gt;
&lt;button onclick=&#123;() =&gt; drawingRef.startDrawing()&#125;&gt;
  Start Drawing
&lt;/button&gt;
&lt;button onclick=&#123;() =&gt; drawingRef.clearArea()&#125;&gt;
  Clear
&lt;/button&gt;</code></pre>
  </div>

  <div class="features">
    <h2>Component Features</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">✏️</div>
        <h3>Polygon Drawing</h3>
        <p>Draw custom polygon areas with leaflet-draw integration</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔧</div>
        <h3>Auto-Simplify</h3>
        <p>Automatically simplifies polygons to reduce vertex count</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>Statistics</h3>
        <p>Track vertex counts and simplification metrics</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎯</div>
        <h3>GeoJSON</h3>
        <p>Outputs standard GeoJSON Polygon format</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔄</div>
        <h3>Programmatic Control</h3>
        <p>Start, stop, and clear drawing via component methods</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🗺️</div>
        <h3>Context Integration</h3>
        <p>Works seamlessly with BaseMap context API</p>
      </div>
    </div>
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
    font-size: 1.5rem;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
  }

  .info {
    background: #e3f2fd;
    border: 1px solid #2196f3;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .info ul {
    margin: 1rem 0 0 0;
    padding-left: 1.5rem;
  }

  .info li {
    margin: 0.5rem 0;
    font-size: 0.95rem;
  }

  .controls {
    background: #fff3e0;
    border: 1px solid #ff9800;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
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
    background: #757575;
    color: white;
  }

  .btn-danger {
    background: #d32f2f;
    color: white;
  }

  .toggle {
    padding: 1rem;
    background: white;
    border-radius: 4px;
  }

  .toggle label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .map-container {
    margin: 2rem 0;
  }

  .map-container > :global(div) {
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  .stats {
    background: #f1f8e9;
    border: 1px solid #8bc34a;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .stat-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .stat-card.highlight {
    background: linear-gradient(135deg, #8bc34a 0%, #689f38 100%);
    color: white;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .stat-card.highlight .stat-label {
    color: rgba(255, 255, 255, 0.9);
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #1976d2;
  }

  .stat-card.highlight .stat-value {
    color: white;
  }

  .geojson {
    background: #263238;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .geojson h2 {
    color: #aed581;
    margin-top: 0;
  }

  .geojson pre {
    background: #1e272e;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0;
  }

  .geojson code {
    color: #aed581;
    font-family: "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .usage {
    background: #fff3e0;
    border: 1px solid #ff9800;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .usage pre {
    background: #263238;
    color: #aed581;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 1rem 0 0 0;
  }

  .usage code {
    font-family: "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .features {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 2rem;
    margin: 2rem 0;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .feature-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .feature-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .feature-card h3 {
    color: #1976d2;
    margin: 0.5rem 0;
    font-size: 1.1rem;
  }

  .feature-card p {
    color: #666;
    font-size: 0.9rem;
    margin: 0.5rem 0 0 0;
  }
</style>
