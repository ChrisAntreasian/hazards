<!--
/**
 * @fileoverview Advanced image upload component with drag-and-drop, queue management, and progress tracking.
 * Provides secure image handling for hazard reports with automatic processing, validation, and batch uploads.
 * 
 * @component ImageUpload
 * @example
 * ```svelte
 * <ImageUpload 
 *   {userId} 
 *   {hazardId}
 *   {hazardLocation}
 *   maxFiles={3}
 *   {supabaseClient}
 *   on:upload={(e) => handleImageUpload(e.detail)}
 *   on:error={(e) => showError(e.detail.message)}
 *   on:success={(e) => showSuccess(e.detail.message)}
 * />
 * ```
 * 
 * @dispatches upload - Fired when an image is successfully uploaded
 * @dispatches error - Fired when upload validation or processing fails
 * @dispatches progress - Fired during upload progress for each file
 * @dispatches success - Fired when all uploads complete successfully
 * 
 * @features
 * - Drag and drop interface with visual feedback
 * - Multi-file selection with queue management
 * - Real-time upload progress tracking
 * - Image validation (type, size, dimensions)
 * - Automatic image processing and optimization
 * - Geographic metadata integration
 * - Toast notification system
 * - Responsive design for mobile/desktop
 * 
 * @security
 * - File type validation (images only)
 * - Size limits (1KB - 10MB per image)
 * - Content scanning via ImageProcessor
 * - Secure upload to Supabase Storage with RLS
 */
-->

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { SupabaseClient } from "@supabase/supabase-js";
  import { ImageProcessor } from "$lib/images/processor.js";
  import { ImageStorage } from "$lib/images/storage.js";
  import type { GeoPoint, ImageUploadResult } from "$lib/types/images.js";

  /**
   * Component props interface for type-safe property binding.
   * @interface Props
   */
  interface Props {
    /** Optional hazard ID to associate uploaded images with existing hazard report */
    hazardId?: string;
    /** Required user ID for image ownership and RLS security */
    userId: string;
    /** Optional geographic coordinates for EXIF data and location validation */
    hazardLocation?: GeoPoint;
    /** Maximum number of images that can be uploaded at once (default: 5) */
    maxFiles?: number;
    /** Disables upload functionality when true (loading states, permissions) */
    disabled?: boolean;
    /** Authenticated Supabase client for secure upload operations */
    supabaseClient?: SupabaseClient | null;
    /** Current user session for authorization and metadata */
    currentSession?: any;
    /** Current user object for additional context and validation */
    currentUser?: any;
  }

  let {
    hazardId = undefined,
    userId,
    hazardLocation = undefined,
    maxFiles = 5,
    disabled = false,
    supabaseClient = null,
    currentSession = null,
    currentUser = null,
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    upload: ImageUploadResult;
    error: { message: string };
    progress: { fileIndex: number; progress: number };
    success: { message: string };
  }>();

  let fileInput: HTMLInputElement;
  let uploadQueue: File[] = $state([]);
  let uploadProgress: Record<string, number> = $state({});
  let isUploading = $state(false);
  let dragOver = $state(false);
  let uploadResults: Array<{ file: string; success: boolean; error?: string }> =
    $state([]);
  let successfulUploads: Array<{ name: string; url: string; id: string }> =
    $state([]);
  let showToast = $state(false);
  let toastMessage = $state("");
  let toastType: "success" | "error" | "info" = $state("info");

  const imageProcessor = new ImageProcessor();
  const imageStorage = supabaseClient
    ? new ImageStorage(supabaseClient)
    : new ImageStorage();

  // Toast notification system
  const showToastMessage = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    toastMessage = message;
    toastType = type;
    showToast = true;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      showToast = false;
    }, 5000);
  };

  const hideToast = () => {
    showToast = false;
  };

  const handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      addFilesToQueue(Array.from(input.files));
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragOver = false;

    if (event.dataTransfer?.files) {
      addFilesToQueue(Array.from(event.dataTransfer.files));
    }
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    dragOver = true;
  };

  const handleDragLeave = () => {
    dragOver = false;
  };

  const addFilesToQueue = (files: File[]) => {
    if (disabled || isUploading) return;

    // Reset previous results and errors
    uploadResults = [];
    showToast = false;

    // Validate file types and sizes
    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        rejectedFiles.push(`${file.name} (not an image)`);
      } else if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        rejectedFiles.push(`${file.name} (file too large - max 10MB)`);
      } else if (file.size < 1024) {
        // 1KB minimum
        rejectedFiles.push(`${file.name} (file too small - min 1KB)`);
      } else {
        validFiles.push(file);
      }
    }

    if (rejectedFiles.length > 0) {
      showToastMessage(
        `Some files were rejected: ${rejectedFiles.join(", ")}`,
        "error"
      );
      dispatch("error", {
        message: `Rejected files: ${rejectedFiles.join(", ")}`,
      });
    }

    // Limit total files
    const remainingSlots = maxFiles - uploadQueue.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (filesToAdd.length < validFiles.length) {
      const message = `Only ${remainingSlots} more images can be added (max ${maxFiles} total).`;
      showToastMessage(message, "info");
      dispatch("error", { message });
    }

    if (filesToAdd.length > 0) {
      uploadQueue = [...uploadQueue, ...filesToAdd];
      showToastMessage(
        `Added ${filesToAdd.length} image(s) to upload queue`,
        "success"
      );
    }
  };

  const removeFromQueue = (index: number) => {
    if (isUploading) return;
    uploadQueue = uploadQueue.filter((_, i) => i !== index);
  };

  const clearQueue = () => {
    if (isUploading) return;
    uploadQueue = [];
    uploadProgress = {};
  };

  const uploadImages = async () => {
    if (uploadQueue.length === 0 || isUploading) return;

    isUploading = true;
    uploadProgress = {};
    uploadResults = [];
    showToast = false; // Clear any previous errors/messages

    showToastMessage(
      `Starting upload of ${uploadQueue.length} image(s)...`,
      "info"
    );

    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < uploadQueue.length; i++) {
        const file = uploadQueue[i];
        const fileId = `${file.name}-${i}`;

        try {
          // Reset progress for this file
          uploadProgress[fileId] = 0;
          dispatch("progress", { fileIndex: i, progress: 0 });

          // Stage 1: Validation
          uploadProgress[fileId] = 10;
          dispatch("progress", { fileIndex: i, progress: 10 });

          // Stage 2: Processing image
          uploadProgress[fileId] = 25;
          dispatch("progress", { fileIndex: i, progress: 25 });

          const processedImage = await imageProcessor.processUpload(
            file,
            hazardLocation
          );

          uploadProgress[fileId] = 60;
          dispatch("progress", { fileIndex: i, progress: 60 });

          // Stage 3: Uploading to storage
          uploadProgress[fileId] = 80;
          dispatch("progress", { fileIndex: i, progress: 80 });

          const result = await imageStorage.uploadProcessedImage(
            processedImage,
            hazardId,
            currentSession,
            currentUser
          );

          // Stage 4: Complete
          uploadProgress[fileId] = 100;
          dispatch("progress", { fileIndex: i, progress: 100 });
          dispatch("upload", result);

          uploadResults.push({ file: file.name, success: true });
          successfulUploads.push({
            name: file.name,
            url: result.thumbnailUrl || result.originalUrl,
            id: result.id,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          uploadResults.push({
            file: file.name,
            success: false,
            error: errorMessage,
          });
          errorCount++;

          dispatch("error", {
            message: `Failed to upload ${file.name}: ${errorMessage}`,
          });
        }
      }

      // Show final result
      if (errorCount === 0) {
        showToastMessage(
          `Successfully uploaded all ${successCount} image(s)!`,
          "success"
        );
        dispatch("success", {
          message: `Successfully uploaded ${successCount} images`,
        });
      } else if (successCount > 0) {
        showToastMessage(
          `Upload completed: ${successCount} successful, ${errorCount} failed`,
          "error"
        );
      } else {
        showToastMessage(
          `All uploads failed! Please check your images and try again.`,
          "error"
        );
      }

      // Clear queue after processing (successful or not)
      uploadQueue = [];
      uploadProgress = {};

      // Reset file input to allow re-uploading same files
      if (fileInput) {
        fileInput.value = "";
      }
    } finally {
      isUploading = false;
    }
  };

  const canUpload = $derived(
    uploadQueue.length > 0 && !isUploading && !disabled
  );
  const hasImages = $derived(uploadQueue.length > 0);
</script>

<div class="image-upload">
  <!-- Drag and Drop Area -->
  <div
    class="drop-zone"
    class:drag-over={dragOver}
    class:disabled
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    role="button"
    tabindex="0"
    onclick={() => !disabled && fileInput.click()}
    onkeydown={(e) => e.key === "Enter" && !disabled && fileInput.click()}
  >
    <div class="drop-zone-content">
      <svg
        class="upload-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17,8 12,3 7,8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>

      {#if dragOver}
        <p class="primary">Drop images here</p>
      {:else if disabled}
        <p class="muted">Image upload disabled</p>
      {:else}
        <p class="primary">Click to select images or drag and drop</p>
        <p class="secondary">
          Max {maxFiles} images, 2MB each (JPEG, PNG, WebP)
        </p>
      {/if}
    </div>
  </div>

  <!-- Hidden File Input -->
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    multiple
    disabled={disabled || isUploading}
    onchange={handleFileSelect}
    style="display: none;"
  />

  <!-- Upload Queue -->
  {#if hasImages}
    <div class="upload-queue">
      <div class="queue-header">
        <h3>Images to Upload ({uploadQueue.length}/{maxFiles})</h3>
        <div class="queue-actions">
          <button
            type="button"
            class="btn-secondary"
            disabled={isUploading}
            onclick={clearQueue}
          >
            Clear All
          </button>
          <button
            type="button"
            class="btn-primary"
            disabled={!canUpload}
            onclick={uploadImages}
          >
            {isUploading
              ? "Uploading..."
              : `Upload ${uploadQueue.length} Image${uploadQueue.length > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      <div class="queue-list">
        {#each uploadQueue as file, index}
          {@const fileId = `${file.name}-${index}`}
          {@const progress = uploadProgress[fileId] || 0}

          <div class="queue-item">
            <div class="file-preview">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview of {file.name}"
                loading="lazy"
              />
            </div>

            <div class="file-info">
              <span class="file-name">{file.name}</span>
              <span class="file-size"
                >{(file.size / 1024 / 1024).toFixed(1)}MB</span
              >

              {#if isUploading && progress > 0}
                <div class="progress-bar">
                  <div class="progress-fill" style="width: {progress}%"></div>
                  <span class="progress-text">{progress}%</span>
                </div>
              {/if}
            </div>

            <button
              type="button"
              class="btn-remove"
              disabled={isUploading}
              onclick={() => removeFromQueue(index)}
              aria-label="Remove {file.name}"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Uploaded Images Gallery -->
  {#if successfulUploads.length > 0}
    <div class="uploaded-gallery">
      <h4>Uploaded Images ({successfulUploads.length}):</h4>
      <div class="uploaded-grid">
        {#each successfulUploads as upload (upload.id)}
          <div class="uploaded-item">
            <div class="uploaded-preview">
              <img src={upload.url} alt={upload.name} loading="lazy" />
            </div>
            <div class="uploaded-info">
              <span class="uploaded-name">{upload.name}</span>
              <span class="uploaded-status">✓ Uploaded</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Upload Errors Only -->
  {#if uploadResults.some((r) => !r.success)}
    <div class="upload-results">
      <h4>Upload Errors:</h4>
      <div class="results-list">
        {#each uploadResults.filter((r) => !r.success) as result}
          <div class="result-item error">
            <div class="result-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div class="result-details">
              <span class="file-name">{result.file}</span>
              {#if result.error}
                <span class="error-message">{result.error}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Toast Notification -->
{#if showToast}
  <div
    class="toast"
    class:success={toastType === "success"}
    class:error={toastType === "error"}
    class:info={toastType === "info"}
  >
    <div class="toast-content">
      <div class="toast-icon">
        {#if toastType === "success"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        {:else if toastType === "error"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        {/if}
      </div>
      <span class="toast-message">{toastMessage}</span>
      <button
        class="toast-close"
        onclick={hideToast}
        aria-label="Close notification"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .image-upload {
    width: 100%;
  }

  .drop-zone {
    border: 2px dashed #d1d5db;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f9fafb;
  }

  .drop-zone:hover:not(.disabled) {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .drop-zone.drag-over {
    border-color: #3b82f6;
    background: #dbeafe;
    transform: scale(1.02);
  }

  .drop-zone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f3f4f6;
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .upload-icon {
    width: 3rem;
    height: 3rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .drop-zone p.primary {
    font-size: 1.1rem;
    font-weight: 500;
    color: #374151;
    margin: 0;
  }

  .drop-zone p.secondary {
    font-size: 0.9rem;
    color: #6b7280;
    margin: 0;
  }

  .drop-zone p.muted {
    color: #9ca3af;
    margin: 0;
  }

  .upload-queue {
    margin-top: 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }

  .queue-header {
    background: #f9fafb;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .queue-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .queue-actions {
    display: flex;
    gap: 0.5rem;
  }

  .queue-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .queue-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f3f4f6;
    gap: 1rem;
  }

  .queue-item:last-child {
    border-bottom: none;
  }

  .file-preview {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    border-radius: 6px;
    overflow: hidden;
    background: #f3f4f6;
  }

  .file-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .file-name {
    font-weight: 500;
    color: #374151;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .progress-bar {
    position: relative;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 0.25rem;
  }

  .progress-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }

  .progress-text {
    position: absolute;
    top: -1.5rem;
    right: 0;
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }

  .btn-remove {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border: none;
    background: none;
    cursor: pointer;
    color: #ef4444;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
  }

  .btn-remove:hover:not(:disabled) {
    background: #fee2e2;
  }

  .btn-remove:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-remove svg {
    width: 1rem;
    height: 1rem;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #f9fafb;
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .drop-zone {
      padding: 1.5rem 1rem;
    }

    .queue-header {
      flex-direction: column;
      align-items: stretch;
    }

    .queue-actions {
      justify-content: stretch;
    }

    .queue-actions button {
      flex: 1;
    }

    .file-info {
      font-size: 0.875rem;
    }
  }

  /* Uploaded Images Gallery */
  .uploaded-gallery {
    margin-top: 1.5rem;
  }

  .uploaded-gallery h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #15803d;
  }

  .uploaded-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .uploaded-item {
    background: white;
    border-radius: 12px;
    border: 2px solid #86efac;
    overflow: hidden;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .uploaded-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }

  .uploaded-preview {
    width: 100%;
    height: 200px;
    overflow: hidden;
    background: #f8fafc;
  }

  .uploaded-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .uploaded-info {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: #f0fdf4;
    border-top: 1px solid #86efac;
  }

  .uploaded-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .uploaded-status {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    text-align: center;
    background: #dcfce7;
    color: #166534;
  }

  /* Upload Errors */
  .upload-results {
    margin-top: 1rem;
    padding: 1rem;
    background: #fef2f2;
    border-radius: 8px;
    border: 1px solid #fecaca;
  }

  .upload-results h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #dc2626;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 6px;
    background: white;
    border: 1px solid #e5e7eb;
  }

  .result-item.error {
    border-color: #ef4444;
    background: #fef2f2;
  }

  .result-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    color: #ef4444;
  }

  .result-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .file-name {
    font-weight: 500;
    font-size: 0.875rem;
    color: #374151;
  }

  .error-message {
    font-size: 0.75rem;
    color: #dc2626;
  }

  /* Toast Notifications */
  .toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    min-width: 300px;
    max-width: 500px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    animation: slideInRight 0.3s ease-out;
  }

  .toast.success {
    background: #10b981;
    color: white;
  }

  .toast.error {
    background: #ef4444;
    color: white;
  }

  .toast.info {
    background: #3b82f6;
    color: white;
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
  }

  .toast-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .toast-close {
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
  }

  .toast-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
