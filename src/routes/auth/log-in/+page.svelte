<script lang="ts">
  import { page } from "$app/stores";
  import { enhance } from "$app/forms";
  import {
    AuthFormWrapper,
    FormField,
    FormButton,
    MessageDisplay,
    AuthLinks,
    ResendConfirmation,
  } from "$lib/components/auth";
  import type { PageData, ActionData } from "./$types";

  interface Props {
    data: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  let email = $state(
    form &&
      typeof form === "object" &&
      "email" in form &&
      typeof form.email === "string"
      ? form.email
      : ""
  );
  let password = $state("");
  let loading = $state(false);

  // Check if error is related to email confirmation
  const isConfirmationError = $derived(
    form?.error &&
      (form.error.includes("confirm") ||
        form.error.includes("Email not confirmed"))
  );

  const authLinks = [
    { text: "Don't have an account? Sign up", href: "/auth/register" },
    { text: "Forgot your password?", href: "/auth/forgot-password" },
  ];
</script>

<AuthFormWrapper
  title="Welcome Back"
  subtitle="Sign in to your Hazards account"
>
  {#snippet children()}
    <!-- Success message from URL params (e.g., after password reset) -->
    {#if data.message}
      <MessageDisplay type="success" message={data.message} />
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          // Clear password for security but preserve email
          password = "";
          await update();
        };
      }}
    >
      {#if form?.error}
        <MessageDisplay type="error" message={form.error} />

        <!-- Show resend confirmation if it's an email confirmation error -->
        <ResendConfirmation {email} visible={!!isConfirmationError} />
      {/if}

      <!-- Hidden field for return URL -->
      <input
        type="hidden"
        name="returnUrl"
        value={$page.url.searchParams.get("returnUrl") || "/dashboard"}
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        placeholder="your@email.com"
        required
        disabled={loading}
        bind:value={email}
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        placeholder="Your password"
        required
        disabled={loading}
        bind:value={password}
      />

      <FormButton disabled={loading} {loading} loadingText="Signing in...">
        Sign In
      </FormButton>
    </form>

    <AuthLinks links={authLinks} />
  {/snippet}
</AuthFormWrapper>
