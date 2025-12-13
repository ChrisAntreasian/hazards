<script lang="ts">
  import { onMount } from 'svelte';
  
  interface CategorySuggestion {
    id: string;
    suggested_name: string;
    suggested_path: string;
    suggested_parent_id: string | null;
    suggested_icon: string;
    description: string | null;
    reason: string;
    suggested_by: string;
    user_trust_score: number;
    status: 'pending' | 'provisional' | 'active' | 'rejected' | 'archived';
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    approved_category_id: string | null;
    created_at: string;
    updated_at: string;
    users?: {
      id: string;
      email: string;
      trust_score: number;
    };
    hazard_categories?: {
      id: string;
      name: string;
      path: string;
      icon: string;
    };
  }

  let suggestions: CategorySuggestion[] = $state([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let selectedSuggestion = $state<CategorySuggestion | null>(null);
  let reviewNotes = $state('');
  let statusFilter = $state('pending,provisional');

  onMount(async () => {
    await loadSuggestions();
  });

  async function loadSuggestions() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/categories/suggest?status=${statusFilter}`);
      const result = await response.json();

      if (result.success) {
        suggestions = result.suggestions || [];
      } else {
        error = result.error || 'Failed to load suggestions';
      }
    } catch (err) {
      error = 'Network error loading suggestions';
      console.error('Error loading suggestions:', err);
    } finally {
      isLoading = false;
    }
  }

  async function reviewSuggestion(action: 'approve' | 'reject') {
    if (!selectedSuggestion) {
      error = 'No suggestion selected';
      return;
    }

    isLoading = true;
    error = null;

    try {
      // For suggestions, we review the suggestion directly, not a category
      const suggestionId = selectedSuggestion.id;

      const response = await fetch(`/api/categories/review/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: reviewNotes
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          error = errorJson.message || errorJson.error || `Failed to ${action} category (${response.status})`;
        } catch {
          error = `Failed to ${action} category: ${response.status} ${errorText.substring(0, 100)}`;
        }
        return;
      }

      const result = await response.json();

      if (result.success) {
        selectedSuggestion = null;
        reviewNotes = '';
        await loadSuggestions();
      } else {
        error = result.error || `Failed to ${action} category`;
      }
    } catch (err) {
      error = `Network error during ${action}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`Error ${action}ing category:`, err);
    } finally {
      isLoading = false;
    }
  }

  function selectSuggestion(suggestion: CategorySuggestion) {
    selectedSuggestion = suggestion;
    reviewNotes = '';
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'pending': return 'badge-pending';
      case 'provisional': return 'badge-provisional';
      case 'active': return 'badge-active';
      case 'rejected': return 'badge-rejected';
      default: return 'badge-default';
    }
  }
</script>

<div class="suggestion-review">
  <div class="header">
    <h2>Category Suggestions</h2>
    <div class="filter-controls">
      <label for="status-filter">Filter:</label>
      <select 
        id="status-filter" 
        bind:value={statusFilter} 
        onchange={() => loadSuggestions()}
      >
        <option value="pending,provisional">Pending Review</option>
        <option value="pending">Pending Only</option>
        <option value="provisional">Provisional Only</option>
        <option value="active">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="pending,provisional,active,rejected">All</option>
      </select>
    </div>
  </div>

  {#if error}
    <div class="alert alert-error">
      {error}
      <button onclick={() => error = null} class="alert-close">×</button>
    </div>
  {/if}

  <div class="content-grid">
    <!-- Suggestions List -->
    <div class="suggestions-list">
      <h3>Suggestions ({suggestions.length})</h3>

      {#if isLoading && suggestions.length === 0}
        <div class="loading">Loading suggestions...</div>
      {:else if suggestions.length === 0}
        <div class="empty-state">
          <p>No category suggestions found for this filter.</p>
        </div>
      {:else}
        <div class="list-container">
          {#each suggestions as suggestion (suggestion.id)}
            <button 
              type="button"
              class="suggestion-item"
              class:selected={selectedSuggestion?.id === suggestion.id}
              onclick={() => selectSuggestion(suggestion)}
            >
              <div class="suggestion-header">
                <span class="suggestion-icon">{suggestion.suggested_icon}</span>
                <span class="suggestion-name">{suggestion.suggested_name}</span>
                <span class="badge {getStatusBadgeClass(suggestion.status)}">
                  {suggestion.status}
                </span>
              </div>
              <div class="suggestion-meta">
                <span class="suggestion-path">{suggestion.suggested_path}</span>
                <span class="suggestion-date">{formatDate(suggestion.created_at)}</span>
              </div>
              {#if suggestion.users}
                <div class="suggestion-user">
                  by {suggestion.users.email} (trust: {suggestion.user_trust_score})
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Detail Panel -->
    {#if selectedSuggestion}
      <div class="detail-panel">
        <h3>Review Suggestion</h3>

        <div class="detail-content">
          <div class="detail-header">
            <span class="detail-icon">{selectedSuggestion.suggested_icon}</span>
            <div class="detail-title">
              <h4>{selectedSuggestion.suggested_name}</h4>
              <span class="badge {getStatusBadgeClass(selectedSuggestion.status)}">
                {selectedSuggestion.status}
              </span>
            </div>
          </div>

          <div class="detail-section">
            <span class="field-label">Path:</span>
            <span class="detail-value">{selectedSuggestion.suggested_path}</span>
          </div>

          {#if selectedSuggestion.hazard_categories}
            <div class="detail-section">
              <span class="field-label">Parent Category:</span>
              <span class="detail-value">
                {selectedSuggestion.hazard_categories.icon} {selectedSuggestion.hazard_categories.name}
              </span>
            </div>
          {/if}

          {#if selectedSuggestion.description}
            <div class="detail-section">
              <span class="field-label">Description:</span>
              <p class="detail-text">{selectedSuggestion.description}</p>
            </div>
          {/if}

          <div class="detail-section">
            <span class="field-label">Submitted by:</span>
            <div class="user-info">
              <span>{selectedSuggestion.users?.email || 'Unknown'}</span>
              <span class="trust-badge">Trust Score: {selectedSuggestion.user_trust_score}</span>
            </div>
          </div>

          <div class="detail-section">
            <span class="field-label">Submitted:</span>
            <span class="detail-value">{formatDate(selectedSuggestion.created_at)}</span>
          </div>

          {#if selectedSuggestion.reviewed_at}
            <div class="detail-section reviewed">
              <span class="field-label">Reviewed:</span>
              <span class="detail-value">{formatDate(selectedSuggestion.reviewed_at)}</span>
              {#if selectedSuggestion.review_notes}
                <p class="review-notes">{selectedSuggestion.review_notes}</p>
              {/if}
            </div>
          {/if}

          {#if selectedSuggestion.status === 'pending' || selectedSuggestion.status === 'provisional'}
            <div class="review-form">
              <div class="form-group">
                <label for="review-notes">Review Notes (optional):</label>
                <textarea
                  id="review-notes"
                  bind:value={reviewNotes}
                  rows="3"
                  placeholder="Add notes about your decision..."
                ></textarea>
              </div>

              <div class="review-actions">
                <button 
                  type="button"
                  class="btn btn-reject" 
                  onclick={() => reviewSuggestion('reject')}
                  disabled={isLoading}
                >
                  ❌ Reject
                </button>
                <button 
                  type="button"
                  class="btn btn-approve" 
                  onclick={() => reviewSuggestion('approve')}
                  disabled={isLoading}
                >
                  ✅ Approve
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="detail-panel empty">
        <p>Select a suggestion to review</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .suggestion-review {
    padding: 0;
    max-width: none;
    margin: 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .header h2 {
    color: #1f2937;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-controls label {
    font-weight: 500;
    color: #6b7280;
  }

  .filter-controls select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    min-height: 600px;
  }

  .suggestions-list {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .suggestions-list h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1f2937;
  }

  .list-container {
    max-height: 550px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .suggestion-item {
    width: 100%;
    text-align: left;
    padding: 1rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .suggestion-item:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  .suggestion-item.selected {
    background: #eff6ff;
    border-color: #3b82f6;
  }

  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .suggestion-icon {
    font-size: 1.25rem;
  }

  .suggestion-name {
    font-weight: 600;
    color: #1f2937;
    flex: 1;
  }

  .suggestion-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.8125rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .suggestion-path {
    font-family: monospace;
    font-size: 0.75rem;
  }

  .suggestion-user {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .badge {
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge-pending {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-provisional {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .badge-active {
    background: #d1fae5;
    color: #065f46;
  }

  .badge-rejected {
    background: #fee2e2;
    color: #991b1b;
  }

  .badge-default {
    background: #f3f4f6;
    color: #4b5563;
  }

  .detail-panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    position: sticky;
    top: 2rem;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }

  .detail-panel.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
  }

  .detail-panel h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #1f2937;
  }

  .detail-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .detail-icon {
    font-size: 2.5rem;
  }

  .detail-title {
    flex: 1;
  }

  .detail-title h4 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    color: #1f2937;
  }

  .detail-section {
    margin-bottom: 1rem;
  }

  .detail-section .field-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .detail-value {
    font-size: 0.9375rem;
    color: #1f2937;
  }

  .detail-text {
    margin: 0;
    font-size: 0.9375rem;
    color: #374151;
    line-height: 1.5;
    background: #f9fafb;
    padding: 0.75rem;
    border-radius: 6px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .trust-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    color: #6b7280;
  }

  .detail-section.reviewed {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 6px;
    margin-top: 1rem;
  }

  .review-notes {
    margin: 0.5rem 0 0;
    font-style: italic;
    color: #6b7280;
  }

  .review-form {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    resize: vertical;
  }

  .review-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn {
    flex: 1;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-reject {
    background: #fee2e2;
    color: #dc2626;
  }

  .btn-reject:hover {
    background: #fecaca;
  }

  .btn-approve {
    background: #d1fae5;
    color: #059669;
  }

  .btn-approve:hover {
    background: #a7f3d0;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .alert {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .alert-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .alert-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.25rem;
    opacity: 0.7;
    padding: 0;
  }

  .alert-close:hover {
    opacity: 1;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }

    .detail-panel {
      position: static;
      max-height: none;
    }
  }
</style>
