<script lang="ts">
  /**
   * Regional content selector component
   * Allows users to switch between different US regional content variations
   */
  import type { USRegion, RegionalContent } from "$lib/types/educational";
  import { REGIONS } from "$lib/types/educational";

  export let regionalContent: RegionalContent[];
  export let selectedRegion: USRegion = "northeast";
  export let onRegionChange: (region: USRegion) => void = () => {};

  // Get available regions from the content
  $: availableRegions = regionalContent.map((rc) => rc.region);

  // Get selected content
  $: selectedContent = regionalContent.find(
    (rc) => rc.region === selectedRegion
  );

  function handleRegionSelect(region: USRegion) {
    selectedRegion = region;
    onRegionChange(region);
  }
</script>

<div class="regional-selector">
  <div class="region-tabs">
    {#each availableRegions as region (region)}
      {@const regionInfo = REGIONS[region]}
      <button
        class="region-tab"
        class:active={selectedRegion === region}
        on:click={() => handleRegionSelect(region)}
        title={regionInfo.description}
      >
        {regionInfo.name}
      </button>
    {/each}
  </div>

  {#if selectedContent}
    <div class="region-content">
      <div class="region-header">
        <h3>{REGIONS[selectedRegion].name}</h3>
        <p class="region-states">
          {REGIONS[selectedRegion].states.join(", ")}
        </p>
      </div>
      <slot content={selectedContent.content} />
    </div>
  {:else}
    <div class="no-content">
      <p>
        No regional information available for {REGIONS[selectedRegion].name}.
      </p>
    </div>
  {/if}
</div>

<style>
  .regional-selector {
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: var(--color-bg-card, #fff);
  }

  .region-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    background-color: var(--color-bg-tabs, #f9fafb);
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .region-tab {
    flex: 1;
    min-width: fit-content;
    padding: 0.75rem 1rem;
    border: none;
    background-color: transparent;
    color: var(--color-text-secondary, #6b7280);
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
  }

  .region-tab:hover {
    background-color: var(--color-bg-hover, #f3f4f6);
    color: var(--color-text-primary, #1a1a1a);
  }

  .region-tab.active {
    color: var(--color-primary, #3b82f6);
    border-bottom-color: var(--color-primary, #3b82f6);
    background-color: var(--color-bg-card, #fff);
  }

  .region-content {
    padding: 1.5rem;
  }

  .region-header {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .region-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: var(--color-text-heading, #000);
  }

  .region-states {
    font-size: 0.875rem;
    color: var(--color-text-secondary, #6b7280);
    margin: 0;
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
    .region-tab {
      font-size: 0.8125rem;
      padding: 0.625rem 0.75rem;
    }

    .region-content {
      padding: 1rem;
    }

    .region-header h3 {
      font-size: 1.125rem;
    }
  }
</style>
