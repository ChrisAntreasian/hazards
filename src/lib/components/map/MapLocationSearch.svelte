<script lang="ts">
  import type { Location } from "$lib/components/map/types";
  import { logger } from "$lib/utils/logger";

  interface Props {
    onLocationFound?: (location: Location, zoom?: number) => void;
    initialLocation?: Location;
    showCurrentLocation?: boolean;
    placeholder?: string;
    compact?: boolean;
  }

  let {
    onLocationFound,
    initialLocation,
    showCurrentLocation = true,
    placeholder = "Enter address, city, or zip code...",
    compact = false,
  }: Props = $props();

  // State
  let searchMode = $state<"address" | "coordinates">("address");
  let addressInput = $state("");
  let latInput = $state(initialLocation?.lat?.toString() || "");
  let lngInput = $state(initialLocation?.lng?.toString() || "");
  let isSearching = $state(false);
  let errorMessage = $state("");
  let successMessage = $state("");
  let isGettingLocation = $state(false);

  // Watch for initial location changes
  $effect(() => {
    if (initialLocation) {
      latInput = initialLocation.lat.toString();
      lngInput = initialLocation.lng.toString();
    }
  });

  /**
   * Search for location by address/zip code
   */
  async function searchByAddress() {
    if (!addressInput.trim()) {
      errorMessage = "Please enter an address or zip code";
      return;
    }

    isSearching = true;
    errorMessage = "";

    try {
      // Use Nominatim geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(addressInput)}&` +
          `format=json&` +
          `limit=1&` +
          `countrycodes=us` // Limit to US for better results
      );

      if (!response.ok) {
        throw new Error("Geocoding service unavailable");
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const location: Location = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };

        // Update lat/lng inputs
        latInput = location.lat.toString();
        lngInput = location.lng.toString();

        if (onLocationFound) {
          onLocationFound(location, 17);
        }

        errorMessage = "";
        // Show the full address that was found
        successMessage = `📍 Found: ${result.display_name}`;
        setTimeout(() => {
          successMessage = "";
        }, 5000);

        logger.debug("MapLocationSearch: Location found via address", {
          component: "MapLocationSearch",
          metadata: {
            address: addressInput,
            location,
            display_name: result.display_name,
          },
        });
      } else {
        errorMessage =
          "Location not found. Please try a different address or zip code.";
      }
    } catch (error) {
      errorMessage = "Error searching for location. Please try again.";
      logger.componentError(
        "MapLocationSearch",
        error instanceof Error ? error : new Error(String(error)),
        { action: "search_by_address" }
      );
    } finally {
      isSearching = false;
    }
  }

  /**
   * Search by coordinates
   */
  function searchByCoordinates() {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || isNaN(lng)) {
      errorMessage = "Please enter valid latitude and longitude values";
      return;
    }

    if (lat < -90 || lat > 90) {
      errorMessage = "Latitude must be between -90 and 90";
      return;
    }

    if (lng < -180 || lng > 180) {
      errorMessage = "Longitude must be between -180 and 180";
      return;
    }

    const location: Location = { lat, lng };

    if (onLocationFound) {
      onLocationFound(location, 17);
    }

    errorMessage = "";
    logger.debug("MapLocationSearch: Location set via coordinates", {
      component: "MapLocationSearch",
      metadata: { location },
    });
  }

  /**
   * Get user's current location
   */
  function getCurrentLocation() {
    if (!navigator.geolocation) {
      errorMessage = "Geolocation is not supported by your browser";
      return;
    }

    isGettingLocation = true;
    errorMessage = "";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Update inputs
        latInput = location.lat.toString();
        lngInput = location.lng.toString();

        if (onLocationFound) {
          onLocationFound(location, 17);
        }

        isGettingLocation = false;
        logger.debug("MapLocationSearch: Current location found", {
          component: "MapLocationSearch",
          metadata: { location },
        });
      },
      (error) => {
        errorMessage =
          "Unable to retrieve your location. Please check your browser permissions.";
        isGettingLocation = false;
        logger.warn("MapLocationSearch: Geolocation error", {
          component: "MapLocationSearch",
          metadata: {
            errorCode: error.code,
            errorMessage: error.message,
          },
        });
      }
    );
  }
</script>

<div class="map-location-search" class:compact>
  <!-- Mode Tabs -->
  <div class="search-tabs">
    <button
      type="button"
      class="tab-btn"
      class:active={searchMode === "address"}
      onclick={() => (searchMode = "address")}
    >
      🔍 Address
    </button>
    <button
      type="button"
      class="tab-btn"
      class:active={searchMode === "coordinates"}
      onclick={() => (searchMode = "coordinates")}
    >
      🌐 Coordinates
    </button>
  </div>

  <!-- Address Search -->
  {#if searchMode === "address"}
    <div class="search-form">
      <div class="input-group">
        <input
          type="text"
          bind:value={addressInput}
          {placeholder}
          disabled={isSearching}
          class="search-input"
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              searchByAddress();
            }
          }}
        />
        <button
          type="button"
          class="btn-search"
          disabled={isSearching || !addressInput.trim()}
          onclick={searchByAddress}
        >
          {#if isSearching}
            ⏳ Searching...
          {:else}
            🔍 Search
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <!-- Coordinate Input -->
  {#if searchMode === "coordinates"}
    <div class="search-form coords-form">
      <div class="coords-inputs">
        <div class="coord-group">
          <label for="lat-input">Latitude</label>
          <input
            id="lat-input"
            type="number"
            step="any"
            bind:value={latInput}
            placeholder="42.3601"
            class="coord-input"
            onkeydown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchByCoordinates();
              }
            }}
          />
        </div>
        <div class="coord-group">
          <label for="lng-input">Longitude</label>
          <input
            id="lng-input"
            type="number"
            step="any"
            bind:value={lngInput}
            placeholder="-71.0589"
            class="coord-input"
            onkeydown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchByCoordinates();
              }
            }}
          />
        </div>
      </div>
      <button
        type="button"
        class="btn-search"
        disabled={!latInput || !lngInput}
        onclick={searchByCoordinates}
      >
        📍 Go to Location
      </button>
    </div>
  {/if}

  <!-- Current Location Button -->
  {#if showCurrentLocation}
    <button
      type="button"
      class="btn-current-location"
      onclick={getCurrentLocation}
      disabled={isGettingLocation}
    >
      {#if isGettingLocation}
        ⏳ Getting location...
      {:else}
        📍 Use My Location
      {/if}
    </button>
  {/if}

  <!-- Success Message -->
  {#if successMessage}
    <div class="success-message">
      {successMessage}
    </div>
  {/if}

  <!-- Error Message -->
  {#if errorMessage}
    <div class="error-message">
      ⚠️ {errorMessage}
    </div>
  {/if}
</div>

<style>
  .map-location-search {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .map-location-search.compact {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .search-tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 0.5rem;
  }

  .tab-btn {
    flex: 1;
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    color: #666;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    background: #f5f5f5;
    color: #333;
  }

  .tab-btn.active {
    background: #1976d2;
    color: white;
  }

  .search-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
  }

  .search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.95rem;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: #1976d2;
  }

  .search-input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .btn-search {
    padding: 0.75rem 1.5rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-search:hover:not(:disabled) {
    background: #1565c0;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
  }

  .btn-search:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  .coords-form {
    gap: 0.75rem;
  }

  .coords-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .coord-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .coord-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #666;
  }

  .coord-input {
    padding: 0.75rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 0.95rem;
    transition: border-color 0.2s;
  }

  .coord-input:focus {
    outline: none;
    border-color: #1976d2;
  }

  .btn-current-location {
    padding: 0.75rem 1.5rem;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-current-location:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  }

  .btn-current-location:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  .success-message {
    padding: 0.75rem 1rem;
    background: #e8f5e9;
    border: 1px solid #4caf50;
    border-radius: 6px;
    color: #2e7d32;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .error-message {
    padding: 0.75rem 1rem;
    background: #ffebee;
    border: 1px solid #ef5350;
    border-radius: 6px;
    color: #c62828;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .input-group {
      flex-direction: column;
    }

    .coords-inputs {
      grid-template-columns: 1fr;
    }

    .tab-btn {
      font-size: 0.85rem;
      padding: 0.5rem 0.75rem;
    }
  }
</style>
