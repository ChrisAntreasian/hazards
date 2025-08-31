<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { createSupabaseLoadClient } from "$lib/supabase.js";
  import { useAuth, useRouteGuard } from "$lib/hooks/useAuth.js";
  import { user, session, loading, initialized } from "$lib/stores/auth.js";

  let { data } = $props();
  let currentUser = $state<any>(null);
  let pageLoading = $state(true);
  let updating = $state(false);
  let message = $state("");

  // Form fields
  let displayName = $state("");
  let email = $state("");

  const supabase = createSupabaseLoadClient();

  // Initialize auth from server data if available
  $effect(() => {
    if (data.session && data.user && !$initialized) {
      const auth = useAuth();
      auth.refreshAuth();
    }
  });

  // Route protection
  const { checkAccess } = useRouteGuard({ requireAuth: true });

  onMount(async () => {
    // Wait for auth to be initialized
    if (!$initialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check access after auth is ready
    if ($initialized && !checkAccess($user, $session)) {
      return;
    }

    // Load user data if we have a session
    if ($session && $user) {
      currentUser = $user;
      displayName = currentUser.user_metadata?.display_name || "";
      email = currentUser.email || "";
    }

    pageLoading = false;
  });

  // Reactive user data loading
  $effect(() => {
    if ($user && !currentUser) {
      currentUser = $user;
      displayName = currentUser.user_metadata?.display_name || "";
      email = currentUser.email || "";
    }
  });

  async function updateProfile(event: Event) {
    event.preventDefault();
    if (!supabase || !currentUser) return;

    updating = true;
    message = "";

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
        },
      });

      if (error) {
        message = `Error: ${error.message}`;
      } else {
        message = "Profile updated successfully!";
        // Refresh user data
        const {
          data: { user: userData },
        } = await supabase.auth.getUser();
        currentUser = userData;
      }
    } catch (e: any) {
      message = `Error: ${e.message}`;
    } finally {
      updating = false;
    }
  }
</script>

<svelte:head>
  <title>Profile - Hazards App</title>
</svelte:head>

<div class="profile-container">
  {#if pageLoading || $loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading your profile...</p>
    </div>
  {:else if !$session && !currentUser}
    <div class="error">
      <h2>Authentication Required</h2>
      <p>Please <a href="/auth/log-in">sign in</a> to access your profile.</p>
    </div>
  {:else}
    <div class="profile">
      <header class="profile-header">
        <h1>👤 Your Profile</h1>
        <p class="subtitle">Manage your account information and preferences</p>
      </header>

      <div class="profile-grid">
        <div class="profile-card">
          <h2>Account Information</h2>

          {#if message}
            <div
              class="message {message.startsWith('Error')
                ? 'error'
                : 'success'}"
            >
              {message}
            </div>
          {/if}

          <form onsubmit={updateProfile}>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                id="email"
                type="email"
                bind:value={email}
                disabled
                readonly
              />
              <small>Email cannot be changed. Contact support if needed.</small>
            </div>

            <div class="form-group">
              <label for="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                bind:value={displayName}
                placeholder="How others will see you"
                disabled={updating}
              />
            </div>

            <button type="submit" class="btn btn-primary" disabled={updating}>
              {updating ? "Updating..." : "Update Profile"}
            </button>
          </form>
        </div>

        <div class="profile-card">
          <h2>Account Stats</h2>
          <div class="stats">
            <div class="stat-item">
              <span class="stat-label">Member Since</span>
              <span class="stat-value"
                >{currentUser
                  ? new Date(currentUser.created_at).toLocaleDateString()
                  : "Unknown"}</span
              >
            </div>
            <div class="stat-item">
              <span class="stat-label">Trust Score</span>
              <span class="stat-value">100 <small>(New User)</small></span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Reports Submitted</span>
              <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Helpful Votes Received</span>
              <span class="stat-value">0</span>
            </div>
          </div>
        </div>

        <div class="profile-card">
          <h2>Account Actions</h2>
          <div class="actions">
            <a href="/dashboard" class="btn btn-secondary"
              >← Back to Dashboard</a
            >
            <a href="/auth/change-password" class="btn btn-secondary"
              >Change Password</a
            >
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .profile-container {
    max-width: 1000px;
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

  .profile-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .profile-header h1 {
    color: #1e293b;
    margin-bottom: 0.5rem;
    font-size: 2rem;
  }

  .subtitle {
    color: #64748b;
    font-size: 1.1rem;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .profile-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .profile-card h2 {
    color: #1e293b;
    margin-bottom: 1.5rem;
    font-size: 1.25rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  input:disabled {
    background-color: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }

  small {
    color: #6b7280;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
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

  .message {
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .message.success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
  }

  .message.error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #dc2626;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .stat-item:last-child {
    border-bottom: none;
  }

  .stat-label {
    color: #64748b;
    font-weight: 500;
  }

  .stat-value {
    color: #1e293b;
    font-weight: 600;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .profile-container {
      padding: 1rem;
    }

    .profile-header h1 {
      font-size: 1.5rem;
    }

    .profile-grid {
      grid-template-columns: 1fr;
    }

    .actions {
      flex-direction: column;
    }

    .btn {
      margin-right: 0;
      margin-bottom: 0.5rem;
    }
  }
</style>
