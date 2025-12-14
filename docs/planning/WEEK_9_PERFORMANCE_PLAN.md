# 🚀 Week 9 Performance Optimization Plan
*Created: December 13, 2025*

## 📊 Current Status Assessment

### What's Already Done (60% Complete)
Based on the November status and current codebase:

| Feature | Status | Notes |
|---------|--------|-------|
| Database Indexing | ✅ Done | PostGIS spatial indexes on hazards |
| Image Optimization | ✅ Done | Sharp processing pipeline |
| Component Lazy Loading | ✅ Done | LazyLoad wrapper component |
| Map Clustering | ⚠️ Basic | Works but needs tuning |
| Caching Strategies | ❌ None | No HTTP caching headers |
| Service Worker/PWA | ❌ None | Not started |

### What's Missing (40% Remaining)
1. **HTTP Caching** - No Cache-Control headers on API routes
2. **Service Worker** - No offline support or asset caching
3. **PWA Manifest** - No installability
4. **Map Performance** - Clustering threshold may need adjustment
5. **API Response Caching** - No SWR or caching layer

---

## 🎯 Week 9 Performance Goals

From the original planning documents:

> "Week 9: Performance optimization
>   - Image optimization pipeline ✅
>   - Map performance tuning
>   - Caching strategies  
>   - Mobile optimization"

### Target Metrics
- **Map Load Time**: < 2 seconds (currently ~2-3 seconds)
- **First Contentful Paint**: < 1.5 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Time to Interactive**: < 3 seconds
- **Offline Capability**: Basic hazard viewing

---

## 🏗️ Implementation Plan

### Phase 1: HTTP Caching (2-3 hours)
**Priority: HIGH - Immediate impact with minimal effort**

#### 1.1 Add Caching Headers to API Routes

Create a caching utility:
```typescript
// src/lib/utils/cache.ts
export const CACHE_DURATIONS = {
  // Static content - rarely changes
  categories: 'public, max-age=86400, stale-while-revalidate=604800', // 1 day, stale OK for 7 days
  staticAssets: 'public, max-age=31536000, immutable', // 1 year
  
  // Semi-dynamic content
  hazardsList: 'public, max-age=300, stale-while-revalidate=3600', // 5 min, stale OK for 1 hour
  hazardDetail: 'public, max-age=60, stale-while-revalidate=300', // 1 min, stale OK for 5 min
  
  // User-specific content
  userProfile: 'private, max-age=300', // 5 min, private
  
  // Highly dynamic
  leaderboard: 'public, max-age=60, stale-while-revalidate=300', // 1 min
  
  // Images
  hazardImages: 'public, max-age=2592000, immutable', // 30 days
  userAvatars: 'public, max-age=86400, stale-while-revalidate=604800' // 1 day
} as const;

export function setCacheHeaders(response: Response, cacheType: keyof typeof CACHE_DURATIONS) {
  response.headers.set('Cache-Control', CACHE_DURATIONS[cacheType]);
  return response;
}
```

#### 1.2 Apply to API Routes

**Hazards List API** (`/api/hazards/+server.ts`):
```typescript
export const GET: RequestHandler = async ({ url, setHeaders }) => {
  setHeaders({
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
  });
  // ... existing code
};
```

**Categories API** (`/api/categories/+server.ts`):
```typescript
export const GET: RequestHandler = async ({ setHeaders }) => {
  setHeaders({
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
  });
  // ... existing code
};
```

#### 1.3 Add ETag Support for Dynamic Content
```typescript
// src/lib/utils/etag.ts
export function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash}"`;
}

export function handleConditionalRequest(
  request: Request, 
  etag: string
): Response | null {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 });
  }
  return null;
}
```

---

### Phase 2: Service Worker & PWA (4-5 hours)
**Priority: MEDIUM - Enables offline and installability**

#### 2.1 Install SvelteKit PWA Plugin
```bash
npm install @vite-pwa/sveltekit vite-plugin-pwa workbox-window -D
```

#### 2.2 Configure Vite for PWA
```typescript
// vite.config.ts
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      srcDir: 'src',
      mode: 'production',
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hazards App',
        short_name: 'Hazards',
        description: 'Community hazard reporting for outdoor safety',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            // Cache API responses
            urlPattern: /^\/api\/(hazards|categories)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 3600 // 1 hour
              }
            }
          },
          {
            // Cache map tiles
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 2592000 // 30 days
              }
            }
          },
          {
            // Cache Supabase images
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hazard-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 2592000 // 30 days
              }
            }
          }
        ]
      }
    })
  ]
});
```

#### 2.3 Create PWA Icons
Need to create:
- `/static/icons/icon-192.png`
- `/static/icons/icon-512.png`
- `/static/icons/apple-touch-icon.png`

#### 2.4 Update app.html for PWA
```html
<!-- src/app.html -->
<head>
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#3b82f6" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
</head>
```

---

### Phase 3: Map Performance Tuning (2-3 hours)
**Priority: HIGH - Direct impact on user experience**

#### 3.1 Optimize Clustering Configuration

Review and adjust `PERFORMANCE_CONFIG`:
```typescript
export const PERFORMANCE_CONFIG = {
  maps: {
    initialZoom: 13,
    maxHazardsPerView: 100,     // Increased from 50
    clusteringThreshold: 8,     // Lowered from 10 - cluster earlier
    preloadRadius: 3000,        // Increased from 2000 meters
    // NEW: Viewport-based loading
    viewportBuffer: 0.2,        // Load 20% beyond visible area
    debounceMs: 150,            // Debounce map move events
    // NEW: Cluster visual settings
    clusterRadius: 80,          // Pixels for clustering
    disableClusteringAtZoom: 17 // Show individual markers when zoomed in
  }
};
```

#### 3.2 Implement Viewport-Based Loading

Update `MapMarkers.svelte` to only load hazards in the current viewport:
```typescript
// Only fetch hazards within current viewport + buffer
async function loadVisibleHazards(bounds: LatLngBounds) {
  const bufferedBounds = expandBounds(bounds, 0.2); // 20% buffer
  const { data } = await supabase
    .from('hazards')
    .select('*')
    .gte('latitude', bufferedBounds.south)
    .lte('latitude', bufferedBounds.north)
    .gte('longitude', bufferedBounds.west)
    .lte('longitude', bufferedBounds.east)
    .eq('status', 'approved')
    .is('resolved_at', null);
  return data;
}
```

#### 3.3 Add Debounced Map Updates
```typescript
import { debounce } from '$lib/utils/debounce';

const debouncedLoadHazards = debounce((bounds: LatLngBounds) => {
  loadVisibleHazards(bounds);
}, 150);

// On map move/zoom
map.on('moveend', () => {
  debouncedLoadHazards(map.getBounds());
});
```

#### 3.4 Optimize Marker Rendering

Use canvas-based markers for better performance:
```typescript
// Use CircleMarkers instead of Markers for better performance
// CircleMarker is rendered as SVG/Canvas, not DOM elements
const hazardCircle = L.circleMarker([lat, lng], {
  radius: 8,
  fillColor: getSeverityColor(severity),
  color: '#fff',
  weight: 2,
  opacity: 1,
  fillOpacity: 0.8
});
```

---

### Phase 4: API Response Optimization (2 hours)
**Priority: MEDIUM - Reduces data transfer**

#### 4.1 Implement Field Selection
```typescript
// API: /api/hazards?fields=id,title,latitude,longitude,severity_level
const fields = url.searchParams.get('fields')?.split(',') || ['*'];
const { data } = await supabase
  .from('hazards')
  .select(fields.join(','));
```

#### 4.2 Add Pagination with Cursor
```typescript
// /api/hazards?cursor=abc123&limit=50
const cursor = url.searchParams.get('cursor');
const limit = parseInt(url.searchParams.get('limit') || '50');

let query = supabase
  .from('hazards')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(limit);

if (cursor) {
  query = query.lt('created_at', cursor);
}
```

#### 4.3 Compress Responses
SvelteKit automatically handles compression via adapter, but ensure it's enabled:
```typescript
// svelte.config.js
export default {
  kit: {
    adapter: adapter({
      // Vercel/Netlify automatically compress
      // For Node adapter:
      compress: true
    })
  }
};
```

---

### Phase 5: Image Delivery Optimization (1-2 hours)
**Priority: MEDIUM - Images are already optimized**

#### 5.1 Add srcset for Responsive Images
```svelte
<!-- OptimizedImage.svelte -->
<script lang="ts">
  let { src, alt, sizes = '100vw' } = $props<{
    src: string;
    alt: string;
    sizes?: string;
  }>();
  
  // Generate srcset for different sizes
  const srcset = [
    `${src}?width=320 320w`,
    `${src}?width=640 640w`,
    `${src}?width=960 960w`,
    `${src}?width=1200 1200w`
  ].join(', ');
</script>

<img 
  {src}
  srcset={srcset}
  sizes={sizes}
  {alt}
  loading="lazy"
  decoding="async"
/>
```

#### 5.2 Add Blur Placeholder
```typescript
// Generate tiny placeholder during image processing
const placeholder = await sharp(buffer)
  .resize(20, 20, { fit: 'inside' })
  .blur(10)
  .toBuffer();
  
const placeholderDataUrl = `data:image/jpeg;base64,${placeholder.toString('base64')}`;
```

---

## 📋 Implementation Checklist

### Phase 1: HTTP Caching ⬜
- [ ] Create `src/lib/utils/cache.ts` with cache duration constants
- [ ] Add Cache-Control headers to `/api/hazards` endpoints
- [ ] Add Cache-Control headers to `/api/categories` endpoints
- [ ] Add ETag support for conditional requests
- [ ] Test caching with browser DevTools

### Phase 2: Service Worker & PWA ⬜
- [ ] Install `@vite-pwa/sveltekit` and dependencies
- [ ] Configure `vite.config.ts` with PWA plugin
- [ ] Create PWA icons (192x192, 512x512)
- [ ] Update `app.html` with PWA meta tags
- [ ] Test offline functionality
- [ ] Test installability on mobile

### Phase 3: Map Performance ⬜
- [ ] Update `PERFORMANCE_CONFIG` with optimized values
- [ ] Implement viewport-based hazard loading
- [ ] Add debounced map update events
- [ ] Consider canvas-based markers
- [ ] Test with 100+ markers

### Phase 4: API Optimization ⬜
- [ ] Add field selection to hazard endpoints
- [ ] Implement cursor-based pagination
- [ ] Verify response compression is enabled
- [ ] Test with slow network throttling

### Phase 5: Image Delivery ⬜
- [ ] Add srcset to OptimizedImage component
- [ ] Test responsive image loading
- [ ] Verify lazy loading works correctly

---

## 🎯 Success Metrics

After implementation, verify:

1. **Lighthouse Scores**
   - Performance: > 90
   - Best Practices: > 90
   - SEO: > 90
   - PWA: ✅ Installable

2. **Core Web Vitals**
   - LCP: < 2.5s
   - FID: < 100ms
   - CLS: < 0.1

3. **Network**
   - API responses cached (check DevTools)
   - Map tiles cached
   - Images cached
   - Offline map view works

4. **Map Performance**
   - Smooth panning with 100+ markers
   - Clustering works at zoom levels < 17
   - No jank during marker updates

---

## 🕒 Time Estimates

| Phase | Estimated Time | Priority |
|-------|---------------|----------|
| Phase 1: HTTP Caching | 2-3 hours | HIGH |
| Phase 2: Service Worker/PWA | 4-5 hours | MEDIUM |
| Phase 3: Map Performance | 2-3 hours | HIGH |
| Phase 4: API Optimization | 2 hours | MEDIUM |
| Phase 5: Image Delivery | 1-2 hours | LOW |
| **Total** | **11-15 hours** | |

**Recommended Order:** Phase 1 → Phase 3 → Phase 2 → Phase 4 → Phase 5

---

## 🚀 Quick Start

To begin implementation, run:

```bash
# Check current Lighthouse scores first
npx lighthouse http://localhost:5173 --view

# Install PWA dependencies
npm install @vite-pwa/sveltekit vite-plugin-pwa workbox-window -D

# Start dev server
npm run dev
```

Then start with **Phase 1: HTTP Caching** as it provides immediate benefits with minimal risk.

---

## 📚 References

- [SvelteKit PWA Plugin](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html)
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview)
- [HTTP Caching (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Leaflet Performance Tips](https://leafletjs.com/reference.html#map-prefercanvas)
- [Core Web Vitals](https://web.dev/vitals/)

---

*This plan was created based on the original Week 9 planning from August 2025 and current codebase assessment.*
