<script lang="ts">
  import type { EducationalLink } from '$lib/utils/educational-links';

  interface Props {
    /** The educational link data */
    link: EducationalLink;
    /** Display variant */
    variant?: 'inline' | 'card' | 'button';
    /** Additional CSS classes */
    class?: string;
    /** Show description text */
    showDescription?: boolean;
  }

  let {
    link,
    variant = 'inline',
    class: className = '',
    showDescription = false
  }: Props = $props();

  // Determine styling based on link type
  const typeStyles = $derived({
    specific: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      hoverBg: 'hover:bg-green-100',
      badge: '📖 Learn More'
    },
    category: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      hoverBg: 'hover:bg-blue-100',
      badge: '📚 Browse Guides'
    },
    general: {
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      hoverBg: 'hover:bg-gray-100',
      badge: '🔍 Explore'
    }
  }[link.type]);
</script>

{#if variant === 'inline'}
  <a 
    href={link.href}
    class="educational-link-inline {typeStyles.textColor} {className}"
    title={link.description}
  >
    <span class="link-icon">{link.icon}</span>
    <span class="link-text">{link.label}</span>
    <span class="link-arrow">→</span>
  </a>

{:else if variant === 'card'}
  <a 
    href={link.href}
    class="educational-link-card {typeStyles.bgColor} {typeStyles.borderColor} {typeStyles.hoverBg} {className}"
  >
    <div class="card-header">
      <span class="card-icon">{link.icon}</span>
      <span class="card-badge {typeStyles.textColor}">{typeStyles.badge}</span>
    </div>
    <h4 class="card-title">{link.label}</h4>
    {#if showDescription}
      <p class="card-description">{link.description}</p>
    {/if}
    <span class="card-cta {typeStyles.textColor}">
      {#if link.type === 'specific'}
        View detailed guide →
      {:else if link.type === 'category'}
        Browse all guides →
      {:else}
        Explore guides →
      {/if}
    </span>
  </a>

{:else if variant === 'button'}
  <a 
    href={link.href}
    class="educational-link-button {typeStyles.bgColor} {typeStyles.borderColor} {typeStyles.textColor} {typeStyles.hoverBg} {className}"
  >
    <span class="btn-icon">{link.icon}</span>
    <span class="btn-text">{link.label}</span>
  </a>
{/if}

<style>
  /* Inline variant */
  .educational-link-inline {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .educational-link-inline:hover {
    text-decoration: underline;
  }

  .educational-link-inline:hover .link-arrow {
    transform: translateX(4px);
  }

  .link-icon {
    font-size: 1.1em;
  }

  .link-text {
    flex: 1;
  }

  .link-arrow {
    font-size: 0.9em;
    transition: transform 0.2s ease;
  }

  /* Card variant */
  .educational-link-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    border-radius: 12px;
    border: 2px solid;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .educational-link-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-icon {
    font-size: 1.75rem;
  }

  .card-badge {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    line-height: 1.3;
  }

  .card-description {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .card-cta {
    font-size: 0.875rem;
    font-weight: 600;
    margin-top: auto;
  }

  /* Button variant */
  .educational-link-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 8px;
    border: 1px solid;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .educational-link-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .btn-icon {
    font-size: 1.1em;
  }

  .btn-text {
    white-space: nowrap;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .educational-link-card {
      padding: 1rem;
    }

    .card-icon {
      font-size: 1.5rem;
    }

    .card-title {
      font-size: 1rem;
    }
  }
</style>
