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
  const recentActivity = data.recentActivity || [];

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
</script>

<svelte:head>
  <title>Dashboard - Hazards App</title>
</svelte:head>

<div class="dashboard-container">
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>
        🚨 Welcome back{user?.displayName ? `, ${user.displayName}` : ""}!
      </h1>
      <p class="subtitle">Manage your hazard reports and account settings</p>
    </header>

    <!-- Success Message -->
    {#if successMessage === "hazard-created"}
      <div class="alert alert-success">
        ✅ Hazard reported successfully! It will be reviewed before being
        published.
      </div>
    {/if}

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
      <div class="dashboard-card">
        <div class="card-icon">📍</div>
        <h3>Report New Hazard</h3>
        <p>Found a new outdoor hazard? Report it to help keep others safe.</p>
        <a href="/hazards/create" class="btn btn-primary">Report Hazard</a>
      </div>

      <div class="dashboard-card">
        <div class="card-icon">📊</div>
        <h3>My Reports</h3>
        <p>You have <strong>{hazardStats.total}</strong> hazard reports.</p>
        <div class="stats-breakdown">
          <span class="stat-item {hazardStats.pending > 0 ? 'pending' : ''}">
            {hazardStats.pending} pending
          </span>
          <span class="stat-item {hazardStats.approved > 0 ? 'approved' : ''}">
            {hazardStats.approved} approved
          </span>
          <span class="stat-item {hazardStats.rejected > 0 ? 'rejected' : ''}">
            {hazardStats.rejected} rejected
          </span>
        </div>
        <a href="/my-reports" class="btn btn-primary">View All Reports</a>
      </div>

      <div class="dashboard-card">
        <div class="card-icon">⭐</div>
        <h3>Trust Score</h3>
        <p>
          Your community trust score: <strong>{user?.trustScore || 0}</strong>
          {#if (user?.trustScore || 0) === 0}
            (New User)
          {:else if (user?.trustScore || 0) < 100}
            (Building Reputation)
          {:else if (user?.trustScore || 0) < 500}
            (Trusted Contributor)
          {:else}
            (Community Leader)
          {/if}
        </p>
        <a href="/profile" class="btn btn-secondary">View Profile</a>
      </div>

      <div class="dashboard-card">
        <div class="card-icon">🗺️</div>
        <h3>Interactive Map</h3>
        <p>
          View reported hazards on an interactive map and explore your area.
        </p>
        <a href="/map" class="btn btn-secondary">Explore Map</a>
      </div>

      <div class="dashboard-card">
        <div class="card-icon">📚</div>
        <h3>Learn About Hazards</h3>
        <p>Educational guides for identifying, preventing, and treating hazard encounters.</p>
        <a href="/learn" class="btn btn-primary">Browse Guides</a>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="recent-activity">
      <h2>Recent Activity</h2>
      <div class="activity-list">
        {#if recentActivity.length > 0}
          {#each recentActivity.slice(0, 5) as activity}
            <div class="activity-item">
              <div class="activity-icon">
                {#if activity.status === "approved"}
                  ✅
                {:else if activity.status === "removed"}
                  ❌
                {:else if activity.status === "pending"}
                  ⏳
                {:else}
                  📍
                {/if}
              </div>
              <div class="activity-content">
                <div class="activity-title">
                  {#if activity.status === "approved"}
                    Hazard report approved
                  {:else if activity.status === "removed"}
                    Hazard report rejected
                  {:else if activity.status === "pending"}
                    Hazard report submitted for review
                  {:else}
                    Hazard report created
                  {/if}
                </div>
                <div class="activity-description">
                  <strong
                    >{activity.hazards?.[0]?.title || "Unknown hazard"}</strong
                  >
                  {#if activity.moderator_notes}
                    - {activity.moderator_notes}
                  {/if}
                </div>
                <div class="activity-time">
                  {activity.resolved_at
                    ? formatDate(activity.resolved_at)
                    : formatDate(activity.created_at)}
                </div>
              </div>
              <div class="activity-status">
                <span
                  class="status-badge {activity.status === 'approved'
                    ? 'status-approved'
                    : activity.status === 'rejected'
                      ? 'status-rejected'
                      : 'status-pending'}"
                >
                  {activity.status}
                </span>
              </div>
            </div>
          {/each}
        {:else if userHazards.length > 0}
          {#each userHazards.slice(0, 5) as hazard}
            <div class="activity-item">
              <div class="activity-icon">
                {#if hazard.status === "approved"}
                  ✅
                {:else if hazard.status === "rejected"}
                  ❌
                {:else if hazard.status === "pending"}
                  ⏳
                {:else}
                  📍
                {/if}
              </div>
              <div class="activity-content">
                <div class="activity-title">
                  {#if hazard.status === "approved"}
                    Hazard report approved
                  {:else if hazard.status === "rejected"}
                    Hazard report needs revision
                  {:else if hazard.status === "pending"}
                    Hazard report submitted for review
                  {:else}
                    Hazard report created
                  {/if}
                </div>
                <div class="activity-description">
                  <strong>{hazard.title}</strong>
                </div>
                <div class="activity-time">{formatDate(hazard.created_at)}</div>
              </div>
              <div class="activity-status">
                <span class="status-badge {getStatusColor(hazard.status)}">
                  {hazard.status}
                </span>
              </div>
            </div>
          {/each}
        {:else}
          <div class="activity-item">
            <div class="activity-icon">🎯</div>
            <div class="activity-content">
              <div class="activity-title">Welcome to Hazards App!</div>
              <div class="activity-description">
                Start by reporting your first outdoor hazard to help keep the
                community safe.
              </div>
              <div class="activity-time">Get started today</div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <h2>Quick Stats</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-number">{hazardStats.total}</span>
          <span class="stat-label">Reports Submitted</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{hazardStats.approved}</span>
          <span class="stat-label">Approved Reports</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{hazardStats.pending}</span>
          <span class="stat-label">Pending Review</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">
            {user?.createdAt ? formatDate(user.createdAt) : "N/A"}
          </span>
          <span class="stat-label">Member Since</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .dashboard-header h1 {
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

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .dashboard-card {
    background: var(--color-bg-card);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .dashboard-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .card-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    display: block;
  }

  .dashboard-card h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .dashboard-card p {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.5;
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

  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  /* Success Alert */
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

  /* Stats Breakdown */
  .stats-breakdown {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }

  .stats-breakdown .stat-item {
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    background-color: #f8fafc;
    color: #64748b;
  }

  .stats-breakdown .stat-item.pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .stats-breakdown .stat-item.approved {
    background-color: #d1fae5;
    color: #065f46;
  }

  .stats-breakdown .stat-item.rejected {
    background-color: #fee2e2;
    color: #991b1b;
  }

  /* Status badges for activity */
  .status-badge {
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

  .quick-stats {
    margin-top: 3rem;
  }

  .quick-stats h2 {
    margin-bottom: 1.5rem;
    color: #1a365d;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
  }

  .stat-item {
    text-align: center;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
  }

  .stat-number {
    display: block;
    font-size: 2rem;
    font-weight: 700;
    color: #3b82f6;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
  }

  /* Recent Activity */
  .recent-activity {
    margin: 3rem 0;
  }

  .recent-activity h2 {
    margin-bottom: 1.5rem;
    color: #1a365d;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .activity-list {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.2s;
  }

  .activity-item:last-child {
    border-bottom: none;
  }

  .activity-item:hover {
    background-color: #f8fafc;
  }

  .activity-icon {
    font-size: 1.5rem;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f1f5f9;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;
  }

  .activity-title {
    font-weight: 600;
    color: #1a365d;
    margin-bottom: 0.25rem;
  }

  .activity-description {
    color: #64748b;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .activity-time {
    color: #94a3b8;
    font-size: 0.75rem;
  }

  .activity-status {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .dashboard-container {
      padding: 1rem;
    }

    .stats-breakdown {
      justify-content: flex-start;
    }

    .activity-item {
      padding: 1rem;
      gap: 0.75rem;
    }

    .activity-icon {
      width: 2rem;
      height: 2rem;
      font-size: 1.25rem;
    }
  }
</style>
