<script lang="ts">
	import type { Map as LeafletMap, Marker, TileLayer } from 'leaflet';
	import { logger } from '$lib/utils/logger';
	// import type { HazardWithDetails } from '$lib/types/database';

	interface Props {
		hazards?: any[];
		height?: string;
		center?: [number, number];
		zoom?: number;
		showUserLocation?: boolean;
	}

	let {
		hazards = [],
		height = '400px',
		center = [42.3601, -71.0589], // Default to Boston area
		zoom = 10,
		showUserLocation = true
	}: Props = $props();

	let mapElement: HTMLDivElement;
	let map = $state<LeafletMap>();
	let markers: Marker[] = []; // Don't make this reactive to avoid triggering effects
	let userLocationMarker = $state<Marker | null>(null);
	let markerClusterGroup = $state<any>(null);
	let L = $state<any>();

	// Hazard category colors for markers
	const categoryColors: Record<string, string> = {
		// Animal-related categories
		'Animals': '#d32f2f',
		'Large Mammals': '#d32f2f',
		'Biting': '#c62828',
		'Insects': '#e57373',
		'Reptiles': '#f44336',
		'Stinging': '#ef5350',
		'wolves': '#b71c1c',
		
		// Plant-related categories
		'Plants': '#388e3c',
		'Thorns': '#2e7d32',
		'Poisonous': '#689f38',
		
		// Terrain and environment
		'Terrain': '#6d4c41',
		'Unstable': '#5d4037',
		'ice': '#81c784',
		
		// Weather
		'Weather': '#1976d2',
		
		// Water hazards
		'Water': '#0277bd',
		'Water Hazards': '#0277bd',
		
		// Infrastructure and other
		'Infrastructure': '#f57f17',
		'Chemical': '#9c27b0',
		'Other': '#424242'
	};

	$effect(() => {
		if (!mapElement) return;

		// Initialize map asynchronously
		(async () => {
			try {
				// Dynamic import of Leaflet to avoid SSR issues
				L = await import('leaflet');
				
				// Import MarkerCluster plugin - this extends the L object
				try {
					await import('leaflet.markercluster');
				} catch (error) {
					logger.componentError('Map', error as Error, { action: 'load_marker_cluster_plugin' });
				}
			
			// Import Leaflet and MarkerCluster CSS
			if (typeof window !== 'undefined') {
				const leafletLink = document.createElement('link');
				leafletLink.rel = 'stylesheet';
				leafletLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				document.head.appendChild(leafletLink);

				const clusterLink = document.createElement('link');
				clusterLink.rel = 'stylesheet';
				clusterLink.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
				document.head.appendChild(clusterLink);

				const clusterDefaultLink = document.createElement('link');
				clusterDefaultLink.rel = 'stylesheet';
				clusterDefaultLink.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
				document.head.appendChild(clusterDefaultLink);
			}

			// Initialize the map
			map = L.map(mapElement).setView(center, zoom);

			// Add OpenStreetMap tiles
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19
			}).addTo(map);

			// Initialize MarkerClusterGroup with better configuration
			if (L.markerClusterGroup) {
				try {
					markerClusterGroup = L.markerClusterGroup({
						// More aggressive clustering settings
						maxClusterRadius: 60, // Reduced from 80 for tighter clustering
						disableClusteringAtZoom: 16, // Cluster until zoom level 16 (was 18)
						spiderfyOnMaxZoom: true, // Show spider legs when max zoom reached
						showCoverageOnHover: true, // Show coverage area on hover
						zoomToBoundsOnClick: true,
						// Remove spider legs delay for better UX
						spiderfyDistanceMultiplier: 1.2,
						
						// Custom cluster icon
						iconCreateFunction: function(cluster: any) {
							const childCount = cluster.getChildCount();
							let className = 'marker-cluster-';
							let size = 30;
							
							// Size and color clusters based on count
							if (childCount < 5) {
								className += 'small';
								size = 30;
							} else if (childCount < 15) {
								className += 'medium';
								size = 40;
							} else {
								className += 'large';
								size = 50;
							}

							return L.divIcon({
								html: `<div><span>${childCount}</span></div>`,
								className: `marker-cluster ${className}`,
								iconSize: [size, size],
								iconAnchor: [size / 2, size / 2]
							});
						}
					});

					map?.addLayer(markerClusterGroup);
				} catch (error) {
					logger.componentError('Map', error as Error, { action: 'initialize_marker_clustering' });
					markerClusterGroup = null;
				}
			} else {
				logger.warn('MarkerCluster plugin not available, using regular markers', { component: 'Map' });
				markerClusterGroup = null;
			}

			// Get user location if enabled
			if (showUserLocation && navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					(position) => {
						const userLat = position.coords.latitude;
						const userLng = position.coords.longitude;
						
						// Add user location marker
						userLocationMarker = L.marker([userLat, userLng], {
							icon: L.divIcon({
								className: 'user-location-marker',
								html: '<div style="background: #2196f3; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3);"></div>',
								iconSize: [16, 16],
								iconAnchor: [8, 8]
							})
						}).addTo(map!);

						// Center map on user location
						map?.setView([userLat, userLng], 12);
					},
					(error) => {
						logger.warn('Could not get user location', { 
							component: 'Map', 
							metadata: { errorCode: error.code, errorMessage: error.message } 
						});
					}
				);
			}

			// Add hazard markers
			updateHazardMarkers();
			} catch (error) {
				logger.componentError('Map', error as Error, { action: 'initialize_map' });
			}
		})();

		// Cleanup function
		return () => {
			if (map) {
				map.remove();
			}
		};
	});

	function updateHazardMarkers() {
		if (!map || !L) {
			return;
		}

		// Clear existing markers
		if (markerClusterGroup) {
			markerClusterGroup.clearLayers();
		} else {
			// Clear individual markers if no cluster group
			markers.forEach(marker => marker.remove());
		}
		markers.length = 0; // Clear array without reassigning (avoid potential reactivity issues)

		// Add new markers for hazards
		hazards.forEach((hazard, index) => {
			try {
				if (hazard?.latitude && hazard?.longitude) {
				const categoryColor = categoryColors[hazard?.category_name || 'Other'] || categoryColors['Other'];
				
				const marker = L.marker([parseFloat(hazard.latitude), parseFloat(hazard.longitude)], {
					icon: L.divIcon({
						className: 'hazard-marker',
						html: `<div style="background: ${categoryColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">${getMarkerIcon(hazard?.category_name || 'Other')}</div>`,
						iconSize: [24, 24],
						iconAnchor: [12, 12]
					})
				});

				// Add popup with hazard details
				const popupContent = `
					<div class="hazard-popup">
						<h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">${hazard?.title || 'Untitled Hazard'}</h3>
						<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
							<strong>Category:</strong> ${hazard?.category_name || 'Unknown'}
						</p>
						<p style="margin: 0 0 8px 0; font-size: 14px; color: #444;">
							${hazard?.description || 'No description available'}
						</p>
						<p style="margin: 0; font-size: 11px; color: #888;">
							Reported: ${hazard?.created_at ? new Date(hazard.created_at).toLocaleDateString() : 'Unknown date'}
						</p>
					</div>
				`;
				
				marker.bindPopup(popupContent, {
					maxWidth: 250,
					className: 'hazard-popup-container'
				});

				// Add marker to cluster group or directly to map
				if (markerClusterGroup) {
					markerClusterGroup.addLayer(marker);
				} else {
					marker.addTo(map);
				}
				markers.push(marker);
				}
			} catch (error) {
				logger.componentError('Map', error as Error, { 
					action: 'create_marker', 
					metadata: { hazardIndex: index, hazardId: hazard?.id } 
				});
			}
		});
		
		// Force refresh of cluster groups
		if (markerClusterGroup) {
			markerClusterGroup.refreshClusters();
		}
	}

	function getMarkerIcon(categoryName: string): string {
		const icons: Record<string, string> = {
			// Animal-related categories
			'Animals': '🐻',
			'Large Mammals': '🦌',
			'Biting': '🦷',
			'Insects': '🐛',
			'Reptiles': '🐍',
			'Stinging': '🐝',
			'wolves': '🐺',
			
			// Plant-related categories
			'Plants': '🌿',
			'Thorns': '🌹',
			'Poisonous': '☠️',
			
			// Terrain and environment
			'Terrain': '⛰️',
			'Unstable': '🪨',
			'ice': '🧊',
			
			// Weather
			'Weather': '🌩️',
			
			// Water hazards
			'Water': '💧',
			'Water Hazards': '🌊',
			
			// Infrastructure and other
			'Infrastructure': '🏗️',
			'Chemical': '⚠️',
			'Other': '❗'
		};
		return icons[categoryName] || '❗';
	}

	// Watch for hazards changes - since markers is no longer reactive, this won't loop
	let lastHazardsLength = -1;
	$effect(() => {
		if (map && L && hazards && hazards.length !== lastHazardsLength) {
			lastHazardsLength = hazards.length;
			updateHazardMarkers();
		}
	});
</script>

<div
  bind:this={mapElement}
  style="height: {height}; width: 100%;"
  class="map-container"
></div>

<style>
  .map-container {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  :global(.hazard-popup-container .leaflet-popup-content-wrapper) {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :global(.hazard-popup-container .leaflet-popup-tip) {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  :global(.user-location-marker) {
    background: transparent !important;
    border: none !important;
  }

  :global(.hazard-marker) {
    background: transparent !important;
    border: none !important;
  }

  /* Enhanced marker cluster styling */
  :global(.marker-cluster) {
    border-radius: 50%;
    text-align: center;
    color: white;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 3px solid rgba(255, 255, 255, 0.9);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  :global(.marker-cluster:hover) {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  :global(.marker-cluster div) {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 12px;
    font-weight: 700;
  }

  :global(.marker-cluster-small) {
    background: linear-gradient(135deg, #4caf50, #45a049);
    width: 30px;
    height: 30px;
  }

  :global(.marker-cluster-medium) {
    background: linear-gradient(135deg, #ff9800, #f57c00);
    width: 40px;
    height: 40px;
  }

  :global(.marker-cluster-medium div) {
    font-size: 14px;
  }

  :global(.marker-cluster-large) {
    background: linear-gradient(135deg, #f44336, #d32f2f);
    width: 50px;
    height: 50px;
  }

  :global(.marker-cluster-large div) {
    font-size: 16px;
    margin-top: 5px;
    text-align: center;
    border: 1px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
  }

  :global(.marker-cluster span) {
    line-height: 30px;
  }
</style>
