<script lang="ts">
  import { goto } from "$app/navigation";
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";

  interface Props {
    data: any;
  }

  let { data }: Props = $props();
  let processing = $state(false);
  let clientError = $state("");

  // Helper function to process tokens once found
  async function processTokens(
    accessToken: string,
    refreshToken: string,
    tokenType?: string
  ) {
    // Determine if this is a recovery flow
    const isRecovery =
      tokenType === "recovery" ||
      data.isRecovery ||
      window.location.href.includes("recovery") ||
      document.referrer.includes("forgot-password");

    // Send tokens to server for processing
    const response = await fetch("/auth/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        type: isRecovery ? "recovery" : tokenType,
      }),
    });

    if (response.ok) {
      const result = await response.json();

      if (result.redirectTo) {
        goto(result.redirectTo);
      } else if (isRecovery) {
        goto("/auth/reset-password");
      } else {
        goto("/dashboard");
      }
    } else {
      const errorText = await response.text();
      console.error("Auth: Server processing failed:", response.status);
      throw new Error("Failed to process authentication");
    }
  }

  // Handle client-side URL fragment processing
  onMount(() => {
    if (data.needsClientProcessing) {
      handleClientSideAuth();
    }
  });

  async function handleClientSideAuth() {
    processing = true;

    try {
      // Extract tokens from URL hash or search params
      const fullUrl = window.location.href;
      const hash = window.location.hash.substring(1);
      const search = window.location.search;

      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);

      // Try hash first (Supabase default), then search params
      const accessToken =
        hashParams.get("access_token") || searchParams.get("access_token");
      const refreshToken =
        hashParams.get("refresh_token") || searchParams.get("refresh_token");
      const type = hashParams.get("type") || searchParams.get("type");
      const error = hashParams.get("error") || searchParams.get("error");

      if (error) {
        clientError = `Authentication failed: ${error}`;
        return;
      }

      // Try alternative token parsing if standard methods fail
      if (!accessToken && !refreshToken) {
        // Try regex extraction from full URL
        const fullTokenMatch = fullUrl.match(/access_token=([^&\s#]+)/);
        const fullRefreshMatch = fullUrl.match(/refresh_token=([^&\s#]+)/);

        if (fullTokenMatch && fullRefreshMatch) {
          return processTokens(
            fullTokenMatch[1],
            fullRefreshMatch[1],
            type || "recovery"
          );
        }

        // Try URL decoding
        try {
          const decodedHash = decodeURIComponent(hash);
          const decodedSearch = decodeURIComponent(search);
          const decodedHashParams = new URLSearchParams(decodedHash);
          const decodedSearchParams = new URLSearchParams(decodedSearch);

          const decodedAccessToken =
            decodedHashParams.get("access_token") ||
            decodedSearchParams.get("access_token");
          const decodedRefreshToken =
            decodedHashParams.get("refresh_token") ||
            decodedSearchParams.get("refresh_token");

          if (decodedAccessToken && decodedRefreshToken) {
            return processTokens(
              decodedAccessToken,
              decodedRefreshToken,
              type || "recovery"
            );
          }
        } catch (e) {
          // URL decoding failed, continue to error
        }
      }

      if (accessToken && refreshToken) {
        await processTokens(accessToken, refreshToken, type || undefined);
      } else {
        console.error("Auth: Missing authentication tokens");
        clientError = "Missing authentication tokens";
      }
    } catch (err) {
      console.error(
        "Auth: Client processing error:",
        err instanceof Error ? err.message : String(err)
      );
      clientError = `Authentication processing failed: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      processing = false;
    }
  }

  // Handle server-side redirect for successful confirmations
  $effect(() => {
    if (data.status === "success" && data.redirectTo) {
      setTimeout(async () => {
        // Force invalidation and fresh data load like logout does
        await invalidateAll();
        // Use window.location for reliable redirect with fresh state
        window.location.href = data.redirectTo;
      }, 2000);
    }
  });
</script>

<svelte:head>
  <title>Email Confirmation - Hazards App</title>
</svelte:head>

<div class="callback-container">
  <div class="callback-card">
    {#if clientError}
      <div class="error">
        <div class="error-icon">❌</div>
        <h1>Authentication Failed</h1>
        <p>{clientError}</p>
        <div class="error-details">
          <strong>What to try:</strong>
          <ul>
            <li>
              Make sure you clicked the most recent password reset link from
              your email
            </li>
            <li>Check if the link has expired (links expire after 1 hour)</li>
            <li>Try requesting a new password reset</li>
          </ul>
        </div>
        <div class="actions">
          <a href="/auth/forgot-password" class="btn btn-primary"
            >Request New Password Reset</a
          >
          <a href="/auth/log-in" class="btn btn-secondary">Go to Login</a>
        </div>
      </div>
    {:else if processing || data.needsClientProcessing}
      <div class="processing">
        <div class="spinner"></div>
        <h1>🔄 Processing authentication...</h1>
        <p>Please wait while we confirm your email address...</p>
      </div>
    {:else if data.status === "error"}
      <div class="error">
        <div class="error-icon">❌</div>
        <h1>Confirmation Failed</h1>
        <p>{data.message}</p>
        {#if data.error}
          <div class="error-details">
            <strong>Error:</strong>
            {data.error}
          </div>
        {/if}
        <div class="actions">
          <a href="/auth/log-in" class="btn btn-primary">Try Logging In</a>
          <a href="/auth/register" class="btn btn-secondary">Register Again</a>
          <a href="/" class="btn btn-secondary">Go Home</a>
        </div>
      </div>
    {:else if data.status === "success"}
      <div class="success">
        <div class="checkmark">✅</div>
        <h1>Email Confirmed!</h1>
        <p>{data.message}</p>
        {#if data.redirectTo}
          <p class="redirect-notice">Redirecting to your dashboard...</p>
          <a href={data.redirectTo} class="btn btn-primary"
            >Go to Dashboard Now</a
          >
        {/if}
      </div>
    {:else}
      <!-- Fallback processing state -->
      <div class="processing">
        <div class="spinner"></div>
        <h1>🔄 Processing authentication...</h1>
        <p>Please wait while we confirm your email address...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .callback-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  }

  .callback-card {
    background: white;
    padding: 3rem;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    width: 100%;
    text-align: center;
    border: 1px solid #e2e8f0;
  }

  .processing,
  .success,
  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 60px;
    height: 60px;
    border: 6px solid #e5e7eb;
    border-top: 6px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .checkmark,
  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  h1 {
    color: #1e293b;
    margin-bottom: 1rem;
    font-size: 1.75rem;
  }

  p {
    color: #64748b;
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .redirect-notice {
    color: #2563eb;
    font-weight: 500;
    font-size: 1rem;
  }

  .error-details {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
    font-size: 0.9rem;
    text-align: left;
  }

  .error-details ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
  }

  .error-details li {
    margin-bottom: 0.25rem;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 2rem;
  }

  .btn {
    display: inline-block;
    padding: 0.875rem 1.75rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: #f8fafc;
    color: #374151;
    border: 1px solid #e5e7eb;
  }

  .btn-secondary:hover {
    background: #f1f5f9;
  }

  @media (max-width: 480px) {
    .callback-container {
      padding: 1rem;
    }

    .callback-card {
      padding: 2rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .checkmark,
    .error-icon {
      font-size: 3rem;
    }
  }
</style>
