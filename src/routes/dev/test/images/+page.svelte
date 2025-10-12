<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { createSupabaseLoadClient } from "$lib/supabase.js";
  import { MessageDisplay } from "$lib/components/auth";
  import ImageUpload from "$lib/components/ImageUpload.svelte";
  import ImageGallery from "$lib/components/ImageGallery.svelte";
  import { ImageStorage } from "$lib/images/storage.js";
  import type { HazardImage, ImageUploadResult } from "$lib/types/images.js";
  import type { PageData } from "./$types";

  // Use server-provided data for consistency with other pages
  let { data }: { data: PageData } = $props();

  // Derive authentication state from server data
  let user = $derived(data.user);
  let session = $derived(data.session);
  let isAuthenticated = $derived(!!user);

  let images: HazardImage[] = $state([]);
  let loading = $state(false);
  let error = $state("");
  let uploadError = $state("");
  let uploadSuccess = $state("");

  // Pagination state
  let currentPage = $state(1);
  const imagesPerPage = 12; // 4 columns × 3 rows
  let totalPages = $derived(Math.ceil(images.length / imagesPerPage));
  let paginatedImages = $derived.by(() => {
    const startIndex = (currentPage - 1) * imagesPerPage;
    const endIndex = startIndex + imagesPerPage;
    return images.slice(startIndex, endIndex);
  });

  // Use the centralized auth system instead of managing locally
  const supabase = createSupabaseLoadClient();
  let imageStorage: ImageStorage | null = null;

  // Initialize ImageStorage once
  $effect(() => {
    if (supabase) {
      imageStorage = new ImageStorage(supabase);
      loadImages();
    }
  });

  // Mock data for demonstration
  const mockHazardId = null; // Use null for testing since we don't have a real hazard
  // Use real user ID if authenticated, otherwise use a test user ID that exists in database
  let mockUserId = $derived(user?.id || "aae81a04-9e69-4b82-ac61-a22bb457d8a6");
  const mockLocation = {
    lat: 42.3601,
    lng: -71.0589,
  };

  const loadImages = async () => {
    loading = true;
    error = "";

    if (!imageStorage) {
      error = "Image storage not available";
      loading = false;
      return;
    }

    try {
      // Always load real images from database, using the current user's ID
      const currentUserId = user?.id || mockUserId;
      console.log('🔍 Loading images for user:', currentUserId);
      console.log('🔍 User object:', user);
      console.log('🔍 ImageStorage instance:', imageStorage);
      
      const userImages = await imageStorage.getUserImages(currentUserId);
      console.log('📸 Loaded images from database:', userImages);
      console.log('📸 Number of images found:', userImages.length);
      
      images = userImages.map(img => ({
        id: img.id,
        hazard_id: img.hazard_id || mockHazardId,
        user_id: img.user_id,
        original_url: img.original_url,
        thumbnail_url: img.thumbnail_url,
        vote_score: img.vote_score || 0,
        uploaded_at: img.uploaded_at,
        metadata: img.metadata || {
          timestamp: img.uploaded_at,
          fileSize: img.metadata?.fileSize || 0,
          dimensions: img.metadata?.dimensions || { width: 0, height: 0 }
        },
        user_vote: null // Will be populated if we implement voting
      }));
      
      // If no images found, show helpful message
      if (images.length === 0) {
        console.log('❌ No images found for current user');
      } else {
        console.log('✅ Successfully loaded', images.length, 'images');
      }
    } catch (err) {
      console.error("Failed to load images:", err);
      error = err instanceof Error ? err.message : "Failed to load images";
      // Fallback to empty array
      images = [];
    } finally {
      loading = false;
    }
  };

  const handleImageUpload = (event: CustomEvent<ImageUploadResult>) => {
    const result = event.detail;
    uploadSuccess = `Successfully uploaded image: ${result.id}`;
    uploadError = "";

    // Add new image to gallery (at the beginning)
    const newImage: HazardImage = {
      id: result.id,
      hazard_id: mockHazardId,
      user_id: mockUserId,
      original_url: result.originalUrl,
      thumbnail_url: result.thumbnailUrl,
      vote_score: 0,
      uploaded_at: new Date().toISOString(),
      metadata: result.metadata,
    };

    images = [newImage, ...images];
    
    // Reset to page 1 to show the new image
    currentPage = 1;

    // Clear success message after 3 seconds
    setTimeout(() => {
      uploadSuccess = "";
    }, 3000);
  };

  const handleUploadError = (event: CustomEvent<{ message: string }>) => {
    uploadError = event.detail.message;
    uploadSuccess = "";

    // Clear error message after 5 seconds
    setTimeout(() => {
      uploadError = "";
    }, 5000);
  };

  const handleUploadSuccess = (event: CustomEvent<{ message: string }>) => {
    uploadSuccess = event.detail.message;
    uploadError = "";

    // Clear success message after 3 seconds
    setTimeout(() => {
      uploadSuccess = "";
    }, 3000);
  };

  const handleImageVote = async (
    event: CustomEvent<{ imageId: string; vote: "up" | "down" }>
  ) => {
    const { imageId, vote } = event.detail;

    if (!imageStorage) {
      error = "Image storage not available";
      return;
    }

    try {
      await imageStorage.voteOnImage(imageId, mockUserId, vote);

      // Update local state
      images = images.map((img) => {
        if (img.id === imageId) {
          const scoreChange = vote === "up" ? 1 : -1;
          return {
            ...img,
            vote_score: img.vote_score + scoreChange,
            user_vote: vote,
          };
        }
        return img;
      });
    } catch (err) {
      console.error("Vote failed:", err);
      error = "Failed to vote on image";
    }
  };

  const handleImageDelete = async (event: CustomEvent<{ imageId: string }>) => {
    const { imageId } = event.detail;

    if (!imageStorage) {
      error = "Image storage not available";
      return;
    }

    try {
      await imageStorage.deleteImage(imageId, mockUserId);

      // Remove from local state
      images = images.filter((img) => img.id !== imageId);
      
      // Reset to page 1 if current page would be empty
      const newTotalPages = Math.ceil(images.length / imagesPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        currentPage = newTotalPages;
      } else if (images.length === 0) {
        currentPage = 1;
      }
    } catch (err) {
      console.error("Delete failed:", err);
      error = "Failed to delete image";
    }
  };
</script>

<svelte:head>
  <title>Image Upload Test - Hazards App</title>
  <meta
    name="description"
    content="Test page for image upload and gallery functionality"
  />
</svelte:head>

<div class="container">
  <div class="header">
    <h1>Image Upload & Gallery Test</h1>
    <p class="subtitle">
      Week 3 Development: Testing image processing, storage, and gallery
      components
    </p>
  </div>

  <!-- Authentication Alert -->
  {#if !isAuthenticated}
    <MessageDisplay
      type="warning"
      message="You are not logged in. Image uploads will fail without authentication."
    />
    <div style="margin-bottom: 1rem; text-align: center;">
      <a href="/auth/log-in" class="login-btn">Log In to Upload Images</a>
    </div>
  {/if}

  <!-- Status Messages using standardized components -->
  {#if error}
    <MessageDisplay
      type="error"
      message={error}
      dismissible
      onDismiss={() => (error = "")}
    />
  {/if}

  {#if uploadError}
    <MessageDisplay
      type="error"
      message={uploadError}
      dismissible
      onDismiss={() => (uploadError = "")}
    />
  {/if}

  {#if uploadSuccess}
    <MessageDisplay
      type="success"
      message={uploadSuccess}
      dismissible
      onDismiss={() => (uploadSuccess = "")}
    />
  {/if}

  <!-- Demo Info -->
  <div class="demo-info">
    <h2>Demo Configuration</h2>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Hazard ID:</span>
        <code>{mockHazardId || "null (test mode)"}</code>
      </div>
      <div class="info-item">
        <span class="info-label">User ID:</span>
        <code>{mockUserId}</code>
      </div>
      <div class="info-item">
        <span class="info-label">Location:</span>
        <code>{mockLocation.lat}, {mockLocation.lng}</code>
      </div>
      <div class="info-item">
        <span class="info-label">Authentication:</span>
        <span
          class="status"
          class:authenticated={isAuthenticated}
          class:guest={!isAuthenticated}
        >
          {isAuthenticated ? "Authenticated" : "Guest Mode"}
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">Session Available:</span>
        <span
          class="status"
          class:authenticated={session}
          class:guest={!session}
        >
          {session ? "Yes" : "No"}
        </span>
      </div>
    </div>
  </div>

  <!-- Image Upload Section -->
  <div class="section">
    <h2>Upload Images</h2>
    <p class="section-description">
      Test the image upload component with automatic processing, compression,
      and EXIF handling.
    </p>

    <ImageUpload
      hazardId={mockHazardId}
      userId={mockUserId}
      hazardLocation={mockLocation}
      maxFiles={5}
      disabled={!isAuthenticated}
      supabaseClient={supabase}
      currentSession={session}
      currentUser={user}
      on:upload={handleImageUpload}
      on:error={handleUploadError}
      on:success={handleUploadSuccess}
      on:progress={(e) => console.log("Upload progress:", e.detail)}
    />
  </div>

  <!-- Image Gallery Section -->
  <div class="section">
    <h2>Image Gallery</h2>
    <p class="section-description">
      Browse, vote on, and manage uploaded images. Includes modal view and
      voting system.
    </p>

    <div class="gallery-header">
      <h2>Your Image Gallery ({images.length} images)</h2>
      <p class="section-description">
        Browse, vote on, and manage your uploaded images. Images are displayed in a 4×3 grid with pagination.
      </p>
    </div>

    <ImageGallery
      images={paginatedImages}
      currentUserId={mockUserId}
      canVote={isAuthenticated}
      canDelete={isAuthenticated}
      {loading}
      on:vote={handleImageVote}
      on:delete={handleImageDelete}
      on:view={(e) => console.log("Viewing image:", e.detail.image)}
    />

    <!-- Pagination Controls -->
    {#if totalPages > 1}
      <div class="pagination">
        <button
          class="pagination-btn"
          disabled={currentPage === 1}
          onclick={() => currentPage = Math.max(1, currentPage - 1)}
        >
          ← Previous
        </button>
        
        <div class="pagination-info">
          <span>Page {currentPage} of {totalPages}</span>
          <span class="pagination-details">
            Showing {((currentPage - 1) * imagesPerPage) + 1}-{Math.min(currentPage * imagesPerPage, images.length)} of {images.length} images
          </span>
        </div>
        
        <button
          class="pagination-btn"
          disabled={currentPage === totalPages}
          onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
        >
          Next →
        </button>
      </div>
    {/if}
  </div>

  <!-- Technical Details -->
  <div class="technical-details">
    <h2>Technical Implementation</h2>
    <div class="details-grid">
      <div class="detail-card">
        <h3>Image Processing</h3>
        <ul>
          <li>WebP conversion for optimal compression</li>
          <li>Automatic thumbnail generation (200x200)</li>
          <li>EXIF data privacy protection</li>
          <li>Minimum resolution validation (640px)</li>
          <li>File size limit (2MB)</li>
        </ul>
      </div>

      <div class="detail-card">
        <h3>Storage Architecture</h3>
        <ul>
          <li>Supabase Storage with organized paths</li>
          <li>Public URLs with CDN caching</li>
          <li>Atomic upload with rollback</li>
          <li>User-based access control</li>
          <li>Metadata tracking in database</li>
        </ul>
      </div>

      <div class="detail-card">
        <h3>User Experience</h3>
        <ul>
          <li>Drag & drop file upload</li>
          <li>Real-time upload progress</li>
          <li>Image voting system</li>
          <li>Modal gallery viewer</li>
          <li>Mobile-responsive design</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #6b7280;
    margin: 0;
  }

  .login-btn {
    background: #3b82f6;
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 600;
    transition: background-color 0.2s ease;
  }

  .login-btn:hover {
    background: #2563eb;
  }

  .demo-info {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .demo-info h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #374151;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-item .info-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
  }

  .info-item code {
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: "Courier New", monospace;
    font-size: 0.875rem;
    color: #374151;
  }

  .status.authenticated {
    color: #059669;
    font-weight: 600;
  }

  .status.guest {
    color: #d97706;
    font-weight: 600;
  }

  .section {
    margin-bottom: 3rem;
  }

  .section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .section-description {
    color: #6b7280;
    margin: 0 0 1.5rem 0;
    line-height: 1.6;
  }

  .technical-details {
    margin-top: 4rem;
    padding-top: 2rem;
    border-top: 2px solid #e5e7eb;
  }

  .technical-details h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1.5rem 0;
    text-align: center;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }

  .detail-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .detail-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .detail-card ul {
    margin: 0;
    padding-left: 1.25rem;
    list-style-type: disc;
  }

  .detail-card li {
    color: #4b5563;
    line-height: 1.6;
    margin-bottom: 0.5rem;
  }

  .detail-card li:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header h1 {
      font-size: 2rem;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .details-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
  }

  /* Gallery Header */
  .gallery-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .gallery-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
    padding: 1rem;
  }

  .pagination-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .pagination-btn:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .pagination-btn:disabled {
    background: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  .pagination-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #6b7280;
    min-width: 200px;
    text-align: center;
  }

  .pagination-info span:first-child {
    font-weight: 600;
    color: #374151;
  }

  .pagination-details {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  @media (max-width: 640px) {
    .pagination {
      flex-direction: column;
      gap: 0.75rem;
    }

    .pagination-btn {
      padding: 0.625rem 1.25rem;
      font-size: 0.8rem;
    }

    .pagination-info {
      min-width: auto;
    }
  }
</style>
