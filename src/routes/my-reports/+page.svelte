<script lang="ts">
  import type { PageData } from "./$types";
  import { page } from "$app/stores";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  // Use server-provided user data
  const user = data.user;
  const userHazards = data.userHazards || [];
  const hazardStats = data.hazardStats || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  // Check for success message from URL
  let successMessage = $derived($page.url.searchParams.get("success"));

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "approved":
        return "status-approved";
      case "rejected":
        return "status-rejected";
      case "pending":
        return "status-pending";
      default:
        return "status-unknown";
    }
  }

  function getSeverityColor(level: number) {
    if (level >= 4) return "severity-high";
    if (level === 3) return "severity-medium";
    return "severity-low";
  }

  // Filter functions for different views
  let selectedFilter = $state("all");
  let filteredHazards = $derived(
    selectedFilter === "all"
      ? userHazards
      : userHazards.filter((h) => h.status === selectedFilter)
  );

  // Sorting options
  let sortBy = $state("created_at");
  let sortOrder = $state("desc");
  let sortedHazards = $derived(
    [...filteredHazards].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      // Safe property access
      switch (sortBy) {
        case "created_at":
          aVal = a.created_at;
          bVal = b.created_at;
          break;
        case "reported_active_date":
          aVal = a.reported_active_date;
          bVal = b.reported_active_date;
          break;
        case "title":
          aVal = a.title;
          bVal = b.title;
          break;
        case "severity_level":
          aVal = a.severity_level;
          bVal = b.severity_level;
          break;
        default:
          aVal = a.created_at;
          bVal = b.created_at;
      }

      if (sortBy === "created_at" || sortBy === "reported_active_date") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    })
  );
</script>

<svelte:head>
  <title>My Reports - Hazards App</title>
</svelte:head>

<div class="my-reports-container">
  <div class="my-reports">
    <header class="page-header">
      <div class="header-content">
        <h1>📊 My Hazard Reports</h1>
        <p class="subtitle">
          View and manage all your submitted hazard reports
        </p>
      </div>
      <a href="/hazards/create" class="btn btn-primary">+ Report New Hazard</a>
    </header>

    <!-- Success Message -->
    {#if successMessage === "hazard-created"}
      <div class="alert alert-success">
        ✅ Hazard reported successfully! It will be reviewed before being
        published.
      </div>
    {/if}

    <!-- Stats Overview -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon">📍</div>
        <div class="stat-content">
          <div class="stat-number">{hazardStats.total}</div>
          <div class="stat-label">Total Reports</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-number">{hazardStats.pending}</div>
          <div class="stat-label">Pending Review</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-number">{hazardStats.approved}</div>
          <div class="stat-label">Approved</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">❌</div>
        <div class="stat-content">
          <div class="stat-number">{hazardStats.rejected}</div>
          <div class="stat-label">Rejected</div>
        </div>
      </div>
    </div>

    <!-- Filters and Sorting -->
    <div class="controls">
      <div class="filters">
        <label for="filter">Filter by status:</label>
        <select bind:value={selectedFilter} id="filter" class="filter-select">
          <option value="all">All Reports ({hazardStats.total})</option>
          <option value="pending">Pending ({hazardStats.pending})</option>
          <option value="approved">Approved ({hazardStats.approved})</option>
          <option value="rejected">Rejected ({hazardStats.rejected})</option>
        </select>
      </div>

      <div class="sorting">
        <label for="sort">Sort by:</label>
        <select bind:value={sortBy} id="sort" class="sort-select">
          <option value="created_at">Date Created</option>
          <option value="title">Title</option>
          <option value="severity_level">Severity Level</option>
          <option value="status">Status</option>
        </select>

        <button
          class="sort-order-btn"
          onclick={() => (sortOrder = sortOrder === "asc" ? "desc" : "asc")}
          title={sortOrder === "asc" ? "Sort Descending" : "Sort Ascending"}
        >
          {sortOrder === "asc" ? "⬆️" : "⬇️"}
        </button>
      </div>
    </div>

    <!-- Hazards List -->
    <div class="hazards-section">
      {#if sortedHazards.length > 0}
        <div class="hazards-grid">
          {#each sortedHazards as hazard}
            <div class="hazard-card">
              <div class="hazard-header">
                <h3>{hazard.title}</h3>
                <div class="hazard-badges">
                  <span class="status-badge {getStatusColor(hazard.status)}">
                    {hazard.status}
                  </span>
                  <span
                    class="severity-badge {getSeverityColor(
                      hazard.severity_level
                    )}"
                  >
                    Level {hazard.severity_level}
                  </span>
                </div>
              </div>

              <div class="hazard-info">
                <p class="hazard-description">{hazard.description}</p>

                <div class="hazard-meta">
                  <div class="meta-item">
                    <span class="meta-label">Reported:</span>
                    <span class="meta-value"
                      >{formatDate(hazard.created_at)}</span
                    >
                  </div>
                  {#if hazard.reported_active_date}
                    <div class="meta-item">
                      <span class="meta-label">Active Date:</span>
                      <span class="meta-value"
                        >{formatDate(hazard.reported_active_date)}</span
                      >
                    </div>
                  {/if}
                  <div class="meta-item">
                    <span class="meta-label">Location:</span>
                    <span class="meta-value"
                      >{parseFloat(hazard.latitude).toFixed(4)}, {parseFloat(
                        hazard.longitude
                      ).toFixed(4)}</span
                    >
                  </div>
                  {#if hazard.is_seasonal}
                    <div class="meta-item">
                      <span class="seasonal-badge">🗓️ Seasonal</span>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="hazard-actions">
                <a href="/hazards/{hazard.id}" class="btn btn-small btn-primary">
                  View Details
                </a>
                {#if hazard.status === "pending"}
                  <a href="/hazards/edit/{hazard.id}" class="btn btn-small btn-secondary">
                    Edit
                  </a>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else if selectedFilter === "all"}
        <div class="empty-state">
          <div class="empty-icon">📍</div>
          <h3>No Hazards Reported Yet</h3>
          <p>
            You haven't reported any hazards yet. Help keep the community safe
            by reporting outdoor hazards you encounter.
          </p>
          <a href="/hazards/create" class="btn btn-primary"
            >Report Your First Hazard</a
          >
        </div>
      {:else}
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No {selectedFilter} Reports</h3>
          <p>You don't have any {selectedFilter} hazard reports.</p>
          <button
            onclick={() => (selectedFilter = "all")}
            class="btn btn-secondary">View All Reports</button
          >
        </div>
      {/if}
    </div>

    <!-- Back to Dashboard -->
    <div class="navigation">
      <a href="/dashboard" class="btn btn-secondary"> ← Back to Dashboard </a>
    </div>
  </div>
</div>

<style>
  .my-reports-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
  }

  .header-content h1 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary);
    font-size: 2.5rem;
    font-weight: 700;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    margin: 0;
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: var(--color-bg-card);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stat-icon {
    font-size: 2rem;
    opacity: 0.8;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-primary);
    margin-bottom: 0.25rem;
  }

  .stat-label {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .filters,
  .sorting {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .filters label,
  .sorting label {
    font-weight: 600;
    color: #475569;
    font-size: 0.875rem;
  }

  .filter-select,
  .sort-select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    font-size: 0.875rem;
    color: #374151;
  }

  .sort-order-btn {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sort-order-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background-color: #2563eb;
  }

  .btn-secondary {
    background-color: #f1f5f9;
    color: #475569;
  }

  .btn-secondary:hover {
    background-color: #e2e8f0;
  }

  .btn-outline {
    background-color: transparent;
    color: #3b82f6;
    border: 1px solid #3b82f6;
  }

  .btn-outline:hover {
    background-color: #3b82f6;
    color: white;
  }

  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  .alert {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    font-weight: 500;
  }

  .alert-success {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #10b981;
  }

  .hazards-grid {
    display: grid;
    gap: 1.5rem;
  }

  .hazard-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .hazard-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .hazard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .hazard-header h3 {
    margin: 0;
    color: #1a365d;
    font-size: 1.1rem;
    font-weight: 600;
    flex: 1;
    margin-right: 1rem;
  }

  .hazard-badges {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .status-badge,
  .severity-badge,
  .seasonal-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.status-pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .status-badge.status-approved {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-badge.status-rejected {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .severity-badge.severity-low {
    background-color: #ecfdf5;
    color: #059669;
  }

  .severity-badge.severity-medium {
    background-color: #fef3c7;
    color: #d97706;
  }

  .severity-badge.severity-high {
    background-color: #fee2e2;
    color: #dc2626;
  }

  .hazard-info {
    margin-bottom: 1rem;
  }

  .category {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .category-icon {
    font-size: 1.2rem;
  }

  .category-name {
    font-weight: 600;
    color: #475569;
  }

  .hazard-description {
    color: #64748b;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .hazard-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .meta-item {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .meta-label {
    font-weight: 600;
    color: #475569;
  }

  .meta-value {
    color: #64748b;
  }

  .seasonal-badge {
    background-color: #e0e7ff;
    color: #3730a3;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .hazard-actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #64748b;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .empty-state h3 {
    margin: 0 0 1rem 0;
    color: #1a365d;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .empty-state p {
    margin-bottom: 2rem;
    line-height: 1.6;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .navigation {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e2e8f0;
  }

  @media (max-width: 768px) {
    .my-reports-container {
      padding: 1rem;
    }

    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .filters,
    .sorting {
      justify-content: space-between;
    }

    .hazard-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .hazard-badges {
      justify-content: flex-start;
    }

    .hazard-actions {
      flex-direction: column;
    }

    .stats-overview {
      grid-template-columns: repeat(2, 1fr);
    }

    .stat-card {
      flex-direction: column;
      text-align: center;
    }
  }
</style>
