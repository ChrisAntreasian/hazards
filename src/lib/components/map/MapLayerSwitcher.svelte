<script lang="ts">
  import { onMount } from "svelte";
  import { getMapContext } from "./context";
  import { TILE_LAYERS } from "./layers";
  import type { TileLayerConfig } from "./types";

  interface Props {
    defaultLayer?: string;
    position?: "topright" | "topleft" | "bottomright" | "bottomleft";
  }

  let { defaultLayer = "satellite", position = "topright" }: Props = $props();

  // Get map context
  const { map, leaflet: L } = getMapContext();

  // State
  let showMenu = $state(false);
  let currentLayerId = $state(defaultLayer);
  let currentTileLayer = $state<any>(null);
  let menuElement = $state<HTMLDivElement>();
  let controlContainer = $state<HTMLDivElement>();

  // Available layers
  const layers: TileLayerConfig[] = Object.values(TILE_LAYERS);

  /**
   * Switch to a different tile layer
   */
  function switchLayer(layerId: string) {
    if (!map || !L) return;

    const layerConfig = TILE_LAYERS[layerId];
    if (!layerConfig) return;

    // Remove current tile layer
    if (currentTileLayer) {
      map.removeLayer(currentTileLayer);
    }

    // Add new tile layer
    currentTileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom || 19,
    }).addTo(map);

    currentLayerId = layerId;
    showMenu = false;
  }

  /**
   * Toggle menu visibility
   */
  function toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    showMenu = !showMenu;
  }

  /**
   * Close menu when clicking outside
   */
  function handleClickOutside(event: MouseEvent) {
    if (
      showMenu &&
      menuElement &&
      !menuElement.contains(event.target as Node)
    ) {
      const button = controlContainer?.querySelector(".map-layer-button");
      if (button && !button.contains(event.target as Node)) {
        showMenu = false;
      }
    }
  }

  let control: any = null;

  // Initialize control
  onMount(() => {
    if (map && L && controlContainer) {
      // Create Leaflet control
      const Control = L.Control.extend({
        onAdd: function () {
          return controlContainer;
        },
      });

      control = new Control({ position });
      control.addTo(map);

      // Add initial layer
      switchLayer(defaultLayer);
    }

    return () => {
      if (map && control) {
        map.removeControl(control);
      }
    };
  });

  // Handle click outside
  $effect(() => {
    if (showMenu) {
      // Small delay to prevent immediate closure
      const timeout = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  });

</script>

<div bind:this={controlContainer} class="leaflet-control-container leaflet-bar leaflet-control">
  <button
    type="button"
    class="map-layer-button"
    onclick={toggleMenu}
    title="Change map layer"
  >
    🗺️
  </button>

  {#if showMenu}
    <div bind:this={menuElement} class="layer-menu">
      <div class="layer-menu-header">
        <span>Map Layers</span>
        <button
          type="button"
          class="close-btn"
          onclick={() => (showMenu = false)}
          title="Close">✕</button
        >
      </div>

      {#each layers as layer}
        <button
          type="button"
          class="layer-item"
          class:active={currentLayerId === layer.id}
          onclick={() => switchLayer(layer.id)}
        >
          <span class="layer-icon">{layer.icon}</span>
          <span class="layer-name">{layer.name}</span>
          {#if currentLayerId === layer.id}
            <span class="check-icon">✓</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Control Container */
  .leaflet-control-container {
    position: relative;
  }

  /* Floating Layer Button */
  .map-layer-button {
    width: 34px;
    height: 34px;
    background: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
  }

  .map-layer-button:hover {
    background: #f4f4f4;
  }

  /* Layer Menu Popup */
  .layer-menu {
    position: absolute;
    top: 40px;
    right: 0;
    z-index: 1000;
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.65);
    min-width: 200px;
    overflow: hidden;
    animation: slideDown 0.15s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Menu Header */
  .layer-menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem 0.85rem;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    font-weight: 600;
    font-size: 0.85rem;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #e0e0e0;
    color: #333;
  }

  /* Layer Items - Compact Design */
  .layer-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    padding: 0.6rem 0.85rem;
    border: none;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
    position: relative;
  }

  .layer-item:last-child {
    border-bottom: none;
  }

  .layer-item:hover {
    background: #f8f9fa;
  }

  .layer-item.active {
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: white;
  }

  .layer-icon {
    font-size: 20px;
    line-height: 1;
    flex-shrink: 0;
  }

  .layer-name {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .check-icon {
    font-size: 14px;
    font-weight: bold;
    margin-left: auto;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .map-layer-button {
      width: 30px;
      height: 30px;
      font-size: 16px;
    }

    .layer-menu {
      min-width: 180px;
    }
  }
</style>
