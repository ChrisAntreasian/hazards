<script lang="ts">
  import {
    createSupabaseLoadClient,
    isSupabaseConfigured,
  } from "$lib/supabase.js";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { invalidate } from "$app/navigation";

  let email = "";
  let password = "";
  let loading = false;
  let error = "";
  let success = "";
  let resendingConfirmation = false;
  let resendMessage = "";

  const supabase = createSupabaseLoadClient();
  const configured = isSupabaseConfigured();

  async function handleLogin() {
    if (!supabase) {
      error =
        "Supabase not configured. Please check your environment variables.";
      return;
    }

    if (!email || !password) {
      error = "Please fill in all fields";
      return;
    }

    loading = true;
    error = "";
    success = "";

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

      if (authError) {
        if (authError.message.includes("Email not confirmed")) {
          error =
            "Please check your email and click the confirmation link before signing in. Check your spam folder if you don't see it.";
        } else {
          error = authError.message;
        }
      } else {
        // Check if email is confirmed
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && !user.email_confirmed_at) {
          error =
            "Please confirm your email address before signing in. Check your email for a confirmation link.";
          // Sign out the unconfirmed user
          await supabase.auth.signOut();
        } else {
          // Show success message
          success = "Login successful! Redirecting...";

          // Trigger a manual session refresh to update the layout
          const { data: sessionData } = await supabase.auth.getSession();
          console.log(
            "Session after login:",
            sessionData.session ? "exists" : "null"
          );

          // Force SvelteKit to refresh auth-dependent data
          await invalidate("supabase:auth");

          // Wait a bit longer to ensure auth state is propagated
          setTimeout(async () => {
            // Double-check session before redirect
            const { data: finalSession } = await supabase.auth.getSession();
            console.log(
              "Final session check:",
              finalSession.session ? "exists" : "null"
            );

            // Redirect to dashboard or return url
            const returnUrl =
              $page.url.searchParams.get("returnUrl") || "/dashboard";
            console.log("Redirecting to:", returnUrl);

            try {
              await goto(returnUrl);
            } catch (e) {
              console.log("goto failed, using window.location:", e);
              window.location.href = returnUrl;
            }
          }, 2000); // Increased delay to 2 seconds
          return; // Don't set loading to false in finally block
        }
      }
    } catch (e) {
      error = "An unexpected error occurred";
      console.error("Login error:", e);
    } finally {
      if (!success) {
        loading = false;
      }
    }
  }

  async function resendConfirmation() {
    if (!supabase || !email) {
      resendMessage = "Please enter your email address first";
      return;
    }

    resendingConfirmation = true;
    resendMessage = "";

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        resendMessage = `Error: ${error.message}`;
      } else {
        resendMessage = "Confirmation email sent! Check your inbox.";
      }
    } catch (e: any) {
      resendMessage = "Failed to resend confirmation email";
    } finally {
      resendingConfirmation = false;
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) return;

    loading = true;
    error = "";
    success = "";

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${$page.url.origin}/auth/callback`,
        },
      });

      if (authError) {
        error = authError.message;
      }
    } catch (e) {
      error = "An unexpected error occurred";
      console.error("Google login error:", e);
    } finally {
      loading = false;
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
        onsubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        {#if success}
          <div class="success">{success}</div>
        {/if}

        {#if error}
          <div class="error">{error}</div>

          {#if error.includes("confirm") || error.includes("Email not confirmed")}
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

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="your@email.com"
            required
            disabled={loading || !!success}
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="Your password"
            required
            disabled={loading || !!success}
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary"
          disabled={loading || !!success}
        >
          {success ? "✅ Success!" : loading ? "Signing in..." : "Sign In"}
        </button>

        <div class="divider">
          <span>or</span>
        </div>

        <button
          type="button"
          class="btn btn-google"
          onclick={handleGoogleLogin}
          disabled={loading || !!success}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
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

  .btn-google {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;
  }

  .btn-google:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .divider {
    text-align: center;
    margin: 1rem 0;
    position: relative;
  }

  .divider::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e5e7eb;
  }

  .divider span {
    background: white;
    padding: 0 1rem;
    color: #9ca3af;
    font-size: 0.875rem;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: successSlideIn 0.3s ease-out;
  }

  .success::before {
    content: "✅";
    font-size: 1rem;
  }

  @keyframes successSlideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
