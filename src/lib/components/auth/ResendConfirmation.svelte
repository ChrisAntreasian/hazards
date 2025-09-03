<script lang="ts">
  import { FormButton, MessageDisplay } from "$lib/components/auth";

  interface Props {
    email: string;
    visible?: boolean;
  }

  let { email, visible = false }: Props = $props();

  let loading = $state(false);
  let message = $state("");

  async function resendConfirmation() {
    if (!email) {
      message = "Please enter your email address first";
      return;
    }

    loading = true;
    message = "";

    try {
      // Use fetch to call our server-side resend endpoint
      const response = await fetch("/auth/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        message = `Error: ${result.error || "Failed to resend"}`;
      } else {
        message = "Confirmation email sent! Check your inbox.";
      }
    } catch (e: any) {
      message = "Failed to resend confirmation email";
    } finally {
      loading = false;
    }
  }
</script>

{#if visible}
  <div class="resend-section">
    <p class="resend-text">Didn't receive the confirmation email?</p>

    {#if message}
      <MessageDisplay
        type={message.startsWith("Error") ? "error" : "success"}
        {message}
      />
    {/if}

    <FormButton
      type="button"
      variant="secondary"
      disabled={loading || !email}
      {loading}
      loadingText="Sending..."
      onclick={resendConfirmation}
    >
      Resend Confirmation Email
    </FormButton>
  </div>
{/if}

<style>
  .resend-section {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .resend-text {
    color: #0369a1;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }
</style>
