<script lang="ts">
  import { goto } from "$app/navigation";
  import { createSupabaseLoadClient } from "$lib/supabase.js";
  import { logger } from "$lib/utils/logger.js";
  import ImageUpload from "$lib/components/ImageUpload.svelte";
  import MapLocationPicker from "$lib/components/MapLocationPicker.svelte";
  import { MapLocationSearch } from "$lib/components/map";
  import ImageDeleteModal from "$lib/components/ImageDeleteModal.svelte";
  import type { PageData } from "./$types";
  import type { ImageUploadResult } from "$lib/types/images.js";
  import type { Location } from "$lib/components/map/types";
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  // Authentication state
  let user = $derived(data.user);
  let hazard = $derived(data.hazard);
  let categories = $derived(data.categories || []);

  // Supabase setup
  const supabase = createSupabaseLoadClient();

  // Form state pre-populated with existing hazard data
  let formData = $state({
    title: hazard.title,
    description: hazard.description,
    category_id: hazard.category_id || "",
    severity_level: hazard.severity_level,
    latitude: hazard.latitude.toString(),
    longitude: hazard.longitude.toString(),
    reported_active_date: hazard.reported_active_date
      ? new Date(hazard.reported_active_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    is_seasonal: hazard.is_seasonal,
  });

  // Location and area state
  let currentLocation = $state<{ lat: number; lng: number }>({
    lat: hazard.latitude,
    lng: hazard.longitude,
  });
  let currentArea = $state<GeoJSON.Polygon | null>(hazard.area);
  let mapZoom = $state(13); // Track zoom level for map
  let uploadedImages = $state<string[]>([]);
  let loading = $state(false);
  let error = $state("");
  let success = $state("");

  // Image deletion modal state
  let showDeleteModal = $state(false);
  let imageToDelete = $state<{ id: string; url: string } | null>(null);

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

  // Handle successful image uploads
  const handleImageUpload = (event: CustomEvent<ImageUploadResult>) => {
    const result = event.detail;
    uploadedImages = [...uploadedImages, result.id];
    success = "Image uploaded successfully!";
    setTimeout(() => (success = ""), 3000);
  };

  // Handle image upload errors
  const handleImageError = (event: CustomEvent<{ message: string }>) => {
    error = `Image upload failed: ${event.detail.message}`;
    setTimeout(() => (error = ""), 5000);
  };

  // Handle form submission
  const handleSubmit = () => {
    loading = true;
    error = "";
    success = "";
  };

  function handleCancel() {
    goto(`/hazards/${hazard.id}`);
  }

  function removeImage(imageId: string) {
    const image = hazard.hazard_images?.find((img: any) => img.id === imageId);
    if (image) {
      imageToDelete = {
        id: imageId,
        url: image.thumbnail_url || image.image_url,
      };
      showDeleteModal = true;
    }
  }

  function handleDeleteConfirm(imageId: string) {
    // Remove the image from the hazard's image list locally
    if (hazard.hazard_images) {
      hazard.hazard_images = hazard.hazard_images.filter(
        (img: any) => img.id !== imageId
      );
    }

    // Close modal
    showDeleteModal = false;
    imageToDelete = null;

    // Show success message
    success = "Image deleted successfully!";
    setTimeout(() => (success = ""), 3000);
  }

  function handleDeleteCancel() {
    showDeleteModal = false;
    imageToDelete = null;
  }
</script>

<svelte:head>
  <title>Edit Hazard: {hazard.title}</title>
  <meta name="description" content="Edit hazard report details" />
</svelte:head>

<div class="container">
  <div class="page-header">
    <h1>Edit Hazard Report</h1>
    <p>
      Update the details of your hazard report. Changes will be reviewed before
      being published.
    </p>
  </div>

  <form
    class="hazard-form"
    method="POST"
    action="?/updateHazard"
    use:enhance={() => {
      handleSubmit();

      return async ({ result, update }: { result: any; update: any }) => {
        loading = false;

        if (result.type === "failure") {
          const errorData = result.data as any;
          error = errorData?.error || "Failed to update hazard";
          logger.error(
            "Form submission failed",
            new Error(errorData?.error || "Unknown form error")
          );
        } else if (result.type === "redirect") {
          success = "Hazard updated successfully! Redirecting...";
          // Let the redirect happen naturally
        }

        await update();
      };
    }}
  >
    <!-- Basic Information -->
    <section class="form-section">
      <h2>Basic Information</h2>

      <div class="form-group">
        <label for="title">Title *</label>
        <input
          id="title"
          name="title"
          type="text"
          bind:value={formData.title}
          placeholder="Brief description of the hazard"
          required
        />
      </div>

      <div class="form-group">
        <label for="description">Description *</label>
        <textarea
          id="description"
          name="description"
          bind:value={formData.description}
          placeholder="Detailed description of the hazard, its location, and any relevant safety information"
          rows="6"
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
          <option value="">Select a category</option>

          <!-- Hierarchical category display -->
          {#each categories.filter((cat) => cat.level === 0) as mainCategory}
            <option value={mainCategory.id}>
              {mainCategory.icon}
              {mainCategory.name}
            </option>
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

    <!-- Location & Area -->
    <section class="form-section">
      <h2>Location & Area</h2>
      <p class="section-description">
        Update the precise location where the hazard is located. Optionally,
        modify the affected area.
      </p>

      <!-- Location Search -->
      <div class="location-search-section">
        <h4>Search for Location</h4>
        <MapLocationSearch
          onLocationFound={handleLocationSearch}
          initialLocation={currentLocation}
          showCurrentLocation={true}
          placeholder="Search by address, city, zip code, or enter coordinates..."
        />
      </div>

      <!-- Map Location Picker -->
      <div class="map-container">
        <MapLocationPicker
          initialLocation={currentLocation}
          initialArea={currentArea}
          zoom={mapZoom}
          onLocationChange={handleLocationChange}
          onAreaChange={handleAreaChange}
        />
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

    <!-- Existing Images -->
    {#if hazard.hazard_images && hazard.hazard_images.length > 0}
      <section class="form-section">
        <h2>Existing Images</h2>
        <p class="section-description">
          Current images attached to this hazard. Click the X to remove an
          image.
        </p>

        <div class="existing-images-grid">
          {#each hazard.hazard_images as image}
            <div class="image-card">
              <div class="image-card-header">
                <button
                  type="button"
                  class="remove-image-btn"
                  onclick={() => removeImage(image.id)}
                  title="Remove this image"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
              <div class="image-preview-wrapper">
                <img
                  src={image.thumbnail_url || image.image_url}
                  alt="Hazard scene"
                  loading="lazy"
                />
              </div>
              <div class="image-card-footer">
                <div
                  class="image-status-badge status-{image.moderation_status}"
                >
                  {image.moderation_status}
                </div>
                <div class="image-date-small">
                  📅 {new Date(image.upload_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Image Upload -->
    <section class="form-section">
      <h2>Add New Images</h2>
      <p class="section-description">
        Upload additional photos to help identify and locate the hazard. Images
        are reviewed before being published.
      </p>

      <ImageUpload
        hazardId={hazard.id}
        userId={user?.id || ""}
        hazardLocation={currentLocation || {
          lat: hazard.latitude,
          lng: hazard.longitude,
        }}
        supabaseClient={supabase}
        currentUser={user}
        on:upload={handleImageUpload}
        on:error={handleImageError}
      />

      {#if uploadedImages.length > 0}
        <div class="upload-status">
          <p>
            ✅ {uploadedImages.length} new {uploadedImages.length === 1
              ? "image"
              : "images"} uploaded and will be attached to this report
          </p>
        </div>
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

    <!-- Submit -->
    <section class="form-section">
      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      {#if success}
        <div class="alert alert-success">{success}</div>
      {/if}

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick={handleCancel}>
          Cancel
        </button>
        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? "Updating..." : "Update Hazard Report"}
        </button>
      </div>
    </section>
  </form>
</div>

<!-- Image Delete Modal -->
{#if showDeleteModal && imageToDelete}
  <ImageDeleteModal
    imageSrc={imageToDelete.url}
    imageId={imageToDelete.id}
    onConfirm={handleDeleteConfirm}
    onCancel={handleDeleteCancel}
  />
{/if}

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

  .section-description {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
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
  textarea,
  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }

  .severity-selector {
    padding: 1rem;
    background: var(--color-bg-muted);
    border-radius: 6px;
    border: 1px solid #d1d5db;
  }

  .severity-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  .severity-display {
    margin-top: 1rem;
    font-size: 1rem;
    text-align: center;
  }

  /* Map and location styles */
  .location-search-section {
    margin-bottom: 1.5rem;
  }

  .location-search-section h4 {
    margin-bottom: 0.75rem;
    color: var(--color-text);
    font-size: 1rem;
  }

  .map-container {
    margin: 1.5rem 0;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
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

  /* Existing images styles */
  .existing-images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .image-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    position: relative;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .image-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }

  .image-card-header {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 10;
    padding: 0.5rem;
  }

  .remove-image-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.95);
    color: white;
    border: 2px solid white;
    font-size: 1.1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .remove-image-btn:hover {
    background: rgb(220, 38, 38);
    transform: scale(1.1);
  }

  .image-preview-wrapper {
    width: 100%;
    height: 200px;
    overflow: hidden;
    background: #f8fafc;
  }

  .image-preview-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-card-footer {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
  }

  .image-status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    text-align: center;
  }

  .image-status-badge.status-approved {
    background: #dcfce7;
    color: #166534;
  }

  .image-status-badge.status-pending {
    background: #fef3c7;
    color: #92400e;
  }

  .image-status-badge.status-flagged {
    background: #fecaca;
    color: #b91c1c;
  }

  .image-status-badge.status-rejected {
    background: #fee2e2;
    color: #991b1b;
  }

  .image-date-small {
    font-size: 0.8rem;
    color: #64748b;
    text-align: center;
  }

  .upload-status {
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

    .form-actions {
      flex-direction: column;
    }

    .existing-images-grid {
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }

    .severity-labels {
      flex-direction: column;
      gap: 0.25rem;
      text-align: center;
    }
  }
</style>
