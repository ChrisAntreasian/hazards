# Offline Trips Feature - Implementation Plan

**Date:** January 2, 2026  
**Feature:** Offline map viewing and hazard management for hiking trips  
**Status:** Planning Phase

---

## 🎯 Feature Overview

Allow users to download map views and hazard data before going into areas with no cell service. Users can create "Trips" containing multiple saved map views, browse hazards offline, and queue actions (create, vote, flag, resolve) for sync when connectivity returns.

### Key User Story
> "I'm planning a 3-day hike in the White Mountains. I open the app, create a trip called 'White Mountains Jan 2026', save several map views (trailhead, summit, campsite), and download all visible hazards. While hiking with no service, I can view my saved maps, see hazard locations, and report a new hazard. When I get back to my car and have service, my offline actions automatically sync to the database."

---

## 📋 Requirements Summary

### Core Requirements
1. **Trip Management**
   - Create named trips with description
   - Add multiple map views to a trip
   - View/navigate between saved map views
   - Delete trips to free storage

2. **Map View Saving**
   - Save exact map state (center, zoom, bounds)
   - Download only tiles visible in current viewport
   - Lock zoom/pan when viewing offline (no additional tiles needed)
   - Store first 2 images per hazard (thumbnails ~200KB each)

3. **Offline Actions with Background Sync**
   - Create hazards (with images)
   - Vote on hazards
   - Flag hazards
   - Submit resolutions
   - Auto-sync when online + manual sync button

4. **Storage Management**
   - Show estimated size before download
   - Display total storage used
   - Warn if device storage low
   - Allow deletion of trips

5. **Conflict Resolution**
   - Duplicate hazard detection → moderation queue
   - Deleted hazard votes → silent discard with message
   - Expired session → prompt re-login

---

## 🏗️ Technical Architecture

### Database Schema

#### New Tables

**`offline_trips`**
```sql
CREATE TABLE offline_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_size_bytes BIGINT DEFAULT 0
);
```

**`offline_trip_views`**
```sql
CREATE TABLE offline_trip_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES offline_trips(id) ON DELETE CASCADE NOT NULL,
  name TEXT, -- Optional name like "Trailhead", "Summit"
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  zoom INTEGER NOT NULL,
  bounds_min_lat DOUBLE PRECISION NOT NULL,
  bounds_min_lng DOUBLE PRECISION NOT NULL,
  bounds_max_lat DOUBLE PRECISION NOT NULL,
  bounds_max_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  view_order INTEGER DEFAULT 0, -- Order within trip
  tile_count INTEGER DEFAULT 0,
  hazard_count INTEGER DEFAULT 0
);
```

**`offline_sync_queue`**
```sql
CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- 'create_hazard', 'vote', 'flag', 'resolve'
  action_data JSONB NOT NULL, -- Serialized action payload
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT DEFAULT 'pending' -- 'pending', 'syncing', 'failed', 'completed'
);
```

**`offline_duplicate_review`**
```sql
CREATE TABLE offline_duplicate_review (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_queue_id UUID REFERENCES offline_sync_queue(id) ON DELETE CASCADE NOT NULL,
  existing_hazard_id UUID REFERENCES hazards(id) ON DELETE CASCADE,
  offline_hazard_data JSONB NOT NULL,
  distance_meters DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' -- 'pending', 'merged', 'separate', 'cancelled'
);
```

### IndexedDB Schema (Client-Side)

**Store: `offline_trips`**
```typescript
{
  id: string,
  name: string,
  description: string,
  createdAt: Date,
  updatedAt: Date,
  totalSizeBytes: number
}
```

**Store: `offline_map_tiles`**
```typescript
{
  id: string, // Format: "{tripViewId}_{z}_{x}_{y}"
  tripViewId: string,
  zoom: number,
  x: number,
  y: number,
  blob: Blob, // PNG/JPEG tile data
  cachedAt: Date
}
```

**Store: `offline_hazards`**
```typescript
{
  id: string,
  tripId: string,
  // Full hazard data
  title: string,
  description: string,
  category: string,
  location: { lat: number, lng: number },
  severity: string,
  status: string,
  // Limited images (first 2 thumbnails)
  images: Array<{ url: string, blob: Blob }>,
  cachedAt: Date
}
```

**Store: `sync_queue`**
```typescript
{
  id: string,
  actionType: 'create_hazard' | 'vote' | 'flag' | 'resolve',
  actionData: any,
  createdAt: Date,
  status: 'pending' | 'syncing' | 'failed' | 'completed',
  retryCount: number,
  lastError?: string
}
```

---

## 🎨 User Interface

### New Pages/Components

#### 1. **Trips Page** (`/trips`)
Main navigation item showing all user's offline trips.

```
┌─────────────────────────────────────┐
│ 🗺️ Offline Trips                   │
├─────────────────────────────────────┤
│                                     │
│ [+ Create New Trip]                 │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ White Mountains Jan 2026        ││
│ │ 3 views • 24 hazards • 187 MB   ││
│ │ Last updated: 2 hours ago       ││
│ │ [View] [Update] [Delete]        ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ Berkshires Summer Trail         ││
│ │ 2 views • 15 hazards • 134 MB   ││
│ │ Last updated: 5 days ago        ││
│ │ [View] [Update] [Delete]        ││
│ └─────────────────────────────────┘│
│                                     │
│ Total Storage: 321 MB / 1 GB        │
└─────────────────────────────────────┘
```

#### 2. **Trip Detail Page** (`/trips/[id]`)
View saved map views within a trip.

```
┌─────────────────────────────────────┐
│ ← Back to Trips                     │
│                                     │
│ White Mountains Jan 2026            │
│ 3-day backpacking trip              │
├─────────────────────────────────────┤
│                                     │
│ 📍 Saved Map Views                  │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ [Map View 1: Overview]          ││
│ │ Zoom 12 • 45 tiles • 18 hazards ││
│ │ [Show on Map]                   ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ [Map View 2: Trailhead]         ││
│ │ Zoom 15 • 28 tiles • 8 hazards  ││
│ │ [Show on Map]                   ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ [Map View 3: Summit Area]       ││
│ │ Zoom 16 • 52 tiles • 6 hazards  ││
│ │ [Show on Map]                   ││
│ └─────────────────────────────────┘│
│                                     │
│ [+ Add Map View] [Edit Trip]        │
└─────────────────────────────────────┘
```

#### 3. **Map Page Enhancements** (`/map`)

**New "Create Trip from Map" Button:**
```
┌─────────────────────────────────────┐
│ [🏠] [🗺️ Map] [🎒 Trips] [👤]      │
├─────────────────────────────────────┤
│                                     │
│  [🗺️ Save for Offline Trip]         │
│  [🔍] [📍] [🎛️]                     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │        [Map Display]          │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│ 🔌 Offline Mode - Viewing:          │
│ "White Mountains Jan 2026"          │
│ View 2 of 3 [◀ ▶]                  │
│                                     │
│ ⏳ 3 actions pending sync [Sync Now]│
└─────────────────────────────────────┘
```

**Offline Mode Indicators:**
- Banner showing current trip and view
- Navigation between views within trip
- Sync status with manual sync button
- Disabled zoom/pan controls when viewing offline

#### 4. **Create Trip Modal**
```
┌─────────────────────────────────────┐
│ Create Offline Trip                 │
├─────────────────────────────────────┤
│                                     │
│ Trip Name: *                        │
│ [White Mountains Jan 2026_______]   │
│                                     │
│ Description: (optional)             │
│ [3-day backpacking trip_________]   │
│ [________________________________]  │
│                                     │
│ First Map View:                     │
│ Current viewport will be saved      │
│                                     │
│ 📊 Estimated Download:              │
│ • 34 map tiles (~12 MB)             │
│ • 18 hazards with images (~8 MB)    │
│ • Total: ~20 MB                     │
│                                     │
│ ⚠️ This will use device storage     │
│ Available: 2.4 GB                   │
│                                     │
│ [Cancel] [Create Trip & Download]   │
└─────────────────────────────────────┘
```

#### 5. **Add View to Trip Modal**
```
┌─────────────────────────────────────┐
│ Add View to Trip                    │
├─────────────────────────────────────┤
│                                     │
│ Select Trip: *                      │
│ [▼ White Mountains Jan 2026]        │
│                                     │
│ View Name: (optional)               │
│ [Summit Area________________]       │
│                                     │
│ 📊 Estimated Download:              │
│ • 52 map tiles (~18 MB)             │
│ • 6 new hazards (~3 MB)             │
│ • Total: ~21 MB                     │
│                                     │
│ [Cancel] [Add View & Download]      │
└─────────────────────────────────────┘
```

#### 6. **Sync Status Component**
```
┌─────────────────────────────────────┐
│ 📶 Sync Status                      │
├─────────────────────────────────────┤
│                                     │
│ ✓ 2 hazards created                 │
│ ✓ 5 votes synced                    │
│ ⏳ 1 flag pending...                │
│                                     │
│ [View Details] [Dismiss]            │
└─────────────────────────────────────┘
```

#### 7. **Duplicate Detection Modal** (For Moderators)
```
┌─────────────────────────────────────┐
│ ⚠️ Potential Duplicate Hazard       │
├─────────────────────────────────────┤
│                                     │
│ Offline Report (User: john_doe)     │
│ "Fallen tree on Appalachian Trail"  │
│ Location: 44.2706°N, 71.3033°W      │
│ Created: Jan 2, 2026 (offline)      │
│                                     │
│ Existing Report (User: jane_smith)  │
│ "Tree blocking AT near mile 12"     │
│ Location: 44.2709°N, 71.3029°W      │
│ Created: Jan 2, 2026                │
│                                     │
│ Distance: 47 meters                 │
│                                     │
│ Actions:                            │
│ [ ] Merge into existing hazard      │
│ [ ] Keep as separate hazard         │
│ [ ] Reject offline report           │
│                                     │
│ [Review] [Decide Later]             │
└─────────────────────────────────────┘
```

---

## 🔧 Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
**Goal:** Set up database, IndexedDB, and basic trip CRUD

**Tasks:**
- [ ] Create database migration for `offline_trips`, `offline_trip_views`, `offline_sync_queue`, `offline_duplicate_review`
- [ ] Create IndexedDB utility library (`src/lib/utils/indexeddb.ts`)
- [ ] Create offline storage manager (`src/lib/utils/offlineStorage.ts`)
- [ ] Implement IndexedDB stores (trips, tiles, hazards, sync_queue)
- [ ] Create Trips API endpoints:
  - `POST /api/trips` - Create trip
  - `GET /api/trips` - List user's trips
  - `GET /api/trips/[id]` - Get trip details
  - `PATCH /api/trips/[id]` - Update trip
  - `DELETE /api/trips/[id]` - Delete trip
  - `POST /api/trips/[id]/views` - Add view to trip
  - `DELETE /api/trips/[id]/views/[viewId]` - Remove view
- [ ] Write unit tests for storage utilities
- [ ] Write API endpoint tests

**Deliverables:**
- Working database schema
- IndexedDB wrapper with CRUD operations
- REST API for trip management
- 80%+ test coverage

---

### Phase 2: Map Tile Download & Storage (Week 3-4)
**Goal:** Download and store map tiles for offline viewing

**Tasks:**
- [ ] Create tile calculator utility (`src/lib/utils/tileCalculator.ts`)
  - Calculate tile coordinates for viewport bounds
  - Calculate storage size estimates
- [ ] Create tile downloader service (`src/lib/services/tileDownloader.ts`)
  - Parallel download with queue
  - Progress tracking
  - Error handling and retry logic
  - Respect tile server rate limits
- [ ] Implement tile caching in IndexedDB
- [ ] Create tile retrieval service (check IndexedDB before network)
- [ ] Add tile download progress UI component
- [ ] Implement tile cleanup (delete old tiles when trip deleted)
- [ ] Write tests for tile calculator
- [ ] Write tests for tile downloader
- [ ] Write integration tests for offline tile serving

**Deliverables:**
- Tile download system with progress tracking
- Offline tile serving from IndexedDB
- Storage management utilities
- 75%+ test coverage

---

### Phase 3: Hazard Data Download & Storage (Week 5)
**Goal:** Download and cache hazard data for offline viewing

**Tasks:**
- [ ] Create hazard downloader service (`src/lib/services/hazardDownloader.ts`)
  - Query hazards within view bounds
  - Download first 2 images per hazard (thumbnails)
  - Store in IndexedDB with compression
- [ ] Create offline hazard retrieval service
- [ ] Implement image thumbnail generation/compression
- [ ] Add hazard count and size to trip metadata
- [ ] Create API endpoint: `GET /api/hazards/bbox` (if not exists)
- [ ] Write tests for hazard downloader
- [ ] Write tests for offline hazard retrieval

**Deliverables:**
- Hazard caching system
- Image optimization for offline storage
- Offline hazard viewing
- 80%+ test coverage

---

### Phase 4: Trips UI (Week 6-7)
**Goal:** Build user interface for trip management

**Tasks:**
- [ ] Create Trips page (`src/routes/trips/+page.svelte`)
  - List all trips
  - Show storage stats
  - Create/delete trips
- [ ] Create Trip Detail page (`src/routes/trips/[id]/+page.svelte`)
  - List saved views
  - Navigate between views
  - Add/remove views
  - Edit trip details
- [ ] Create "Save for Offline" button on Map page
- [ ] Create Trip Creation Modal component
- [ ] Create Add View Modal component
- [ ] Implement trip view navigation on map
- [ ] Add offline mode indicators to map
- [ ] Create storage management UI
- [ ] Add confirmation dialogs for destructive actions
- [ ] Write component tests for all UI
- [ ] Write E2E tests for trip creation flow

**Deliverables:**
- Complete Trips UI
- Trip creation and management flow
- Map integration for offline viewing
- 70%+ test coverage

---

### Phase 5: Offline Actions & Sync Queue (Week 8-9)
**Goal:** Queue user actions while offline and sync when online

**Tasks:**
- [ ] Create sync queue manager (`src/lib/services/syncQueue.ts`)
  - Add actions to queue
  - Process queue when online
  - Handle retry logic
  - Handle conflicts
- [ ] Implement action queueing:
  - Create hazard (with images)
  - Vote (upvote/downvote)
  - Flag hazard
  - Submit resolution
- [ ] Create online/offline detector service
- [ ] Implement auto-sync on connection restore
- [ ] Create manual sync button and UI
- [ ] Add sync status indicators
- [ ] Implement optimistic UI updates
- [ ] Write tests for sync queue
- [ ] Write tests for each action type
- [ ] Write E2E tests for offline action flow

**Deliverables:**
- Fully functional sync queue
- Offline action support for create/vote/flag/resolve
- Auto and manual sync
- 80%+ test coverage

---

### Phase 6: Conflict Resolution (Week 10)
**Goal:** Handle edge cases and conflicts during sync

**Tasks:**
- [ ] Implement duplicate hazard detection
  - Geospatial query for nearby hazards
  - Distance calculation
  - Create duplicate review records
- [ ] Create moderation queue integration for duplicates
- [ ] Add Duplicate Review UI for moderators
- [ ] Implement deleted hazard handling
  - Detect 404/410 on sync
  - Show "no longer exists" message
  - Silent discard vote/flag
- [ ] Implement session expiration handling
  - Detect 401 on sync
  - Prompt user to re-login
  - Retry after authentication
  - Preserve queue across sessions
- [ ] Create conflict resolution settings/preferences
- [ ] Write tests for duplicate detection
- [ ] Write tests for error handling scenarios
- [ ] Write E2E tests for conflict scenarios

**Deliverables:**
- Duplicate detection system
- Moderator duplicate review UI
- Graceful error handling for all edge cases
- 75%+ test coverage

---

### Phase 7: Polish & Optimization (Week 11)
**Goal:** Performance, UX improvements, and edge case handling

**Tasks:**
- [ ] Optimize IndexedDB queries (indexes, bulk operations)
- [ ] Implement lazy loading for trip list
- [ ] Add loading skeletons for better perceived performance
- [ ] Optimize image compression settings
- [ ] Add analytics tracking for offline feature usage
- [ ] Implement offline capability detection
- [ ] Add device storage quota checks
- [ ] Create onboarding tutorial for offline trips
- [ ] Add tooltips and help text
- [ ] Implement keyboard shortcuts for power users
- [ ] Add accessibility improvements (ARIA labels, focus management)
- [ ] Performance testing and optimization
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile testing (iOS, Android)

**Deliverables:**
- Polished, performant user experience
- Cross-platform compatibility
- Accessibility compliance
- Performance benchmarks met

---

### Phase 8: Documentation & Launch Prep (Week 12)
**Goal:** Documentation, testing, and production readiness

**Tasks:**
- [ ] Write user documentation ("How to use offline trips")
- [ ] Create troubleshooting guide
- [ ] Write technical documentation for developers
- [ ] Create API documentation
- [ ] Final E2E test suite run
- [ ] Load testing for sync endpoints
- [ ] Security audit (auth, storage, sync)
- [ ] Privacy review (what data is stored offline)
- [ ] Create feature flag for gradual rollout
- [ ] Prepare rollback plan
- [ ] Monitor dashboard setup
- [ ] Beta testing with select users
- [ ] Gather feedback and iterate
- [ ] Final bug fixes
- [ ] Release notes

**Deliverables:**
- Complete documentation
- Production-ready feature
- Monitoring and rollback plan
- Beta feedback incorporated

---

## 🧪 Testing Strategy

### Unit Tests
**Coverage Target: 80%+**

**Files to Test:**
- `src/lib/utils/indexeddb.ts` - All CRUD operations
- `src/lib/utils/offlineStorage.ts` - Storage management
- `src/lib/utils/tileCalculator.ts` - Tile coordinate calculations
- `src/lib/services/tileDownloader.ts` - Download logic
- `src/lib/services/hazardDownloader.ts` - Hazard caching
- `src/lib/services/syncQueue.ts` - Queue management and sync
- `src/lib/utils/duplicateDetector.ts` - Duplicate detection algorithm

**Test Framework:** Vitest

**Example Test:**
```typescript
// src/lib/utils/tileCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTilesForBounds, estimateTileStorageSize } from './tileCalculator';

describe('tileCalculator', () => {
  describe('calculateTilesForBounds', () => {
    it('should calculate correct tile coordinates for bounds', () => {
      const bounds = {
        minLat: 44.25,
        minLng: -71.35,
        maxLat: 44.30,
        maxLng: -71.25
      };
      const zoom = 14;
      
      const tiles = calculateTilesForBounds(bounds, zoom);
      
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles[0]).toHaveProperty('x');
      expect(tiles[0]).toHaveProperty('y');
      expect(tiles[0]).toHaveProperty('z', zoom);
    });
    
    it('should return empty array for invalid bounds', () => {
      const bounds = {
        minLat: 44.30,
        minLng: -71.25,
        maxLat: 44.25, // Invalid: max < min
        maxLng: -71.35
      };
      
      const tiles = calculateTilesForBounds(bounds, 14);
      
      expect(tiles).toEqual([]);
    });
  });
  
  describe('estimateTileStorageSize', () => {
    it('should estimate storage size based on tile count', () => {
      const tileCount = 100;
      const avgTileSize = 25000; // 25KB
      
      const estimate = estimateTileStorageSize(tileCount, avgTileSize);
      
      expect(estimate).toBe(2500000); // 2.5MB
    });
  });
});
```

---

### Integration Tests
**Coverage Target: Key user flows**

**Scenarios to Test:**
1. Create trip → Add views → Download data → Verify IndexedDB
2. View offline trip → Navigate between views → Verify tiles/hazards loaded
3. Create hazard offline → Sync when online → Verify in database
4. Vote on hazard offline → Go online → Verify vote recorded
5. Duplicate hazard detection → Send to moderation → Moderator review

**Test Framework:** Vitest + Testing Library

**Example Test:**
```typescript
// src/lib/services/syncQueue.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncQueue } from './syncQueue';
import { createTestHazard } from '../test-utils';

describe('SyncQueue Integration', () => {
  beforeEach(async () => {
    await syncQueue.clear();
  });
  
  it('should sync create_hazard action when online', async () => {
    // Add hazard to queue while "offline"
    const hazardData = createTestHazard();
    await syncQueue.add('create_hazard', hazardData);
    
    // Verify queued
    const queued = await syncQueue.getPending();
    expect(queued).toHaveLength(1);
    
    // Process queue (simulate going online)
    const results = await syncQueue.processAll();
    
    // Verify synced
    expect(results.successful).toBe(1);
    expect(results.failed).toBe(0);
    
    // Verify hazard in database
    const response = await fetch(`/api/hazards/${hazardData.id}`);
    expect(response.ok).toBe(true);
  });
  
  it('should handle duplicate detection during sync', async () => {
    // Create existing hazard
    const existing = await createTestHazard({ 
      lat: 44.2706, 
      lng: -71.3033 
    });
    
    // Queue similar hazard offline
    const offlineHazard = {
      lat: 44.2709, // ~30 meters away
      lng: -71.3029,
      title: 'Similar hazard',
      category: existing.category
    };
    await syncQueue.add('create_hazard', offlineHazard);
    
    // Process queue
    await syncQueue.processAll();
    
    // Verify duplicate review created
    const response = await fetch('/api/moderation/duplicates');
    const { data } = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].distance_meters).toBeLessThan(50);
  });
});
```

---

### E2E Tests
**Coverage Target: Critical user journeys**

**Test Framework:** Playwright

**Scenarios:**
1. **Trip Creation Flow**
   - Navigate to map
   - Click "Save for Offline"
   - Fill trip details
   - Verify download progress
   - Verify trip appears in Trips page

2. **Offline Hazard Creation**
   - Open trip in offline mode
   - Create new hazard
   - Verify "Pending sync" indicator
   - Go online
   - Verify auto-sync occurs
   - Verify hazard in database

3. **Offline Voting**
   - View hazard while offline
   - Cast vote
   - Verify optimistic UI update
   - Go online
   - Verify vote synced

4. **Storage Management**
   - Create multiple trips
   - View storage usage
   - Delete a trip
   - Verify storage freed

**Example E2E Test:**
```typescript
// e2e/offline-trips.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offline Trips', () => {
  test('should create trip and download map data', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to map
    await page.goto('/map');
    await page.waitForSelector('.leaflet-container');
    
    // Click "Save for Offline"
    await page.click('button:has-text("Save for Offline Trip")');
    
    // Fill trip details
    await page.fill('[name="tripName"]', 'Test Trip');
    await page.fill('[name="description"]', 'Test description');
    
    // Verify storage estimate shown
    await expect(page.locator('text=Estimated Download')).toBeVisible();
    await expect(page.locator('text=MB')).toBeVisible();
    
    // Create trip
    await page.click('button:has-text("Create Trip & Download")');
    
    // Wait for download to complete
    await expect(page.locator('text=Download complete')).toBeVisible({ timeout: 30000 });
    
    // Navigate to Trips page
    await page.click('nav >> text=Trips');
    
    // Verify trip exists
    await expect(page.locator('text=Test Trip')).toBeVisible();
    await expect(page.locator('text=Test description')).toBeVisible();
  });
  
  test('should create hazard offline and sync when online', async ({ page, context }) => {
    // Enable offline mode
    await context.setOffline(true);
    
    // Navigate to trip
    await page.goto('/trips/test-trip-id');
    await page.click('button:has-text("Show on Map")');
    
    // Create hazard
    await page.click('button:has-text("Report Hazard")');
    await page.fill('[name="title"]', 'Offline Hazard Test');
    await page.selectOption('[name="category"]', 'fallen_tree');
    await page.fill('[name="description"]', 'Test hazard created offline');
    await page.click('button:has-text("Submit")');
    
    // Verify pending sync indicator
    await expect(page.locator('text=Pending sync')).toBeVisible();
    await expect(page.locator('text=⏳ 1 action pending')).toBeVisible();
    
    // Go online
    await context.setOffline(false);
    
    // Wait for auto-sync
    await expect(page.locator('text=✓ Synced successfully')).toBeVisible({ timeout: 10000 });
    
    // Verify hazard exists in database
    const response = await page.request.get('/api/hazards?status=pending');
    const { data } = await response.json();
    const hazard = data.find(h => h.title === 'Offline Hazard Test');
    expect(hazard).toBeTruthy();
  });
});
```

---

### Performance Testing

**Metrics to Track:**
- IndexedDB write speed (tiles/sec)
- IndexedDB read speed (tiles/sec)
- Tile download throughput (MB/sec)
- Sync queue processing speed (actions/sec)
- Memory usage during downloads
- App responsiveness while syncing

**Tools:**
- Lighthouse for general performance
- Chrome DevTools Performance tab
- Custom benchmarks with `performance.now()`

**Benchmarks:**
```typescript
// benchmarks/tile-download.bench.ts
import { bench, describe } from 'vitest';
import { tileDownloader } from '../src/lib/services/tileDownloader';

describe('Tile Download Performance', () => {
  bench('download 100 tiles', async () => {
    await tileDownloader.downloadTiles(mockTiles100, 'test-trip');
  });
  
  bench('store 100 tiles in IndexedDB', async () => {
    await offlineStorage.storeTiles(mockTileBlobs100);
  });
  
  bench('retrieve 100 tiles from IndexedDB', async () => {
    await offlineStorage.getTiles(mockTileIds100);
  });
});
```

**Performance Targets:**
- Tile download: >10 tiles/sec
- IndexedDB write: >50 tiles/sec
- IndexedDB read: >100 tiles/sec
- Sync processing: >5 actions/sec
- Memory usage: <200MB for typical trip (50 tiles, 20 hazards)

---

### Manual QA Checklist

**Pre-Release Testing:**
- [ ] Test on Chrome (Windows, Mac, Android)
- [ ] Test on Safari (Mac, iOS)
- [ ] Test on Firefox (Windows, Mac)
- [ ] Test on Edge (Windows)
- [ ] Test with slow 3G network
- [ ] Test with no network
- [ ] Test with intermittent network
- [ ] Test with device storage nearly full
- [ ] Test with IndexedDB quota exceeded
- [ ] Test with large trips (100+ tiles, 50+ hazards)
- [ ] Test session expiration during offline usage
- [ ] Test app update while offline data exists
- [ ] Test concurrent sync from multiple tabs
- [ ] Test trip deletion while sync in progress

**Accessibility Testing:**
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces all UI changes
- [ ] Focus management in modals
- [ ] Color contrast meets WCAG AA
- [ ] All interactive elements have labels
- [ ] Error messages are clear and actionable

---

## 📊 Success Metrics

### Feature Adoption
- % of active users who create at least one trip
- Average number of trips per user
- Average number of views per trip
- Average storage used per user

### Engagement
- % of hazards created via offline sync
- % of votes cast offline
- Average time between offline action and sync
- User retention rate for offline feature users

### Technical Health
- Sync success rate (target: >95%)
- Average sync time per action
- IndexedDB error rate (target: <1%)
- Duplicate detection accuracy (precision/recall)

### User Satisfaction
- Feature rating (survey after usage)
- Support ticket volume related to offline
- User feedback sentiment

---

## 🚨 Risks & Mitigations

### Risk 1: Storage Quota Exceeded
**Impact:** User cannot download trips, app becomes unusable  
**Likelihood:** Medium  
**Mitigation:**
- Check available storage before download
- Show clear storage warnings
- Allow granular trip deletion
- Implement auto-cleanup of old trips
- Compress images aggressively

### Risk 2: Sync Conflicts
**Impact:** Data loss, duplicate hazards, poor UX  
**Likelihood:** Medium  
**Mitigation:**
- Duplicate detection with geospatial queries
- Moderation queue for conflicts
- Graceful error handling
- User notifications for issues
- Retry logic with exponential backoff

### Risk 3: Poor Network on Sync
**Impact:** Long sync times, user frustration  
**Likelihood:** High  
**Mitigation:**
- Background sync API for automatic retry
- Manual sync button for user control
- Progress indicators
- Ability to cancel sync
- Queue persistence across sessions

### Risk 4: IndexedDB Corruption
**Impact:** Data loss, app crashes  
**Likelihood:** Low  
**Mitigation:**
- Graceful degradation (fall back to online mode)
- Periodic integrity checks
- Clear error messages
- "Reset offline data" option
- Backup sync queue to localStorage

### Risk 5: Browser Compatibility
**Impact:** Feature unavailable on some devices  
**Likelihood:** Low  
**Mitigation:**
- Feature detection (check for IndexedDB, Service Worker)
- Progressive enhancement
- Clear messaging if unsupported
- Fallback to regular online mode

### Risk 6: Session Expiration
**Impact:** Sync fails, queued actions lost  
**Likelihood:** High (for multi-day trips)  
**Mitigation:**
- Detect 401 errors during sync
- Prompt user to re-login
- Preserve queue across login
- Refresh token before expiration if online

---

## 🎯 Open Questions for Future Consideration

1. **Multi-device sync:** Should trips be synced across user's devices via cloud?
2. **Collaborative trips:** Share trip with friends for group hikes?
3. **Pre-made trip templates:** "Popular White Mountain loops" created by admins?
4. **Offline educational content:** Download hazard guides for offline viewing?
5. **GPS track recording:** Record hiking route and associate with trip?
6. **Export/import trips:** Download trip as file to share or backup?
7. **Automatic trip updates:** Refresh hazards when near a saved trip area?
8. **Offline analytics:** Track user behavior while offline?

---

## 📚 Related Documentation

- [Background Sync API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [IndexedDB Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker Caching Strategies](https://developer.chrome.com/docs/workbox/)
- [Leaflet Tile Layer](https://leafletjs.com/reference.html#tilelayer)
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)

---

## 🚀 Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Core Infrastructure | 2 weeks | Database + IndexedDB + API |
| 2. Map Tile Download | 2 weeks | Tile downloading & caching |
| 3. Hazard Data Download | 1 week | Hazard caching |
| 4. Trips UI | 2 weeks | Full UI for trip management |
| 5. Offline Actions & Sync | 2 weeks | Sync queue + background sync |
| 6. Conflict Resolution | 1 week | Duplicate detection + errors |
| 7. Polish & Optimization | 1 week | Performance + UX improvements |
| 8. Documentation & Launch | 1 week | Docs + testing + deploy |
| **Total** | **12 weeks** | **Production-ready feature** |

---

## ✅ Definition of Done

Feature is considered complete when:
- [ ] All 8 phases completed
- [ ] Test coverage >75% overall
- [ ] All E2E tests passing
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Cross-browser testing complete
- [ ] Documentation published
- [ ] Beta testing feedback incorporated
- [ ] Production deployment successful
- [ ] Monitoring dashboards active
- [ ] No P0/P1 bugs in backlog

---

**Last Updated:** January 2, 2026  
**Next Review:** After Phase 1 completion
