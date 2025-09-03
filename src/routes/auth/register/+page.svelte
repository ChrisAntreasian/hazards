<script lang="ts">
  import { page } from "$app/stores";
  import { enhance } from "$app/forms";
  import { isSupabaseConfigured } from "$lib/supabase.js";

  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let displayName = $state("");
  let loading = $state(false);

  const configured = isSupabaseConfigured();

  // Access form action results with Svelte 5 derived
  let form = $derived($page.form);

  // Client-side validation function
  function validateForm() {
    if (!email || !password || !confirmPassword || !displayName) {
      return "Please fill in all fields";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }

    return null;
  }
</script>

<svelte:head>
  <title>Register - Hazards App</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <h1>🚨 Create Account</h1>
    <p class="subtitle">
      Join the Hazards community to report and track outdoor hazards
    </p>

    {#if !configured}
      <div class="warning">
        <h3>⚠️ Supabase Not Configured</h3>
        <p>To enable registration, please:</p>
        <ol>
          <li>Create a Supabase project</li>
          <li>Update your <code>.env.local</code> file</li>
          <li>Run the database migration</li>
        </ol>
        <p>See <code>SUPABASE_SETUP.md</code> for detailed instructions.</p>
      </div>
    {:else}
      <form
        action="/auth?/signUp"
        method="post"
        use:enhance={({ formData, cancel }) => {
          const error = validateForm();
          if (error) {
            alert(error);
            cancel();
            return;
          }
          loading = true;
          return async ({ result }) => {
            loading = false;
            if (result.type === "redirect") {
              // Let the redirect happen naturally
            } else if (result.type === "failure") {
              // Preserve form values on error with type safety
              if (result.data?.email && typeof result.data.email === "string") {
                email = result.data.email;
              }
              if (
                result.data?.displayName &&
                typeof result.data.displayName === "string"
              ) {
                displayName = result.data.displayName;
              }
              // Clear password fields for security
              password = "";
              confirmPassword = "";
            } else if (result.type === "success") {
              // Clear form on success
              email = "";
              password = "";
              confirmPassword = "";
              displayName = "";
            }
          };
        }}
      >
        {#if form?.success}
          <div class="success">
            ✅ {form.message}
          </div>
        {/if}

        {#if form?.error}
          <div class="error">
            {form.error}
          </div>
        {/if}

        <div class="form-group">
          <label for="displayName">Display Name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            bind:value={displayName}
            placeholder="How others will see you"
            required
            disabled={loading}
          />
        </div>

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
            placeholder="At least 6 characters"
            required
            disabled={loading}
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Repeat your password"
            required
            disabled={loading}
          />
        </div>

        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    {/if}

    <div class="auth-footer">
      <p>Already have an account? <a href="/auth/log-in">Sign in</a></p>
      <p><a href="/">← Back to Home</a></p>
    </div>
  </div>
</div>

<style>
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

  .success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
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

  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 1rem;
  }

  .auth-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    max-width: 420px;
    width: 100%;
    border: 1px solid #e2e8f0;
  }

  h1 {
    margin-bottom: 0.5rem;
    color: #1e293b;
    text-align: center;
    font-size: 1.75rem;
  }

  .subtitle {
    color: #64748b;
    margin-bottom: 2rem;
    text-align: center;
    font-size: 0.95rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #374151;
    font-weight: 500;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  input:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
  }

  .btn {
    width: 100%;
    padding: 0.875rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
    box-sizing: border-box;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  .btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
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
  }

  .auth-footer {
    margin-top: 2rem;
    text-align: center;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .auth-footer p {
    margin: 0.5rem 0;
    color: #64748b;
    font-size: 0.9rem;
  }

  .auth-footer a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-footer a:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .auth-card {
      padding: 1.5rem;
      margin: 0.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }
  }
</style>
