<script lang="ts">
  import type { PageData } from "./$types";
  import { NavigationGrid, Breadcrumbs } from "$lib/components/learn";
  import type { BreadcrumbItem } from "$lib/utils/learn-navigation";
  import { goto } from "$app/navigation";

  let { data }: { data: PageData } = $props();

  // Search state
  let searchQuery = $state("");

  // Category color mapping for gradients
  const categoryColors: Record<string, string> = {
    plants: "from-green-500 to-emerald-600",
    insects: "from-amber-500 to-orange-600",
    animals: "from-red-500 to-rose-600",
    terrain: "from-slate-500 to-gray-600",
    weather: "from-blue-500 to-cyan-600",
    ice: "from-cyan-400 to-blue-500",
    other: "from-purple-500 to-indigo-600",
  };

  // Breadcrumbs for root page
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Learning Center", href: null, isCurrentPage: true },
  ];

  // Enrich categories with colors
  const enrichedCategories = $derived(
    data.categories.map((cat) => ({
      ...cat,
      color: categoryColors[cat.path] || "from-blue-500 to-indigo-600",
    }))
  );

  // Handle search submission - redirect to search page
  function handleSearch(e: Event) {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      goto(`/learn/search?q=${encodeURIComponent(searchQuery.trim())}&from=/learn`);
    }
  }
</script>

<svelte:head>
  <title>Learning Center - Hazard Education</title>
  <meta
    name="description"
    content="Browse comprehensive guides on outdoor hazards. Learn to identify, prevent, and respond to dangerous plants, insects, animals, terrain, and weather."
  />
</svelte:head>

<div class="learn-page">
  <Breadcrumbs items={breadcrumbs} />

  <!-- Hero Section -->
  <section class="hero">
    <h1>📚 Learning Center</h1>
    <p class="hero-subtitle">
      Comprehensive guides to help you identify, prevent, and respond to outdoor
      hazards
    </p>

    <!-- Search Bar -->
    <form class="search-container" onsubmit={handleSearch}>
      <div class="search-input-wrapper">
        <svg
          class="search-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search hazards, categories, guides..."
          class="search-input"
          aria-label="Search learning center"
        />
        <button type="submit" class="search-submit" aria-label="Search">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>
      </div>
    </form>
  </section>

  <!-- Category Grid -->
  <section class="categories-section">
    <h2>Browse by Category</h2>

    {#if enrichedCategories.length > 0}
      <div class="categories-grid">
        {#each enrichedCategories as category}
          <a href="/learn/{category.path}" class="category-card">
            <div class="category-header bg-gradient-to-br {category.color}">
              <span class="category-icon">{category.icon}</span>
            </div>
            <div class="category-body">
              <h3>{category.name}</h3>
              <p>
                {category.short_description ||
                  category.description ||
                  `Learn about ${category.name.toLowerCase()} hazards`}
              </p>
              <div class="category-meta">
                <div class="counts">
                  {#if category.child_count > 0}
                    <span class="count"
                      >{category.child_count} subcategor{category.child_count ===
                      1
                        ? "y"
                        : "ies"}</span
                    >
                  {/if}
                  {#if category.template_count > 0}
                    <span class="count"
                      >{category.template_count} guide{category.template_count ===
                      1
                        ? ""
                        : "s"}</span
                    >
                  {/if}
                </div>
                <span class="view-link">Explore →</span>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No categories available yet.</p>
      </div>
    {/if}
  </section>

  <!-- Quick Stats -->
  {#if data.stats}
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{data.stats.rootCategories}</div>
          <div class="stat-label">Categories</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{data.stats.totalCategories}</div>
          <div class="stat-label">Total Topics</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{data.stats.totalTemplates}</div>
          <div class="stat-label">Hazard Guides</div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Info Banner -->
  <section class="info-banner">
    <div class="info-content">
      <h3>🌍 Regional Content</h3>
      <p>
        All guides include region-specific information. Learn about seasonal
        variations, local species, and area-specific safety tips for your
        region.
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

  .counts {
    display: flex;
    gap: 0.5rem;
  }

  .count {
    font-size: 0.75rem;
    color: #64748b;
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

  /* Search Styles */
  .search-container {
    margin-top: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    color: #94a3b8;
    pointer-events: none;
  }

  .search-input {
    flex: 1;
    padding: 1rem 1rem 1rem 3rem;
    font-size: 1.125rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    background: white;
    color: #1e293b;
    transition: all 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  .search-input::placeholder {
    color: #94a3b8;
  }

  .search-submit {
    padding: 1rem;
    background: #2563eb;
    border: none;
    border-radius: 12px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
  }

  .search-submit:hover {
    background: #1d4ed8;
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

    .search-input {
      font-size: 1rem;
      padding: 0.875rem 0.875rem 0.875rem 2.5rem;
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
