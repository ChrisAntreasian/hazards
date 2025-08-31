import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		globals: true,
		include: ['src/**/*.{test,spec}.{js,ts}'],
		poolOptions: {
			threads: {
				singleThread: true
			}
		}
	},
	resolve: {
		conditions: ['browser']
	},
	define: {
		global: 'globalThis'
	}
});
