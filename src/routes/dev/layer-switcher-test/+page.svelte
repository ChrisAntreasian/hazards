<script lang="ts">
  import { BaseMap, MapLayerSwitcher } from "$lib/components/map";
</script>

<svelte:head>
  <title>Layer Switcher Test - Hazards</title>
</svelte:head>

<div class="test-page">
  <h1>Map Layer Switcher Test</h1>

  <div class="info">
    <p>
      The unified layer switcher component combines the best features from both
      implementations:
    </p>
    <ul>
      <li>✅ Floating button design (from /map page)</li>
      <li>✅ Compact menu items (reduced height)</li>
      <li>✅ Active layer highlighted</li>
      <li>✅ Click outside to close</li>
      <li>✅ Smooth animations</li>
      <li>✅ Position configurable (topright, topleft, etc.)</li>
    </ul>
  </div>

  <div class="demo-section">
    <h2>Default Position (Top Right)</h2>
    <div class="map-container">
      <BaseMap center={[42.3601, -71.0589]} zoom={13} height="400px">
        <MapLayerSwitcher />
      </BaseMap>
    </div>
  </div>

  <div class="demo-section">
    <h2>Top Left Position</h2>
    <div class="map-container">
      <BaseMap center={[40.7128, -74.006]} zoom={13} height="400px">
        <MapLayerSwitcher position="topleft" />
      </BaseMap>
    </div>
  </div>

  <div class="features">
    <h2>Component Features</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>Compact Design</h3>
        <p>Reduced padding for cleaner, space-efficient menu items</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📍</div>
        <h3>Position Control</h3>
        <p>
          Place switcher in any corner: topright, topleft, bottomright,
          bottomleft
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">✨</div>
        <h3>Active State</h3>
        <p>Current layer highlighted with gradient background and checkmark</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎯</div>
        <h3>Click Outside</h3>
        <p>Menu automatically closes when clicking outside</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔄</div>
        <h3>Reusable</h3>
        <p>Use in BaseMap, Map, or MapLocationPicker components</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📱</div>
        <h3>Responsive</h3>
        <p>Adapts to mobile screens with adjusted sizing</p>
      </div>
    </div>
  </div>

  <div class="usage">
    <h2>Usage</h2>
    <pre><code
        >&lt;script&gt;
  import &#123; BaseMap, MapLayerSwitcher &#125; from "$lib/components/map";
&lt;/script&gt;

&lt;BaseMap center=&#123;[42.3601, -71.0589]&#125; zoom=&#123;13&#125;&gt;
  &lt;!-- Default position (top right) --&gt;
  &lt;MapLayerSwitcher /&gt;
  
  &lt;!-- Or specify position --&gt;
  &lt;MapLayerSwitcher position="topleft" /&gt;
  
  &lt;!-- Set default layer --&gt;
  &lt;MapLayerSwitcher defaultLayer="terrain" /&gt;
&lt;/BaseMap&gt;</code
      ></pre>
  </div>

  <div class="layers-info">
    <h2>Available Layers</h2>
    <div class="layer-cards">
      <div class="layer-card">
        <div class="layer-icon">🛰️</div>
        <h3>Earth View</h3>
        <p><strong>ID:</strong> satellite</p>
        <p><strong>Source:</strong> Esri World Imagery</p>
        <p class="layer-desc">High-resolution satellite imagery</p>
      </div>

      <div class="layer-card">
        <div class="layer-icon">🚗</div>
        <h3>Street View</h3>
        <p><strong>ID:</strong> street</p>
        <p><strong>Source:</strong> OpenStreetMap</p>
        <p class="layer-desc">Detailed street and road maps</p>
      </div>

      <div class="layer-card">
        <div class="layer-icon">⛰️</div>
        <h3>Terrain View</h3>
        <p><strong>ID:</strong> terrain</p>
        <p><strong>Source:</strong> OpenTopoMap</p>
        <p class="layer-desc">Topographic terrain maps</p>
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
    margin: 0.5rem 0;
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

  .demo-section {
    margin: 2rem 0;
  }

  .map-container {
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    margin: 1rem 0;
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
  }

  .feature-card p {
    color: #666;
    font-size: 0.9rem;
    margin: 0.5rem 0 0 0;
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
    margin: 1rem 0;
  }

  .usage code {
    font-family: "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .layers-info {
    background: #f1f8e9;
    border: 1px solid #8bc34a;
    border-radius: 8px;
    padding: 2rem;
    margin: 2rem 0;
  }

  .layer-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .layer-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .layer-card .layer-icon {
    font-size: 3rem;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .layer-card p {
    color: #666;
    font-size: 0.85rem;
    margin: 0.25rem 0;
  }

  .layer-desc {
    color: #888;
    font-style: italic;
    margin-top: 0.5rem !important;
  }
</style>
