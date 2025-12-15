import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
plugins: [
sveltekit(),
SvelteKitPWA({
srcDir: 'src',
mode: 'production',
strategies: 'generateSW',
registerType: 'autoUpdate',
scope: '/',
base: '/',
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
src: '/icons/icon-192.svg',
sizes: '192x192',
type: 'image/svg+xml'
},
{
src: '/icons/icon-512.svg',
sizes: '512x512',
type: 'image/svg+xml',
purpose: 'any maskable'
}
]
},
workbox: {
globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
navigateFallback: null,
runtimeCaching: [
{
// Cache API responses for categories and templates (long cache)
urlPattern: /^\/api\/(categories|templates)/,
handler: 'StaleWhileRevalidate',
options: {
cacheName: 'api-static-cache',
expiration: {
maxEntries: 50,
maxAgeSeconds: 86400 // 1 day
}
}
},
{
// Cache hazards API responses (shorter cache)
urlPattern: /^\/api\/hazards/,
handler: 'StaleWhileRevalidate',
options: {
cacheName: 'api-hazards-cache',
expiration: {
maxEntries: 100,
maxAgeSeconds: 300 // 5 minutes
}
}
},
{
// Cache map tiles from OpenStreetMap
urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org/,
handler: 'CacheFirst',
options: {
cacheName: 'map-tiles',
expiration: {
maxEntries: 500,
maxAgeSeconds: 2592000 // 30 days
},
cacheableResponse: {
statuses: [0, 200]
}
}
},
{
// Cache Supabase storage images
urlPattern: /^https:\/\/.*\.supabase\.co\/storage/,
handler: 'CacheFirst',
options: {
cacheName: 'hazard-images',
expiration: {
maxEntries: 200,
maxAgeSeconds: 2592000 // 30 days
},
cacheableResponse: {
statuses: [0, 200]
}
}
},
{
// Cache Google Fonts
urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
handler: 'CacheFirst',
options: {
cacheName: 'google-fonts',
expiration: {
maxEntries: 30,
maxAgeSeconds: 31536000 // 1 year
}
}
}
]
},
devOptions: {
enabled: false,
type: 'module'
}
})
],
define: {
global: 'globalThis'
},
optimizeDeps: {
include: ['leaflet', 'leaflet.markercluster', 'leaflet-draw']
},
ssr: {
noExternal: ['leaflet', 'leaflet.markercluster', 'leaflet-draw']
},
build: {
rollupOptions: {
output: {
manualChunks: (id) => {
// Group leaflet-related modules
if (id.includes('leaflet')) {
return 'leaflet';
}
// Group large vendor libraries
if (id.includes('node_modules')) {
return 'vendor';
}
}
}
},
chunkSizeWarningLimit: 600,
sourcemap: false
}
});
