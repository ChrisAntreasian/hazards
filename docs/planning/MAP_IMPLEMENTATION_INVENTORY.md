# Map Implementation Inventory

**Date:** November 1, 2025  
**Purpose:** Detailed inventory of all current map implementations in the Hazards application

---

## Summary

The application currently has **4 map-related component files** and **4 routes** that use maps:

### Components:
1. ✅ **`Map.svelte`** - Main hazard display map (520 lines)
2. ✅ **`MapLocationPicker.svelte`** - Interactive location/area editor (580 lines)
3. ⚠️ **`MapLocationPicker.minimal.svelte`** - Test stub (120 lines)
4. ⚠️ **`MapLocationPicker.backup.svelte`** - Empty backup (1 line)

### Routes Using Maps:
1. `/map` - Uses `Map.svelte`
2. `/hazards/create` - Uses `MapLocationPicker.svelte`
3. `/hazards/edit/[id]` - Uses `MapLocationPicker.svelte`
4. `/hazards/[id]` - Uses `MapLocationPicker.svelte` (readonly)

---

## Component Details

### 1. Map.svelte

**Path:** `src/lib/components/Map.svelte`  
**Lines:** 520  
**Status:** ✅ Production (Active)  
**Used in:** `/map` route

#### Purpose:
Display an interactive map showing all hazards with clustering, popups, and user location.

#### Features Matrix:

| Feature | Implemented | Notes |
|---------|-------------|-------|
| Leaflet initialization | ✅ | Dynamic import, SSR-safe |
| Tile layers | ✅ | Satellite (default), Street, Terrain |
| Layer switching | ❌ | Controlled externally in route |
| Hazard markers | ✅ | Category-based colors and icons |
| Marker clustering | ✅ | MarkerCluster plugin, 3 size tiers |
| Marker popups | ✅ | Custom HTML with hazard details |
| User location | ✅ | Blue dot marker |
| Drawing tools | ❌ | Not supported |
| Location picking | ❌ | Not supported |
| Readonly mode | ❌ | Always interactive |

#### Props:
```typescript
interface Props {
  hazards?: HazardMapData[];         // Array of hazards to display
  height?: string;                    // Default: "400px"
  center?: [number, number];          // Default: Boston [42.3601, -71.0589]
  zoom?: number;                      // Default: 10
  showUserLocation?: boolean;         // Default: true
  onMapReady?: (mapInstance: LeafletMap) => void;
}
```

#### Dependencies:
- `leaflet@1.9.4`
- `leaflet.markercluster@1.5.3`
- `@types/leaflet@1.9.21`
- `@types/leaflet.markercluster@1.5.6`

#### Tile Layers:
```typescript
// Default: Esri Satellite
const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 19 }
);

// Also loads CSS for clustering
```

#### Category Colors:
```typescript
const categoryColors = {
  Animals: "#d32f2f",
  "Large Mammals": "#d32f2f",
  Plants: "#388e3c",
  Terrain: "#6d4c41",
  Weather: "#1976d2",
  Water: "#0277bd",
  Infrastructure: "#f57f17",
  Chemical: "#9c27b0",
  Other: "#424242",
  // ... more
};
```

#### Category Icons:
```typescript
const icons = {
  Animals: "🐻",
  Plants: "🌿",
  Terrain: "⛰️",
  Weather: "🌩️",
  Water: "💧",
  Infrastructure: "🏗️",
  Chemical: "⚠️",
  Other: "❗",
  // ... more
};
```

#### Marker Clustering Configuration:
```typescript
markerClusterGroup = L.markerClusterGroup({
  maxClusterRadius: 60,
  disableClusteringAtZoom: 16,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: true,
  zoomToBoundsOnClick: true,
  spiderfyDistanceMultiplier: 1.2,
  iconCreateFunction: (cluster) => {
    const count = cluster.getChildCount();
    let className = count < 5 ? "small" : count < 15 ? "medium" : "large";
    let size = count < 5 ? 30 : count < 15 ? 40 : 50;
    return L.divIcon({
      html: `<div><span>${count}</span></div>`,
      className: `marker-cluster ${className}`,
      iconSize: [size, size],
    });
  },
});
```

#### Code Structure:
- **Lines 1-45:** Props, state, imports
- **Lines 46-85:** Effect for map initialization
- **Lines 86-250:** Leaflet/MarkerCluster setup
- **Lines 251-390:** updateHazardMarkers() function
- **Lines 391-430:** getMarkerIcon() helper
- **Lines 431-450:** Reactivity effects
- **Lines 451-520:** Styles (clustering, popups)

---

### 2. MapLocationPicker.svelte

**Path:** `src/lib/components/MapLocationPicker.svelte`  
**Lines:** 580  
**Status:** ✅ Production (Active)  
**Used in:** `/hazards/create`, `/hazards/edit/[id]`, `/hazards/[id]`

#### Purpose:
Interactive map for selecting hazard location and drawing area boundaries.

#### Features Matrix:

| Feature | Implemented | Notes |
|---------|-------------|-------|
| Leaflet initialization | ✅ | Dynamic import, SSR-safe |
| Tile layers | ✅ | Satellite (default), Street, Terrain |
| Layer switching | ✅ | Built-in control |
| Hazard markers | ❌ | Not supported |
| Marker clustering | ❌ | Not supported |
| Location marker | ✅ | Single marker for hazard location |
| Drawing tools | ✅ | Polygon drawing with leaflet-draw |
| Area editing | ✅ | Edit/delete polygons |
| Auto-simplification | ✅ | Uses `map-simplification.ts` |
| Mode switching | ✅ | View / Reposition / Draw |
| Readonly mode | ✅ | Disables all interactions |

#### Props:
```typescript
interface Props {
  initialLocation: { lat: number; lng: number };
  initialArea?: GeoJSON.Polygon | null;
  height?: string;                    // Default: "600px"
  zoom?: number;                      // Default: 13
  readonly?: boolean;                 // Default: false
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onAreaChange?: (area: GeoJSON.Polygon | null) => void;
}
```

#### Interaction Modes:
```typescript
type MapMode = "view" | "reposition" | "draw";

// View: Standard navigation, no editing
// Reposition: Click to move location marker
// Draw: Polygon drawing tool active
```

#### Dependencies:
- `leaflet@1.9.4`
- `leaflet-draw@1.0.4`
- `@types/leaflet@1.9.21`
- `@types/leaflet-draw@1.0.13`
- `$lib/utils/map-simplification` (auto-simplify)

#### Drawing Configuration:
```typescript
const polygonDrawer = new L.Draw.Polygon(map, {
  allowIntersection: false,
  drawError: {
    color: "#e1e100",
    message: "<strong>Error:</strong> shape edges cannot cross!",
  },
  shapeOptions: {
    color: "#3b82f6",
    weight: 2,
    fillOpacity: 0.2,
  },
});
```

#### Auto-Simplification:
```typescript
import { autoSimplifyPolygon } from "$lib/utils/map-simplification";

// Convert coordinates to Point[]
const points = coordinates.map(coord => ({
  lat: coord[1],
  lng: coord[0]
}));

// Simplify
const result = autoSimplifyPolygon(points);
const simplified = result.simplified;

// Update area stats
areaStats = {
  vertices: simplified.length,
  originalVertices: coordinates.length !== simplified.length 
    ? coordinates.length 
    : undefined
};
```

#### Readonly Mode:
```typescript
if (readonly) {
  mapOptions.dragging = false;
  mapOptions.touchZoom = false;
  mapOptions.doubleClickZoom = false;
  mapOptions.scrollWheelZoom = false;
  mapOptions.boxZoom = false;
  mapOptions.keyboard = false;
  mapOptions.zoomControl = false;
  mapOptions.attributionControl = false;
}
```

#### Code Structure:
- **Lines 1-70:** Props, state, imports, effects
- **Lines 71-280:** onMount() - Map initialization
- **Lines 281-310:** handleMapClick() - Reposition mode
- **Lines 311-360:** handleModeChange() - Mode switching
- **Lines 361-470:** Drawing event handlers (create/edit/delete)
- **Lines 471-490:** clearArea() helper
- **Lines 491-580:** Template and styles

---

### 3. MapLocationPicker.minimal.svelte

**Path:** `src/lib/components/MapLocationPicker.minimal.svelte`  
**Lines:** 120  
**Status:** ⚠️ Test Stub (Not Production)  
**Used in:** Nowhere (development testing only)

#### Purpose:
Minimal test component created during debugging to isolate issues.

#### Features:
- Mode buttons (View / Reposition / Draw)
- Location display
- No actual map (placeholder div)
- Used for testing state management without Leaflet

#### Should be deleted:
✅ Yes, after migration is complete

---

### 4. MapLocationPicker.backup.svelte

**Path:** `src/lib/components/MapLocationPicker.backup.svelte`  
**Lines:** 1  
**Status:** ⚠️ Empty Backup  
**Used in:** Nowhere

#### Content:
```svelte
<!-- Backup of original component -->
```

#### Should be deleted:
✅ Yes, immediately (no content)

---

## Route Usage Analysis

### 1. `/map` Route

**File:** `src/routes/map/+page.svelte`  
**Map Component:** `Map.svelte`  
**Purpose:** Main hazard map page

#### Map Integration:
```svelte
<LazyLoad
  loader={loadMap}
  componentProps={{
    hazards,
    height: "600px",
    showUserLocation: true,
    onMapReady: handleMapReady,
  }}
  loadingText="Loading interactive map..."
/>
```

#### External Controls (NOT in Map.svelte):

1. **Floating Layer Switcher:**
   - Button: Floating `🗺️` icon (top-right)
   - Popup menu: Earth View / Street View / Terrain View
   - Uses `switchLayer()` function to change tiles

2. **Geolocation Button:**
   - "📍 Show My Location"
   - Uses `navigator.geolocation.getCurrentPosition()`
   - Centers map on user

3. **Address Search:**
   - Input field + "🔍 Search" button
   - Uses Nominatim geocoding API
   - Limits to US results

4. **Legend:**
   - Displays category colors and icons
   - Static display (not interactive)

5. **Statistics:**
   - Hazard count
   - Category count

#### Tile Layer Switching Logic:
```typescript
async function switchLayer(layerType: "road" | "satellite" | "terrain") {
  const L = await import("leaflet");
  
  // Remove current layer
  if (currentTileLayer) {
    mapInstance.removeLayer(currentTileLayer);
  }
  
  // Add new layer
  const newLayer = tileLayers[layerType];
  currentTileLayer = L.tileLayer(newLayer.url, {
    attribution: newLayer.attribution,
    maxZoom: 19,
  }).addTo(mapInstance);
  
  selectedLayer = layerType;
}
```

#### Issues:
- ⚠️ Layer switching logic is duplicated (exists in route AND potentially needed in component)
- ⚠️ Controls are split between page and component (tight coupling)
- ⚠️ `onMapReady` callback used to extract map instance for external manipulation

---

### 2. `/hazards/create` Route

**File:** `src/routes/hazards/create/+page.svelte`  
**Map Component:** `MapLocationPicker.svelte`  
**Purpose:** Create new hazard report with location and area

#### Map Integration:
```svelte
<MapLocationPicker
  initialLocation={currentLocation ?? { lat: 42.3601, lng: -71.0589 }}
  initialArea={currentArea}
  height="600px"
  zoom={13}
  onLocationChange={handleLocationChange}
  onAreaChange={handleAreaChange}
/>
```

#### Callbacks:
```typescript
const handleLocationChange = (location: { lat: number; lng: number }) => {
  currentLocation = location;
  formData.latitude = location.lat.toString();
  formData.longitude = location.lng.toString();
};

const handleAreaChange = (area: GeoJSON.Polygon | null) => {
  currentArea = area;
};
```

#### Form Integration:
- Location updates `formData.latitude` and `formData.longitude`
- Area stored in `currentArea` state
- Both sent to Supabase on form submit

#### Geolocation:
- "Use Current Location" button in form (NOT in map)
- Uses same `navigator.geolocation` API
- Updates `currentLocation` state, which updates map via props

---

### 3. `/hazards/edit/[id]` Route

**File:** `src/routes/hazards/edit/[id]/+page.svelte`  
**Map Component:** `MapLocationPicker.svelte`  
**Purpose:** Edit existing hazard location and area

#### Map Integration:
```svelte
<MapLocationPicker
  initialLocation={currentLocation}
  initialArea={currentArea}
  height="600px"
  zoom={13}
  onLocationChange={handleLocationChange}
  onAreaChange={handleAreaChange}
/>
```

#### Pre-populated Data:
```typescript
let currentLocation = $state<{ lat: number; lng: number }>({
  lat: hazard.latitude,
  lng: hazard.longitude,
});
let currentArea = $state<GeoJSON.Polygon | null>(hazard.area);
```

#### Same Callbacks as Create:
- `handleLocationChange` updates form
- `handleAreaChange` updates area state
- Form submit updates Supabase record

---

### 4. `/hazards/[id]` Route (View Details)

**File:** `src/routes/hazards/[id]/+page.svelte`  
**Map Component:** `MapLocationPicker.svelte` (readonly)  
**Purpose:** Display hazard location and area (read-only)

#### Map Integration:
```svelte
<MapLocationPicker
  initialLocation={{
    lat: hazard.latitude,
    lng: hazard.longitude
  }}
  initialArea={hazard.area}
  height="400px"
  zoom={13}
  readonly={true}
/>
```

#### Readonly Mode:
- No mode buttons shown
- No editing allowed
- Map still navigable (zoom/pan)
- All interaction handlers disabled

---

## Code Duplication Analysis

### Duplicated Across Map.svelte and MapLocationPicker.svelte:

| Code Block | Map.svelte | MapLocationPicker.svelte | Lines |
|------------|------------|--------------------------|-------|
| Leaflet dynamic import | ✅ | ✅ | ~10 |
| CSS loading (leaflet.css) | ✅ | ✅ | ~15 |
| Map initialization | ✅ | ✅ | ~20 |
| Tile layer definitions | ✅ | ✅ | ~30 |
| Marker creation | ✅ | ✅ | ~15 |
| User location detection | ✅ | ❌ | ~20 |
| Map cleanup | ✅ | ✅ | ~5 |
| **TOTAL** | | | **~115 lines** |

### Additional Duplication in Route Pages:

| Code Block | /map | /hazards/create | /hazards/edit | Lines |
|------------|------|-----------------|---------------|-------|
| Layer switching | ✅ | ❌ | ❌ | ~40 |
| Geolocation | ✅ | ✅ | ✅ | ~25 |
| Address search | ✅ | ❌ | ❌ | ~30 |
| **TOTAL** | | | | **~95 lines** |

### Grand Total Duplication:
**~210 lines** of redundant code across components and routes

---

## Dependencies Inventory

### NPM Packages:
```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "leaflet-draw": "^1.0.4",
    "leaflet.markercluster": "^1.5.3"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.21",
    "@types/leaflet-draw": "^1.0.13",
    "@types/leaflet.markercluster": "^1.5.6"
  }
}
```

### CDN Resources (loaded dynamically):
```
https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css
https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css
https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css
```

### Tile Layer URLs:
```
# Esri Satellite (default)
https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}

# OpenStreetMap
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

# OpenTopoMap
https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png
```

### Geocoding API:
```
https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1&countrycodes=us
```

---

## Feature Comparison Matrix

| Feature | Map.svelte | MapLocationPicker.svelte |
|---------|------------|--------------------------|
| **Display** | | |
| Leaflet map | ✅ | ✅ |
| Tile layers | ✅ | ✅ |
| Layer control | ❌ (external) | ✅ (internal) |
| User location | ✅ | ❌ |
| **Markers** | | |
| Single marker | ❌ | ✅ |
| Multiple markers | ✅ | ❌ |
| Marker clustering | ✅ | ❌ |
| Custom popups | ✅ | ❌ |
| Category styling | ✅ | ❌ |
| **Drawing** | | |
| Polygon drawing | ❌ | ✅ |
| Polygon editing | ❌ | ✅ |
| Polygon deletion | ❌ | ✅ |
| Auto-simplification | ❌ | ✅ |
| GeoJSON import | ❌ | ✅ |
| **Interaction** | | |
| View mode | ✅ | ✅ |
| Reposition mode | ❌ | ✅ |
| Draw mode | ❌ | ✅ |
| Readonly mode | ❌ | ✅ |
| Click events | ❌ | ✅ |
| **Configuration** | | |
| Configurable height | ✅ | ✅ |
| Configurable zoom | ✅ | ✅ |
| Configurable center | ✅ | ✅ |
| Props-based | ✅ | ✅ |
| Callbacks | ✅ (onMapReady) | ✅ (onLocationChange, onAreaChange) |

---

## Utility Functions

### Map Simplification

**File:** `src/lib/utils/map-simplification.ts`  
**Used by:** MapLocationPicker.svelte  
**Purpose:** Auto-simplify drawn polygons to reduce vertex count

#### Algorithm:
Uses Ramer-Douglas-Peucker algorithm with intelligent tolerance selection.

#### API:
```typescript
interface Point {
  lat: number;
  lng: number;
}

interface SimplificationResult {
  simplified: Point[];
  originalCount: number;
  simplifiedCount: number;
  tolerance: number;
  reductionPercent: number;
}

function autoSimplifyPolygon(
  points: Point[],
  targetVertices: number = 50,
  maxIterations: number = 10
): SimplificationResult;
```

#### Example Usage:
```typescript
const points = [
  { lat: 42.3601, lng: -71.0589 },
  { lat: 42.3602, lng: -71.0590 },
  // ... 200 more points
];

const result = autoSimplifyPolygon(points, 50);
// result.simplified has ~50 points
// result.reductionPercent = 75% (reduced from 202 to 50)
```

---

## Known Issues

### Map.svelte:
1. ⚠️ Layer switching controlled externally (tight coupling)
2. ⚠️ CSS loaded dynamically (could be bundled)
3. ⚠️ No error handling for MarkerCluster plugin failure
4. ⚠️ Marker update logic uses length comparison (fragile)

### MapLocationPicker.svelte:
1. ⚠️ Long onMount() function (~210 lines)
2. ⚠️ Mode switching logic complex (needs refactoring)
3. ⚠️ Drawing events tightly coupled to L.Draw
4. ⚠️ No validation for invalid GeoJSON

### Route Pages:
1. ⚠️ Geolocation logic duplicated across routes
2. ⚠️ Layer switching only on /map route
3. ⚠️ Address search only on /map route
4. ⚠️ No consistent error handling

---

## Performance Considerations

### Bundle Size:
- Leaflet: ~140KB (minified)
- leaflet-draw: ~50KB
- leaflet.markercluster: ~30KB
- **Total:** ~220KB for map dependencies

### Optimization Opportunities:
1. ✅ Lazy load Map.svelte (currently done on /map route)
2. ❌ Could lazy load leaflet-draw only when needed
3. ❌ Could lazy load markercluster only when needed
4. ❌ Could bundle tile layer configs
5. ❌ Could use shared Leaflet instance across components

---

## Migration Priorities

### High Priority (Critical Functionality):
1. ✅ Preserve all existing features
2. ✅ No breaking changes to route pages
3. ✅ Maintain performance (no degradation)

### Medium Priority (Code Quality):
1. ✅ Eliminate code duplication
2. ✅ Improve testability
3. ✅ Better TypeScript types

### Low Priority (Nice to Have):
1. ⭐ Bundle size reduction
2. ⭐ Performance improvements
3. ⭐ Better error handling
4. ⭐ Accessibility improvements

---

## Conclusion

The current map implementation works well but has significant code duplication and tight coupling between components and routes. A unified architecture will:

1. **Reduce maintenance burden** - Single source of truth
2. **Improve code reusability** - Plugin-based architecture
3. **Enable future features** - Easy to add new map functionality
4. **Better developer experience** - Clearer API, better docs

The unification plan provides a clear path forward with minimal risk and maximum benefit.

---

**Document Version:** 1.0  
**Last Updated:** November 1, 2025  
**Related Documents:**
- [Map Unification Plan](./MAP_UNIFICATION_PLAN.md)
- [Map Location Picker Guide](./MAP_LOCATION_PICKER_PLANNING_GUIDE.md)
