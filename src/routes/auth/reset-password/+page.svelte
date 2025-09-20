<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import {
    AuthFormWrapper,
    FormField,
    FormButton,
    MessageDisplay,
    AuthLinks,
  } from "$lib/components/auth";
  import type { PageData, ActionData } from "./$types";

  interface Props {
    data: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  let loading = $state(false);
  let newPassword = $state("");
  let confirmPassword = $state("");

  const authLinks = [
    { text: "Remember your password? Sign in", href: "/auth/log-in" },
    { text: "Request new reset link", href: "/auth/forgot-password" },
  ];

  // Handle session expiration
  $effect(() => {
    if (form?.sessionExpired) {
      setTimeout(() => {
        goto(
          "/auth/forgot-password?message=Session expired. Please request a new password reset link."
        );
      }, 3000);
    }
  });
</script>

<AuthFormWrapper
  title="Set New Password"
  subtitle="Choose a strong password for your account"
>
  {#snippet children()}
    {#if data.error}
      <MessageDisplay type="error" message={data.error} />
      <div class="mt-4 text-center">
        <p class="text-sm text-gray-600 mb-4">
          If your session has expired, you'll need to request a new password
          reset link.
        </p>
      </div>
    {:else if data.user}
      <div class="mb-4">
        <MessageDisplay
          type="info"
          message="Resetting password for: {data.user.email}"
        />
      </div>

      <form
        method="POST"
        use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            loading = false;
            await update();
          };
        }}
      >
        {#if form?.error}
          <MessageDisplay type="error" message={form.error} />
          {#if form?.sessionExpired}
            <div class="mt-2 text-center">
              <p class="text-sm text-gray-600">
                Redirecting to request a new reset link...
              </p>
            </div>
          {/if}
        {/if}

        <FormField
          label="New Password"
          name="newPassword"
          type="password"
          placeholder="Enter new password"
          required
          disabled={loading}
          bind:value={newPassword}
          minlength={6}
        />

        <FormField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          required
          disabled={loading}
          bind:value={confirmPassword}
          minlength={6}
        />

        <FormButton
          disabled={loading}
          {loading}
          loadingText="Updating Password..."
        >
          Update Password
        </FormButton>
      </form>
    {:else}
      <MessageDisplay
        type="error"
        message="No user session found. Please use the password reset link from your email."
      />
    {/if}

    <AuthLinks links={authLinks} />
  {/snippet}
</AuthFormWrapper>
