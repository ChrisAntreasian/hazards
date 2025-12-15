<script lang="ts">
  import type { PageData } from "./$types";
  import { Breadcrumbs } from "$lib/components/learn";
  import type { BreadcrumbItem } from "$lib/utils/learn-navigation";
  import { goto } from "$app/navigation";

  let { data }: { data: PageData } = $props();

  // Local search input state
  let searchInput = $state(data.query);

  // Parse the "from" path to build meaningful breadcrumbs
  const breadcrumbs = $derived<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: "Learning Center", href: "/learn", isCurrentPage: false },
    ];

    // If we came from a specific path, add it to breadcrumbs
    if (data.from && data.from !== "/learn") {
      const pathParts = data.from.replace("/learn/", "").split("/");
      let currentPath = "/learn";
      for (const part of pathParts) {
        if (part) {
          currentPath += `/${part}`;
          items.push({
            label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " "),
            href: currentPath,
            isCurrentPage: false,
          });
        }
      }
    }

    items.push({
      label: `Search: "${data.query}"`,
      href: null,
      isCurrentPage: true,
    });

    return items;
  });

  // Category color mapping
  const categoryColors: Record<string, string> = {
    plants: "from-green-500 to-emerald-600",
    insects: "from-amber-500 to-orange-600",
    animals: "from-red-500 to-rose-600",
    terrain: "from-slate-500 to-gray-600",
    weather: "from-blue-500 to-cyan-600",
    ice: "from-cyan-400 to-blue-500",
    other: "from-purple-500 to-indigo-600",
  };

  function getCategoryColor(path: string): string {
    const rootCategory = path.split("/")[0];
    return categoryColors[rootCategory] || "from-blue-500 to-indigo-600";
  }

  // Danger level display
  function getDangerInfo(level: number) {
    const levels: Record<number, { color: string; label: string }> = {
      1: { color: "#22c55e", label: "Low" },
      2: { color: "#eab308", label: "Moderate" },
      3: { color: "#f97316", label: "Significant" },
      4: { color: "#ef4444", label: "High" },
      5: { color: "#7c2d12", label: "Extreme" },
    };
    return levels[level] || { color: "#6b7280", label: "Unknown" };
  }

  // Format path for display
  function formatPath(path: string): string {
    return path.split("/").map(p => 
      p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " ")
    ).join(" › ");
  }

  // Handle new search
  function handleSearch(e: Event) {
    e.preventDefault();
    if (searchInput.trim().length >= 2) {
      goto(`/learn/search?q=${encodeURIComponent(searchInput.trim())}&from=${encodeURIComponent(data.from)}`);
    }
  }

  // Separate top-level categories from subcategories
  const topLevelCategories = $derived(
    data.categories.filter((c: { level: number }) => c.level === 0)
  );
  const subcategories = $derived(
    data.categories.filter((c: { level: number }) => c.level > 0)
  );
</script>

<svelte:head>
  <title>Search: {data.query} - Learning Center</title>
  <meta
    name="description"
    content="Search results for '{data.query}' in the Hazards Learning Center"
  />
</svelte:head>

<div class="search-page">
  <Breadcrumbs items={breadcrumbs()} />

  <!-- Search Header -->
  <section class="search-header">
    <h1>🔍 Search Results</h1>
    
    <!-- Search Form -->
    <form class="search-form" onsubmit={handleSearch}>
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
          bind:value={searchInput}
          placeholder="Search hazards, categories, guides..."
          class="search-input"
          aria-label="Search learning center"
        />
        <button type="submit" class="search-button">Search</button>
      </div>
    </form>

    {#if data.query}
      <p class="results-summary">
        Found <strong>{data.totalResults}</strong> result{data.totalResults === 1 ? '' : 's'} for "<strong>{data.query}</strong>"
      </p>
    {/if}
  </section>

  {#if !data.query}
    <div class="empty-state">
      <p>Enter a search term to find hazards, categories, and guides.</p>
    </div>
  {:else if data.totalResults === 0}
    <div class="no-results">
      <h2>No results found</h2>
      <p>No matches for "<strong>{data.query}</strong>"</p>
      <p class="hint">Try different keywords or browse the <a href="/learn">Learning Center</a></p>
    </div>
  {:else}
    <!-- Hazard Guides Section -->
    {#if data.templates.length > 0}
      <section class="results-section">
        <h2>📖 Hazard Guides ({data.templates.length})</h2>
        <div class="templates-grid">
          {#each data.templates as template}
            {@const dangerInfo = getDangerInfo(template.danger_level)}
            <a
              href="/learn/{template.category_path}/{template.slug}"
              class="template-card"
            >
              <div class="template-header">
                <span class="template-name">{template.name}</span>
                <span
                  class="danger-badge"
                  style="background-color: {dangerInfo.color}"
                >
                  {dangerInfo.label}
                </span>
              </div>
              <p class="template-description">
                {template.short_description || "Learn about this hazard"}
              </p>
              <span class="template-category">
                📁 {formatPath(template.category_path)}
              </span>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Top-Level Categories Section -->
    {#if topLevelCategories.length > 0}
      <section class="results-section">
        <h2>📂 Categories ({topLevelCategories.length})</h2>
        <div class="categories-grid">
          {#each topLevelCategories as category}
            <a href="/learn/{category.path}" class="category-card">
              <div class="category-header bg-gradient-to-br {getCategoryColor(category.path)}">
                <span class="category-icon">{category.icon || '📁'}</span>
              </div>
              <div class="category-body">
                <h3>{category.name}</h3>
                <p>
                  {category.short_description ||
                    category.description ||
                    `Learn about ${category.name.toLowerCase()} hazards`}
                </p>
                <span class="view-link">Explore →</span>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Subcategories Section -->
    {#if subcategories.length > 0}
      <section class="results-section">
        <h2>📁 Subcategories ({subcategories.length})</h2>
        <div class="subcategories-list">
          {#each subcategories as category}
            <a href="/learn/{category.path}" class="subcategory-card">
              <div class="subcategory-icon-wrapper bg-gradient-to-br {getCategoryColor(category.path)}">
                <span class="subcategory-icon">{category.icon || '📄'}</span>
              </div>
              <div class="subcategory-info">
                <h3>{category.name}</h3>
                <p class="subcategory-path">{formatPath(category.path)}</p>
                {#if category.short_description}
                  <p class="subcategory-description">{category.short_description}</p>
                {/if}
              </div>
              <span class="subcategory-arrow">→</span>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  {/if}

  <!-- Back Link -->
  <div class="back-section">
    <a href={data.from || '/learn'} class="back-link">
      ← Back to {data.from === '/learn' ? 'Learning Center' : 'previous page'}
    </a>
  </div>
</div>

<style>
  .search-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* Search Header */
  .search-header {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem 1rem;
  }

  .search-header h1 {
    font-size: 2.5rem;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 1.5rem;
  }

  .search-form {
    max-width: 600px;
    margin: 0 auto 1.5rem;
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

  .search-button {
    padding: 1rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: white;
    background: #2563eb;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .search-button:hover {
    background: #1d4ed8;
  }

  .results-summary {
    color: #64748b;
    font-size: 1.125rem;
  }

  /* Results Sections */
  .results-section {
    margin-bottom: 3rem;
  }

  .results-section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #e2e8f0;
  }

  /* Templates Grid */
  .templates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .template-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .template-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .template-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .template-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
  }

  .danger-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    white-space: nowrap;
  }

  .template-description {
    color: #64748b;
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .template-category {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  /* Categories Grid */
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
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
    padding: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .category-icon {
    font-size: 3rem;
  }

  .category-body {
    padding: 1.25rem;
  }

  .category-body h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .category-body p {
    color: #64748b;
    margin-bottom: 0.75rem;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  .view-link {
    color: #2563eb;
    font-weight: 500;
    font-size: 0.875rem;
  }

  /* Subcategories List */
  .subcategories-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .subcategory-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem 1.5rem;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .subcategory-card:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }

  .subcategory-icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .subcategory-icon {
    font-size: 1.5rem;
  }

  .subcategory-info {
    flex: 1;
    min-width: 0;
  }

  .subcategory-info h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.25rem;
  }

  .subcategory-path {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-bottom: 0.25rem;
  }

  .subcategory-description {
    font-size: 0.875rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subcategory-arrow {
    font-size: 1.25rem;
    color: #94a3b8;
    flex-shrink: 0;
  }

  /* Empty/No Results States */
  .empty-state,
  .no-results {
    text-align: center;
    padding: 4rem 2rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 2px dashed #e2e8f0;
  }

  .empty-state p,
  .no-results p {
    color: #64748b;
    font-size: 1.125rem;
    margin: 0;
  }

  .no-results h2 {
    font-size: 1.5rem;
    color: #1e293b;
    margin-bottom: 1rem;
  }

  .no-results .hint {
    font-size: 0.95rem;
    margin-top: 1rem;
  }

  .no-results a {
    color: #2563eb;
    text-decoration: underline;
  }

  /* Back Section */
  .back-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e2e8f0;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: #2563eb;
    font-weight: 500;
    text-decoration: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    transition: background-color 0.2s ease;
  }

  .back-link:hover {
    background: #eff6ff;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .search-page {
      padding: 1rem;
    }

    .search-header h1 {
      font-size: 1.75rem;
    }

    .search-input-wrapper {
      flex-direction: column;
    }

    .search-input {
      width: 100%;
      font-size: 1rem;
    }

    .search-button {
      width: 100%;
    }

    .templates-grid,
    .categories-grid {
      grid-template-columns: 1fr;
    }

    .subcategory-card {
      padding: 1rem;
    }

    .subcategory-description {
      display: none;
    }
  }
</style>
