<script lang="ts">
  import { page } from "$app/stores";
  import { enhance } from "$app/forms";
  import { isSupabaseConfigured } from "$lib/supabase.js";
  import type { SubmitFunction } from '@sveltejs/kit';

  let email = $state("");
  let password = $state("");
  let loading = $state(false);
  let resendingConfirmation = $state(false);
  let resendMessage = $state("");
  let loginSuccess = $state(false);
  let manualError = $state(""); // Manual error state to work around form enhancement issue

  const configured = isSupabaseConfigured();

  // Access form action results with Svelte 5 derived
  let form = $derived($page.form);

  async function resendConfirmation() {
    if (!email) {
      resendMessage = "Please enter your email address first";
      return;
    }

    resendingConfirmation = true;
    resendMessage = "";

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
        resendMessage = `Error: ${result.error || "Failed to resend"}`;
      } else {
        resendMessage = "Confirmation email sent! Check your inbox.";
      }
    } catch (e: any) {
      resendMessage = "Failed to resend confirmation email";
    } finally {
      resendingConfirmation = false;
    }
  }
</script>

<svelte:head>
  <title>Login - Hazards App</title>
  <meta name="cache-bust" content="2025-08-31-v1" />
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <h1>Welcome Back</h1>
    <p class="subtitle">Sign in to your Hazards account</p>

    {#if !configured}
      <div class="warning">
        <h3>⚠️ Supabase Not Configured</h3>
        <p>To enable authentication, please:</p>
        <ol>
          <li>Create a Supabase project</li>
          <li>Update your <code>.env.local</code> file</li>
          <li>Run the database migration</li>
        </ol>
        <p>See <code>SUPABASE_SETUP.md</code> for detailed instructions.</p>
      </div>
    {:else}
      <form
        action="/auth?/signIn"
        method="post"
        use:enhance={({ formData, cancel }) => {
          loading = true;
          manualError = ""; // Clear any previous error
          return async ({ result, update }) => {
            loading = false;
            
            if (result.type === "redirect") {
              // SUCCESS: Handle server redirect
              const returnUrl = formData.get('returnUrl') as string || '/dashboard';
              console.log('✅ Login successful - redirecting to:', returnUrl);
              
              // Show success state briefly before redirect
              loginSuccess = true;
              
              // Force complete page reload after brief delay
              setTimeout(() => {
                window.location.href = returnUrl;
              }, 800);
              
              return; // Don't call update() - we're navigating away
              
            } else if (result.type === "success") {
              // SUCCESS: Handle custom success response with redirect URL
              const redirectUrl = (result.data && typeof result.data === 'object' && 'redirectUrl' in result.data) 
                ? result.data.redirectUrl as string 
                : '/dashboard';
              
              console.log('✅ Login successful - redirecting to:', redirectUrl);
              
              // Show success state briefly before redirect
              loginSuccess = true;
              
              // Force complete page reload after brief delay
              setTimeout(() => {
                window.location.href = redirectUrl;
              }, 800);
              
              return; // Don't call update() - we're navigating away
              
            } else if (result.type === "failure") {
              // ERROR: Clear password for security but preserve email
              password = "";
              manualError = (result.data && typeof result.data === 'object' && 'error' in result.data && typeof result.data.error === 'string') 
                ? result.data.error 
                : "Login failed";
              await update(); // Still call update but also use manual error
            } else {
              await update();
            }
          };
        }}
      >
        {#if loginSuccess}
          <div class="success">
            ✅ Login successful! Redirecting to dashboard...
          </div>
        {/if}

        {#if manualError}
          <div class="error">
            {manualError}
          </div>

          {#if manualError.includes("confirm") || manualError.includes("Email not confirmed")}
            <div class="resend-section">
              <p class="resend-text">Didn't receive the confirmation email?</p>

              {#if resendMessage}
                <div
                  class="message {resendMessage.startsWith('Error')
                    ? 'error'
                    : 'success'}"
                >
                  {resendMessage}
                </div>
              {/if}

              <button
                type="button"
                class="btn btn-resend"
                onclick={resendConfirmation}
                disabled={resendingConfirmation || !email}
              >
                {resendingConfirmation
                  ? "Sending..."
                  : "Resend Confirmation Email"}
              </button>
            </div>
          {/if}
          
        {:else if form?.error}
          <div class="error">
            {form.error}
          </div>

          {#if form.error.includes("confirm") || form.error.includes("Email not confirmed")}
            <div class="resend-section">
              <p class="resend-text">Didn't receive the confirmation email?</p>

              {#if resendMessage}
                <div
                  class="message {resendMessage.startsWith('Error')
                    ? 'error'
                    : 'success'}"
                >
                  {resendMessage}
                </div>
              {/if}

              <button
                type="button"
                class="btn btn-resend"
                onclick={resendConfirmation}
                disabled={resendingConfirmation || !email}
              >
                {resendingConfirmation
                  ? "Sending..."
                  : "Resend Confirmation Email"}
              </button>
            </div>
          {/if}
        {/if}

        <!-- Hidden field for return URL -->
        <input
          type="hidden"
          name="returnUrl"
          value={$page.url.searchParams.get("returnUrl") || "/dashboard"}
        />

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            bind:value={email}
            placeholder="your@email.com"
            required
            disabled={loading}
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            bind:value={password}
            placeholder="Your password"
            required
            disabled={loading}
          />
        </div>

        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div class="auth-links">
        <p>Don't have an account? <a href="/auth/register">Sign up</a></p>
        <p><a href="/auth/forgot-password">Forgot your password?</a></p>
      </div>
    {/if}

    <div class="back-link">
      <a href="/">← Back to Home</a>
    </div>
  </div>
</div>

<style>
  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem;
  }

  .auth-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 100%;
  }

  h1 {
    text-align: center;
    margin-bottom: 0.5rem;
    color: #1e293b;
    font-size: 1.75rem;
  }

  .subtitle {
    text-align: center;
    color: #64748b;
    margin-bottom: 2rem;
    font-size: 0.95rem;
  }

  .warning {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .warning h3 {
    color: #92400e;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .warning p {
    color: #92400e;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .warning ol {
    color: #92400e;
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .warning code {
    background: #fbbf24;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  input:disabled {
    background-color: #f3f4f6;
    color: #9ca3af;
  }

  .btn {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    text-decoration: none;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
    margin-bottom: 1rem;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .resend-section {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .resend-text {
    color: #0369a1;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }

  .btn-resend {
    background: #0ea5e9;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-resend:hover:not(:disabled) {
    background: #0284c7;
  }

  .btn-resend:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .message {
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  .message.success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
  }

  .message.error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #dc2626;
  }

  .auth-links {
    text-align: center;
    margin-top: 1.5rem;
  }

  .auth-links p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    color: #64748b;
  }

  .auth-links a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-links a:hover {
    text-decoration: underline;
  }

  .back-link {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .back-link a {
    color: #64748b;
    text-decoration: none;
    font-size: 0.9rem;
    margin: 0 0.5rem;
    display: inline-block;
  }

  .back-link a:hover {
    color: #2563eb;
  }

  @media (max-width: 480px) {
    .auth-container {
      padding: 1rem;
    }

    .auth-card {
      padding: 1.5rem;
    }
  }
</style>
