<script lang="ts">
  import { onMount } from 'svelte';
  import { autoSimplifyPolygon, type Point } from '$lib/utils/map-simplification';
  import { logger } from '$lib/utils/logger';
  
  interface Props {
    initialLocation: { lat: number; lng: number };
    initialArea?: GeoJSON.Polygon | null;
    height?: string;
    zoom?: number;
    readonly?: boolean;
    onLocationChange?: (location: { lat: number; lng: number }) => void;
    onAreaChange?: (area: GeoJSON.Polygon | null) => void;
  }

  let {
    initialLocation,
    initialArea = null,
    height = "600px",
    zoom = 13,
    readonly = false,
    onLocationChange,
    onAreaChange
  }: Props = $props();

  let mapMode = $state<'view' | 'reposition' | 'draw'>('view');
  let currentLocation = $state(initialLocation);
  let mapElement: HTMLDivElement;
  let map: any;
  let L: any;
  let locationMarker: any;
  let drawControl: any;
  let drawnItems: any;
  let currentArea = $state<GeoJSON.Polygon | null>(initialArea);
  let areaStats = $state<{ vertices: number; originalVertices?: number } | null>(null);
  let showAreaSaved = $state(false);

  // Effect to update map when initialLocation changes
  $effect(() => {
    if (map && locationMarker && initialLocation) {
      logger.debug('MapLocationPicker: Location changed', { metadata: { initialLocation } });
      currentLocation = initialLocation;
      locationMarker.setLatLng([initialLocation.lat, initialLocation.lng]);
      map.setView([initialLocation.lat, initialLocation.lng], zoom);
    }
  });

  // Effect to update map when initialArea changes
  $effect(() => {
    if (map && drawnItems && L) {
      logger.debug('MapLocationPicker: Area changed', { 
        metadata: { hasArea: !!initialArea, coordinates: initialArea?.coordinates } 
      });
      
      // Clear existing polygons
      drawnItems.clearLayers();
      currentArea = initialArea;
      areaStats = null;
      
      // If there's a new area, render it
      if (initialArea) {
        try {
          const polygon = L.geoJSON(initialArea, {
            style: {
              color: '#3b82f6',
              weight: 2,
              fillColor: '#3b82f6',
              fillOpacity: 0.2
            }
          });
          
          drawnItems.addLayer(polygon);
          
          // Fit map bounds to show the polygon
          const bounds = polygon.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
          
          // Update area stats
          if (initialArea.coordinates && initialArea.coordinates[0]) {
            areaStats = {
              vertices: initialArea.coordinates[0].length - 1
            };
          }
        } catch (err) {
          logger.error('MapLocationPicker: Failed to render area', err instanceof Error ? err : new Error(String(err)));
        }
      } else {
        // No area, just center on the marker location
        if (locationMarker) {
          const markerLatLng = locationMarker.getLatLng();
          map.setView(markerLatLng, zoom);
        }
      }
    }
  });

  onMount(async () => {
    try {
      // Import Leaflet first
      L = await import('leaflet');
      
      // Only import leaflet-draw if not in readonly mode
      if (!readonly) {
        try {
          await import('leaflet-draw');
          
          // Small delay to ensure leaflet-draw has time to extend L
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify L.Draw is available
          if (!L.Draw || !L.Draw.Polygon) {
            logger.warn('MapLocationPicker: L.Draw.Polygon not available, drawing features disabled');
          } else {
            logger.debug('MapLocationPicker: Leaflet and leaflet-draw loaded successfully');
          }
        } catch (drawError) {
          logger.warn('MapLocationPicker: Failed to load leaflet-draw', { 
            metadata: { error: drawError instanceof Error ? drawError.message : String(drawError) }
          });
        }
      }
      
      // Create map with options based on readonly mode
      const mapOptions: any = {
        maxZoom: 19,
        minZoom: 1
      };
      
      // If readonly, disable all interactions
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
      
      map = L.map(mapElement, mapOptions).setView([currentLocation.lat, currentLocation.lng], zoom);
      
      // Add multiple tile layers with consistent max zoom
      // Using same Esri satellite imagery as main map page for consistency
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      });
      
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      });
      
      // Terrain/topographic layer
      const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors',
        maxZoom: 19
      });
      
      // Add default layer (satellite/earth view)
      satelliteLayer.addTo(map);
      
      // Only add layer control if not readonly
      if (!readonly) {
        const baseLayers = {
          "🛰️ Earth View": satelliteLayer,
          "� Street View": osmLayer,
          "⛰️ Terrain View": terrainLayer
        };
        
        L.control.layers(baseLayers).addTo(map);
      }
      
      // Add marker
      locationMarker = L.marker([currentLocation.lat, currentLocation.lng]).addTo(map);
      
      // Initialize drawing functionality
      drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      
      // Set up map click handler for reposition mode
      map.on('click', handleMapClick);
      
      // Set up drawing event handlers (only after L.Draw is confirmed available)
      if (L.Draw && L.Draw.Event) {
        map.on(L.Draw.Event.CREATED, handleDrawCreated);
        map.on(L.Draw.Event.EDITED, handleDrawEdited);
        map.on(L.Draw.Event.DELETED, handleDrawDeleted);
      } else {
        logger.warn('MapLocationPicker: L.Draw.Event not available, drawing events not registered');
      }
      
      // If there's an initial area, render it on the map
      if (currentArea) {
        logger.debug('MapLocationPicker: Rendering initial area', { metadata: { currentArea } });
        try {
          const initialPolygon = L.geoJSON(currentArea, {
            style: {
              color: '#3b82f6',
              weight: 2,
              fillColor: '#3b82f6',
              fillOpacity: 0.2
            }
          });
          
          // Add to drawn items layer
          drawnItems.addLayer(initialPolygon);
          
          // Fit map bounds to show the polygon
          const bounds = initialPolygon.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
          }
          
          // Update area stats
          if (currentArea.coordinates && currentArea.coordinates[0]) {
            areaStats = {
              vertices: currentArea.coordinates[0].length - 1
            };
          }
        } catch (err) {
          logger.error('MapLocationPicker: Failed to render initial area', err instanceof Error ? err : new Error(String(err)));
        }
      }
      
    } catch (error) {
      logger.error('MapLocationPicker: Map initialization error', error instanceof Error ? error : new Error(String(error)));
    }
  });

  function handleMapClick(e: any) {
    // Only handle clicks in reposition mode
    if (mapMode !== 'reposition') return;
    
    const { lat, lng } = e.latlng;
    logger.debug('MapLocationPicker: Map clicked in reposition mode', { metadata: { lat, lng } });
    
    // Update the location state
    currentLocation = { lat, lng };
    
    // Move the marker to the new position
    if (locationMarker) {
      locationMarker.setLatLng([lat, lng]);
    }
    
    // Notify parent component of location change
    if (onLocationChange) {
      onLocationChange({ lat, lng });
    }
  }

  function handleModeChange(newMode: 'view' | 'reposition' | 'draw') {
    logger.debug('MapLocationPicker: Mode changed', { metadata: { newMode } });
    mapMode = newMode;
    
    // Update map cursor and drawing controls based on mode
    if (map && L) {
      const mapContainer = map.getContainer();
      
      // Remove existing draw control or drawing tool
      if (drawControl) {
        if (drawControl.disable) {
          // It's a drawing tool, disable it
          drawControl.disable();
        } else {
          // It's a control, remove it from map
          map.removeControl(drawControl);
        }
        drawControl = null;
      }
      
      if (newMode === 'reposition') {
        mapContainer.style.cursor = 'crosshair';
      } else if (newMode === 'draw') {
        mapContainer.style.cursor = 'crosshair';
        
        // Check if L.Draw is available
        if (!L.Draw || !L.Draw.Polygon) {
          logger.error('MapLocationPicker: L.Draw.Polygon not available, leaflet-draw may not be loaded', new Error('Missing leaflet-draw'));
          return;
        }
        
        // Directly activate polygon drawing without control buttons
        const polygonDrawer = new L.Draw.Polygon(map, {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: '<strong>Error:</strong> shape edges cannot cross!'
          },
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.2
          }
        });
        
        // Enable polygon drawing immediately
        polygonDrawer.enable();
        
        // Store reference for cleanup
        drawControl = polygonDrawer;
      } else {
        mapContainer.style.cursor = '';
      }
    }
  }

  function handleDrawCreated(e: any) {
    logger.debug('MapLocationPicker: Draw created event', { metadata: { event: e } });
    const layer = e.layer;
    
    // Clear existing drawn items first
    drawnItems.clearLayers();
    
    // Convert to GeoJSON and simplify
    let geoJson = layer.toGeoJSON();
    logger.debug('MapLocationPicker: Original GeoJSON', { metadata: { geoJson } });
    
    // Extract geometry from Feature object
    const geometry = geoJson.geometry;
    if (!geometry || !geometry.coordinates || !geometry.coordinates[0] || !Array.isArray(geometry.coordinates[0])) {
      logger.error('MapLocationPicker: Invalid GeoJSON structure', new Error('Invalid geometry'), { metadata: { geoJson } });
      return;
    }
    
    // Apply auto-simplification
    const coordinates = geometry.coordinates[0];
    const points: Point[] = coordinates.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }));
    const simplificationResult = autoSimplifyPolygon(points);
    const simplifiedPoints = simplificationResult.simplified;
    
    // Update GeoJSON with simplified coordinates
    const simplifiedCoords = simplifiedPoints.map((p: Point) => [p.lng, p.lat]);
    simplifiedCoords.push(simplifiedCoords[0]); // Close the polygon
    
    geoJson = {
      type: "Polygon",
      coordinates: [simplifiedCoords]
    } as GeoJSON.Polygon;
    
    currentArea = geoJson;
    
    // Update area stats
    areaStats = {
      vertices: simplifiedPoints.length,
      originalVertices: coordinates.length !== simplifiedPoints.length ? coordinates.length : undefined
    };
    
    // Create a permanent polygon layer that won't be affected by draw tools
    const permanentPolygon = L.geoJSON(geoJson, {
      style: {
        color: '#3b82f6',
        weight: 3,
        fillOpacity: 0.3,
        fillColor: '#3b82f6'
      }
    });
    
    // Add to drawnItems for persistence
    drawnItems.addLayer(permanentPolygon);
    
    // Switch back to view mode after drawing is complete
    setTimeout(() => {
      handleModeChange('view');
    }, 100);
    
    // Show saved feedback
    showAreaSaved = true;
    setTimeout(() => {
      showAreaSaved = false;
    }, 3000);
    
    // Notify parent component
    if (onAreaChange) {
      onAreaChange(geoJson);
    }
    
    logger.info('MapLocationPicker: Area created and simplified', {
      metadata: {
        original: coordinates.length,
        simplified: simplifiedPoints.length,
        vertices: simplifiedPoints.length
      }
    });
  }
  
  function handleDrawEdited(e: any) {
    logger.debug('MapLocationPicker: Draw edited event', { metadata: { event: e } });
    // Handle polygon edits if needed
  }
  
  function handleDrawDeleted(e: any) {
    logger.debug('MapLocationPicker: Draw deleted event', { metadata: { event: e } });
    currentArea = null;
    areaStats = null;
    
    if (onAreaChange) {
      onAreaChange(null);
    }
  }
  
  function clearArea() {
    drawnItems.clearLayers();
    currentArea = null;
    areaStats = null;
    
    if (onAreaChange) {
      onAreaChange(null);
    }
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
</svelte:head>

<div class="map-location-picker">
  {#if !readonly}
    <div class="mode-controls">
      <button
        type="button"
        class="mode-btn {mapMode === 'view' ? 'active' : ''}"
        onclick={() => handleModeChange('view')}
      >
        👀 View
      </button>
      
      <button
        type="button"
        class="mode-btn {mapMode === 'reposition' ? 'active' : ''}"
        onclick={() => handleModeChange('reposition')}
      >
        📍 Reposition
      </button>
      
      <button
        type="button"
        class="mode-btn {mapMode === 'draw' ? 'active' : ''}"
        onclick={() => handleModeChange('draw')}
      >
        ✏️ Draw Area
      </button>
    </div>
  {/if}

  <div class="location-display">
    <strong>Mode:</strong> {mapMode}
    <br>
    <strong>Location:</strong> {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
    
    {#if mapMode === 'reposition'}
      <br>
      <span class="mode-instruction">💡 Click anywhere on the map to move the pin</span>
    {:else if mapMode === 'draw'}
      <br>
      <span class="mode-instruction">✏️ Use the drawing tools to create an area polygon</span>
    {/if}
    
    {#if showAreaSaved}
      <br>
      <span class="area-saved-message">✅ Area saved successfully!</span>
    {/if}
    
    {#if currentArea && areaStats}
      <br>
      <strong>Area:</strong> 
      <span class="area-info">
        Polygon with {areaStats.vertices} vertices
        {#if areaStats.originalVertices}
          <span class="simplification-note">(simplified from {areaStats.originalVertices})</span>
        {/if}
      </span>
      <button type="button" class="clear-area-btn" onclick={clearArea}>🗑️ Clear Area</button>
    {/if}
  </div>

  <div class="map-container" bind:this={mapElement} style="height: {height};">
    <!-- Map will be rendered here -->
  </div>
</div>

<style>
  .map-location-picker {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .mode-controls {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
  }

  .mode-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    border: none;
    background: white;
    border-right: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .mode-btn:last-child {
    border-right: none;
  }

  .mode-btn:hover {
    background: #f8fafc;
  }

  .mode-btn.active {
    background: #3b82f6;
    color: white;
  }

  .location-display {
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.9rem;
    font-family: monospace;
  }

  .mode-instruction {
    color: #059669;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .area-info {
    color: #7c3aed;
    font-weight: 500;
  }

  .simplification-note {
    color: #6b7280;
    font-weight: normal;
    font-size: 0.85rem;
  }

  .clear-area-btn {
    margin-left: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .clear-area-btn:hover {
    background: #dc2626;
  }

  .area-saved-message {
    color: #059669;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: fadeInOut 3s ease-in-out;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }

  .map-container {
    width: 100%;
    background: #f0f0f0;
  }
</style>