<script lang="ts">
  /**
   * Content navigation tabs component
   * Provides tabbed navigation between different educational content sections
   */
  import type { ContentFile, ContentFileType } from "$lib/types/educational";
  import { CONTENT_FILE_TITLES } from "$lib/types/educational";

  export let files: ContentFile[];
  export let activeFileType: ContentFileType = "overview";
  export let onTabChange: (fileType: ContentFileType) => void = () => {};

  // Get active file content
  $: activeFile = files.find((f) => f.type === activeFileType);

  function handleTabClick(fileType: ContentFileType) {
    activeFileType = fileType;
    onTabChange(fileType);
  }

  // Icon mapping for each content type
  const icons: Record<ContentFileType, string> = {
    overview: "📋",
    identification: "🔍",
    symptoms: "⚠️",
    treatment: "🏥",
    prevention: "🛡️",
    regional_notes: "🗺️",
  };
</script>

<div class="content-tabs">
  <nav class="tabs-nav" aria-label="Content sections">
    {#each files as file (file.type)}
      <button
        class="tab"
        class:active={activeFileType === file.type}
        on:click={() => handleTabClick(file.type)}
        title={file.title}
      >
        <span class="tab-icon" aria-hidden="true">{icons[file.type]}</span>
        <span class="tab-label">{file.title}</span>
      </button>
    {/each}
  </nav>

  <div class="tab-content">
    {#if activeFile}
      <slot content={activeFile.content} file={activeFile} />
    {:else}
      <div class="no-content">
        <p>Content not available</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .content-tabs {
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: var(--color-bg-card, #fff);
  }

  .tabs-nav {
    display: flex;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    background-color: var(--color-bg-tabs, #f9fafb);
    overflow-x: auto;
    scrollbar-width: thin;
    gap: 0.25rem;
    padding: 0.5rem;
  }

  .tabs-nav::-webkit-scrollbar {
    height: 4px;
  }

  .tabs-nav::-webkit-scrollbar-thumb {
    background-color: var(--color-border, #e5e7eb);
    border-radius: 2px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.375rem;
    background-color: transparent;
    color: var(--color-text-secondary, #6b7280);
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    min-width: fit-content;
  }

  .tab:hover {
    background-color: var(--color-bg-hover, #e5e7eb);
    color: var(--color-text-primary, #1a1a1a);
  }

  .tab.active {
    background-color: var(--color-bg-card, #fff);
    color: var(--color-primary, #3b82f6);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .tab-icon {
    font-size: 1.125rem;
  }

  .tab-label {
    font-weight: 600;
  }

  .tab-content {
    padding: 1.5rem;
    min-height: 200px;
  }

  .no-content {
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary, #6b7280);
  }

  .no-content p {
    margin: 0;
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .tabs-nav {
      gap: 0.125rem;
      padding: 0.375rem;
    }

    .tab {
      padding: 0.625rem 0.75rem;
      font-size: 0.8125rem;
    }

    .tab-icon {
      font-size: 1rem;
    }

    .tab-label {
      display: none; /* Hide labels on mobile, show only icons */
    }

    .tab:hover .tab-label,
    .tab.active .tab-label {
      display: inline; /* Show label for active/hover on mobile */
    }

    .tab-content {
      padding: 1rem;
    }
  }

  /* Tablet and up: show both icon and label */
  @media (min-width: 768px) {
    .tab-label {
      display: inline;
    }
  }
</style>
