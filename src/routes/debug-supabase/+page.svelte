<script lang="ts">
  interface Props {
    data: {
      supabaseUrl: string;
      anonKeyPreview: string;
      currentOrigin: string;
      expectedRedirectUrl: string;
      requiredDashboardUrls: string[];
    };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Supabase Configuration Debug - Hazards App</title>
</svelte:head>

<div class="container">
  <h1>🔍 Remote Supabase Configuration Debug</h1>

  <div class="section">
    <h2>Current Configuration</h2>
    <div class="config-item">
      <strong>Supabase URL:</strong>
      <code>{data.supabaseUrl}</code>
    </div>
    <div class="config-item">
      <strong>Anon Key:</strong>
      <code>{data.anonKeyPreview}</code>
    </div>
    <div class="config-item">
      <strong>Current Origin:</strong>
      <code>{data.currentOrigin}</code>
    </div>
    <div class="config-item">
      <strong>Expected Redirect URL:</strong>
      <code>{data.expectedRedirectUrl}</code>
    </div>
  </div>

  <div class="section urgent">
    <h2>⚠️ CRITICAL: Supabase Dashboard Configuration Required</h2>
    <p>
      <strong
        >To fix the forgot password flow, you MUST configure these URLs in your
        Supabase dashboard:</strong
      >
    </p>

    <div class="steps">
      <h3>Step 1: Go to Supabase Dashboard</h3>
      <p>
        Visit: <a href="https://supabase.com/dashboard" target="_blank"
          >https://supabase.com/dashboard</a
        >
      </p>

      <h3>Step 2: Navigate to Authentication Settings</h3>
      <p>Go to: <strong>Authentication → URL Configuration</strong></p>

      <h3>Step 3: Configure Site URL</h3>
      <p>Set <strong>Site URL</strong> to: <code>{data.currentOrigin}</code></p>

      <h3>Step 4: Add Redirect URLs</h3>
      <p>Add these URLs to <strong>Redirect URLs</strong>:</p>
      <div class="url-list">
        {#each data.requiredDashboardUrls as url}
          <div class="url-item">
            <code>{url}</code>
            <button
              onclick={() => navigator.clipboard.writeText(url)}
              class="copy-btn">Copy</button
            >
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🧪 Test Password Reset Flow</h2>
    <p>After configuring the URLs in Supabase dashboard:</p>
    <ol>
      <li>Go to the forgot password page</li>
      <li>Enter your email address</li>
      <li>Check your email for the reset link</li>
      <li>Click the link and check browser console for debugging info</li>
    </ol>
    <div class="actions">
      <a href="/auth/forgot-password" class="btn primary"
        >Test Forgot Password</a
      >
      <a href="/auth/callback" class="btn secondary">Test Callback Page</a>
    </div>
  </div>

  <div class="section">
    <h2>🔧 Common Issues & Solutions</h2>
    <div class="issue">
      <h3>"Missing authentication tokens"</h3>
      <p>
        <strong>Cause:</strong> Redirect URL not configured in Supabase dashboard
      </p>
      <p>
        <strong>Solution:</strong> Add all URLs above to your Supabase project settings
      </p>
    </div>

    <div class="issue">
      <h3>"Authentication Failed"</h3>
      <p>
        <strong>Cause:</strong> Link expired (1 hour limit) or URL modified by email
        client
      </p>
      <p>
        <strong>Solution:</strong> Request new password reset, check URL configuration
      </p>
    </div>

    <div class="issue">
      <h3>Link redirects but no tokens</h3>
      <p>
        <strong>Cause:</strong> Tokens in URL fragment not being parsed correctly
      </p>
      <p>
        <strong>Solution:</strong> Our enhanced parsing should handle this - check
        console logs
      </p>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
  }

  h1 {
    color: #1e293b;
    margin-bottom: 2rem;
  }

  .section {
    background: white;
    padding: 1.5rem;
    margin: 1.5rem 0;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
  }

  .section.urgent {
    border-color: #f59e0b;
    background: #fffbeb;
  }

  .config-item {
    margin: 1rem 0;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  code {
    background: #1e293b;
    color: #e2e8f0;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
    font-size: 0.9rem;
  }

  .steps h3 {
    color: #dc2626;
    margin: 1.5rem 0 0.5rem 0;
  }

  .url-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    margin: 1rem 0;
  }

  .url-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .url-item:last-child {
    border-bottom: none;
  }

  .copy-btn {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .copy-btn:hover {
    background: #1d4ed8;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn.primary {
    background: #2563eb;
    color: white;
  }

  .btn.primary:hover {
    background: #1d4ed8;
  }

  .btn.secondary {
    background: #f8fafc;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn.secondary:hover {
    background: #f1f5f9;
  }

  .issue {
    margin: 1rem 0;
    padding: 1rem;
    background: #f8fafc;
    border-left: 4px solid #2563eb;
    border-radius: 0 6px 6px 0;
  }

  .issue h3 {
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .issue p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
  }

  ol,
  ul {
    padding-left: 1.5rem;
  }

  li {
    margin-bottom: 0.5rem;
  }

  a {
    color: #2563eb;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
</style>
