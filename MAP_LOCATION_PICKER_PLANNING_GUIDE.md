# 🗺️ Interactive Map Location & Area Drawing - Planning Guide
*Created: October 24, 2025*

## **Project Overview**

Implementation of interactive map location picker with area drawing capabilities for hazard reporting. This feature allows users to precisely set hazard locations and define affected areas through an intuitive map interface.

## **Confirmed Technical Decisions**

- ✅ **Database**: JSONB column for area storage
- ✅ **Drawing**: Auto-simplification with configurable rules (modifiable)
- ✅ **Vertex limits**: 8-15 vertices based on area size
- ✅ **No cost transparency** shown to users
- ✅ **Development route**: `/dev/map-picker`
- ✅ **Map library**: Leaflet with leaflet-draw plugin

## **Component Architecture**

```typescript
interface MapLocationPicker {
  // Core state
  mode: 'view' | 'reposition' | 'draw';
  location: { lat: number; lng: number };
  area: GeoJSON.Polygon | null;
  
  // Configuration (modifiable)
  simplificationConfig: {
    small: { maxArea: 0.1, maxVertices: 8, tolerance: 0.0001 },
    medium: { maxArea: 1.0, maxVertices: 12, tolerance: 0.0005 },
    large: { maxVertices: 15, tolerance: 0.001 }
  };
  
  // Event handlers
  onLocationChange: (coords: LatLng) => void;
  onAreaChange: (polygon: GeoJSON.Polygon | null) => void;
}
```

## **Database Schema Update**

```sql
-- Migration: Add area column to hazards table
ALTER TABLE hazards ADD COLUMN area jsonb;

-- Example data structure:
{
  "type": "Polygon",
  "coordinates": [[[lat1,lng1], [lat2,lng2], [lat3,lng3], [lat1,lng1]]],
  "properties": {
    "vertices": 8,
    "area_km2": 0.25,
    "simplified": true
  }
}
```

## **Implementation Phases**

### **Phase 1: Development Setup** (Day 1)
**Objective**: Create development environment and basic structure

**Files to create/modify:**
- `package.json` - Add leaflet-draw dependency
- `src/routes/dev/map-picker/+page.svelte` - New dev route
- `src/routes/dev/map-picker/+page.server.ts` - Basic server load

**Deliverables:**
- Working dev route at `/dev/map-picker`
- Basic map display with mode toggle buttons
- Button states: View (active), Reposition (inactive), Draw (inactive)

### **Phase 2A: Core Component Structure** (Day 2)
**Objective**: Build foundational component architecture

**Files to create:**
- `src/lib/components/MapLocationPicker.svelte` - Main component
- `src/lib/utils/map-simplification.ts` - Auto-simplification logic

**Component Features:**
- Mode state management ($state reactive)
- Button styling for active/inactive states
- Basic Leaflet map initialization
- Props interface for configuration

### **Phase 2B: View Mode** (Day 2-3)
**Objective**: Implement read-only map display

**Features:**
- Display map centered on provided location
- Show pin marker at location
- Display area polygon overlay (if area exists)
- Read-only state - no interaction except pan/zoom

**UI Elements:**
- Map container (600px height)
- Mode buttons: **[View]** [Reposition] [Draw]
- Location display: "Location: 42.3601, -71.0589"

### **Phase 3: Reposition Mode** (Day 3-4)
**Objective**: Enable interactive pin placement

**Features:**
- Click anywhere on map to place new pin
- Real-time coordinate updates
- Auto-exit reposition mode after click
- Smooth pin animation to new location

**UI State:**
- Mode buttons: [View] **[Repositioning...]** [Draw]
- Cursor changes to crosshair
- Instructions: "Click map to set new location"

**Technical Implementation:**
```typescript
const handleMapClick = (e: LeafletMouseEvent) => {
  if (mode === 'reposition') {
    location = { lat: e.latlng.lat, lng: e.latlng.lng };
    mode = 'view';
    onLocationChange(e.latlng);
  }
};
```

### **Phase 4A: Drawing Tools** (Day 4-5)
**Objective**: Implement polygon drawing capabilities

**Dependencies:**
- leaflet-draw integration
- Polygon drawing tool only (no circles/rectangles)
- Douglas-Peucker simplification algorithm

**Features:**
- Polygon drawing with vertex snapping
- Real-time simplification during draw
- Area calculation and vertex count display
- Preview of simplified polygon

**Technical Details:**
```typescript
const simplifyPolygon = (polygon: LatLng[], tolerance: number): LatLng[] => {
  // Douglas-Peucker algorithm implementation
  // Returns simplified polygon within vertex limits
};
```

### **Phase 4B: Drawing Controls** (Day 5-6)
**Objective**: Add drawing management controls

**UI Controls:**
- **[Save Area]** - Commit polygon to state
- **[Revert]** - Cancel current drawing, restore previous
- **[Delete]** - Remove area entirely, clear polygon

**State Management:**
- Temporary drawing state vs. committed state
- Undo/redo capability for drawing session
- Auto-exit draw mode on save/revert/delete

**Visual Feedback:**
- Drawing polygon: Red dashed line
- Saved polygon: Blue filled with transparency
- Vertex count: Real-time display during drawing

### **Phase 5: Database Schema** (Day 6)
**Objective**: Update database to support area storage

**Migration Creation:**
```sql
-- Create migration file
CREATE MIGRATION add_hazard_area_column

-- Migration content
ALTER TABLE hazards ADD COLUMN area jsonb;
CREATE INDEX IF NOT EXISTS idx_hazards_area ON hazards USING gin(area);
```

**Supabase Integration:**
- Migration via Supabase CLI or dashboard
- Test data validation
- Update TypeScript types

### **Phase 6: Data Persistence** (Day 7)
**Objective**: Implement save/load functionality

**API Functions:**
```typescript
// Save hazard with location and area
const saveHazardLocation = async (hazardId: string, data: {
  latitude: number;
  longitude: number;
  area?: GeoJSON.Polygon;
}) => { /* Implementation */ };

// Load hazard location data
const loadHazardLocation = async (hazardId: string) => { /* Implementation */ };
```

**Form Integration Prep:**
- Props interface for parent component integration
- Event emitters for data changes
- Validation functions

### **Phase 7: Testing & Integration** (Day 8)
**Objective**: Validate complete workflow and prepare for production

**Testing Scenarios:**
1. Pin placement and repositioning
2. Area drawing with various complexity levels
3. Save/revert/delete operations
4. Data persistence round-trip
5. Mobile touch interaction

**Integration Points:**
- Export component for hazard creation form
- Props configuration for different use cases
- Error handling and validation

## **File Structure**

```
src/
├── lib/
│   ├── components/
│   │   └── MapLocationPicker.svelte      # Main component
│   └── utils/
│       └── map-simplification.ts         # Auto-simplification logic
├── routes/
│   └── dev/
│       └── map-picker/
│           ├── +page.svelte              # Dev testing route
│           └── +page.server.ts           # Server load function
└── supabase/
    └── migrations/
        └── add_hazard_area_column.sql    # Database migration
```

## **User Experience Flow**

### **Initial State (View Mode)**
1. User clicks "Get Current Location" button
2. Map displays centered on user's location with pin
3. Mode buttons visible: **[View]** [Reposition] [Draw]

### **Reposition Workflow**
1. User clicks [Reposition] button
2. Button state changes to **[Repositioning...]**
3. Cursor changes to crosshair
4. User clicks desired location on map
5. Pin moves to new location
6. Automatically returns to View mode
7. Coordinates update in form

### **Drawing Workflow**
1. User clicks [Draw] button
2. Drawing tools appear on map
3. User draws polygon by clicking vertices
4. Real-time simplification and vertex count display
5. Drawing controls appear: [Save Area] [Revert] [Delete]
6. User saves, reverts, or deletes area
7. Returns to View mode

## **Success Criteria**

- [ ] User can click "Get Location" → Map displays at location
- [ ] User can enter "Reposition" mode → Click to move pin
- [ ] User can enter "Draw" mode → Draw polygon area
- [ ] Areas auto-simplify to 8-15 vertices
- [ ] Save/Revert/Delete controls work correctly
- [ ] Data persists to database in JSONB format
- [ ] Component ready for hazard creation form integration

## **Modifiable Configuration**

The simplification rules are easily configurable without code changes:

```typescript
// Can be modified without code changes
const SIMPLIFICATION_CONFIG = {
  small: { maxArea: 0.1, maxVertices: 8, tolerance: 0.0001 },
  medium: { maxArea: 1.0, maxVertices: 12, tolerance: 0.0005 },
  large: { maxVertices: 15, tolerance: 0.001 }
};
```

## **Dependencies Required**

```bash
npm install leaflet-draw @types/leaflet-draw
```

## **Next Steps**

1. Review and approve this planning document
2. Begin Phase 1: Development Setup
3. Iterative development with testing at each phase
4. Integration with hazard creation form upon completion

---

*This document serves as the complete implementation guide for the interactive map location picker feature. All technical decisions and implementation details are documented for consistent development.*