# Map Component Unification Plan

**Date:** November 1, 2025  
**Status:** Planning Phase  
**Objective:** Unify multiple Leaflet map implementations into a maintainable, modular component architecture

---

## Executive Summary

The application previously had **multiple independent map implementations** with overlapping functionality. This unification effort has been **successfully completed** as of December 2025.

### Before (Problem)
1. **`Map.svelte`** - Main map with hazard markers and clustering
2. **`MapLocationPicker.svelte`** - Interactive location/area picker with drawing tools
3. **`MapLocationPicker.minimal.svelte`** - Simplified test version
4. **`MapLocationPicker.backup.svelte`** - Empty backup file

This created:
- **Code duplication** (Leaflet initialization, tile layers, markers)
- **Maintenance burden** (changes need to be replicated)
- **Inconsistent UX** (different map behaviors across pages)
- **Larger bundle size** (redundant code)

### After (Solution) ✅

A unified, modular architecture with:
- **BaseMap.svelte** - Core Leaflet wrapper
- **6 Plugin Components** - MapMarkers, MapDrawing, MapLocationMarker, MapLayerSwitcher, MapLocationSearch, MapUserLocation
- **Support Files** - types.ts, context.ts, layers.ts, utils.ts, index.ts

**Result:** ~280 lines of duplicate code eliminated, consistent behavior across all pages, easy maintenance.

---

## Current State Analysis

### 1. Map.svelte (Main Hazard Map)

**Location:** `src/lib/components/Map.svelte`  
**Used in:** `/map` route  
**Lines of code:** ~520

#### Features:
- ✅ Dynamic Leaflet import (SSR-safe)
- ✅ MarkerCluster plugin integration
- ✅ Multiple tile layers (Satellite/Earth, Street, Terrain)
- ✅ Hazard markers with category-based colors and icons
- ✅ Custom marker popups with hazard details
- ✅ User location detection and marker
- ✅ Responsive marker clustering (3 sizes: small/medium/large)
- ✅ Map instance callback (`onMapReady`)
- ✅ Configurable via props (hazards, height, center, zoom, showUserLocation)

#### Tile Layers:
```javascript
// Default: Esri Satellite/Earth View
"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

// OpenStreetMap
"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

// OpenTopoMap (terrain)
"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
```

#### Limitations:
- No drawing functionality
- No location picking/editing
- Read-only map display

---

### 2. MapLocationPicker.svelte (Interactive Location/Area Editor)

**Location:** `src/lib/components/MapLocationPicker.svelte`  
**Used in:** `/hazards/create`, `/hazards/edit/[id]`, `/hazards/[id]` routes  
**Lines of code:** ~580

#### Features:
- ✅ All base map features (Leaflet, tile layers)
- ✅ Three interaction modes:
  - **View** - Read-only navigation
  - **Reposition** - Click to move location marker
  - **Draw** - Polygon drawing with leaflet-draw
- ✅ GeoJSON polygon support (create/edit/delete)
- ✅ Auto-simplification of drawn polygons (via `map-simplification.ts`)
- ✅ Area statistics (vertex count, simplification feedback)
- ✅ Readonly mode for view-only display
- ✅ Layer control (Earth/Street/Terrain views)
- ✅ Location and area change callbacks
- ✅ Initial location and area props

#### Interaction Modes:
```typescript
mapMode: "view" | "reposition" | "draw"

// View: Standard map navigation
// Reposition: Click to update marker position
// Draw: Polygon drawing tool active
```

#### Props Interface:
```typescript
interface Props {
  initialLocation: { lat: number; lng: number };
  initialArea?: GeoJSON.Polygon | null;
  height?: string;
  zoom?: number;
  readonly?: boolean;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onAreaChange?: (area: GeoJSON.Polygon | null) => void;
}
```

#### Limitations:
- No hazard markers display
- No marker clustering
- Redundant Leaflet initialization code
- Duplicate tile layer definitions

---

### 3. Map Usage in Routes

#### `/map` Route (map/+page.svelte)
- Uses: `Map.svelte`
- Features:
  - Layer switcher (floating button + popup menu)
  - Geolocation ("Show My Location" button)
  - Address/ZIP search with Nominatim geocoding
  - Legend with category colors
  - Statistics display (hazard count, categories)
  - External map controls (not in Map.svelte component)

#### `/hazards/create` & `/hazards/edit/[id]` Routes
- Uses: `MapLocationPicker.svelte`
- Features:
  - Mode control buttons (View/Reposition/Draw Area)
  - Location display with coordinates
  - Area statistics display
  - Geolocation integration
  - Form integration (lat/lng/area binding)

#### `/hazards/[id]` Route (View Details)
- Uses: `MapLocationPicker.svelte` in readonly mode
- Features:
  - Display-only map with hazard location
  - Shows existing area if available
  - No interaction controls

---

## Duplication Analysis

### Code Duplicated Across Components:

1. **Leaflet Initialization** (~50 lines)
   - Dynamic import
   - CSS loading
   - Map instance creation
   - Cleanup on unmount

2. **Tile Layer Management** (~40 lines)
   - Same 3 tile layer URLs
   - Layer switching logic
   - Attribution handling

3. **Marker Management** (~30 lines)
   - Location marker creation
   - Marker positioning
   - Custom marker icons

4. **Geolocation Logic** (~20 lines)
   - Navigator.geolocation API
   - Error handling
   - Position callback

**Total Estimated Duplication:** ~140 lines per component = **280+ lines** of redundant code

---

## Proposed Architecture

### Design Principles:
1. **Composition over inheritance** - Plugin-based architecture
2. **Single Responsibility** - Each component has one clear purpose
3. **Props-based configuration** - Flexible, declarative API
4. **SSR-safe** - All Leaflet imports are dynamic
5. **Type-safe** - Full TypeScript support
6. **Backward compatible** - Drop-in replacements for existing components

### Component Hierarchy:

```
BaseMap.svelte (Core)
├── Provides: Leaflet instance, tile management, lifecycle
├── Props: center, zoom, height, layers, onReady
└── Slots: controls, markers, overlays

MapMarkers.svelte (Plugin)
├── Depends on: BaseMap context
├── Provides: Marker clustering, popups, category styling
└── Props: markers[], clusterOptions, onMarkerClick

MapDrawing.svelte (Plugin)
├── Depends on: BaseMap context
├── Provides: Polygon drawing, editing, deletion
├── Props: initialArea, onAreaChange, mode
└── Uses: leaflet-draw, map-simplification

MapLocationPicker.svelte (Plugin)
├── Depends on: BaseMap context
├── Provides: Location marker, reposition mode
└── Props: location, onLocationChange, draggable

MapControls.svelte (Utility)
├── Layer switcher
├── Geolocation button
├── Zoom controls
└── Search box
```

### Usage Example - Main Map:
```svelte
<BaseMap center={[42.3601, -71.0589]} zoom={10} onReady={handleMapReady}>
  <MapMarkers 
    markers={hazards} 
    enableClustering={true}
    categoryColors={categoryColorMap} />
  
  <MapControls 
    showLayerSwitcher={true}
    showGeolocation={true}
    showSearch={true} />
</BaseMap>
```

### Usage Example - Location Picker:
```svelte
<BaseMap center={initialLocation} zoom={13}>
  <MapLocationPicker
    location={currentLocation}
    mode={mapMode}
    onLocationChange={handleLocationChange} />
  
  <MapDrawing
    area={currentArea}
    mode={mapMode}
    onAreaChange={handleAreaChange} />
  
  <MapControls 
    showLayerSwitcher={true}
    customControls={modeButtons} />
</BaseMap>
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal:** Create core BaseMap component

#### Task 1.1: Create BaseMap.svelte
- [ ] Dynamic Leaflet import with SSR safety
- [ ] Map initialization and lifecycle management
- [ ] Tile layer management (add/remove/switch)
- [ ] Context API for child components
- [ ] Cleanup on unmount
- [ ] Props: `center`, `zoom`, `height`, `layers`, `readonly`, `onReady`
- [ ] Slots: `default` (for plugins), `controls`

**Files:**
- `src/lib/components/map/BaseMap.svelte`
- `src/lib/components/map/types.ts` (shared interfaces)
- `src/lib/components/map/context.ts` (Svelte context)

#### Task 1.2: Create Tile Layer Configuration
- [ ] Centralized tile layer definitions
- [ ] Export layer metadata (name, icon, URL, attribution)

**Files:**
- `src/lib/components/map/layers.ts`

---

### Phase 2: Plugins (Week 2)
**Goal:** Extract reusable map functionality into plugins

#### Task 2.1: Create MapMarkers.svelte
- [ ] Marker clustering with MarkerCluster plugin
- [ ] Category-based styling (colors, icons)
- [ ] Popup generation from marker data
- [ ] Reactive marker updates
- [ ] Props: `markers`, `clusterOptions`, `categoryColors`, `onMarkerClick`

**Files:**
- `src/lib/components/map/MapMarkers.svelte`

#### Task 2.2: Create MapDrawing.svelte
- [ ] Leaflet-draw integration
- [ ] Polygon drawing/editing/deletion
- [ ] Auto-simplification integration
- [ ] GeoJSON import/export
- [ ] Props: `area`, `onAreaChange`, `mode`, `readonly`

**Files:**
- `src/lib/components/map/MapDrawing.svelte`

#### Task 2.3: Create MapLocationPicker.svelte (Plugin)
- [ ] Location marker management
- [ ] Reposition mode (click to move)
- [ ] Draggable marker option
- [ ] Props: `location`, `onLocationChange`, `mode`, `draggable`

**Files:**
- `src/lib/components/map/MapLocationPicker.svelte`

#### Task 2.4: Create MapControls.svelte
- [ ] Layer switcher (floating button + menu)
- [ ] Geolocation button
- [ ] Address/ZIP search with geocoding
- [ ] Custom control slots
- [ ] Props: `showLayerSwitcher`, `showGeolocation`, `showSearch`

**Files:**
- `src/lib/components/map/MapControls.svelte`

---

### Phase 3: Migration (Week 3)
**Goal:** Refactor existing components to use new architecture

#### Task 3.1: Refactor Main Map
- [ ] Update `Map.svelte` to use BaseMap + MapMarkers
- [ ] Preserve all existing functionality
- [ ] Test on `/map` route
- [ ] Verify marker clustering works
- [ ] Verify popups work

**Files Modified:**
- `src/lib/components/Map.svelte`

#### Task 3.2: Refactor Location Picker
- [ ] Update `MapLocationPicker.svelte` to use plugins
- [ ] Test on `/hazards/create` route
- [ ] Test on `/hazards/edit/[id]` route
- [ ] Test readonly mode on `/hazards/[id]` route
- [ ] Verify drawing works
- [ ] Verify reposition works

**Files Modified:**
- `src/lib/components/MapLocationPicker.svelte`

#### Task 3.3: Update Route Pages
- [ ] Update `/map` route controls to use MapControls
- [ ] Test layer switching
- [ ] Test geolocation
- [ ] Test address search

**Files Modified:**
- `src/routes/map/+page.svelte`

---

### Phase 4: Cleanup & Polish (Week 4)
**Goal:** Remove old code, add tests, update docs

#### Task 4.1: Remove Deprecated Files
- [ ] Delete `MapLocationPicker.backup.svelte`
- [ ] Delete `MapLocationPicker.minimal.svelte`
- [ ] Archive old component versions (if needed)

#### Task 4.2: Testing
- [ ] Unit tests for BaseMap
- [ ] Unit tests for each plugin
- [ ] Integration tests for map pages
- [ ] Visual regression tests (optional)

**Files:**
- `src/lib/components/map/__tests__/`

#### Task 4.3: Documentation
- [ ] Update README.md with new architecture
- [ ] Create component usage guide
- [ ] Add JSDoc comments to all components
- [ ] Update MAP_LOCATION_PICKER_PLANNING_GUIDE.md

**Files:**
- `docs/components/MAP_COMPONENTS.md` (new)
- `docs/planning/MAP_LOCATION_PICKER_PLANNING_GUIDE.md` (update)

---

## API Design

### BaseMap.svelte

```typescript
interface BaseMapProps {
  // Map initialization
  center?: [number, number];
  zoom?: number;
  height?: string;
  
  // Behavior
  readonly?: boolean;
  zoomControl?: boolean;
  scrollWheelZoom?: boolean;
  
  // Tile layers
  defaultLayer?: 'satellite' | 'street' | 'terrain';
  availableLayers?: LayerConfig[];
  
  // Callbacks
  onReady?: (map: L.Map) => void;
  onClick?: (event: L.LeafletMouseEvent) => void;
  onMoveEnd?: () => void;
}
```

### MapMarkers.svelte

```typescript
interface MapMarkersProps {
  // Data
  markers: MarkerData[];
  
  // Clustering
  enableClustering?: boolean;
  clusterOptions?: MarkerClusterOptions;
  
  // Styling
  categoryColors?: Record<string, string>;
  categoryIcons?: Record<string, string>;
  
  // Behavior
  popupTemplate?: (marker: MarkerData) => string;
  onMarkerClick?: (marker: MarkerData) => void;
}

interface MarkerData {
  id: string | number;
  latitude: number;
  longitude: number;
  category?: string;
  title?: string;
  description?: string;
  [key: string]: any;
}
```

### MapDrawing.svelte

```typescript
interface MapDrawingProps {
  // Drawing state
  area?: GeoJSON.Polygon | null;
  mode?: 'view' | 'draw' | 'edit';
  
  // Behavior
  autoSimplify?: boolean;
  simplifyTolerance?: number;
  maxVertices?: number;
  
  // Styling
  drawColor?: string;
  fillOpacity?: number;
  
  // Callbacks
  onAreaChange?: (area: GeoJSON.Polygon | null) => void;
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}
```

### MapLocationPicker.svelte (Plugin)

```typescript
interface MapLocationPickerProps {
  // Location
  location: { lat: number; lng: number };
  
  // Behavior
  mode?: 'view' | 'reposition';
  draggable?: boolean;
  
  // Styling
  markerIcon?: L.DivIcon | L.Icon;
  
  // Callbacks
  onLocationChange?: (location: { lat: number; lng: number }) => void;
}
```

### MapControls.svelte

```typescript
interface MapControlsProps {
  // Control visibility
  showLayerSwitcher?: boolean;
  showGeolocation?: boolean;
  showSearch?: boolean;
  showZoom?: boolean;
  
  // Layer switcher
  layers?: LayerConfig[];
  defaultLayer?: string;
  
  // Search
  searchPlaceholder?: string;
  searchCountry?: string; // ISO code
  onSearchResult?: (result: GeocodingResult) => void;
  
  // Slots
  customControls?: any; // Slot for custom buttons
}
```

---

## Benefits of Unification

### 1. **Maintainability** ⭐⭐⭐⭐⭐
- Single source of truth for Leaflet initialization
- Changes propagate automatically to all maps
- Easier to update Leaflet version
- Centralized bug fixes

### 2. **Code Reusability** ⭐⭐⭐⭐⭐
- Plugins can be mixed and matched
- Custom maps can be built from existing plugins
- No code duplication

### 3. **Bundle Size Reduction** ⭐⭐⭐⭐
- Estimated: **280+ lines** of duplicate code eliminated
- Shared Leaflet import and initialization
- Tree-shaking friendly

### 4. **Consistency** ⭐⭐⭐⭐⭐
- Same map behavior across all pages
- Consistent tile layers
- Unified styling

### 5. **Testing** ⭐⭐⭐⭐
- Test BaseMap once, benefits all components
- Easier to mock for unit tests
- Clear component boundaries

### 6. **Developer Experience** ⭐⭐⭐⭐⭐
- Clear, intuitive API
- Easy to understand component hierarchy
- Better TypeScript support
- Comprehensive documentation

### 7. **Flexibility** ⭐⭐⭐⭐⭐
- Easy to add new plugins
- Customizable via props and slots
- Supports future requirements

---

## Migration Strategy

### Approach: **Incremental Migration**
We will NOT do a "big bang" rewrite. Instead:

1. ✅ Create new components alongside existing ones
2. ✅ Test thoroughly in isolation
3. ✅ Migrate one route at a time
4. ✅ Keep old components as fallback
5. ✅ Delete old components only after full migration

### Risk Mitigation:
- **Feature parity testing:** Checklist for each route
- **Visual regression tests:** Screenshots before/after
- **User testing:** Verify no functionality lost
- **Rollback plan:** Git branches for easy revert

---

## File Structure

```
src/lib/components/
├── map/                              # New unified map components
│   ├── BaseMap.svelte               # Core map component
│   ├── MapMarkers.svelte            # Marker clustering plugin
│   ├── MapDrawing.svelte            # Polygon drawing plugin
│   ├── MapLocationPicker.svelte     # Location picking plugin
│   ├── MapControls.svelte           # Control buttons/UI
│   ├── context.ts                   # Svelte context for map instance
│   ├── types.ts                     # TypeScript interfaces
│   ├── layers.ts                    # Tile layer configurations
│   ├── utils.ts                     # Helper functions
│   └── __tests__/                   # Unit tests
│       ├── BaseMap.test.ts
│       ├── MapMarkers.test.ts
│       └── MapDrawing.test.ts
│
├── Map.svelte                       # Main map (REFACTORED)
├── MapLocationPicker.svelte         # Location picker (REFACTORED)
├── MapLocationPicker.backup.svelte  # TO BE DELETED
└── MapLocationPicker.minimal.svelte # TO BE DELETED
```

---

## Success Criteria

### Must Have:
- ✅ All existing map functionality preserved
- ✅ No visual changes to end users (unless intended)
- ✅ All routes working (no broken maps)
- ✅ Tests passing
- ✅ No console errors or warnings

### Should Have:
- ✅ At least **200 lines** of code reduction
- ✅ All plugins documented with examples
- ✅ Performance maintained or improved
- ✅ Bundle size reduction measured

### Nice to Have:
- ✅ Visual regression tests
- ✅ Storybook examples for each plugin
- ✅ Performance benchmarks
- ✅ Accessibility improvements

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Foundation** | Week 1 (5 days) | BaseMap.svelte, context, types |
| **Phase 2: Plugins** | Week 2 (5 days) | MapMarkers, MapDrawing, MapLocationPicker, MapControls |
| **Phase 3: Migration** | Week 3 (5 days) | Refactored Map.svelte, MapLocationPicker.svelte, route pages |
| **Phase 4: Cleanup** | Week 4 (5 days) | Tests, docs, deprecated file removal |
| **Total** | **4 weeks** | Fully unified map architecture |

---

## Open Questions

1. **Context API vs Props Drilling?**
   - Use Svelte context to pass map instance to plugins?
   - Or require explicit prop passing?
   - **Recommendation:** Context API for cleaner plugin composition

2. **Backward Compatibility?**
   - Keep old Map.svelte and MapLocationPicker.svelte exports?
   - Or force migration to new API?
   - **Recommendation:** Refactor in-place, no breaking changes to consumers

3. **Leaflet Version?**
   - Stay on Leaflet 1.9.4?
   - Upgrade to latest?
   - **Recommendation:** Stay on 1.9.4 (stable), upgrade separately

4. **Testing Strategy?**
   - Unit tests with Vitest?
   - E2E tests with Playwright?
   - Visual regression with Percy/Chromatic?
   - **Recommendation:** Unit tests first, E2E later

5. **Plugin Discovery?**
   - Auto-inject plugins by detecting children?
   - Or explicit registration?
   - **Recommendation:** Explicit (clearer, more predictable)

---

## Next Steps

1. **Review this plan** with the team
2. **Approve architecture** and API design
3. **Set up git branch** for map unification work
4. **Start Phase 1** - Create BaseMap.svelte
5. **Regular check-ins** to validate approach

---

## References

- [Leaflet Documentation](https://leafletjs.com/)
- [leaflet-draw Plugin](https://github.com/Leaflet/Leaflet.draw)
- [leaflet.markercluster Plugin](https://github.com/Leaflet/Leaflet.markercluster)
- [Svelte Context API](https://svelte.dev/docs/svelte#setcontext)
- [Current MapLocationPicker Guide](./MAP_LOCATION_PICKER_PLANNING_GUIDE.md)

---

**Document Version:** 2.0 (Final)  
**Last Updated:** December 14, 2025  
**Author:** AI Assistant  
**Status:** ✅ Complete
