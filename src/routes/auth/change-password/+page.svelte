<script lang="ts">
  import { enhance } from "$app/forms";
  import { user, isAuthenticated, initialized } from "$lib/stores/auth.js";
  import { isSupabaseConfigured } from "$lib/supabase.js";

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let loading = $state(false);

  const configured = isSupabaseConfigured();

  // Only redirect after auth has been fully initialized
  $effect(() => {
    if ($initialized && !$isAuthenticated) {
      window.location.href = "/auth/log-in?returnUrl=/auth/change-password";
    }
  });

  // Client-side validation function
  function validateForm() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return "Please fill in all fields";
    }

    if (newPassword !== confirmPassword) {
      return "New passwords do not match";
    }

    if (newPassword.length < 6) {
      return "New password must be at least 6 characters long";
    }

    if (currentPassword === newPassword) {
      return "New password must be different from current password";
    }

    return null;
  }
</script>

<svelte:head>
  <title>Change Password - Hazards App</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <h1>🔐 Change Password</h1>
    <p class="subtitle">Update your account password</p>

    {#if !configured}
      <div class="warning">
        <h3>⚠️ Supabase Not Configured</h3>
        <p>To enable password changes, please configure Supabase.</p>
      </div>
    {:else if !$initialized}
      <div class="loading">
        <p>Loading...</p>
      </div>
    {:else if !$isAuthenticated}
      <div class="warning">
        <h3>⚠️ Not Authenticated</h3>
        <p>You must be logged in to change your password.</p>
        <a
          href="/auth/log-in?returnUrl=/auth/change-password"
          class="btn btn-primary">Sign In</a
        >
      </div>
    {:else}
      <form
        action="/auth?/changePassword"
        method="post"
        use:enhance={({ formData, cancel }) => {
          const error = validateForm();
          if (error) {
            alert(error);
            cancel();
            return;
          }
          loading = true;
          return async ({ result }) => {
            loading = false;
            if (result.type === "success") {
              // Clear form on success
              currentPassword = "";
              newPassword = "";
              confirmPassword = "";
            }
          };
        }}
      >
        <div class="form-group">
          <label for="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            bind:value={currentPassword}
            placeholder="Enter your current password"
            required
            disabled={loading}
          />
        </div>

        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            bind:value={newPassword}
            placeholder="Enter your new password"
            required
            disabled={loading}
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Confirm your new password"
            required
            disabled={loading}
          />
        </div>

        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? "Updating Password..." : "Update Password"}
        </button>
      </form>
    {/if}

    <div class="auth-footer">
      <p><a href="/profile">← Back to Profile</a></p>
      <p><a href="/dashboard">← Back to Dashboard</a></p>
    </div>
  </div>
</div>

<style>
  .warning {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .warning h3 {
    color: #92400e;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .warning p {
    color: #92400e;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem;
  }

  .auth-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 100%;
  }

  h1 {
    text-align: center;
    margin-bottom: 0.5rem;
    color: #1e293b;
    font-size: 1.75rem;
  }

  .subtitle {
    text-align: center;
    color: #64748b;
    margin-bottom: 2rem;
    font-size: 0.95rem;
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
  }

  .btn {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
    margin-bottom: 1rem;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .auth-footer {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .auth-footer p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
  }

  .auth-footer a {
    color: #64748b;
    text-decoration: none;
  }

  .auth-footer a:hover {
    color: #2563eb;
  }

  @media (max-width: 480px) {
    .auth-container {
      padding: 1rem;
    }

    .auth-card {
      padding: 1.5rem;
    }
  }
</style>
