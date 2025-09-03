<script lang="ts">
  import { enhance } from '$app/forms';
  import { isSupabaseConfigured } from "$lib/supabase.js";
  import type { SubmitFunction } from '@sveltejs/kit';

  let { form } = $props();
  
  let loading = $state(false);
  let email = $state("");

  const configured = isSupabaseConfigured();

  const handleSubmit: SubmitFunction = ({ formData }) => {
    loading = true;
    return async ({ result, update }) => {
      loading = false;
      
      if (result.type === 'success') {
        // Clear the form on success
        email = "";
      }
      
      await update();
    };
  };
</script>

<svelte:head>
  <title>Forgot Password - Hazards App</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <h1>Reset Your Password</h1>
    <p class="subtitle">
      Enter your email address and we'll send you a link to reset your password
    </p>

    {#if !configured}
      <div class="warning">
        <h3>⚠️ Supabase Not Configured</h3>
        <p>
          Password reset is not available. Please contact support for
          assistance.
        </p>
      </div>
    {:else}
      <form method="POST" action="?/resetPassword" use:enhance={handleSubmit}>
        {#if form?.success}
          <div class="success">{form.message}</div>
        {/if}

        {#if form?.error}
          <div class="error">{form.error}</div>
        {/if}

        <div class="form-group">
          <label for="email">Email Address</label>
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

        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <div class="auth-links">
        <p>Remember your password? <a href="/auth/log-in">Sign in</a></p>
        <p>Don't have an account? <a href="/auth/register">Sign up</a></p>
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
  }

  .back-link a:hover {
    color: #2563eb;
  }
</style>
