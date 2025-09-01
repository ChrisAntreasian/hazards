<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { HazardImage } from "$lib/types/images.js";

  export let images: HazardImage[] = [];
  export let currentUserId: string | null = null;
  export let canVote = false;
  export let canDelete = false;
  export let loading = false;

  const dispatch = createEventDispatcher<{
    vote: { imageId: string; vote: "up" | "down" };
    delete: { imageId: string };
    view: { image: HazardImage };
  }>();

  let selectedImage: HazardImage | null = null;
  let imageModal = false;

  const handleVote = (imageId: string, vote: "up" | "down") => {
    if (!canVote || !currentUserId) return;
    dispatch("vote", { imageId, vote });
  };

  const handleDelete = (imageId: string) => {
    if (!canDelete) return;
    if (confirm("Are you sure you want to delete this image?")) {
      dispatch("delete", { imageId });
    }
  };

  const openImageModal = (image: HazardImage) => {
    selectedImage = image;
    imageModal = true;
    dispatch("view", { image });
  };

  const closeImageModal = () => {
    imageModal = false;
    selectedImage = null;
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeImageModal();
    }
  };

  const formatUploadDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  $: hasImages = images.length > 0;
  $: sortedImages = images.sort((a, b) => {
    // Sort by vote score first, then by upload date
    if (a.vote_score !== b.vote_score) {
      return b.vote_score - a.vote_score;
    }
    return (
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="image-gallery">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading images...</p>
    </div>
  {:else if !hasImages}
    <div class="empty-state">
      <svg
        class="empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21,15 16,10 5,21" />
      </svg>
      <h3>No images yet</h3>
      <p>Be the first to add photos of this hazard!</p>
    </div>
  {:else}
    <div class="gallery-header">
      <h3>Images ({images.length})</h3>
      <div class="sort-info">
        <span>Sorted by votes, then most recent</span>
      </div>
    </div>

    <div class="gallery-grid">
      {#each sortedImages as image (image.id)}
        <div class="gallery-item">
          <div class="image-container">
            <button
              class="image-button"
              on:click={() => openImageModal(image)}
              aria-label="View full image"
            >
              <img
                src={image.thumbnail_url}
                alt="Hazard image uploaded {formatUploadDate(
                  image.uploaded_at
                )}"
                loading="lazy"
              />
              <div class="image-overlay">
                <svg
                  class="expand-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="15,3 21,3 21,9" />
                  <polyline points="9,21 3,21 3,15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </div>
            </button>
          </div>

          <div class="image-meta">
            <div class="vote-section">
              {#if canVote && currentUserId}
                <button
                  class="vote-btn vote-up"
                  class:voted={image.user_vote === "up"}
                  on:click={() => handleVote(image.id, "up")}
                  aria-label="Upvote image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M7 14l5-5 5 5" />
                  </svg>
                </button>
              {/if}

              <span
                class="vote-score"
                class:positive={image.vote_score > 0}
                class:negative={image.vote_score < 0}
              >
                {image.vote_score > 0 ? "+" : ""}{image.vote_score}
              </span>

              {#if canVote && currentUserId}
                <button
                  class="vote-btn vote-down"
                  class:voted={image.user_vote === "down"}
                  on:click={() => handleVote(image.id, "down")}
                  aria-label="Downvote image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17 10l-5 5-5-5" />
                  </svg>
                </button>
              {/if}
            </div>

            <div class="image-info">
              <span class="upload-time"
                >{formatUploadDate(image.uploaded_at)}</span
              >
              {#if image.metadata.fileSize}
                <span class="file-size"
                  >{(image.metadata.fileSize / 1024 / 1024).toFixed(1)}MB</span
                >
              {/if}
            </div>

            {#if canDelete && currentUserId === image.user_id}
              <button
                class="delete-btn"
                on:click={() => handleDelete(image.id)}
                aria-label="Delete image"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="3,6 5,6 21,6" />
                  <path
                    d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"
                  />
                </svg>
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Image Modal -->
{#if imageModal && selectedImage}
  <div
    class="modal-backdrop"
    on:click={closeImageModal}
    on:keydown={(e) => e.key === "Enter" && closeImageModal()}
    role="button"
    tabindex="-1"
    aria-label="Close image modal"
  >
    <div
      class="modal-content"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-label="Image viewer"
      tabindex="-1"
    >
      <div class="modal-header">
        <div class="modal-info">
          <span class="modal-date"
            >Uploaded {formatUploadDate(selectedImage.uploaded_at)}</span
          >
          {#if selectedImage.metadata.dimensions}
            <span class="modal-dimensions">
              {selectedImage.metadata.dimensions.width}×{selectedImage.metadata
                .dimensions.height}
            </span>
          {/if}
        </div>
        <button
          class="close-btn"
          on:click={closeImageModal}
          aria-label="Close image"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="modal-image">
        <img
          src={selectedImage.original_url}
          alt="Hazard documentation uploaded {formatUploadDate(
            selectedImage.uploaded_at
          )}"
          loading="eager"
        />
      </div>

      <div class="modal-footer">
        <div class="modal-vote-section">
          {#if canVote && currentUserId && selectedImage}
            <button
              class="modal-vote-btn vote-up"
              class:voted={selectedImage.user_vote === "up"}
              on:click={() =>
                selectedImage && handleVote(selectedImage.id, "up")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M7 14l5-5 5 5" />
              </svg>
              Helpful
            </button>
          {/if}

          <span class="modal-vote-score">
            {selectedImage.vote_score > 0 ? "+" : ""}{selectedImage.vote_score} votes
          </span>

          {#if canVote && currentUserId && selectedImage}
            <button
              class="modal-vote-btn vote-down"
              class:voted={selectedImage.user_vote === "down"}
              on:click={() =>
                selectedImage && handleVote(selectedImage.id, "down")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17 10l-5 5-5-5" />
              </svg>
              Not helpful
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .image-gallery {
    width: 100%;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: #6b7280;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-icon {
    width: 3rem;
    height: 3rem;
    color: #d1d5db;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-weight: 600;
  }

  .empty-state p {
    margin: 0;
    color: #6b7280;
  }

  .gallery-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .gallery-header h3 {
    margin: 0;
    font-weight: 600;
    color: #374151;
  }

  .sort-info span {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .gallery-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .gallery-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .image-container {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
  }

  .image-button {
    width: 100%;
    height: 100%;
    border: none;
    background: none;
    cursor: pointer;
    position: relative;
    display: block;
  }

  .image-button img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .image-button:hover img {
    transform: scale(1.05);
  }

  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .image-button:hover .image-overlay {
    opacity: 1;
  }

  .expand-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: white;
  }

  .image-meta {
    padding: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .vote-section {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .vote-btn {
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: none;
    cursor: pointer;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    transition: all 0.2s ease;
  }

  .vote-btn:hover {
    background: #f3f4f6;
  }

  .vote-btn.vote-up.voted {
    color: #059669;
    background: #d1fae5;
  }

  .vote-btn.vote-down.voted {
    color: #dc2626;
    background: #fee2e2;
  }

  .vote-btn svg {
    width: 1rem;
    height: 1rem;
  }

  .vote-score {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    min-width: 1.5rem;
    text-align: center;
  }

  .vote-score.positive {
    color: #059669;
  }

  .vote-score.negative {
    color: #dc2626;
  }

  .image-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .delete-btn {
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: none;
    cursor: pointer;
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    transition: background-color 0.2s ease;
  }

  .delete-btn:hover {
    background: #fee2e2;
  }

  .delete-btn svg {
    width: 1rem;
    height: 1rem;
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-info {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .close-btn {
    width: 2rem;
    height: 2rem;
    border: none;
    background: none;
    cursor: pointer;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background: #f3f4f6;
  }

  .close-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .modal-image {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    min-height: 300px;
  }

  .modal-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .modal-footer {
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .modal-vote-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .modal-vote-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    background: white;
    cursor: pointer;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #374151;
    transition: all 0.2s ease;
  }

  .modal-vote-btn:hover {
    background: #f9fafb;
  }

  .modal-vote-btn.vote-up.voted {
    background: #d1fae5;
    border-color: #059669;
    color: #059669;
  }

  .modal-vote-btn.vote-down.voted {
    background: #fee2e2;
    border-color: #dc2626;
    color: #dc2626;
  }

  .modal-vote-btn svg {
    width: 1rem;
    height: 1rem;
  }

  .modal-vote-score {
    font-weight: 600;
    color: #374151;
  }

  @media (max-width: 640px) {
    .gallery-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.75rem;
    }

    .image-meta {
      padding: 0.5rem;
      gap: 0.5rem;
    }

    .modal-content {
      max-width: 95vw;
      max-height: 95vh;
    }

    .modal-header {
      padding: 0.75rem;
    }

    .modal-info {
      flex-direction: column;
      gap: 0.25rem;
    }

    .modal-vote-section {
      flex-direction: column;
      gap: 0.75rem;
    }

    .modal-vote-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
