<script lang="ts">
  import type { BreadcrumbItem } from '$lib/utils/learn-navigation';

  interface Props {
    items: BreadcrumbItem[];
  }

  let { items }: Props = $props();
</script>

<nav aria-label="Breadcrumb" class="breadcrumbs">
  <ol>
    {#each items as item, index}
      <li>
        {#if item.href && !item.isCurrentPage}
          <a href={item.href}>{item.label}</a>
        {:else}
          <span class="current" aria-current="page">{item.label}</span>
        {/if}
        {#if index < items.length - 1}
          <span class="separator" aria-hidden="true">›</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumbs {
    padding: 0.75rem 0;
    margin-bottom: 1rem;
  }

  ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.875rem;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  a {
    color: #2563eb;
    text-decoration: none;
    transition: color 0.2s;
  }

  a:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }

  .current {
    color: #64748b;
    font-weight: 500;
  }

  .separator {
    color: #94a3b8;
    margin: 0 0.25rem;
  }

  @media (max-width: 640px) {
    ol {
      font-size: 0.8rem;
    }
  }
</style>
