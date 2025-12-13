<script lang="ts">
  import CategoryManagement from "$lib/components/admin/CategoryManagement.svelte";
  import CategorySuggestionReview from "$lib/components/admin/CategorySuggestionReview.svelte";

  let activeTab = $state<'manage' | 'suggestions'>('manage');
</script>

<svelte:head>
  <title>Category Management - Admin Panel</title>
</svelte:head>

<div class="admin-categories">
  <div class="tabs">
    <button 
      type="button"
      class="tab" 
      class:active={activeTab === 'manage'}
      onclick={() => activeTab = 'manage'}
    >
      📁 Manage Categories
    </button>
    <button 
      type="button"
      class="tab" 
      class:active={activeTab === 'suggestions'}
      onclick={() => activeTab = 'suggestions'}
    >
      📝 Review Suggestions
    </button>
  </div>

  <div class="tab-content">
    {#if activeTab === 'manage'}
      <CategoryManagement />
    {:else}
      <CategorySuggestionReview />
    {/if}
  </div>
</div>

<style>
  .admin-categories {
    padding: 0;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0;
  }

  .tab {
    padding: 0.75rem 1.5rem;
    border: none;
    background: none;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
  }

  .tab:hover {
    color: #374151;
  }

  .tab.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .tab-content {
    padding: 0;
  }
</style>
