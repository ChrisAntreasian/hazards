<script lang="ts">
  import { goto } from "$app/navigation";
  import { createSupabaseLoadClient } from "$lib/supabase.js";
  import { logger } from "$lib/utils/logger.js";
  import ImageUpload from "$lib/components/ImageUpload.svelte";
  import MapLocationPicker from "$lib/components/MapLocationPicker.svelte";
  import type { PageData } from "./$types";
  import type { ImageUploadResult } from "$lib/types/images.js";
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  // Authentication state
  let user = $derived(data.user);
  let session = $derived(data.session);
  let isAuthenticated = $derived(!!user);

  // Categories from server-side load
  let categories = $derived(data.categories || []);

  // Supabase setup
  const supabase = createSupabaseLoadClient();

  // Form state
  let formData = $state({
    title: "",
    description: "",
    category_id: "",
    severity_level: 3,
    latitude: "",
    longitude: "",
    reported_active_date: new Date().toISOString().split("T")[0],
    is_seasonal: false,
  });

  // Location and area state
  let currentLocation = $state<{ lat: number; lng: number } | null>(null);
  let currentArea = $state<GeoJSON.Polygon | null>(null);
  let uploadedImages = $state<string[]>([]);
  let loading = $state(false);
  let error = $state("");
  let success = $state("");
  let locationLoading = $state(false);

  // Handle location changes from MapLocationPicker
  const handleLocationChange = (location: { lat: number; lng: number }) => {
    currentLocation = location;
    formData.latitude = location.lat.toString();
    formData.longitude = location.lng.toString();
  };

  // Handle area changes from MapLocationPicker
  const handleAreaChange = (area: GeoJSON.Polygon | null) => {
    currentArea = area;
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      error = "Geolocation is not supported by this browser";
      return;
    }

    locationLoading = true;
    error = "";

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          });
        }
      );

      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      formData.latitude = position.coords.latitude.toString();
      formData.longitude = position.coords.longitude.toString();

      success = "Location acquired successfully!";
      setTimeout(() => {
        success = "";
      }, 3000);
    } catch (err: any) {
      logger.warn("Geolocation failed", {
        metadata: { errorMessage: err.message },
      });
      error = `Failed to get location: ${err.message || "Unknown error"}`;

      // Default to Boston area as fallback
      currentLocation = { lat: 42.3601, lng: -71.0589 };
      formData.latitude = "42.3601";
      formData.longitude = "-71.0589";
    } finally {
      locationLoading = false;
    }
  };

  // Handle image upload results
  const handleImageUpload = (event: CustomEvent<ImageUploadResult>) => {
    const result = event.detail;
    uploadedImages.push(result.id);
  };

  const handleUploadError = (event: CustomEvent<{ message: string }>) => {
    error = `Image upload failed: ${event.detail.message}`;
  };

  // Initialize
  $effect(() => {
    // Ensure Supabase client has the session
    if (supabase && session) {
      supabase.auth.setSession(session);
    }
  });
</script>

<svelte:head>
  <title>Report Hazard - Hazards App</title>
  <meta
    name="description"
    content="Report a new outdoor hazard to help keep the community safe"
  />
</svelte:head>

<div class="container">
  <header class="page-header">
    <h1>🚨 Report a Hazard</h1>
    <p>
      Help keep the outdoor community safe by reporting hazards you encounter
    </p>
  </header>

  {#if !isAuthenticated}
    <div class="auth-required">
      <h2>Authentication Required</h2>
      <p>You must be logged in to report hazards.</p>
      <a href="/auth/log-in" class="btn btn-primary">Log In</a>
    </div>
  {:else}
    <form
      class="hazard-form"
      method="POST"
      action="?/createHazard"
      use:enhance={() => {
        loading = true;
        error = "";
        success = "";

        return async ({ result, update }: { result: any; update: any }) => {
          loading = false;

          if (result.type === "failure") {
            const errorData = result.data as any;
            error = errorData?.error || "Failed to submit hazard";
            logger.error(
              "Form submission failed",
              new Error(errorData?.error || "Unknown form error")
            );
          } else if (result.type === "redirect") {
            success =
              "Hazard reported successfully! Redirecting to dashboard...";

            // Reset form on success
            formData = {
              title: "",
              description: "",
              category_id: "",
              severity_level: 3,
              latitude: "",
              longitude: "",
              reported_active_date: new Date().toISOString().split("T")[0],
              is_seasonal: false,
            };
            uploadedImages = [];
            currentLocation = null;

            // Let SvelteKit handle the redirect
            await update();
          } else {
            // Update the page with any changes
            await update();
          }
        };
      }}
    >
      <!-- Hidden field for uploaded images -->
      <input
        type="hidden"
        name="uploaded_images"
        value={uploadedImages.join(",")}
      />

      <!-- Basic Information -->
      <section class="form-section">
        <h2>Basic Information</h2>

        <div class="form-group">
          <label for="title">Hazard Title *</label>
          <input
            id="title"
            name="title"
            type="text"
            bind:value={formData.title}
            placeholder="e.g., Bear sighting on Main Trail"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description *</label>
          <textarea
            id="description"
            name="description"
            bind:value={formData.description}
            placeholder="Provide detailed information about the hazard, when you encountered it, and any relevant details that could help others stay safe..."
            rows="4"
            required
          ></textarea>
        </div>

        <div class="form-group">
          <label for="category">Category *</label>
          <select
            id="category"
            name="category_id"
            bind:value={formData.category_id}
            required
          >
            <option value=""
              >Select a category... ({categories.length} available)</option
            >
            <!-- Level 0 categories (main categories) -->
            {#each categories.filter((cat) => cat.level === 0) as mainCategory}
              <option value={mainCategory.id}
                >{mainCategory.icon} {mainCategory.name}</option
              >
              <!-- Level 1 subcategories -->
              {#each categories.filter((cat) => cat.level === 1 && cat.path.startsWith(mainCategory.path + "/")) as subCategory}
                <option value={subCategory.id}>
                  ↳ {subCategory.icon} {subCategory.name}</option
                >
                <!-- Level 2 sub-subcategories -->
                {#each categories.filter((cat) => cat.level === 2 && cat.path.startsWith(subCategory.path + "/")) as subSubCategory}
                  <option value={subSubCategory.id}>
                    ↳ {subSubCategory.icon} {subSubCategory.name}</option
                  >
                {/each}
              {/each}
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="severity">Severity Level</label>
          <div class="severity-selector">
            <input
              id="severity"
              name="severity_level"
              type="range"
              min="1"
              max="5"
              bind:value={formData.severity_level}
            />
            <div class="severity-labels">
              <span>1 - Low</span>
              <span>2 - Moderate</span>
              <span>3 - Significant</span>
              <span>4 - High</span>
              <span>5 - Extreme</span>
            </div>
            <div class="severity-display">
              Current: <strong
                >{formData.severity_level} - {[
                  "",
                  "Low",
                  "Moderate",
                  "Significant",
                  "High",
                  "Extreme",
                ][formData.severity_level]}</strong
              >
            </div>
          </div>
        </div>
      </section>

      <!-- Location -->
      <section class="form-section">
        <h2>Location & Area</h2>
        <p class="section-description">
          Set the precise location where the hazard is located. Optionally, draw an area to show the affected region.
        </p>

        <!-- Map Location Picker -->
        <div class="map-container">
          {#if currentLocation}
            <MapLocationPicker 
              initialLocation={currentLocation}
              initialArea={currentArea}
              onLocationChange={handleLocationChange}
              onAreaChange={handleAreaChange}
            />
          {:else}
            <div class="location-prompt">
              <p>Please get your current location or enter coordinates manually to enable the map.</p>
              <button
                type="button"
                class="btn btn-primary"
                onclick={getCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? "Getting Location..." : "📍 Get Current Location"}
              </button>
            </div>
          {/if}
        </div>

        <!-- Manual coordinate entry (fallback) -->
        <details class="manual-coordinates">
          <summary>Or enter coordinates manually</summary>
          <div class="form-row">
            <div class="form-group">
              <label for="latitude">Latitude *</label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                bind:value={formData.latitude}
                placeholder="42.3601"
                required
                onchange={() => {
                  const lat = parseFloat(formData.latitude);
                  const lng = parseFloat(formData.longitude);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    currentLocation = { lat, lng };
                  }
                }}
              />
            </div>
            <div class="form-group">
              <label for="longitude">Longitude *</label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                bind:value={formData.longitude}
                placeholder="-71.0589"
                required
                onchange={() => {
                  const lat = parseFloat(formData.latitude);
                  const lng = parseFloat(formData.longitude);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    currentLocation = { lat, lng };
                  }
                }}
              />
            </div>
          </div>
        </details>

        <!-- Hidden inputs for form submission -->
        <input type="hidden" name="latitude" bind:value={formData.latitude} />
        <input type="hidden" name="longitude" bind:value={formData.longitude} />
        {#if currentArea}
          <input type="hidden" name="area" value={JSON.stringify(currentArea)} />
        {/if}
      </section>

      <!-- Additional Details -->
      <section class="form-section">
        <h2>Additional Details</h2>

        <div class="form-group">
          <label for="date">Date Observed</label>
          <input
            id="date"
            name="reported_active_date"
            type="date"
            bind:value={formData.reported_active_date}
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              name="is_seasonal"
              bind:checked={formData.is_seasonal}
            />
            This is a seasonal hazard (recurring annually)
          </label>
        </div>
      </section>

      <!-- Image Upload -->
      <section class="form-section">
        <h2>Photos</h2>
        <p>Upload photos to help others identify and understand the hazard</p>

        <ImageUpload
          hazardId={undefined}
          userId={user?.id || ""}
          hazardLocation={currentLocation || { lat: 42.3601, lng: -71.0589 }}
          maxFiles={8}
          disabled={!isAuthenticated}
          supabaseClient={supabase}
          currentSession={session}
          currentUser={user}
          on:upload={handleImageUpload}
          on:error={handleUploadError}
        />

        {#if uploadedImages.length > 0}
          <div class="uploaded-images-status">
            <p>
              ✅ {uploadedImages.length} image{uploadedImages.length !== 1
                ? "s"
                : ""} uploaded and will be attached to this report
            </p>
          </div>
        {/if}
      </section>

      <!-- Submit -->
      <section class="form-section">
        {#if error}
          <div class="alert alert-error">{error}</div>
        {/if}

        {#if success}
          <div class="alert alert-success">{success}</div>
        {/if}

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => goto("/dashboard")}
          >
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? "Submitting..." : "Submit Hazard Report"}
          </button>
        </div>
      </section>
    </form>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .page-header p {
    font-size: 1.1rem;
    color: #64748b;
  }

  .auth-required {
    background: white;
    padding: 3rem;
    border-radius: 12px;
    text-align: center;
    border: 1px solid #e5e7eb;
  }

  .hazard-form {
    background: white;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    overflow: hidden;
  }

  .form-section {
    padding: 2rem;
    border-bottom: 1px solid var(--color-bg-muted);
  }

  .form-section:last-child {
    border-bottom: none;
  }

  .form-section h2 {
    font-size: 1.5rem;
    color: var(--color-text-primary);
    margin-bottom: 1.5rem;
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: 0.5rem;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .severity-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .severity-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .severity-display {
    text-align: center;
    font-size: 1rem;
    color: #374151;
  }

  .location-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .location-status {
    color: var(--color-success);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: normal;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }

  .uploaded-images-status {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--success-50);
    border: 1px solid var(--success-200);
    border-radius: 6px;
    color: var(--color-success);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--gray-500);
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--gray-600);
  }

  .alert {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .alert-error {
    background: var(--error-50);
    color: var(--color-error);
    border: 1px solid var(--error-200);
  }

  .alert-success {
    background: var(--success-50);
    color: var(--color-success);
    border: 1px solid var(--success-200);
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .page-header h1 {
      font-size: 2rem;
    }

    .form-section {
      padding: 1.5rem;
    }

    .form-row {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .location-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .form-actions {
      flex-direction: column;
    }

    .severity-labels {
      flex-direction: column;
      gap: 0.25rem;
      text-align: center;
    }
  }

  /* Map Location Picker Styles */
  .map-container {
    margin: 1.5rem 0;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .location-prompt {
    padding: 3rem;
    text-align: center;
    background: var(--color-bg-muted);
    color: var(--color-text-secondary);
  }

  .location-prompt p {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .manual-coordinates {
    margin-top: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0;
  }

  .manual-coordinates summary {
    padding: 1rem;
    background: var(--color-bg-muted);
    cursor: pointer;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .manual-coordinates summary:hover {
    background: var(--color-bg-tertiary);
  }

  .manual-coordinates[open] summary {
    border-bottom: 1px solid var(--color-border);
  }

  .manual-coordinates .form-row {
    padding: 1rem;
  }

  .section-description {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
  }
</style>
