<script lang="ts">
  import { goto } from "$app/navigation";

  interface Props {
    data: any;
  }

  let { data }: Props = $props();

  // Handle client-side redirect for successful confirmations using $effect
  $effect(() => {
    if (data.status === "success" && data.redirectTo) {
      setTimeout(() => {
        goto(data.redirectTo);
      }, 2000);
    }
  });
</script>

<svelte:head>
  <title>Email Confirmation - Hazards App</title>
</svelte:head>

<div class="callback-container">
  <div class="callback-card">
    {#if data.status === "error"}
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
