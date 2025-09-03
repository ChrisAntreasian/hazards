<script lang="ts">
  import { enhance } from "$app/forms";
  import { user, isAuthenticated } from "$lib/stores/auth.js";
  import type { ProfilePageData, ProfileActionData } from "./types";

  interface Props {
    data: ProfilePageData;
    form?: ProfileActionData | null;
  }

  let { data, form = null }: Props = $props();

  let updating = $state(false);

  // Use server-provided data with Svelte 5 derived
  let profileUser = $derived(data.user);
  let regions = $derived(data.regions);

  // Form fields initialized from server data - initialize with server data
  let displayName = $state(data.user?.displayName || "");
  let email = $state(data.user?.email || "");

  // Only update form fields when new server data comes in after a successful update
  // This prevents interference with user input
  let lastKnownDisplayName = $state(data.user?.displayName || "");
  
  $effect(() => {
    // Only update if we receive new server data (e.g., after successful form submission)
    if (profileUser && profileUser.displayName !== lastKnownDisplayName) {
      displayName = profileUser.displayName || "";
      lastKnownDisplayName = profileUser.displayName || "";
    }
  });

  // Handle form submission with progressive enhancement
  const handleSubmit = () => {
    updating = true;
    return async ({
      result,
      update,
    }: {
      result: any;
      update: () => Promise<void>;
    }) => {
      updating = false;

      if (result.type === "success") {
        // Update display name from server response if available
        if (result.data?.user?.displayName) {
          displayName = result.data.user.displayName;
        }
      }

      await update();
    };
  };
</script>

<svelte:head>
  <title>Profile - Hazards App</title>
</svelte:head>

<div class="profile-container">
  <div class="profile">
    <header class="profile-header">
      <h1>👤 Your Profile</h1>
      <p class="subtitle">Manage your account information and preferences</p>
    </header>

    <div class="profile-grid">
      <div class="profile-card">
        <h2>Account Information</h2>

        {#if form?.success}
          <div class="message success">
            {form.message}
          </div>
        {/if}

        {#if form?.error}
          <div class="message error">
            {form.error}
          </div>
        {/if}

        <form method="POST" action="?/updateProfile" use:enhance={handleSubmit}>
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              disabled
              readonly
            />
            <small>Email cannot be changed. Contact support if needed.</small>
          </div>

          <div class="form-group">
            <label for="displayName">Display Name</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              bind:value={displayName}
              placeholder="How others will see you"
              disabled={updating}
              required
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
            <span class="stat-value">
              {profileUser
                ? new Date(profileUser.createdAt).toLocaleDateString()
                : "Unknown"}
            </span>
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
          <a href="/dashboard" class="btn btn-secondary">← Back to Dashboard</a>
          <a href="/auth/change-password" class="btn btn-secondary"
            >Change Password</a
          >
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .profile-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
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
