<!-- ProfileImageUpload.svelte - A simplified, consistent image upload for profile -->
<script lang="ts">
  import { FormButton, MessageDisplay } from "$lib/components/auth";

  interface Props {
    currentImageUrl?: string;
    disabled?: boolean;
    maxFileSize?: number; // in MB
  }

  let {
    currentImageUrl = undefined,
    disabled = false,
    maxFileSize = 2,
  }: Props = $props();

  let fileInput: HTMLInputElement;
  let selectedFile: File | null = $state(null);
  let uploading = $state(false);
  let preview = $state<string | null>(null);
  let error = $state("");
  let success = $state("");
  let dragOver = $state(false);

  // Preview the selected image
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      validateAndSetFile(file);
    }
  }

  function validateAndSetFile(file: File) {
    error = "";

    // Validate file type
    if (!file.type.startsWith("image/")) {
      error = "Please select an image file (PNG, JPEG, WebP)";
      return;
    }

    // Validate file size (convert MB to bytes)
    const maxBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxBytes) {
      error = `File size must be less than ${maxFileSize}MB`;
      return;
    }

    // Set file and create preview
    selectedFile = file;
    preview = URL.createObjectURL(file);
    success = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;

    const file = event.dataTransfer?.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function clearSelection() {
    selectedFile = null;
    preview = null;
    error = "";
    success = "";
    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function uploadImage() {
    if (!selectedFile) return;

    uploading = true;
    error = "";
    success = "";

    try {
      const formData = new FormData();
      formData.append("profileImage", selectedFile);

      const response = await fetch("/profile?/uploadImage", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.type === "success") {
        success = "Profile image updated successfully!";
        // You might want to emit an event or refresh the page here
      } else {
        error = result.data?.error || "Upload failed";
      }
    } catch (err) {
      error = "Upload failed. Please try again.";
      console.error("Upload error:", err);
    } finally {
      uploading = false;
    }
  }

  const hasImageToShow = $derived(preview || currentImageUrl);
  const canUpload = $derived(selectedFile && !uploading && !disabled);
</script>

<div class="image-upload-section">
  <h3>Profile Image</h3>

  <!-- Success/Error Messages -->
  {#if success}
    <MessageDisplay
      type="success"
      message={success}
      dismissible
      onDismiss={() => (success = "")}
    />
  {/if}

  {#if error}
    <MessageDisplay
      type="error"
      message={error}
      dismissible
      onDismiss={() => (error = "")}
    />
  {/if}

  <!-- Current/Preview Image -->
  {#if hasImageToShow}
    <div class="image-preview">
      <img
        src={preview || currentImageUrl}
        alt="Profile preview"
        class="profile-image"
      />
      {#if selectedFile}
        <div class="image-info">
          <span class="file-name">{selectedFile.name}</span>
          <span class="file-size"
            >{(selectedFile.size / 1024 / 1024).toFixed(1)}MB</span
          >
        </div>
      {/if}
    </div>
  {/if}

  <!-- Drop Zone -->
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
        <p class="primary">Drop image here</p>
      {:else if disabled}
        <p class="muted">Image upload disabled</p>
      {:else}
        <p class="primary">
          {hasImageToShow ? "Click to change image" : "Click to select image"}
        </p>
        <p class="secondary">
          or drag and drop • Max {maxFileSize}MB • PNG, JPEG, WebP
        </p>
      {/if}
    </div>
  </div>

  <!-- Hidden File Input -->
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    disabled={disabled || uploading}
    onchange={handleFileSelect}
    style="display: none;"
  />

  <!-- Action Buttons -->
  {#if selectedFile}
    <div class="action-buttons">
      <FormButton
        type="button"
        variant="secondary"
        disabled={uploading}
        onclick={clearSelection}
      >
        Cancel
      </FormButton>

      <FormButton
        type="button"
        disabled={!canUpload}
        loading={uploading}
        loadingText="Uploading..."
        onclick={uploadImage}
      >
        Upload Image
      </FormButton>
    </div>
  {/if}
</div>

<style>
  .image-upload-section {
    margin-top: 1.5rem;
  }

  h3 {
    color: #1e293b;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .image-preview {
    margin-bottom: 1rem;
    text-align: center;
  }

  .profile-image {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 50%;
    border: 3px solid #e5e7eb;
  }

  .image-info {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .file-name {
    color: #374151;
    font-weight: 500;
  }

  .file-size {
    color: #6b7280;
  }

  .drop-zone {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f9fafb;
  }

  .drop-zone:hover:not(.disabled) {
    border-color: #2563eb;
    background: #eff6ff;
  }

  .drop-zone.drag-over {
    border-color: #2563eb;
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
    width: 2.5rem;
    height: 2.5rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .drop-zone p.primary {
    font-size: 1rem;
    font-weight: 500;
    color: #374151;
    margin: 0;
  }

  .drop-zone p.secondary {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .drop-zone p.muted {
    color: #9ca3af;
    margin: 0;
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .action-buttons :global(.btn) {
    flex: 1;
  }

  @media (max-width: 480px) {
    .action-buttons {
      flex-direction: column;
    }

    .action-buttons :global(.btn) {
      width: 100%;
    }
  }
</style>
