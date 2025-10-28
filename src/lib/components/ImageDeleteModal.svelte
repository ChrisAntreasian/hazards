<script lang="ts">
  import { logger } from '$lib/utils/logger';

  interface Props {
    imageSrc: string;
    imageId: string;
    onConfirm: (imageId: string) => void;
    onCancel: () => void;
  }

  let { imageSrc, imageId, onConfirm, onCancel }: Props = $props();
  let isDeleting = $state(false);

  async function handleConfirm() {
    if (isDeleting) return;
    
    isDeleting = true;
    
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete image');
      }

      onConfirm(imageId);
    } catch (err) {
      logger.error('Failed to delete image', err instanceof Error ? err : new Error(String(err)));
      alert('Failed to delete image. Please try again.');
    } finally {
      isDeleting = false;
    }
  }

  function handleCancel() {
    if (!isDeleting) {
      onCancel();
    }
  }

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !isDeleting) {
      handleCancel();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="modal-overlay"
  onclick={handleCancel}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  tabindex="-1"
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-content" onclick={(e) => e.stopPropagation()} role="document">
    <div class="modal-header">
      <h3 id="modal-title">Delete Image</h3>
      <button type="button" class="close-btn" onclick={handleCancel} aria-label="Close modal">✕</button>
    </div>
    
    <div class="modal-body">
      <p>Are you sure you want to delete this image? This action cannot be undone.</p>
      
      <div class="image-preview">
        <img src={imageSrc} alt="Preview of selected item" />
      </div>
    </div>
    
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick={handleCancel} disabled={isDeleting}>
        Cancel
      </button>
      <button type="button" class="btn btn-danger" onclick={handleConfirm} disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete Image'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s, color 0.2s;
  }

  .close-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-body p {
    margin: 0 0 1.5rem 0;
    color: #374151;
    line-height: 1.6;
  }

  .image-preview {
    display: flex;
    justify-content: center;
    margin: 1rem 0;
  }

  .image-preview img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    object-fit: cover;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
    border-color: #dc2626;
  }

  .btn-danger:hover {
    background: #dc2626;
    border-color: #b91c1c;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn:disabled:hover {
    background: var(--disabled-bg, #ef4444);
    border-color: var(--disabled-border, #dc2626);
  }

  .btn-secondary:disabled:hover {
    --disabled-bg: #f3f4f6;
    --disabled-border: #d1d5db;
  }

  @media (max-width: 640px) {
    .modal-content {
      margin: 1rem;
      width: calc(100% - 2rem);
    }

    .modal-footer {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      padding: 0.75rem;
    }
  }
</style>