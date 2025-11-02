<script lang="ts">
  import { BaseMap, MapLocationMarker, MapLayerSwitcher } from "$lib/components/map";

  let markerRef: any;
  let currentLocation = $state({ lat: 42.3601, lng: -71.0589 });
  let repositionMode = $state(false);
  let draggable = $state(false);
  let markerEnabled = $state(true);
  let markerColor = $state("#1976d2");
  let markerIcon = $state("📍");

  function handleLocationChange(location: { lat: number; lng: number }) {
    currentLocation = location;
    console.log("Location changed:", location);
  }

  function enableReposition() {
    if (markerRef) {
      markerRef.enableRepositionMode();
    }
    repositionMode = true;
  }

  function disableReposition() {
    if (markerRef) {
      markerRef.disableRepositionMode();
    }
    repositionMode = false;
  }

  function panToMarker() {
    if (markerRef) {
      markerRef.panToMarker();
    }
  }

  function setRandomLocation() {
    const lat = 42.3 + Math.random() * 0.2;
    const lng = -71.1 + Math.random() * 0.2;
    if (markerRef) {
      markerRef.setLocation({ lat, lng });
    }
  }
</script>

<svelte:head>
  <title>Location Marker Test - Hazards</title>
</svelte:head>

<div class="test-page">
  <h1>Map Location Marker Plugin Test</h1>

  <div class="info">
    <p>
      The MapLocationMarker plugin provides location picking and repositioning
      functionality:
    </p>
    <ul>
      <li>✅ Draggable location marker</li>
      <li>✅ Click-to-reposition mode</li>
      <li>✅ Programmatic location control</li>
      <li>✅ Custom marker icons and colors</li>
      <li>✅ Location change callbacks</li>
      <li>✅ Pan to marker functionality</li>
    </ul>
  </div>

  <div class="controls">
    <h2>Marker Controls</h2>
    
    <div class="control-section">
      <h3>Mode Controls</h3>
      <div class="button-group">
        <button
          onclick={enableReposition}
          class="btn {repositionMode ? 'btn-primary' : 'btn-secondary'}"
        >
          {repositionMode ? "✓" : ""} 🎯 Reposition Mode
        </button>
        <button
          onclick={disableReposition}
          class="btn {!repositionMode ? 'btn-primary' : 'btn-secondary'}"
        >
          {!repositionMode ? "✓" : ""} 👀 View Mode
        </button>
      </div>
      {#if repositionMode}
        <p class="hint">Click anywhere on the map to reposition the marker</p>
      {/if}
    </div>

    <div class="control-section">
      <h3>Marker Properties</h3>
      <div class="property-controls">
        <label>
          <input type="checkbox" bind:checked={draggable} />
          Enable Drag & Drop
        </label>
        <label>
          <input type="checkbox" bind:checked={markerEnabled} />
          Show Marker
        </label>
      </div>
    </div>

    <div class="control-section">
      <h3>Appearance</h3>
      <div class="appearance-controls">
        <label>
          Marker Icon:
          <select bind:value={markerIcon}>
            <option value="📍">📍 Pin</option>
            <option value="🎯">🎯 Target</option>
            <option value="⭐">⭐ Star</option>
            <option value="🏠">🏠 House</option>
            <option value="🏢">🏢 Building</option>
            <option value="🚩">🚩 Flag</option>
          </select>
        </label>
        <label>
          Marker Color:
          <input type="color" bind:value={markerColor} />
        </label>
      </div>
    </div>

    <div class="control-section">
      <h3>Actions</h3>
      <div class="button-group">
        <button onclick={panToMarker} class="btn btn-primary">
          🗺️ Pan to Marker
        </button>
        <button onclick={setRandomLocation} class="btn btn-secondary">
          🎲 Random Location
        </button>
      </div>
    </div>
  </div>

  <div class="location-display">
    <h2>Current Location</h2>
    <div class="location-coords">
      <div class="coord">
        <span class="label">Latitude:</span>
        <span class="value">{currentLocation.lat.toFixed(6)}</span>
      </div>
      <div class="coord">
        <span class="label">Longitude:</span>
        <span class="value">{currentLocation.lng.toFixed(6)}</span>
      </div>
    </div>
  </div>

  <div class="map-container">
    <h2>Interactive Map</h2>
    <BaseMap center={[currentLocation.lat, currentLocation.lng]} zoom={13} height="500px">
      <MapLayerSwitcher />
      <MapLocationMarker
        bind:this={markerRef}
        initialLocation={currentLocation}
        enabled={markerEnabled}
        draggable={draggable}
        repositionMode={repositionMode}
        markerIcon={markerIcon}
        markerColor={markerColor}
        onLocationChange={handleLocationChange}
      />
    </BaseMap>
  </div>

  <div class="usage">
    <h2>Usage Example</h2>
    <pre><code>&lt;script&gt;
  import &#123; BaseMap, MapLocationMarker &#125; from "$lib/components/map";

  let markerRef;
  let location = $state(&#123; lat: 42.3601, lng: -71.0589 &#125;);

  function handleLocationChange(newLocation) &#123;
    location = newLocation;
    console.log("New location:", newLocation);
  &#125;
&lt;/script&gt;

&lt;BaseMap center=&#123;[location.lat, location.lng]&#125; zoom=&#123;13&#125;&gt;
  &lt;MapLocationMarker
    bind:this=&#123;markerRef&#125;
    initialLocation=&#123;location&#125;
    draggable=&#123;true&#125;
    onLocationChange=&#123;handleLocationChange&#125;
  /&gt;
&lt;/BaseMap&gt;

&lt;!-- Control buttons --&gt;
&lt;button onclick=&#123;() =&gt; markerRef.enableRepositionMode()&#125;&gt;
  Enable Reposition
&lt;/button&gt;
&lt;button onclick=&#123;() =&gt; markerRef.panToMarker()&#125;&gt;
  Pan to Marker
&lt;/button&gt;</code></pre>
  </div>

  <div class="features">
    <h2>Component Features</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">🎯</div>
        <h3>Click to Reposition</h3>
        <p>Enable reposition mode to move marker by clicking the map</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">👆</div>
        <h3>Drag & Drop</h3>
        <p>Make marker draggable for direct manipulation</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>Customizable</h3>
        <p>Change marker icon, color, and appearance</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📡</div>
        <h3>Location Events</h3>
        <p>Get callbacks when location changes</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⚙️</div>
        <h3>Programmatic Control</h3>
        <p>Set location, enable modes, pan to marker via methods</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔧</div>
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

  h3 {
    color: #555;
    font-size: 1.1rem;
    margin: 1rem 0 0.5rem 0;
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

  .control-section {
    margin: 1.5rem 0;
    padding: 1rem;
    background: white;
    border-radius: 6px;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
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

  .hint {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #e3f2fd;
    border-left: 3px solid #1976d2;
    border-radius: 4px;
    font-size: 0.9rem;
    color: #1976d2;
  }

  .property-controls,
  .appearance-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .property-controls label,
  .appearance-controls label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .appearance-controls select,
  .appearance-controls input[type="color"] {
    margin-left: 0.5rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .location-display {
    background: #f1f8e9;
    border: 1px solid #8bc34a;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .location-coords {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .coord {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .coord .label {
    display: block;
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .coord .value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: #1976d2;
    font-family: monospace;
  }

  .map-container {
    margin: 2rem 0;
  }

  .map-container > :global(div) {
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
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
