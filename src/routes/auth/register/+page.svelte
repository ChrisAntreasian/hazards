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
  let password = $state("");
  let confirmPassword = $state("");
  let displayName = $state(
    form &&
      typeof form === "object" &&
      "displayName" in form &&
      typeof form.displayName === "string"
      ? form.displayName
      : ""
  );

  const authLinks = [
    {
      text: "Already have an account? Sign in",
      href: "/auth/log-in",
      highlight: true,
    },
  ];
</script>

<AuthFormWrapper
  title="🚨 Create Account"
  subtitle="Join the Hazards community to report and track outdoor hazards"
>
  {#snippet children()}
    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          loading = false;
          // Clear password fields for security on any result
          password = "";
          confirmPassword = "";
          await update();
        };
      }}
    >
      {#if form?.success}
        <MessageDisplay type="success" message={form.message} />
      {/if}

      {#if form?.error}
        <MessageDisplay type="error" message={form.error} />

        <!-- Show helpful link for duplicate email error -->
        {#if form.error.includes("already exists")}
          <div style="text-align: center; margin-top: 1rem;">
            <a href="/auth/log-in" class="sign-in-link">
              Already have an account? Sign in here
            </a>
          </div>
        {/if}
      {/if}

      <FormField
        label="Display Name"
        name="displayName"
        type="text"
        placeholder="How others will see you"
        required
        disabled={loading}
        bind:value={displayName}
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
        placeholder="At least 6 characters"
        required
        disabled={loading}
        bind:value={password}
        minlength={6}
      />

      <FormField
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        placeholder="Repeat your password"
        required
        disabled={loading}
        bind:value={confirmPassword}
        minlength={6}
      />

      <FormButton
        disabled={loading}
        {loading}
        loadingText="Creating Account..."
      >
        Create Account
      </FormButton>
    </form>

    <AuthLinks links={authLinks} />
  {/snippet}
</AuthFormWrapper>

<style>
  .sign-in-link {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border: 1px solid #2563eb;
    border-radius: 6px;
    display: inline-block;
    transition: all 0.2s;
  }

  .sign-in-link:hover {
    background: #2563eb;
    color: white;
  }
</style>
