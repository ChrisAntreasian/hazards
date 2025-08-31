<script lang="ts">
  import {
    createSupabaseLoadClient,
    isSupabaseConfigured,
  } from "$lib/supabase.js";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let currentPassword = "";
  let newPassword = "";
  let confirmPassword = "";
  let loading = false;
  let error = "";
  let success = "";
  let user: any = null;

  const supabase = createSupabaseLoadClient();
  const configured = isSupabaseConfigured();

  onMount(async () => {
    if (!supabase) return;

    // Check if user is authenticated
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      goto("/auth/log-in?returnUrl=/auth/change-password");
      return;
    }
    user = currentUser;
  });

  async function handlePasswordChange() {
    if (!supabase) {
      error =
        "Supabase not configured. Please check your environment variables.";
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      error = "Please fill in all fields";
      return;
    }

    if (newPassword !== confirmPassword) {
      error = "New passwords do not match";
      return;
    }

    if (newPassword.length < 6) {
      error = "New password must be at least 6 characters long";
      return;
    }

    if (currentPassword === newPassword) {
      error = "New password must be different from current password";
      return;
    }

    loading = true;
    error = "";
    success = "";

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        error = "Current password is incorrect";
        loading = false;
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        error = updateError.message;
      } else {
        success = "Password changed successfully!";

        // Clear form
        currentPassword = "";
        newPassword = "";
        confirmPassword = "";

        // Redirect after a delay
        setTimeout(() => {
          goto("/profile");
        }, 2000);
      }
    } catch (e) {
      error = "An unexpected error occurred";
      console.error("Password change error:", e);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Change Password - Hazards App</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <h1>Change Password</h1>
    <p class="subtitle">Update your account password</p>

    {#if !configured}
      <div class="warning">
        <h3>⚠️ Supabase Not Configured</h3>
        <p>
          Password change is not available. Please contact support for
          assistance.
        </p>
      </div>
    {:else if !user}
      <div class="loading">
        <p>Loading...</p>
      </div>
    {:else}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          handlePasswordChange();
        }}
      >
        {#if success}
          <div class="success">{success}</div>
        {/if}

        {#if error}
          <div class="error">{error}</div>
        {/if}

        <div class="form-group">
          <label for="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            bind:value={currentPassword}
            placeholder="Enter current password"
            required
            disabled={loading || !!success}
          />
        </div>

        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            bind:value={newPassword}
            placeholder="Enter new password"
            required
            disabled={loading || !!success}
            minlength="6"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Confirm new password"
            required
            disabled={loading || !!success}
            minlength="6"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary"
          disabled={loading || !!success}
        >
          {success
            ? "✅ Password Changed!"
            : loading
              ? "Changing..."
              : "Change Password"}
        </button>
      </form>

      <div class="auth-links">
        <p><a href="/profile">← Back to Profile</a></p>
        <p><a href="/auth/forgot-password">Forgot your current password?</a></p>
      </div>
    {/if}

    <div class="back-link">
      <a href="/">← Back to Home</a>
    </div>
  </div>
</div>

<style>
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
    color: #64748b;
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

  .error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .auth-links {
    text-align: center;
    margin-top: 1.5rem;
  }

  .auth-links p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    color: #64748b;
  }

  .auth-links a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-links a:hover {
    text-decoration: underline;
  }

  .back-link {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .back-link a {
    color: #64748b;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back-link a:hover {
    color: #2563eb;
  }
</style>
