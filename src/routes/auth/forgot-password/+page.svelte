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
</script>

<AuthFormWrapper
  title="Reset Your Password"
  subtitle="Enter your email address and we'll send you a link to reset your password"
>
  {#snippet children()}
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
