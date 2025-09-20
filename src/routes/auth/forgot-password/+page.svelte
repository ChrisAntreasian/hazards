<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";
  import {
    AuthFormWrapper,
    FormField,
    FormButton,
    MessageDisplay,
    AuthLinks,
  } from "$lib/components/auth";
  import type { PageData, ActionData } from "./$types";

  interface Props {
    data?: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  let loading = $state(false);
  let email = $state(
    form &&
      typeof form === "object" &&
      "email" in form &&
      typeof form.email === "string"
      ? form.email
      : ""
  );

  const authLinks = [
    { text: "Remember your password? Sign in", href: "/auth/log-in" },
    { text: "Don't have an account? Sign up", href: "/auth/register" },
  ];

  // Get message from URL params (for redirects from expired sessions)
  const urlMessage = $derived($page.url.searchParams.get("message"));
</script>

<AuthFormWrapper
  title="Reset Your Password"
  subtitle="Enter your email address and we'll send you a link to reset your password"
>
  {#snippet children()}
    {#if urlMessage}
      <MessageDisplay type="warning" message={urlMessage} />
    {/if}

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
      {#if form?.success}
        <MessageDisplay type="success" message={form.message} />
        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 class="font-medium text-blue-900 mb-2">Next Steps:</h4>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>Check your email inbox for a password reset link</li>

            <li>The link will expire in 1 hour</li>
          </ul>
        </div>
      {/if}

      {#if form?.error}
        <MessageDisplay type="error" message={form.error} />
      {/if}

      <FormField
        label="Email Address"
        name="email"
        type="email"
        placeholder="your@email.com"
        required
        disabled={loading}
        bind:value={email}
      />

      <FormButton disabled={loading} {loading} loadingText="Sending...">
        Send Reset Link
      </FormButton>
    </form>

    <AuthLinks links={authLinks} />
  {/snippet}
</AuthFormWrapper>
