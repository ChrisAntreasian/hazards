<script lang="ts">
  import { goto } from "$app/navigation";
  import { createSupabaseLoadClient } from "$lib/supabase.js";
  import { logger } from "$lib/utils/logger.js";
  import ImageUpload from "$lib/components/ImageUpload.svelte";
  import MapLocationPicker from "$lib/components/MapLocationPicker.svelte";
  import { MapLocationSearch } from "$lib/components/map";
  import type { PageData } from "./$types";
  import type { ImageUploadResult } from "$lib/types/images.js";
  import type { Location } from "$lib/components/map/types";
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";
  import type { ExpirationType, ExpirationSettings } from "$lib/types/database";

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

  // Expiration state
  let expirationSettings = $state<ExpirationSettings | null>(null);
  let selectedExpirationType = $state<ExpirationType>("user_resolvable");
  let autoExpireDuration = $state<number>(24); // hours
  let selectedSeasonalMonths = $state<number[]>([]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Location and area state
  let currentLocation = $state<{ lat: number; lng: number } | null>(null);
  let currentArea = $state<GeoJSON.Polygon | null>(null);
  let mapZoom = $state(13); // Track zoom level for map
  let uploadedImages = $state<string[]>([]);
  let loading = $state(false);
  let error = $state("");
  let success = $state("");

  // Handle location changes from MapLocationPicker
  const handleLocationChange = (location: { lat: number; lng: number }) => {
    currentLocation = location;
    formData.latitude = location.lat.toString();
    formData.longitude = location.lng.toString();
  };

  // Handle location search results
  const handleLocationSearch = (location: Location, zoom?: number) => {
    currentLocation = location;
    formData.latitude = location.lat.toString();
    formData.longitude = location.lng.toString();
    // Update zoom if provided, otherwise use reasonable default
    mapZoom = zoom || 13;
  };

  // Handle area changes from MapLocationPicker
  const handleAreaChange = (area: GeoJSON.Polygon | null) => {
    currentArea = area;
  };

  // Handle zoom changes from MapLocationPicker
  const handleZoomChange = (newZoom: number) => {
    console.log("Zoom changed to:", newZoom);
    mapZoom = newZoom;
  };

  // Handle image upload results
  const handleImageUpload = (event: CustomEvent<ImageUploadResult>) => {
    const result = event.detail;
    uploadedImages.push(result.id);
  };

  const handleUploadError = (event: CustomEvent<{ message: string }>) => {
    // Error is now handled by ImageUpload component's internal display
    // No need to set page-level error
  };

  // Initialize
  $effect(() => {
    // Ensure Supabase client has the session
    if (supabase && session) {
      supabase.auth.setSession(session);
    }
  });

  // Load expiration settings when category changes
  $effect(() => {
    if (formData.category_id) {
      loadExpirationSettings(formData.category_id);
    }
  });

  async function loadExpirationSettings(categoryId: string) {
    if (!supabase) return;

    try {
      const { data: settings, error } = await supabase
        .from("expiration_settings")
        .select("*")
        .eq("category_id", categoryId)
        .single();

      if (settings && !error) {
        expirationSettings = settings;
        // Set defaults from settings
        selectedExpirationType =
          settings.default_expiration_type as ExpirationType;

        if (settings.auto_expire_duration) {
          // Parse interval string like "6 hours" or "2 days"
          const match = settings.auto_expire_duration.match(
            /(\d+)\s*(hour|day|week)/i
          );
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            autoExpireDuration =
              unit === "day"
                ? value * 24
                : unit === "week"
                  ? value * 24 * 7
                  : value;
          }
        }

        if (settings.seasonal_pattern?.active_months) {
          selectedSeasonalMonths = settings.seasonal_pattern.active_months;
        }
      } else {
        // Load default settings
        const { data: defaultSettings } = await supabase
          .from("expiration_settings")
          .select("*")
          .eq("category_path", "default")
          .single();

        if (defaultSettings) {
          expirationSettings = defaultSettings;
          selectedExpirationType =
            defaultSettings.default_expiration_type as ExpirationType;
        }
      }
    } catch (err) {
      console.error("Failed to load expiration settings:", err);
    }
  }

  function toggleSeasonalMonth(month: number) {
    if (selectedSeasonalMonths.includes(month)) {
      selectedSeasonalMonths = selectedSeasonalMonths.filter(
        (m) => m !== month
      );
    } else {
      selectedSeasonalMonths = [...selectedSeasonalMonths, month].sort(
        (a, b) => a - b
      );
    }
  }
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
      use:enhance={({ formData: fd }) => {
        console.log("Form submitting with mapZoom:", mapZoom);
        // Manually ensure zoom is in the form data
        fd.set("zoom", String(mapZoom));
        console.log("FormData zoom set to:", fd.get("zoom"));

        // Add expiration data
        fd.set("expiration_type", selectedExpirationType);

        if (selectedExpirationType === "auto_expire") {
          // Calculate expires_at timestamp
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + autoExpireDuration);
          fd.set("expires_at", expiresAt.toISOString());
        } else if (
          selectedExpirationType === "seasonal" &&
          selectedSeasonalMonths.length > 0
        ) {
          fd.set(
            "seasonal_pattern",
            JSON.stringify({ active_months: selectedSeasonalMonths })
          );
        }

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

      <!-- Hidden field for map zoom level -->
      <input
        type="hidden"
        name="zoom"
        value={String(mapZoom)}
        data-zoom={mapZoom}
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
          Set the precise location where the hazard is located. Optionally, draw
          an area to show the affected region.
        </p>

        <!-- Map Location Picker -->
        <div class="map-container">
          {#if currentLocation}
            <MapLocationPicker
              initialLocation={currentLocation}
              initialArea={currentArea}
              zoom={mapZoom}
              onLocationChange={handleLocationChange}
              onAreaChange={handleAreaChange}
              onZoomChange={handleZoomChange}
            />
          {:else}
            <div class="location-prompt">
              <p>
                Please use the location search below to set a location and
                enable the map.
              </p>
            </div>
          {/if}
        </div>

        <!-- Location Search -->
        <div class="location-search-section">
          <h3>Search for Location</h3>
          <MapLocationSearch
            onLocationFound={handleLocationSearch}
            initialLocation={currentLocation || undefined}
            showCurrentLocation={true}
            placeholder="Search by address, city, zip code, or enter coordinates..."
          />
        </div>

        <!-- Hidden inputs for form submission -->
        <input type="hidden" name="latitude" bind:value={formData.latitude} />
        <input type="hidden" name="longitude" bind:value={formData.longitude} />
        {#if currentArea}
          <input
            type="hidden"
            name="area"
            value={JSON.stringify(currentArea)}
          />
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

      <!-- Expiration Settings -->
      <section class="form-section">
        <h2>Expiration & Resolution</h2>
        <p class="section-description">
          Choose how this hazard should expire or be resolved. Default settings
          are based on the selected category.
        </p>

        <div class="expiration-types">
          <!-- Auto Expire -->
          <label class="expiration-option">
            <input
              type="radio"
              name="expiration_type"
              value="auto_expire"
              bind:group={selectedExpirationType}
            />
            <div class="option-content">
              <div class="option-header">
                <span class="option-icon">⏰</span>
                <span class="option-title">Auto-Expire</span>
              </div>
              <p class="option-description">
                Automatically expires after a set time (for temporary conditions
                like weather)
              </p>

              {#if selectedExpirationType === "auto_expire"}
                <div class="option-settings">
                  <label for="auto-expire-duration">Expires in:</label>
                  <div class="duration-input">
                    <input
                      id="auto-expire-duration"
                      type="number"
                      min="1"
                      max="168"
                      bind:value={autoExpireDuration}
                      class="duration-number"
                    />
                    <span>hours</span>
                  </div>
                  <p class="hint">
                    Typical: Thunderstorm (6h), Ice (24h), Flood (72h)
                  </p>
                </div>
              {/if}
            </div>
          </label>

          <!-- User Resolvable -->
          <label class="expiration-option">
            <input
              type="radio"
              name="expiration_type"
              value="user_resolvable"
              bind:group={selectedExpirationType}
            />
            <div class="option-content">
              <div class="option-header">
                <span class="option-icon">✓</span>
                <span class="option-title">User Resolvable</span>
                {#if expirationSettings?.default_expiration_type === "user_resolvable"}
                  <span class="default-badge">Recommended</span>
                {/if}
              </div>
              <p class="option-description">
                Requires users to report when resolved (for fixable issues like
                road closures)
              </p>
            </div>
          </label>

          <!-- Permanent -->
          <label class="expiration-option">
            <input
              type="radio"
              name="expiration_type"
              value="permanent"
              bind:group={selectedExpirationType}
            />
            <div class="option-content">
              <div class="option-header">
                <span class="option-icon">∞</span>
                <span class="option-title">Permanent</span>
              </div>
              <p class="option-description">
                Never expires (for permanent features like terrain or plants)
              </p>
            </div>
          </label>

          <!-- Seasonal -->
          <label class="expiration-option">
            <input
              type="radio"
              name="expiration_type"
              value="seasonal"
              bind:group={selectedExpirationType}
            />
            <div class="option-content">
              <div class="option-header">
                <span class="option-icon">🌿</span>
                <span class="option-title">Seasonal</span>
              </div>
              <p class="option-description">
                Active only during specific months (for recurring seasonal
                hazards)
              </p>

              {#if selectedExpirationType === "seasonal"}
                <div class="option-settings">
                  <div class="field-label">Active months:</div>
                  <div class="month-selector">
                    {#each monthNames as month, index}
                      <button
                        type="button"
                        class="month-button"
                        class:selected={selectedSeasonalMonths.includes(
                          index + 1
                        )}
                        onclick={() => toggleSeasonalMonth(index + 1)}
                      >
                        {month.substring(0, 3)}
                      </button>
                    {/each}
                  </div>
                  {#if selectedSeasonalMonths.length === 0}
                    <p class="hint error">
                      ⚠ Please select at least one active month
                    </p>
                  {:else}
                    <p class="hint">
                      Active: {selectedSeasonalMonths
                        .map((m) => monthNames[m - 1])
                        .join(", ")}
                    </p>
                  {/if}
                </div>
              {/if}
            </div>
          </label>
        </div>

        {#if expirationSettings}
          <div class="settings-info">
            <p class="text-sm text-gray-600">
              📋 Default for this category: <strong
                >{expirationSettings.default_expiration_type.replace(
                  "_",
                  " "
                )}</strong
              >
              {#if expirationSettings.confirmation_threshold}
                • Resolution threshold: {expirationSettings.confirmation_threshold}
                confirmations
              {/if}
            </p>
          </div>
        {/if}
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

  .location-search-section {
    margin-top: 1rem;
    margin-bottom: 1.5rem;
  }

  .location-search-section h3 {
    font-size: 1.1rem;
    color: var(--color-text);
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  .section-description {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
  }

  /* Expiration Settings Styles */
  .expiration-types {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .expiration-option {
    display: flex;
    gap: 1rem;
    padding: 1.25rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .expiration-option:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }

  .expiration-option:has(input:checked) {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .expiration-option input[type="radio"] {
    width: auto;
    margin-top: 0.25rem;
    cursor: pointer;
  }

  .option-content {
    flex: 1;
  }

  .option-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .option-icon {
    font-size: 1.25rem;
  }

  .option-title {
    font-weight: 600;
    font-size: 1.1rem;
    color: #1e293b;
  }

  .default-badge {
    padding: 0.125rem 0.5rem;
    background: #dcfce7;
    color: #166534;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .option-description {
    color: #64748b;
    font-size: 0.9rem;
    margin: 0;
  }

  .option-settings {
    margin-top: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .option-settings label {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .duration-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .duration-number {
    width: 100px;
    padding: 0.5rem;
  }

  .month-selector {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .month-button {
    padding: 0.5rem;
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .month-button:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }

  .month-button.selected {
    border-color: #3b82f6;
    background: #3b82f6;
    color: white;
    font-weight: 600;
  }

  .hint {
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 0.5rem;
    font-style: italic;
  }

  .hint.error {
    color: #dc2626;
  }

  .settings-info {
    padding: 1rem;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .text-sm {
    font-size: 0.875rem;
  }

  .text-gray-600 {
    color: #64748b;
  }

  @media (max-width: 768px) {
    .month-selector {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
