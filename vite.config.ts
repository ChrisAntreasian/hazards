import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		global: 'globalThis'
	},
	optimizeDeps: {
		include: ['leaflet', 'leaflet.markercluster']
	},
	ssr: {
		noExternal: ['leaflet', 'leaflet.markercluster']
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
		// Optimize chunk size warnings
		chunkSizeWarningLimit: 600,
		// Enable source maps for production debugging
		sourcemap: false // Disable for production builds
	}
});
