# Unified Map Component System

A modular, plugin-based architecture for map functionality in the Hazards application.

## Overview

The unified map system consists of:

- **BaseMap** - Core Leaflet map component
- **Plugins** - Composable components for specific features (markers, drawing, etc.)
- **Utilities** - Helper functions and configurations
- **Context API** - Share map instance between components

## Architecture

```
BaseMap.svelte (Core)
├── Provides: Leaflet instance, tile management, lifecycle
├── Props: center, zoom, height, layers, callbacks
└── Children: Plugin components via slots

MapMarkers.svelte (Plugin) - Coming soon
MapDrawing.svelte (Plugin) - Coming soon
MapLocationPicker.svelte (Plugin) - Coming soon
MapControls.svelte (Utility) - Coming soon
```

## Installation

The map system is already included in the project. Import components from:

```typescript
import { BaseMap } from "$lib/components/map";
```

## Basic Usage

### Simple Map Display

```svelte
<script>
  import { BaseMap } from "$lib/components/map";
</script>

<BaseMap
  center={[42.3601, -71.0589]}
  zoom={13}
  height="500px"
  defaultLayer="satellite"
/>
```

### With Callbacks

```svelte
<script>
  import { BaseMap } from "$lib/components/map";
  import type { Map as LeafletMap } from "leaflet";

  let mapInstance: LeafletMap | null = null;

  function handleMapReady(map: LeafletMap) {
    mapInstance = map;
    console.log("Map ready!", map);
  }

  function handleMapClick(event: any) {
    console.log("Clicked at:", event.latlng);
  }
</script>

<BaseMap
  center={[42.3601, -71.0589]}
  zoom={13}
  height="500px"
  onReady={handleMapReady}
  onClick={handleMapClick}
/>
```

### Readonly Mode

```svelte
<BaseMap
  center={[42.3601, -71.0589]}
  zoom={13}
  height="400px"
  readonly={true}
/>
```

## BaseMap Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `center` | `[number, number]` | `[42.3601, -71.0589]` | Map center (lat, lng) |
| `zoom` | `number` | `10` | Initial zoom level |
| `height` | `string` | `"400px"` | Map container height |
| `defaultLayer` | `string` | `"satellite"` | Default tile layer ID |
| `availableLayers` | `TileLayerConfig[]` | All layers | Available tile layers |
| `readonly` | `boolean` | `false` | Disable all interactions |
| `zoomControl` | `boolean` | `true` | Show zoom controls |
| `scrollWheelZoom` | `boolean` | `true` | Enable scroll wheel zoom |
| `dragging` | `boolean` | `true` | Enable map dragging |
| `onReady` | `(map: LeafletMap) => void` | `undefined` | Called when map is ready |
| `onClick` | `(event: any) => void` | `undefined` | Called on map click |
| `onMoveEnd` | `() => void` | `undefined` | Called after map moves |
| `onZoomEnd` | `() => void` | `undefined` | Called after zoom changes |

## Tile Layers

The system includes three pre-configured tile layers:

### Satellite (Default)
- **ID:** `satellite`
- **Icon:** 🛰️
- **Name:** Earth View
- **Source:** Esri World Imagery

### Street
- **ID:** `street`
- **Icon:** 🚗
- **Name:** Street View
- **Source:** OpenStreetMap

### Terrain
- **ID:** `terrain`
- **Icon:** ⛰️
- **Name:** Terrain View
- **Source:** OpenTopoMap

## Imperative API

The BaseMap component exposes methods for programmatic control:

```svelte
<script>
  import { BaseMap } from "$lib/components/map";

  let baseMap: any;

  function switchToStreetView() {
    baseMap.switchLayer("street");
  }

  function goToLocation() {
    baseMap.setView([40.7128, -74.0060], 12); // New York
  }
</script>

<BaseMap bind:this={baseMap} />

<button onclick={switchToStreetView}>Street View</button>
<button onclick={goToLocation}>Go to NYC</button>
```

### Available Methods

- `switchLayer(layerId: string)` - Switch to a different tile layer
- `getMap()` - Get the Leaflet map instance
- `getLeaflet()` - Get the Leaflet library
- `panTo(latlng: [number, number], options?)` - Pan to location
- `setView(latlng: [number, number], zoom: number, options?)` - Set view
- `fitBounds(bounds: any, options?)` - Fit map to bounds

## Context API

Plugins can access the map instance via context:

```svelte
<script>
  import { getMapContext } from "$lib/components/map";
  import { onMount } from "svelte";

  const { map, leaflet, addCleanup } = getMapContext();

  onMount(() => {
    if (map && leaflet) {
      // Add custom marker
      const marker = leaflet.marker([42.3601, -71.0589]).addTo(map);

      // Register cleanup
      addCleanup(() => {
        marker.remove();
      });
    }
  });
</script>
```

## Utilities

### Get Current Location

```typescript
import { getCurrentLocation } from "$lib/components/map";

const location = await getCurrentLocation();
console.log(location); // { lat: 42.3601, lng: -71.0589 }
```

### Geocode Address

```typescript
import { geocodeAddress } from "$lib/components/map";

const results = await geocodeAddress("Boston, MA");
console.log(results[0]); // { lat: 42.3601, lng: -71.0589, displayName: "..." }
```

### Format Coordinates

```typescript
import { formatCoordinates } from "$lib/components/map";

const formatted = formatCoordinates(42.3601, -71.0589);
console.log(formatted); // "42.360100, -71.058900"
```

### Calculate Distance

```typescript
import { calculateDistance } from "$lib/components/map";

const distance = calculateDistance(
  { lat: 42.3601, lng: -71.0589 },
  { lat: 40.7128, lng: -74.0060 }
);
console.log(distance); // Distance in meters
```

## Plugin Development (Coming Soon)

Plugins are Svelte components that enhance BaseMap with specific features.

### Plugin Template

```svelte
<script>
  import { getMapContext } from "$lib/components/map";
  import { onMount } from "svelte";

  const { map, leaflet, addCleanup } = getMapContext();

  onMount(() => {
    if (!map || !leaflet) return;

    // Your plugin logic here
    // Example: Add a marker
    const marker = leaflet.marker([42.3601, -71.0589]).addTo(map);

    // Register cleanup
    addCleanup(() => {
      marker.remove();
    });
  });
</script>
```

### Using Plugins

```svelte
<script>
  import { BaseMap } from "$lib/components/map";
  import MyPlugin from "./MyPlugin.svelte";
</script>

<BaseMap center={[42.3601, -71.0589]} zoom={13}>
  <MyPlugin />
</BaseMap>
```

## Testing

Test the BaseMap component at: `/dev/basemap-test`

## Migration Guide

### From Old Map.svelte

**Before:**
```svelte
<Map hazards={hazards} height="500px" onMapReady={handleReady} />
```

**After (with plugins):**
```svelte
<BaseMap center={[42.3601, -71.0589]} zoom={10} height="500px" onReady={handleReady}>
  <MapMarkers markers={hazards} enableClustering={true} />
</BaseMap>
```

### From Old MapLocationPicker.svelte

**Before:**
```svelte
<MapLocationPicker
  initialLocation={location}
  initialArea={area}
  onLocationChange={handleLocationChange}
  onAreaChange={handleAreaChange}
/>
```

**After (with plugins):**
```svelte
<BaseMap center={[location.lat, location.lng]} zoom={13}>
  <MapLocationPicker location={location} onLocationChange={handleLocationChange} />
  <MapDrawing area={area} onAreaChange={handleAreaChange} />
</BaseMap>
```

## Roadmap

### Phase 1: Foundation ✅
- [x] BaseMap core component
- [x] Type definitions
- [x] Tile layer configuration
- [x] Context API
- [x] Utility functions

### Phase 2: Plugins (In Progress)
- [ ] MapMarkers - Hazard markers with clustering
- [ ] MapDrawing - Polygon drawing and editing
- [ ] MapLocationPicker - Location marker and repositioning
- [ ] MapControls - Layer switcher, geolocation, search

### Phase 3: Migration
- [ ] Refactor Map.svelte
- [ ] Refactor MapLocationPicker.svelte
- [ ] Update route pages
- [ ] Remove deprecated files

### Phase 4: Polish
- [ ] Comprehensive testing
- [ ] Documentation updates
- [ ] Performance optimization

## Support

For issues or questions, see:
- [Map Unification Plan](../../../docs/planning/MAP_UNIFICATION_PLAN.md)
- [Map Implementation Inventory](../../../docs/planning/MAP_IMPLEMENTATION_INVENTORY.md)

## License

Part of the Hazards application.
