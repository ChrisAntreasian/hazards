<script lang="ts">
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Debug Reset URL - Hazards App</title>
</svelte:head>

<div class="container">
  <h1>Debug Password Reset URL Generation</h1>

  <div class="debug-info">
    <h2>URL Configuration</h2>
    <p><strong>Test Email:</strong> {data.testEmail}</p>
    <p><strong>Redirect URL:</strong> {data.redirectUrl}</p>
    <p><strong>Origin:</strong> {data.origin}</p>
    <p><strong>Full URL:</strong> {data.fullUrl}</p>

    <h2>Expected Flow</h2>
    <ol>
      <li>User enters email in forgot password form</li>
      <li>Supabase sends email with reset link</li>
      <li>Link should point to: <code>{data.redirectUrl}</code></li>
      <li>Supabase adds tokens to URL (usually in hash fragment)</li>
      <li>User clicks link → callback page processes tokens</li>
    </ol>

    <h2>Troubleshooting</h2>
    <p>
      Check the browser console when you click a password reset link to see:
    </p>
    <ul>
      <li>Complete URL received</li>
      <li>Whether tokens are in hash or search parameters</li>
      <li>Any URL parsing issues</li>
    </ul>
  </div>

  <div class="actions">
    <a href="/auth/forgot-password" class="btn">Test Password Reset</a>
    <a href="/auth/callback" class="btn">Go to Callback Page</a>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .debug-info {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 6px;
    margin: 1.5rem 0;
  }

  .debug-info h2 {
    color: #1e293b;
    margin-bottom: 1rem;
  }

  .debug-info p {
    margin-bottom: 0.5rem;
    font-family: monospace;
    background: white;
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  .debug-info code {
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: monospace;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .btn {
    background: #2563eb;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
  }

  .btn:hover {
    background: #1d4ed8;
  }
</style>
