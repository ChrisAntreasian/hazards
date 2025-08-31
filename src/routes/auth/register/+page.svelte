<script lang="ts">
  import { createSupabaseLoadClient } from "$lib/supabase.js";
  import { goto } from "$app/navigation";

  const supabase = createSupabaseLoadClient();

  let email = "";
  let password = "";
  let confirmPassword = "";
  let displayName = "";
  let loading = false;
  let error = "";
  let success = "";

  async function handleRegister() {
    if (!supabase) {
      error = "Supabase not configured";
      return;
    }

    // Validation
    if (!email || !password || !confirmPassword || !displayName) {
      error = "Please fill in all fields";
      return;
    }

    if (password !== confirmPassword) {
      error = "Passwords do not match";
      return;
    }

    if (password.length < 8) {
      error = "Password must be at least 8 characters long";
      return;
    }

    loading = true;
    error = "";
    success = "";

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        if (data.user.email_confirmed_at) {
          // Email already confirmed, redirect to dashboard
          success = "Registration successful! Redirecting to your dashboard...";
          setTimeout(() => goto("/dashboard"), 2000);
        } else {
          // Email confirmation needed
          success = `Registration successful! 

📧 Check your email (${email}) for a confirmation link from Supabase.

👆 Click the link in the email to activate your account and you'll be redirected back here.

⏰ The confirmation email may take a few minutes to arrive.`;
        }
      }
    } catch (e: any) {
      error = e.message || "Registration failed";
    } finally {
      loading = false;
    }
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

    <form on:submit|preventDefault={handleRegister}>
      <div class="form-group">
        <label for="displayName">Display Name</label>
        <input
          id="displayName"
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
          type="password"
          bind:value={password}
          placeholder="At least 8 characters"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          bind:value={confirmPassword}
          placeholder="Repeat your password"
          required
          disabled={loading}
        />
      </div>

      {#if error}
        <div class="error">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="success">
          {success}
        </div>
      {/if}

      <button type="submit" class="btn btn-primary" disabled={loading}>
        {loading ? "Creating Account..." : "Create Account"}
      </button>
    </form>

    <div class="auth-footer">
      <p>Already have an account? <a href="/auth/log-in">Sign in</a></p>
      <p><a href="/">← Back to Home</a></p>
    </div>
  </div>
</div>

<style>
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
