<script lang="ts">
  import { onMount } from "svelte";
  import type {
    ModerationItem,
    ModerationAction,
    ModerationStats,
  } from "$lib/types/moderation.js";
  import { FLAGGING_REASONS } from "$lib/types/moderation.js";

  interface Props {
    userId: string;
    userRole: string;
  }

  let { userId, userRole }: Props = $props();

  let currentItem: ModerationItem | null = $state(null);
  let stats: ModerationStats | null = $state(null);
  let queueItems: ModerationItem[] = $state([]);
  let loading = $state(false);
  let processing = $state(false);
  let error = $state<string | null>(null);
  let selectedAction: "approve" | "reject" | "flag" | null = $state(null);
  let actionNotes = $state("");
  let selectedReason = $state("");
  let currentView: "pending" | "approved" | "rejected" | "urgent" = $state("pending");
  let filteredItems: ModerationItem[] = $state([]);

  // Load initial data
  onMount(async () => {
    await Promise.all([loadStats(), loadQueueOverview()]);
    
    // Auto-select the first item if any exist in the default pending view
    if (filteredItems.length > 0) {
      await selectQueueItem(filteredItems[0]);
    } else {
      // If no pending items, try to load the next available item
      await loadNextItem();
    }
  });

  async function loadNextItem() {
    loading = true;
    error = null;

    try {
      const response = await fetch("/api/moderation/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderatorId: userId }),
      });

      if (!response.ok) throw new Error("Failed to load next item");

      const data = await response.json();
      currentItem = data.item;
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to load moderation item";
      console.error("Error loading next item:", err);
    } finally {
      loading = false;
    }
  }

  async function loadStats() {
    try {
      const response = await fetch("/api/moderation/stats");
      if (!response.ok) throw new Error("Failed to load stats");

      const data = await response.json();
      stats = data.stats;
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }

  async function loadQueueOverview() {
    try {
      const response = await fetch(
        "/api/moderation/queue?limit=20&status=" + (currentView === "urgent" ? "pending" : currentView)
      );
      if (!response.ok) throw new Error("Failed to load queue");

      const data = await response.json();
      queueItems = data.items;
      
      // Filter for urgent items if needed
      if (currentView === "urgent") {
        filteredItems = queueItems.filter(item => item.priority === "urgent");
      } else {
        filteredItems = queueItems;
      }
      
      // Debug logging to see what we're getting
      console.log("Queue items loaded:", queueItems);
      console.log("Filtered items:", filteredItems);
      
    } catch (err) {
      console.error("Error loading queue overview:", err);
    }
  }

  // Function to change view and load appropriate data
  async function changeView(newView: "pending" | "approved" | "rejected" | "urgent") {
    // Show loading state during transition
    loading = true;
    currentView = newView;
    currentItem = null; // Clear current selection temporarily
    selectedAction = null;
    actionNotes = "";
    selectedReason = "";
    
    try {
      await loadQueueOverview();
      
      // Auto-select the most recent item if any exist
      if (filteredItems.length > 0) {
        await selectQueueItem(filteredItems[0]);
      }
    } catch (err) {
      console.error('Error changing view:', err);
      error = `Failed to load ${newView} items`;
    } finally {
      loading = false;
    }
  }

  // Function to select a specific item from the queue
  async function selectQueueItem(item: ModerationItem) {
    currentItem = item;
    selectedAction = null;
    actionNotes = "";
    selectedReason = "";
    
    // Update the item's assignment
    try {
      const response = await fetch("/api/moderation/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          moderatorId: userId,
          specificItemId: item.id 
        }),
      });
      
      if (response.ok) {
        await loadQueueOverview(); // Refresh queue
      }
    } catch (err) {
      console.error("Error selecting item:", err);
    }
  }

  async function processAction(action: ModerationAction) {
    if (!currentItem) return;

    processing = true;
    error = null;

    try {
      const response = await fetch("/api/moderation/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: currentItem.id,
          action,
          moderatorId: userId,
        }),
      });

      if (!response.ok) throw new Error("Failed to process action");

      // Reset form and load next item
      selectedAction = null;
      actionNotes = "";
      selectedReason = "";

      await Promise.all([loadNextItem(), loadStats(), loadQueueOverview()]);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to process action";
      console.error("Error processing action:", err);
    } finally {
      processing = false;
    }
  }

  function handleAction(actionType: "approve" | "reject" | "flag") {
    selectedAction = actionType;
  }

  async function submitAction() {
    if (!selectedAction || processing) return;

    const action: ModerationAction = {
      type: selectedAction,
      notes: actionNotes.trim() || undefined,
      reason: selectedReason || undefined,
    };

    await processAction(action);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function formatLocation(lat: number, lng: number) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "urgent":
        return "text-red-600 bg-red-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }
</script>

<div class="moderation-dashboard">
  <div class="dashboard-header">
    <h1>Content Moderation Queue</h1>
    <p class="subtitle">
      Review and approve community-submitted hazards and content
    </p>
  </div>

  <!-- Stats Overview -->
  {#if stats}
    <div class="stats-grid">
      <button 
        class="stat-card clickable {currentView === 'pending' ? 'active' : ''} {loading && currentView === 'pending' ? 'loading' : ''}"
        onclick={() => changeView('pending')}
        type="button"
        disabled={loading}
      >
        <div class="stat-number">{stats.pending_count}</div>
        <div class="stat-label">Pending Review</div>
      </button>
      <button 
        class="stat-card clickable {currentView === 'approved' ? 'active' : ''} {loading && currentView === 'approved' ? 'loading' : ''}"
        onclick={() => changeView('approved')}
        type="button"
        disabled={loading}
      >
        <div class="stat-number">{stats.approved_today}</div>
        <div class="stat-label">Approved Today</div>
      </button>
      <button 
        class="stat-card clickable {currentView === 'rejected' ? 'active' : ''} {loading && currentView === 'rejected' ? 'loading' : ''}"
        onclick={() => changeView('rejected')}
        type="button"
        disabled={loading}
      >
        <div class="stat-number">{stats.rejected_today}</div>
        <div class="stat-label">Rejected Today</div>
      </button>
      <button 
        class="stat-card clickable {currentView === 'urgent' ? 'active' : ''} {loading && currentView === 'urgent' ? 'loading' : ''}"
        onclick={() => changeView('urgent')}
        type="button"
        disabled={loading}
      >
        <div class="stat-number">{stats.items_by_priority.urgent}</div>
        <div class="stat-label">Urgent Items</div>
      </button>
    </div>
  {/if}

  <div class="moderation-content">
    <!-- Current Review Item -->
    <div class="review-section">
      <h2>Current Review</h2>

      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading next item...</p>
        </div>
      {:else if error}
        <div class="error-state">
          <p class="error-message">{error}</p>
          <button onclick={loadNextItem} class="retry-button">Try Again</button>
        </div>
      {:else if currentItem}
        <div class="review-item">
          <!-- Item Header -->
          <div class="item-header">
            <div class="item-type">
              <span class="type-badge {currentItem.type}"
                >{currentItem.type}</span
              >
              {#if currentItem.flagged_reasons.length > 0}
                <span class="flag-indicator large" title="This item has been flagged for review">🚩</span>
              {/if}
              <span
                class="priority-badge {getPriorityColor(currentItem.priority)}"
              >
                {currentItem.priority}
              </span>
            </div>
            <div class="item-meta">
              <p>
                Submitted by: <strong>{currentItem.submitter_email}</strong>
              </p>
              <p>Submitted: {formatDate(currentItem.created_at)}</p>
            </div>
          </div>

          <!-- Content Preview -->
          {#if currentItem.content_preview}
            <div class="content-preview">
              <h3>{currentItem.content_preview.title}</h3>

              {#if currentItem.content_preview.category}
                <div class="category">
                  <h4>Category:</h4>
                  <div class="category-info">
                    {#if currentItem.content_preview.category.icon}
                      <span class="category-icon">{currentItem.content_preview.category.icon}</span>
                    {/if}
                    <span class="category-name">{currentItem.content_preview.category.name}</span>
                  </div>
                </div>
              {/if}

              {#if currentItem.content_preview.description}
                <div class="description">
                  <h4>Description:</h4>
                  <p>{currentItem.content_preview.description}</p>
                </div>
              {/if}

              {#if currentItem.content_preview.location}
                <div class="location">
                  <h4>Location:</h4>
                  <p>
                    {formatLocation(
                      currentItem.content_preview.location.latitude,
                      currentItem.content_preview.location.longitude
                    )}
                  </p>
                </div>
              {/if}

              {#if currentItem.content_preview.severity_level}
                <div class="severity">
                  <h4>Severity Level:</h4>
                  <span
                    class="severity-badge level-{currentItem.content_preview
                      .severity_level}"
                  >
                    Level {currentItem.content_preview.severity_level}
                  </span>
                </div>
              {/if}

              {#if currentItem.content_preview.reported_active_date}
                <div class="active-date">
                  <h4>Reported Active Date:</h4>
                  <p>{formatDate(currentItem.content_preview.reported_active_date)}</p>
                </div>
              {/if}

              {#if currentItem.content_preview.is_seasonal !== undefined}
                <div class="seasonal">
                  <h4>Seasonal Hazard:</h4>
                  <span class="seasonal-badge {currentItem.content_preview.is_seasonal ? 'yes' : 'no'}">
                    {currentItem.content_preview.is_seasonal ? 'Yes' : 'No'}
                  </span>
                </div>
              {/if}

              {#if currentItem.content_preview.images && currentItem.content_preview.images.length > 0}
                <div class="images-preview">
                  <h4>Attached Images ({currentItem.content_preview.images.length}):</h4>
                  <div class="images-grid">
                    {#each currentItem.content_preview.images as image}
                      <div class="image-item">
                        <button
                          type="button"
                          class="image-button"
                          onclick={() => window.open(image.image_url, '_blank')}
                          title="Click to view full size"
                        >
                          <img
                            src={image.thumbnail_url || image.image_url}
                            alt={image.metadata?.alt_text || "Hazard image"}
                            loading="lazy"
                          />
                        </button>
                        <div class="image-info">
                          {#if image.metadata?.alt_text}
                            <p class="alt-text">{image.metadata.alt_text}</p>
                          {/if}
                          <p class="upload-date">Uploaded: {formatDate(image.uploaded_at)}</p>
                          {#if image.metadata?.file_size}
                            <p class="file-size">Size: {(image.metadata.file_size / 1024).toFixed(1)} KB</p>
                          {/if}
                          {#if image.vote_score !== undefined}
                            <p class="vote-score">Score: {image.vote_score}</p>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if currentItem.content_preview.image_url}
                <div class="image-preview">
                  <h4>Image:</h4>
                  <img
                    src={currentItem.content_preview.image_url}
                    alt="Hazard"
                  />
                </div>
              {/if}
            </div>
          {/if}

          <!-- Flagged Reasons -->
          {#if currentItem.flagged_reasons.length > 0}
            <div class="flagged-reasons">
              <h4>🚩 This item has been flagged for review:</h4>
              <ul>
                {#each currentItem.flagged_reasons as reason}
                  <li>{reason}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Action Buttons - Only show for pending items -->
          {#if currentItem.status === 'pending'}
            {#if !selectedAction}
              <div class="action-buttons">
                <button
                  onclick={() => handleAction("approve")}
                  class="action-btn approve"
                  disabled={processing}
                >
                  ✅ Approve
                </button>
                <button
                  onclick={() => handleAction("reject")}
                  class="action-btn reject"
                  disabled={processing}
                >
                  ❌ Reject
                </button>
                <button
                  onclick={() => handleAction("flag")}
                  class="action-btn flag"
                  disabled={processing}
                  title="Flag this item as needing additional review or escalation. This marks it for senior moderator attention while keeping it in pending status."
                >
                  🏴 Flag for Review
                </button>
              </div>
            {:else}
              <!-- Action Form -->
              <div class="action-form">
                <h4>
                  {selectedAction === "approve"
                    ? "Approve Content"
                    : selectedAction === "reject"
                      ? "Reject Content"
                      : "Flag for Review"}
                </h4>

                {#if selectedAction === "flag"}
                  <p class="flag-explanation">
                    Flagging this item will keep it in pending status but mark it as needing attention from a senior moderator. 
                    Use this when content requires additional expertise or policy clarification.
                  </p>
                {/if}

                {#if selectedAction === "reject" || selectedAction === "flag"}
                  <div class="form-group">
                    <label for="reason">Reason:</label>
                    <select bind:value={selectedReason} id="reason">
                      <option value="">Select a reason...</option>
                      {#each FLAGGING_REASONS as reason}
                        <option value={reason}>{reason}</option>
                      {/each}
                    </select>
                  </div>
                {/if}

                <div class="form-group">
                  <label for="notes">Notes (optional):</label>
                  <textarea
                    bind:value={actionNotes}
                    id="notes"
                    placeholder="Add any additional notes for this decision..."
                    rows="3"
                  ></textarea>
                </div>

                <div class="form-actions">
                  <button
                    onclick={submitAction}
                    class="submit-btn {selectedAction}"
                    disabled={processing ||
                      (selectedAction !== "approve" && !selectedReason)}
                  >
                    {processing ? "Processing..." : `Confirm ${selectedAction}`}
                  </button>
                  <button
                    onclick={() => {
                      selectedAction = null;
                      actionNotes = "";
                      selectedReason = "";
                    }}
                    class="cancel-btn"
                    disabled={processing}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {/if}
          {:else}
            <!-- Status Display for non-pending items -->
            <div class="status-display">
              <div class="status-info {currentItem.status}">
                <span class="status-icon">
                  {currentItem.status === 'approved' ? '✅' : '❌'}
                </span>
                <span class="status-text">
                  This item has been {currentItem.status}
                </span>
                {#if currentItem.moderator_notes}
                  <div class="moderator-notes">
                    <h4>Moderator Notes:</h4>
                    <p>{currentItem.moderator_notes}</p>
                  </div>
                {/if}
                {#if currentItem.resolved_at}
                  <p class="resolved-date">
                    Resolved: {formatDate(currentItem.resolved_at)}
                  </p>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="empty-state">
          <p>🎉 No items pending review!</p>
          <p class="empty-subtitle">All caught up with moderation.</p>
          <button onclick={loadNextItem} class="refresh-btn"
            >Check for New Items</button
          >
        </div>
      {/if}
    </div>

    <!-- Queue Overview -->
    <div class="queue-overview">
      <h3>
        {currentView === 'pending' ? 'Pending Queue' : 
         currentView === 'approved' ? 'Recently Approved' :
         currentView === 'rejected' ? 'Recently Rejected' :
         'Urgent Items'}
        <span class="view-count">({filteredItems.length})</span>
      </h3>

      {#if filteredItems.length > 0}
        <div class="queue-list">
          {#each filteredItems as item}
            <div 
              class="queue-item {currentItem?.id === item.id ? 'selected' : ''} {item.status}"
              onclick={() => selectQueueItem(item)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && selectQueueItem(item)}
            >
              <div class="item-info">
                <span class="type-badge {item.type}">{item.type}</span>
                {#if item.flagged_reasons.length > 0}
                  <span class="flag-indicator" title="This item has been flagged for review">🚩</span>
                {/if}
                <span class="title"
                  >{item.content_preview?.title || "Untitled"}</span
                >
                <span class="status-badge {item.status}">{item.status}</span>
              </div>
              <div class="item-meta">
                <span class="priority-badge {getPriorityColor(item.priority)}">
                  {item.priority}
                </span>
                <span class="date">{formatDate(item.created_at)}</span>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-queue">
          {#if currentView === 'pending'}
            🎉 No items pending review!<br>
            <span class="empty-subtitle">All caught up with moderation.</span>
          {:else if currentView === 'approved'}
            📋 No items approved today.<br>
            <span class="empty-subtitle">Check back after reviewing some content.</span>
          {:else if currentView === 'rejected'}
            📋 No items rejected today.<br>
            <span class="empty-subtitle">Check back after reviewing some content.</span>
          {:else}
            🚨 No urgent items.<br>
            <span class="empty-subtitle">No high-priority hazards need immediate attention.</span>
          {/if}
        </p>
      {/if}
    </div>
  </div>
</div>

<style>
  .moderation-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .dashboard-header h1 {
    font-size: 2rem;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #64748b;
    font-size: 1.1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    text-align: center;
  }

  .stat-card.clickable {
    cursor: pointer;
    transition: all 0.2s ease;
    border: none; /* Remove default button border */
    font: inherit; /* Inherit font from parent */
  }

  .stat-card.clickable:hover {
    border-color: #2563eb;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    transform: translateY(-1px);
  }

  .stat-card.clickable.active {
    border-color: #2563eb;
    background: #dbeafe;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }

  .stat-card.clickable:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .stat-card.clickable.loading {
    opacity: 0.7;
    position: relative;
  }

  .stat-card.clickable.loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid #2563eb;
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: #2563eb;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    color: #64748b;
    font-size: 0.9rem;
  }

  .moderation-content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
  }

  .review-section,
  .queue-overview {
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .review-section h2,
  .queue-overview h3 {
    padding: 1.5rem;
    margin: 0;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
  }

  .loading-state,
  .error-state,
  .empty-state {
    padding: 3rem;
    text-align: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top: 4px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .error-message {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .retry-button,
  .refresh-btn {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .review-item {
    padding: 1.5rem;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .item-type {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .type-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .type-badge.hazard {
    background: #fef3c7;
    color: #92400e;
  }

  .type-badge.image {
    background: #ddd6fe;
    color: #5b21b6;
  }

  .type-badge.template {
    background: #dcfce7;
    color: #166534;
  }

  .priority-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .item-meta {
    text-align: right;
    font-size: 0.9rem;
    color: #64748b;
  }

  .content-preview {
    margin-bottom: 1.5rem;
  }

  .content-preview h3 {
    color: #1e293b;
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }

  .content-preview h4 {
    color: #374151;
    margin: 1rem 0 0.5rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    font-weight: 600;
  }

  .category-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f8fafc;
    padding: 0.5rem;
    border-radius: 4px;
  }

  .category-icon {
    font-size: 1.2rem;
  }

  .category-name {
    font-weight: 500;
    color: #1e293b;
  }

  .seasonal-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .seasonal-badge.yes {
    background: #fef3c7;
    color: #92400e;
  }

  .seasonal-badge.no {
    background: #f0f9ff;
    color: #0369a1;
  }

  .active-date p {
    background: #f8fafc;
    padding: 0.5rem;
    border-radius: 4px;
    margin: 0;
    font-family: monospace;
  }

  .images-preview {
    margin: 1.5rem 0;
  }

  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .image-item {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .image-button {
    width: 100%;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    display: block;
  }

  .image-button:hover {
    opacity: 0.9;
  }

  .image-item img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  }

  .image-info {
    padding: 0.75rem;
  }

  .image-info p {
    margin: 0.25rem 0;
    font-size: 0.8rem;
    color: #64748b;
  }

  .alt-text {
    color: #1e293b !important;
    font-weight: 500;
  }

  .upload-date, .file-size, .vote-score {
    font-family: monospace;
  }

  .vote-score {
    font-weight: 500;
    color: #059669 !important;
  }

  .description p {
    background: #f8fafc;
    padding: 1rem;
    border-radius: 4px;
    border-left: 4px solid #2563eb;
    margin: 0;
  }

  .severity-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .severity-badge.level-1 {
    background: #dcfce7;
    color: #166534;
  }
  .severity-badge.level-2 {
    background: #fef3c7;
    color: #92400e;
  }
  .severity-badge.level-3 {
    background: #fed7aa;
    color: #9a3412;
  }
  .severity-badge.level-4 {
    background: #fecaca;
    color: #991b1b;
  }
  .severity-badge.level-5 {
    background: #fca5a5;
    color: #7f1d1d;
  }

  .image-preview img {
    max-width: 300px;
    max-height: 200px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  .flagged-reasons {
    background: #fef2f2;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid #fecaca;
    margin-bottom: 1.5rem;
  }

  .flagged-reasons h4 {
    color: #dc2626;
    margin: 0 0 0.5rem;
  }

  .flagged-reasons ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .flagged-reasons li {
    color: #991b1b;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
  }

  .action-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn.approve {
    background: #10b981;
    color: white;
  }

  .action-btn.approve:hover {
    background: #059669;
  }

  .action-btn.reject {
    background: #ef4444;
    color: white;
  }

  .action-btn.reject:hover {
    background: #dc2626;
  }

  .action-btn.flag {
    background: #f59e0b;
    color: white;
  }

  .action-btn.flag:hover {
    background: #d97706;
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .action-form {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    margin-top: 1.5rem;
  }

  .action-form h4 {
    margin: 0 0 1rem;
    color: #1e293b;
  }

  .flag-explanation {
    background: #fffbeb;
    color: #92400e;
    padding: 0.75rem;
    border-radius: 4px;
    border-left: 4px solid #f59e0b;
    font-size: 0.9rem;
    line-height: 1.4;
    margin-bottom: 1rem;
  }

  .flag-indicator {
    font-size: 0.9rem;
    color: #dc2626;
    filter: drop-shadow(0 1px 2px rgba(220, 38, 38, 0.3));
    animation: flagPulse 2s ease-in-out infinite;
  }

  .flag-indicator.large {
    font-size: 1.2rem;
    margin: 0 0.25rem;
  }

  @keyframes flagPulse {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1);
    }
    50% { 
      opacity: 0.7; 
      transform: scale(1.1);
    }
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .submit-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    color: white;
  }

  .submit-btn.approve {
    background: #10b981;
  }

  .submit-btn.reject {
    background: #ef4444;
  }

  .submit-btn.flag {
    background: #f59e0b;
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    color: #374151;
    cursor: pointer;
  }

  .cancel-btn:hover {
    background: #f9fafb;
  }

  .queue-list {
    padding: 1rem;
  }

  .queue-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 4px;
    margin-bottom: 2px;
  }

  .queue-item:hover {
    background-color: #f8fafc;
    transform: translateX(2px);
  }

  .queue-item.selected {
    background-color: #dbeafe;
    border: 1px solid #2563eb;
    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
  }

  .queue-item.approved {
    border-left: 4px solid #10b981;
    background-color: #f0fdf4;
  }

  .queue-item.rejected {
    border-left: 4px solid #ef4444;
    background-color: #fef2f2;
  }

  .queue-item.pending {
    border-left: 4px solid #f59e0b;
  }

  .queue-item:last-child {
    border-bottom: none;
  }

  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    margin-left: 0.5rem;
  }

  .status-badge.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.approved {
    background: #dcfce7;
    color: #166534;
  }

  .status-badge.rejected {
    background: #fecaca;
    color: #991b1b;
  }

  .view-count {
    font-size: 0.9rem;
    color: #64748b;
    font-weight: normal;
  }

  .status-display {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    margin-top: 1.5rem;
  }

  .status-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .status-info.approved {
    border-left: 4px solid #10b981;
    padding-left: 1rem;
  }

  .status-info.rejected {
    border-left: 4px solid #ef4444;
    padding-left: 1rem;
  }

  .status-icon {
    font-size: 1.5rem;
  }

  .status-text {
    font-weight: 500;
    color: #1e293b;
  }

  .moderator-notes {
    background: white;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  .moderator-notes h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-size: 0.9rem;
  }

  .moderator-notes p {
    margin: 0;
    color: #64748b;
  }

  .resolved-date {
    font-size: 0.8rem;
    color: #64748b;
    font-family: monospace;
    margin: 0;
  }

  .item-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .item-info .title {
    font-weight: 500;
    color: #1e293b;
  }

  .item-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .item-meta .date {
    color: #64748b;
  }

  .empty-queue {
    padding: 2rem;
    text-align: center;
    color: #64748b;
    font-style: italic;
    line-height: 1.6;
  }

  .empty-subtitle {
    display: block;
    font-size: 0.9rem;
    color: #94a3b8;
    margin-top: 0.5rem;
  }

  @media (max-width: 768px) {
    .moderation-content {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
