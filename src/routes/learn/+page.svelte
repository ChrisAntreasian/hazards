<script lang="ts">
  import type { PageData } from "./$types";
  
  export let data: PageData;
  
  const categories = [
    {
      id: "plants",
      name: "Plants",
      icon: "🌿",
      description: "Poisonous plants, thorns, and allergenic species",
      color: "from-green-500 to-emerald-600",
      hazardCount: data.contentList?.plants ? Object.keys(data.contentList.plants).length : 0
    },
    {
      id: "insects",
      name: "Insects",
      icon: "🐛",
      description: "Biting, stinging, and disease-carrying insects",
      color: "from-amber-500 to-orange-600",
      hazardCount: data.contentList?.insects ? Object.keys(data.contentList.insects).length : 0
    },
    {
      id: "animals",
      name: "Animals",
      icon: "🐻",
      description: "Wildlife encounters and dangerous animals",
      color: "from-red-500 to-rose-600",
      hazardCount: data.contentList?.animals ? Object.keys(data.contentList.animals).length : 0
    },
    {
      id: "terrain",
      name: "Terrain",
      icon: "⛰️",
      description: "Unstable ground, cliffs, and terrain hazards",
      color: "from-slate-500 to-gray-600",
      hazardCount: data.contentList?.terrain ? Object.keys(data.contentList.terrain).length : 0
    }
  ];
  
  // Get featured hazards (first few from data)
  const featuredHazards = [];
  if (data.contentList) {
    for (const [category, subcategories] of Object.entries(data.contentList)) {
      for (const [subcategory, hazards] of Object.entries(subcategories as any)) {
        if (Array.isArray(hazards) && hazards.length > 0) {
          featuredHazards.push({
            name: hazards[0],
            category,
            subcategory,
            displayName: hazards[0].replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          });
          if (featuredHazards.length >= 3) break;
        }
      }
      if (featuredHazards.length >= 3) break;
    }
  }
</script>

<svelte:head>
  <title>Learn About Hazards - Educational Content</title>
  <meta name="description" content="Browse comprehensive guides on outdoor hazards. Learn to identify, prevent, and respond to dangerous plants, insects, animals, and terrain." />
</svelte:head>

<div class="learn-page">
  <!-- Hero Section -->
  <section class="hero">
    <h1>📚 Educational Content</h1>
    <p class="hero-subtitle">
      Comprehensive guides to help you identify, prevent, and respond to outdoor hazards
    </p>
  </section>

  <!-- Category Grid -->
  <section class="categories-section">
    <h2>Browse by Category</h2>
    <div class="categories-grid">
      {#each categories as category}
        <a href="/learn/{category.id}" class="category-card">
          <div class="category-header bg-gradient-to-br {category.color}">
            <span class="category-icon">{category.icon}</span>
          </div>
          <div class="category-body">
            <h3>{category.name}</h3>
            <p>{category.description}</p>
            <div class="category-meta">
              <span class="hazard-count">{category.hazardCount} hazard{category.hazardCount !== 1 ? 's' : ''}</span>
              <span class="view-link">View all →</span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- Featured Hazards -->
  {#if featuredHazards.length > 0}
    <section class="featured-section">
      <h2>Featured Guides</h2>
      <div class="featured-grid">
        {#each featuredHazards as hazard}
          <a href="/learn/{hazard.category}/{hazard.subcategory}/{hazard.name}" class="featured-card">
            <div class="featured-content">
              <h3>{hazard.displayName}</h3>
              <p class="featured-category">{hazard.category.charAt(0).toUpperCase() + hazard.category.slice(1)} → {hazard.subcategory.replace(/_/g, ' ')}</p>
              <span class="read-more">Read guide →</span>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Quick Stats -->
  <section class="stats-section">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{Object.keys(data.contentList || {}).length}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">
          {Object.values(data.contentList || {}).reduce((total, subcats: any) => {
            return total + Object.values(subcats).reduce((subtotal, hazards: any) => {
              return subtotal + (Array.isArray(hazards) ? hazards.length : 0);
            }, 0);
          }, 0)}
        </div>
        <div class="stat-label">Hazard Guides</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">6</div>
        <div class="stat-label">Content Types</div>
      </div>
    </div>
  </section>

  <!-- Info Banner -->
  <section class="info-banner">
    <div class="info-content">
      <h3>🌍 Regional Content</h3>
      <p>
        All guides include region-specific information for the Boston area and surrounding regions.
        Learn about seasonal variations, local species, and area-specific safety tips.
      </p>
    </div>
  </section>
</div>

<style>
  .learn-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* Hero Section */
  .hero {
    text-align: center;
    margin-bottom: 4rem;
    padding: 3rem 1rem;
  }

  .hero h1 {
    font-size: 3rem;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 1rem;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: #64748b;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Categories Section */
  .categories-section h2 {
    font-size: 2rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 2rem;
  }

  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 4rem;
  }

  .category-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid #e2e8f0;
    text-decoration: none;
    transition: all 0.3s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .category-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border-color: #cbd5e1;
  }

  .category-header {
    padding: 3rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .category-icon {
    font-size: 4rem;
  }

  .category-body {
    padding: 1.5rem;
  }

  .category-body h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .category-body p {
    color: #64748b;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .category-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }

  .hazard-count {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .view-link {
    color: #2563eb;
    font-weight: 500;
    font-size: 0.875rem;
  }

  /* Featured Section */
  .featured-section {
    margin-bottom: 4rem;
  }

  .featured-section h2 {
    font-size: 2rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 2rem;
  }

  .featured-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .featured-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 2rem;
    text-decoration: none;
    color: white;
    transition: transform 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .featured-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  .featured-content h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .featured-category {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 1rem;
    display: block;
  }

  .read-more {
    font-weight: 500;
    opacity: 0.95;
  }

  /* Stats Section */
  .stats-section {
    margin-bottom: 4rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
  }

  .stat-card {
    background: #f8fafc;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    border: 1px solid #e2e8f0;
  }

  .stat-value {
    font-size: 3rem;
    font-weight: bold;
    color: #2563eb;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 1rem;
    color: #64748b;
    font-weight: 500;
  }

  /* Info Banner */
  .info-banner {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border-radius: 12px;
    padding: 2rem;
    color: white;
    margin-bottom: 2rem;
  }

  .info-content h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .info-content p {
    font-size: 1rem;
    line-height: 1.6;
    opacity: 0.95;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .learn-page {
      padding: 1rem;
    }

    .hero h1 {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }

    .categories-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .featured-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
