<script lang="ts">
  import type { PageData } from "./$types";
  import EducationalContentCard from "$lib/components/EducationalContentCard.svelte";
  
  export let data: PageData;
  
  const displayName = data.hazard.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  const breadcrumbs = [
    { label: 'Learn', href: '/learn' },
    { label: data.categoryName, href: `/learn/${data.category}` },
    { label: data.subcategoryName, href: `/learn/${data.category}` },
    { label: displayName, href: null }
  ];
</script>

<svelte:head>
  <title>{displayName} - Educational Guide</title>
  <meta name="description" content="Complete guide to {displayName}: identification, symptoms, treatment, and prevention." />
</svelte:head>

<div class="hazard-guide-page">
  <!-- Breadcrumbs -->
  <nav class="breadcrumbs">
    {#each breadcrumbs as crumb, i}
      {#if i > 0}
        <span class="separator">›</span>
      {/if}
      {#if crumb.href}
        <a href={crumb.href}>{crumb.label}</a>
      {:else}
        <span class="current">{crumb.label}</span>
      {/if}
    {/each}
  </nav>

  <!-- Page Header -->
  <div class="page-header">
    <h1>{displayName}</h1>
    <p class="category-label">
      {data.categoryName} › {data.subcategoryName}
    </p>
  </div>

  <!-- Educational Content Card -->
  {#if data.content}
    <EducationalContentCard 
      content={data.content}
      showImages={true}
      defaultTab="overview"
    />
  {:else}
    <div class="error-state">
      <p>⚠️ Content not available</p>
      <p class="error-subtitle">
        We're still working on this guide. Check back soon or
        <a href="/learn">browse other hazards</a>.
      </p>
    </div>
  {/if}

  <!-- Action Buttons -->
  <div class="action-section">
    <h3>Encountered this hazard?</h3>
    <p>Help your community by reporting sightings and sharing safety information.</p>
    <div class="action-buttons">
      <a href="/hazards/create" class="btn-primary">Report This Hazard</a>
      <a href="/map" class="btn-secondary">View on Map</a>
    </div>
  </div>

  <!-- Related Content -->
  <aside class="related-content">
    <h3>Related Hazards</h3>
    <p class="related-subtitle">Other hazards in this category:</p>
    <div class="related-links">
      {#each data.relatedHazards as related}
        {@const relatedDisplay = related.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
        {#if related !== data.hazard}
          <a href="/learn/{data.category}/{data.subcategory}/{related}" class="related-link">
            {relatedDisplay} →
          </a>
        {/if}
      {/each}
    </div>
  </aside>
</div>

<style>
  .hazard-guide-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* Breadcrumbs */
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 2rem;
    font-size: 0.875rem;
    flex-wrap: wrap;
  }

  .breadcrumbs a {
    color: #2563eb;
    text-decoration: none;
    transition: color 0.2s;
  }

  .breadcrumbs a:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }

  .breadcrumbs .separator {
    color: #94a3b8;
  }

  .breadcrumbs .current {
    color: #64748b;
    font-weight: 500;
  }

  /* Page Header */
  .page-header {
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 3rem;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .category-label {
    font-size: 1rem;
    color: #64748b;
    font-weight: 500;
  }

  /* Error State */
  .error-state {
    text-align: center;
    padding: 4rem 2rem;
    background: #fef2f2;
    border: 2px solid #fecaca;
    border-radius: 12px;
    margin: 2rem 0;
  }

  .error-state p {
    font-size: 1.5rem;
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .error-subtitle {
    font-size: 1rem !important;
    color: #64748b !important;
  }

  .error-subtitle a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .error-subtitle a:hover {
    text-decoration: underline;
  }

  /* Action Section */
  .action-section {
    margin-top: 4rem;
    padding: 2rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border-radius: 12px;
    color: white;
    text-align: center;
  }

  .action-section h3 {
    font-size: 1.75rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .action-section p {
    font-size: 1rem;
    margin-bottom: 1.5rem;
    opacity: 0.95;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
    display: inline-block;
  }

  .btn-primary {
    background: white;
    color: #2563eb;
  }

  .btn-primary:hover {
    background: #f8fafc;
    transform: translateY(-2px);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid white;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  /* Related Content */
  .related-content {
    margin-top: 3rem;
    padding: 2rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .related-content h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .related-subtitle {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .related-links {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .related-link {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
    padding: 0.5rem;
    border-radius: 6px;
  }

  .related-link:hover {
    background: #dbeafe;
    color: #1d4ed8;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hazard-guide-page {
      padding: 1rem;
    }

    .page-header h1 {
      font-size: 2rem;
    }

    .action-buttons {
      flex-direction: column;
      align-items: stretch;
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
    }
  }
</style>
