<script lang="ts">
  import { createSupabaseLoadClient } from "$lib/supabase.js";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { invalidate } from "$app/navigation";

  const supabase = createSupabaseLoadClient();
  let status = $state("processing");
  let message = $state("Processing email confirmation...");
  let error = $state("");

  onMount(async () => {
    if (!supabase) {
      status = "error";
      message = "Authentication service not available";
      return;
    }

    try {
      // Get the current URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");
      const type = urlParams.get("type");

      if (type === "signup" || type === "email_change") {
        // This is an email confirmation
        if (accessToken && refreshToken) {
          // Set the session
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            status = "error";
            message = "Failed to confirm email";
            error = sessionError.message;
          } else {
            status = "success";
            message = "Email confirmed successfully! Welcome to Hazards App.";

            // Force auth state update
            await invalidate("supabase:auth");

            // Redirect to dashboard after a short delay
            setTimeout(() => {
              goto("/dashboard");
            }, 2000);
          }
        } else {
          status = "error";
          message = "Invalid confirmation link";
          error = "Missing required parameters";
        }
      } else if (type === "recovery") {
        // Password recovery - redirect to password reset page
        goto("/auth/reset-password");
      } else {
        // Check if user is already logged in
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          status = "success";
          message = "You are already logged in.";
          setTimeout(() => {
            goto("/dashboard");
          }, 1000);
        } else {
          status = "error";
          message = "Invalid or expired confirmation link";
        }
      }
    } catch (e: any) {
      status = "error";
      message = "An unexpected error occurred";
      error = e.message;
    }
  });
</script>

<svelte:head>
  <title>Email Confirmation - Hazards App</title>
</svelte:head>

<div class="callback-container">
  <div class="callback-card">
    {#if status === "processing"}
      <div class="processing">
        <div class="spinner"></div>
        <h1>🔄 {message}</h1>
        <p>Please wait while we confirm your email address...</p>
      </div>
    {:else if status === "success"}
      <div class="success">
        <div class="checkmark">✅</div>
        <h1>Email Confirmed!</h1>
        <p>{message}</p>
        <p class="redirect-notice">Redirecting to your dashboard...</p>
        <a href="/dashboard" class="btn btn-primary">Go to Dashboard Now</a>
      </div>
    {:else if status === "error"}
      <div class="error">
        <div class="error-icon">❌</div>
        <h1>Confirmation Failed</h1>
        <p>{message}</p>
        {#if error}
          <div class="error-details">
            <strong>Error:</strong>
            {error}
          </div>
        {/if}
        <div class="actions">
          <a href="/auth/log-in" class="btn btn-primary">Try Logging In</a>
          <a href="/auth/register" class="btn btn-secondary">Register Again</a>
          <a href="/" class="btn btn-secondary">Go Home</a>
        </div>
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
