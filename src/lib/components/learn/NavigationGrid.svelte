<script lang="ts">
  import DangerBadge from './DangerBadge.svelte';

  interface NavigationItem {
    id: string;
    name: string;
    slug?: string;
    path?: string;
    icon?: string;
    description?: string | null;
    short_description?: string | null;
    danger_level?: number | null;
    template_count?: number;
    child_count?: number;
  }

  interface Props {
    items: NavigationItem[];
    basePath: string;
    type: 'category' | 'template';
    emptyMessage?: string;
  }

  let { 
    items, 
    basePath, 
    type,
    emptyMessage = 'No items available yet.'
  }: Props = $props();

  function getHref(item: NavigationItem): string {
    if (type === 'category' && item.path) {
      return `/learn/${item.path}`;
    }
    if (type === 'template' && item.slug) {
      return `${basePath}/${item.slug}`;
    }
    return basePath;
  }

  function getDescription(item: NavigationItem): string {
    return item.short_description || item.description || '';
  }
</script>

{#if items.length === 0}
  <div class="empty-state">
    <p>{emptyMessage}</p>
  </div>
{:else}
  <div class="navigation-grid">
    {#each items as item}
      <a href={getHref(item)} class="nav-card">
        <div class="card-content">
          <div class="card-header">
            {#if item.icon}
              <span class="item-icon">{item.icon}</span>
            {/if}
            <h3>{item.name}</h3>
            {#if type === 'template' && item.danger_level}
              <DangerBadge level={item.danger_level} size="small" />
            {/if}
          </div>
          
          {#if getDescription(item)}
            <p class="item-description">{getDescription(item)}</p>
          {/if}
          
          <div class="card-footer">
            {#if type === 'category'}
              {#if item.child_count && item.child_count > 0}
                <span class="count">{item.child_count} subcategor{item.child_count === 1 ? 'y' : 'ies'}</span>
              {/if}
              {#if item.template_count && item.template_count > 0}
                <span class="count">{item.template_count} hazard{item.template_count === 1 ? '' : 's'}</span>
              {/if}
            {/if}
            <span class="view-link">
              {type === 'category' ? 'Browse →' : 'Learn more →'}
            </span>
          </div>
        </div>
      </a>
    {/each}
  </div>
{/if}

<style>
  .navigation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .nav-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    text-decoration: none;
    transition: all 0.3s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }

  .nav-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border-color: #3b82f6;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .item-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
    flex: 1;
  }

  .item-description {
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
    margin: 0 0 1rem 0;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.75rem;
    border-top: 1px solid #e2e8f0;
    margin-top: auto;
  }

  .count {
    font-size: 0.75rem;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .view-link {
    color: #2563eb;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 2px dashed #e2e8f0;
  }

  .empty-state p {
    color: #64748b;
    font-size: 1.125rem;
    margin: 0;
  }

  @media (max-width: 640px) {
    .navigation-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
