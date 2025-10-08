<script lang="ts">
  import { enhance } from "$app/forms";
  import { user, isAuthenticated } from "$lib/stores/auth.js";
  import { FormField, FormButton, MessageDisplay } from "$lib/components/auth";
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

  // Form fields initialized from server data
  let displayName = $state(data.user?.displayName || "");
  let email = $state(data.user?.email || "");

  // Only update form fields when new server data comes in after a successful update
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

        <!-- Success/Error Messages using our standardized component -->
        {#if form?.success && form?.message}
          <MessageDisplay type="success" message={form.message} />
        {/if}

        {#if form?.error}
          <MessageDisplay type="error" message={form.error} />
        {/if}

        <form method="POST" action="?/updateProfile" use:enhance={handleSubmit}>
          <!-- Email field (read-only) -->
          <FormField
            label="Email Address"
            name="email"
            type="email"
            bind:value={email}
            disabled={true}
          />
          <small class="field-note"
            >Email cannot be changed. Contact support if needed.</small
          >

          <!-- Display Name field -->
          <FormField
            label="Display Name"
            name="displayName"
            type="text"
            placeholder="How others will see you"
            required
            disabled={updating}
            bind:value={displayName}
          />

          <!-- Submit button using our standardized component -->
          <FormButton
            disabled={updating}
            loading={updating}
            loadingText="Updating Profile..."
          >
            Update Profile
          </FormButton>
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
            <span class="stat-label">Account Role</span>
            <span class="stat-value role-{profileUser?.role || 'user'}">
              {#if profileUser?.role === "admin"}
                👑 Administrator
              {:else if profileUser?.role === "moderator"}
                ⚖️ Moderator
              {:else}
                👤 User
              {/if}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Trust Score</span>
            <span class="stat-value">
              {profileUser?.trustScore || 0}
              <small>
                {#if (profileUser?.trustScore || 0) >= 500}
                  (Trusted)
                {:else if (profileUser?.trustScore || 0) >= 100}
                  (Active)
                {:else}
                  (New User)
                {/if}
              </small>
            </span>
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

  .field-note {
    color: #6b7280;
    font-size: 0.875rem;
    margin-top: -1rem;
    margin-bottom: 1rem;
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

  .btn-secondary:hover {
    background: #f1f5f9;
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

  .role-admin {
    color: #dc2626;
    font-weight: 700;
  }

  .role-moderator {
    color: #d97706;
    font-weight: 700;
  }

  .role-user {
    color: #1e293b;
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
