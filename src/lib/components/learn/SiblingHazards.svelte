<script lang="ts">
  import DangerBadge from "./DangerBadge.svelte";

  interface SiblingTemplate {
    id: string;
    name: string;
    slug: string;
    short_description: string | null;
    danger_level: number | null;
  }

  interface Props {
    siblings: SiblingTemplate[];
    currentSlug: string;
    basePath: string;
    title?: string;
  }

  let {
    siblings,
    currentSlug,
    basePath,
    title = "Related Hazards",
  }: Props = $props();

  // Filter out current hazard
  const otherSiblings = $derived(
    siblings.filter((s) => s.slug !== currentSlug)
  );
</script>

{#if otherSiblings.length > 0}
  <section class="siblings-section">
    <h2>{title}</h2>
    <div class="siblings-grid">
      {#each otherSiblings as sibling}
        <a href="{basePath}/{sibling.slug}" class="sibling-card">
          <div class="sibling-header">
            <h3>{sibling.name}</h3>
            {#if sibling.danger_level}
              <DangerBadge
                level={sibling.danger_level}
                size="small"
                showLabel={false}
              />
            {/if}
          </div>
          {#if sibling.short_description}
            <p>{sibling.short_description}</p>
          {/if}
          <span class="view-link">View guide →</span>
        </a>
      {/each}
    </div>
  </section>
{/if}

<style>
  .siblings-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 2px solid #e2e8f0;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 1.5rem 0;
  }

  .siblings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .sibling-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .sibling-card:hover {
    background: white;
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .sibling-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 0.75rem 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .view-link {
    font-size: 0.875rem;
    color: #2563eb;
    font-weight: 500;
  }

  @media (max-width: 640px) {
    .siblings-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
