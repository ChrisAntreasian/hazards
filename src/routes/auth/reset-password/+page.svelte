<script lang="ts">
  import { enhance } from "$app/forms";
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
  ];
</script>

<AuthFormWrapper
  title="Set New Password"
  subtitle="Choose a strong password for your account"
>
  {#snippet children()}
    {#if data.error}
      <MessageDisplay type="error" message={data.error} />
    {:else}
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

      <AuthLinks links={authLinks} />
    {/if}
  {/snippet}
</AuthFormWrapper>
