<script lang="ts">
  interface Props {
    data: {
      urlInfo: {
        full: string;
        origin: string;
        pathname: string;
        search: string;
        hash: string;
        searchParams: Record<string, string>;
        hasTokens: boolean;
      };
    };
  }

  let { data }: Props = $props();

  // Also check client-side URL info
  let clientUrlInfo = $state<any>({});

  function checkClientUrl() {
    if (typeof window !== "undefined") {
      clientUrlInfo = {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        searchParams: Object.fromEntries(
          new URLSearchParams(window.location.search)
        ),
        hashParams: Object.fromEntries(
          new URLSearchParams(window.location.hash.substring(1))
        ),
      };
    }
  }

  // Check URL on mount
  if (typeof window !== "undefined") {
    checkClientUrl();
  }
</script>

<svelte:head>
  <title>URL Test - Hazards App</title>
</svelte:head>

<div class="container">
  <h1>URL Analysis Test Page</h1>

  <div class="section">
    <h2>Server-Side URL Info</h2>
    <div class="info-grid">
      <div class="info-item">
        <strong>Full URL:</strong>
        <code>{data.urlInfo.full}</code>
      </div>
      <div class="info-item">
        <strong>Origin:</strong>
        <code>{data.urlInfo.origin}</code>
      </div>
      <div class="info-item">
        <strong>Pathname:</strong>
        <code>{data.urlInfo.pathname}</code>
      </div>
      <div class="info-item">
        <strong>Search:</strong>
        <code>{data.urlInfo.search || "(empty)"}</code>
      </div>
      <div class="info-item">
        <strong>Hash:</strong>
        <code>{data.urlInfo.hash || "(empty)"}</code>
      </div>
      <div class="info-item">
        <strong>Search Params:</strong>
        <pre>{JSON.stringify(data.urlInfo.searchParams, null, 2)}</pre>
      </div>
      <div class="info-item">
        <strong>Has Tokens:</strong>
        <span class={data.urlInfo.hasTokens ? "success" : "error"}>
          {data.urlInfo.hasTokens ? "YES" : "NO"}
        </span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Client-Side URL Info</h2>
    <button onclick={checkClientUrl} class="btn">Refresh Client Info</button>

    {#if clientUrlInfo.href}
      <div class="info-grid">
        <div class="info-item">
          <strong>Full URL:</strong>
          <code>{clientUrlInfo.href}</code>
        </div>
        <div class="info-item">
          <strong>Search:</strong>
          <code>{clientUrlInfo.search || "(empty)"}</code>
        </div>
        <div class="info-item">
          <strong>Hash:</strong>
          <code>{clientUrlInfo.hash || "(empty)"}</code>
        </div>
        <div class="info-item">
          <strong>Search Params:</strong>
          <pre>{JSON.stringify(clientUrlInfo.searchParams, null, 2)}</pre>
        </div>
        <div class="info-item">
          <strong>Hash Params:</strong>
          <pre>{JSON.stringify(clientUrlInfo.hashParams, null, 2)}</pre>
        </div>
      </div>
    {/if}
  </div>

  <div class="actions">
    <a href="/auth/forgot-password" class="btn">Test Forgot Password</a>
    <a href="/auth/callback" class="btn">Go to Callback</a>
    <a href="/" class="btn secondary">Home</a>
  </div>
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }

  .section {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .section h2 {
    color: #1e293b;
    margin-bottom: 1rem;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0.5rem;
  }

  .info-grid {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
  }

  .info-item {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .info-item strong {
    display: block;
    color: #374151;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .info-item code {
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: "Courier New", monospace;
    word-break: break-all;
    display: block;
    white-space: pre-wrap;
  }

  .info-item pre {
    background: #f1f5f9;
    padding: 0.75rem;
    border-radius: 4px;
    font-family: "Courier New", monospace;
    font-size: 0.875rem;
    overflow-x: auto;
    margin: 0;
  }

  .success {
    color: #059669;
    font-weight: bold;
  }

  .error {
    color: #dc2626;
    font-weight: bold;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    flex-wrap: wrap;
  }

  .btn {
    background: #2563eb;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn:hover {
    background: #1d4ed8;
  }

  .btn.secondary {
    background: #6b7280;
  }

  .btn.secondary:hover {
    background: #4b5563;
  }
</style>
