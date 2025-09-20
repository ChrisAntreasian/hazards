<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    MessageDisplay,
    FormField,
    FormButton,
    AuthFormWrapper,
  } from "$lib/components/auth";
  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let loading = $state(false);
  let clientError = $state("");

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

  // Clear client error when user starts typing
  $effect(() => {
    if (currentPassword || newPassword || confirmPassword) {
      clientError = "";
    }
  });
</script>

<svelte:head>
  <title>Change Password - Hazards App</title>
</svelte:head>

<AuthFormWrapper
  title="🔐 Change Password"
  subtitle="Update your account password"
>
  <!-- Display server success message -->
  {#if form?.success}
    <MessageDisplay
      type="success"
      message={form.message || "Password updated successfully!"}
    />
  {/if}

  <!-- Display server error message -->
  {#if form?.error}
    <MessageDisplay type="error" message={form.error} />
  {/if}

  <!-- Display client-side validation error -->
  {#if clientError}
    <MessageDisplay
      type="error"
      message={clientError}
      dismissible
      onDismiss={() => (clientError = "")}
    />
  {/if}

  <form
    method="post"
    use:enhance={({ formData, cancel }) => {
      const error = validateForm();
      if (error) {
        clientError = error;
        cancel();
        return;
      }
      loading = true;
      return async ({ result, update }) => {
        loading = false;
        if (result.type === "success") {
          // Clear form on success
          currentPassword = "";
          newPassword = "";
          confirmPassword = "";
        }
        // This is crucial - update() populates the form data with server response
        await update();
      };
    }}
  >
    <FormField
      name="currentPassword"
      type="password"
      label="Current Password"
      placeholder="Enter your current password"
      bind:value={currentPassword}
      required
      disabled={loading}
    />

    <FormField
      name="newPassword"
      type="password"
      label="New Password"
      placeholder="Enter your new password"
      bind:value={newPassword}
      required
      disabled={loading}
      minlength={6}
    />

    <FormField
      name="confirmPassword"
      type="password"
      label="Confirm New Password"
      placeholder="Confirm your new password"
      bind:value={confirmPassword}
      required
      disabled={loading}
    />

    <FormButton type="submit" {loading} disabled={loading}>
      {loading ? "Updating Password..." : "Update Password"}
    </FormButton>
  </form>

  <div class="auth-footer">
    <p><a href="/profile">← Back to Profile</a></p>
    <p><a href="/dashboard">← Back to Dashboard</a></p>
  </div>
</AuthFormWrapper>

<style>
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
</style>
