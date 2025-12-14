/**
 * Map Performance Utilities
 * 
 * Provides viewport-based filtering, debouncing, and performance
 * optimizations for the hazard map.
 */

import type { Map as LeafletMap, LatLngBounds } from 'leaflet';

export interface ViewportBounds {
	north: number;
	south: number;
	east: number;
	west: number;
}

export interface MarkerLocation {
	latitude?: number | string;
	longitude?: number | string;
}

/**
 * Performance configuration for map operations
 */
export const MAP_PERFORMANCE = {
	// Viewport loading settings
	viewportBuffer: 0.2, // Load 20% beyond visible area
	debounceMs: 150, // Debounce map move events

	// Clustering settings
	clusterRadius: 80, // Pixels for clustering
	maxClusterRadius: 60, // Max radius for cluster grouping
	disableClusteringAtZoom: 17, // Show individual markers when zoomed in
	spiderfyDistanceMultiplier: 1.5,

	// Loading limits
	maxMarkersPerView: 200, // Cap markers to prevent performance issues
	preloadRadiusMeters: 3000, // Preload area radius

	// Animation settings
	animateViewportChange: true,
	animationDuration: 300
} as const;

/**
 * Get the current viewport bounds from a Leaflet map
 */
export function getViewportBounds(map: LeafletMap): ViewportBounds {
	const bounds = map.getBounds();
	return {
		north: bounds.getNorth(),
		south: bounds.getSouth(),
		east: bounds.getEast(),
		west: bounds.getWest()
	};
}

/**
 * Expand bounds by a buffer percentage
 */
export function expandBounds(bounds: ViewportBounds, buffer: number = MAP_PERFORMANCE.viewportBuffer): ViewportBounds {
	const latBuffer = (bounds.north - bounds.south) * buffer;
	const lngBuffer = (bounds.east - bounds.west) * buffer;

	return {
		north: bounds.north + latBuffer,
		south: bounds.south - latBuffer,
		east: bounds.east + lngBuffer,
		west: bounds.west - lngBuffer
	};
}

/**
 * Check if a location is within bounds
 */
export function isInBounds(location: MarkerLocation, bounds: ViewportBounds): boolean {
	if (location.latitude === undefined || location.longitude === undefined) return false;

	const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
	const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;

	if (isNaN(lat) || isNaN(lng)) return false;

	return (
		lat >= bounds.south &&
		lat <= bounds.north &&
		lng >= bounds.west &&
		lng <= bounds.east
	);
}

/**
 * Filter markers to only those within the viewport (with buffer)
 */
export function filterMarkersInViewport<T extends MarkerLocation>(
	markers: T[],
	bounds: ViewportBounds,
	buffer: number = MAP_PERFORMANCE.viewportBuffer,
	maxMarkers: number = MAP_PERFORMANCE.maxMarkersPerView
): T[] {
	const expandedBounds = expandBounds(bounds, buffer);

	const filtered = markers.filter(marker => isInBounds(marker, expandedBounds));

	// Cap at maxMarkers to prevent performance issues
	if (filtered.length > maxMarkers) {
		// Prioritize by keeping markers closest to center
		const centerLat = (bounds.north + bounds.south) / 2;
		const centerLng = (bounds.east + bounds.west) / 2;

		return filtered
			.map(marker => {
				const lat = typeof marker.latitude === 'string' ? parseFloat(marker.latitude) : marker.latitude;
				const lng = typeof marker.longitude === 'string' ? parseFloat(marker.longitude) : marker.longitude;
				const distance = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2));
				return { marker, distance };
			})
			.sort((a, b) => a.distance - b.distance)
			.slice(0, maxMarkers)
			.map(item => item.marker);
	}

	return filtered;
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number = MAP_PERFORMANCE.debounceMs
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			fn(...args);
			timeoutId = null;
		}, delay);
	};
}

/**
 * Create a throttled function (executes at most once per interval)
 */
export function throttle<T extends (...args: any[]) => any>(
	fn: T,
	interval: number
): (...args: Parameters<T>) => void {
	let lastCall = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		const now = Date.now();
		const remaining = interval - (now - lastCall);

		if (remaining <= 0) {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			lastCall = now;
			fn(...args);
		} else if (!timeoutId) {
			timeoutId = setTimeout(() => {
				lastCall = Date.now();
				timeoutId = null;
				fn(...args);
			}, remaining);
		}
	};
}

/**
 * Calculate optimal cluster radius based on zoom level
 */
export function getClusterRadiusForZoom(zoom: number): number {
	// Decrease cluster radius as zoom increases (more detailed view)
	if (zoom >= 15) return 40;
	if (zoom >= 13) return 60;
	if (zoom >= 11) return 80;
	if (zoom >= 9) return 100;
	return 120;
}

/**
 * Check if clustering should be disabled at current zoom
 */
export function shouldDisableClustering(zoom: number): boolean {
	return zoom >= MAP_PERFORMANCE.disableClusteringAtZoom;
}

/**
 * Get optimized cluster options based on current zoom
 */
export function getClusterOptions(zoom: number) {
	return {
		maxClusterRadius: getClusterRadiusForZoom(zoom),
		disableClusteringAtZoom: MAP_PERFORMANCE.disableClusteringAtZoom,
		spiderfyOnMaxZoom: true,
		showCoverageOnHover: zoom < 14, // Hide coverage at high zoom
		zoomToBoundsOnClick: true,
		spiderfyDistanceMultiplier: MAP_PERFORMANCE.spiderfyDistanceMultiplier,
		animate: zoom < 15, // Disable animations at very high zoom for performance
		animateAddingMarkers: false // Don't animate adding markers (performance)
	};
}

/**
 * Batch marker operations for better performance
 */
export function batchOperation<T>(
	items: T[],
	operation: (batch: T[]) => void,
	batchSize: number = 50
): void {
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		// Use requestAnimationFrame for smoother UI
		requestAnimationFrame(() => operation(batch));
	}
}

/**
 * Calculate if map has moved significantly (worth updating markers)
 */
export function hasSignificantMovement(
	oldBounds: ViewportBounds | null,
	newBounds: ViewportBounds,
	threshold: number = 0.1 // 10% movement
): boolean {
	if (!oldBounds) return true;

	const latDiff = Math.abs((oldBounds.north + oldBounds.south) / 2 - (newBounds.north + newBounds.south) / 2);
	const lngDiff = Math.abs((oldBounds.east + oldBounds.west) / 2 - (newBounds.east + newBounds.west) / 2);

	const oldLatRange = oldBounds.north - oldBounds.south;
	const oldLngRange = oldBounds.east - oldBounds.west;

	return (latDiff / oldLatRange > threshold) || (lngDiff / oldLngRange > threshold);
}
