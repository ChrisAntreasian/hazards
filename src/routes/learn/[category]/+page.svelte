<script lang="ts">
  import type { PageData } from "./$types";
  
  export let data: PageData;
  
  const categoryIcons: Record<string, string> = {
    plants: "🌿",
    insects: "🐛",
    animals: "🐻",
    terrain: "⛰️"
  };
  
  const categoryColors: Record<string, string> = {
    plants: "from-green-500 to-emerald-600",
    insects: "from-amber-500 to-orange-600",
    animals: "from-red-500 to-rose-600",
    terrain: "from-slate-500 to-gray-600"
  };
</script>

<svelte:head>
  <title>{data.categoryName} Hazards - Educational Content</title>
  <meta name="description" content="Browse {data.categoryName.toLowerCase()} hazards and learn how to identify, prevent, and respond to them." />
</svelte:head>

<div class="category-page">
  <!-- Header -->
  <div class="page-header">
    <a href="/learn" class="back-link">← Back to Categories</a>
    
    <div class="header-content">
      <div class="category-icon-large bg-gradient-to-br {categoryColors[data.category]}">
        {categoryIcons[data.category]}
      </div>
      <div>
        <h1>{data.categoryName}</h1>
        <p class="category-description">
          {#if data.category === 'plants'}
            Learn about poisonous plants, thorny species, and plants that can cause allergic reactions.
          {:else if data.category === 'insects'}
            Identify biting, stinging, and disease-carrying insects in your area.
          {:else if data.category === 'animals'}
            Understand wildlife behavior and stay safe during animal encounters.
          {:else if data.category === 'terrain'}
            Navigate safely around unstable ground, cliffs, and other terrain hazards.
          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- Subcategories -->
  {#if Object.keys(data.subcategories).length > 0}
    <div class="subcategories-section">
      {#each Object.entries(data.subcategories) as [subcategory, hazards]}
        <section class="subcategory-section">
          <h2>{subcategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
          
          <div class="hazards-grid">
            {#each hazards as hazard}
              {@const displayName = hazard.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              <a href="/learn/{data.category}/{subcategory}/{hazard}" class="hazard-card">
                <div class="hazard-card-content">
                  <h3>{displayName}</h3>
                  <p class="hazard-type">{subcategory.replace(/_/g, ' ')}</p>
                  <span class="read-guide">Read full guide →</span>
                </div>
              </a>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p>🚧 Content for this category is coming soon!</p>
      <p class="empty-subtitle">Check back later or explore other categories.</p>
      <a href="/learn" class="btn-primary">Browse All Categories</a>
    </div>
  {/if}
</div>

<style>
  .category-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* Header */
  .back-link {
    display: inline-block;
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
    margin-bottom: 2rem;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #1d4ed8;
  }

  .page-header {
    margin-bottom: 3rem;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .category-icon-large {
    width: 100px;
    height: 100px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3.5rem;
    flex-shrink: 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .header-content h1 {
    font-size: 2.5rem;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .category-description {
    font-size: 1.125rem;
    color: #64748b;
    line-height: 1.6;
    max-width: 600px;
  }

  /* Subcategories */
  .subcategories-section {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .subcategory-section h2 {
    font-size: 1.75rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #e2e8f0;
  }

  .hazards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .hazard-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    text-decoration: none;
    transition: all 0.3s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .hazard-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border-color: #3b82f6;
  }

  .hazard-card-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .hazard-type {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .read-guide {
    color: #2563eb;
    font-weight: 500;
    font-size: 0.875rem;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-state p {
    font-size: 1.5rem;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .empty-subtitle {
    font-size: 1rem !important;
    color: #94a3b8 !important;
    margin-bottom: 2rem !important;
  }

  .btn-primary {
    display: inline-block;
    background: #2563eb;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .category-page {
      padding: 1rem;
    }

    .header-content {
      flex-direction: column;
      text-align: center;
    }

    .header-content h1 {
      font-size: 2rem;
    }

    .category-description {
      font-size: 1rem;
    }

    .hazards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
