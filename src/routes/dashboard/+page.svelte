<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getCurrentUser } from "$lib/supabase.js";
  import { useAuth, useRouteGuard } from "$lib/hooks/useAuth.js";
  import { user, session, loading, initialized, authStore } from "$lib/stores/auth.js";

  let { data } = $props();
  let currentUser = $state<any>(null);
  let pageLoading = $state(true);
  let authCheckComplete = $state(false);

  // Initialize auth from server data if available
  $effect(() => {
    if (data.session || data.user) {
      authStore.initialize(data.user, data.session);
    }
  });

  // Wait for auth initialization and check access
  $effect(() => {
    const checkAuth = async () => {
      // Use server data immediately if available
      if (data.session && data.user) {
        currentUser = data.user;
        authCheckComplete = true;
        pageLoading = false;
        return;
      }

      // Wait for client-side auth initialization
      if (!$initialized) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Try to refresh auth if still not initialized
      if (!$initialized) {
        const auth = useAuth();
        await auth.refreshAuth();
      }

      // Redirect if no authentication after all attempts
      if ($initialized && !$session) {
        const returnUrl = encodeURIComponent(window.location.pathname);
        goto(`/auth/log-in?returnUrl=${returnUrl}`);
        return;
      }

      // Set user data if session exists
      if ($session && $user) {
        currentUser = $user;
      }

      authCheckComplete = true;
      pageLoading = false;
    };

    checkAuth();
  });

  // Reactive user data sync - update currentUser when global user state changes
  $effect(() => {
    if ($user && $session) {
      currentUser = $user;
    }
  });
</script>

<svelte:head>
  <title>Dashboard - Hazards App</title>
</svelte:head>

<div class="dashboard-container">
  {#if pageLoading || $loading || !authCheckComplete}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading your dashboard...</p>
    </div>
  {:else if !$session && !currentUser}
    <div class="error">
      <h2>Authentication Required</h2>
      <p>Please <a href="/auth/log-in">sign in</a> to access your dashboard.</p>
    </div>
  {:else}
    <div class="dashboard">
      <header class="dashboard-header">
        <h1>
          🚨 Welcome back{currentUser?.user_metadata?.display_name
            ? `, ${currentUser.user_metadata.display_name}`
            : ""}!
        </h1>
        <p class="subtitle">Manage your hazard reports and account settings</p>
      </header>

      <div class="dashboard-grid">
        <div class="dashboard-card">
          <div class="card-icon">📍</div>
          <h3>Report New Hazard</h3>
          <p>Found a new outdoor hazard? Report it to help keep others safe.</p>
          <a href="/map" class="btn btn-primary">Report Hazard</a>
        </div>

        <div class="dashboard-card">
          <div class="card-icon">📊</div>
          <h3>My Reports</h3>
          <p>View and manage hazards you've reported.</p>
          <a href="/my-reports" class="btn btn-secondary">View Reports</a>
        </div>

        <div class="dashboard-card">
          <div class="card-icon">⭐</div>
          <h3>Trust Score</h3>
          <p>Your community trust score: <strong>100</strong> (New User)</p>
          <a href="/profile" class="btn btn-secondary">View Profile</a>
        </div>

        <div class="dashboard-card">
          <div class="card-icon">🎓</div>
          <h3>Safety Education</h3>
          <p>Learn about outdoor hazards and safety best practices.</p>
          <a href="/education" class="btn btn-secondary">Learn More</a>
        </div>
      </div>

      <div class="recent-activity">
        <h2>Recent Activity</h2>
        <div class="activity-card">
          <p class="no-activity">
            No recent activity. Start by reporting your first hazard!
          </p>
        </div>
      </div>

      <div class="quick-stats">
        <h2>Quick Stats</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">0</span>
            <span class="stat-label">Reports Submitted</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">0</span>
            <span class="stat-label">Helpful Votes</span>
          </div>
          <div class="stat-item">
            <span class="stat-number"
              >{new Date(currentUser?.created_at).toLocaleDateString()}</span
            >
            <span class="stat-label">Member Since</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #64748b;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .error {
    text-align: center;
    padding: 2rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    color: #dc2626;
  }

  .error a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .dashboard-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .dashboard-header h1 {
    color: #1e293b;
    margin-bottom: 0.5rem;
    font-size: 2rem;
  }

  .subtitle {
    color: #64748b;
    font-size: 1.1rem;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .dashboard-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .dashboard-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .card-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  .dashboard-card h3 {
    color: #1e293b;
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
  }

  .dashboard-card p {
    color: #64748b;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-secondary {
    background: #f8fafc;
    color: #374151;
    border: 1px solid #e5e7eb;
  }

  .btn-secondary:hover {
    background: #f1f5f9;
  }

  .recent-activity {
    margin-bottom: 3rem;
  }

  .recent-activity h2 {
    color: #1e293b;
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .activity-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
  }

  .no-activity {
    color: #64748b;
    font-style: italic;
  }

  .quick-stats h2 {
    color: #1e293b;
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-item {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-number {
    display: block;
    font-size: 2rem;
    font-weight: bold;
    color: #2563eb;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    color: #64748b;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  @media (max-width: 768px) {
    .dashboard-container {
      padding: 1rem;
    }

    .dashboard-header h1 {
      font-size: 1.5rem;
    }

    .dashboard-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
