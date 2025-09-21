<script lang="ts">
  interface Props {
    data: {
      status: {
        timestamp: string;
        supabase: {
          url: string;
          configured: boolean;
          anonKeyPreview: string;
        };
        server: {
          origin: string;
          port: string;
          environment: string;
        };
        endpoints: Record<string, string>;
        flow: Record<string, string>;
      };
    };
  }

  let { data }: Props = $props();

  function testEndpoint(url: string) {
    window.open(url, "_blank");
  }
</script>

<svelte:head>
  <title>System Status - Hazards App</title>
</svelte:head>

<div class="container">
  <h1>🚀 System Status Dashboard</h1>
  <p class="timestamp">Last updated: {data.status.timestamp}</p>

  <div class="grid">
    <div class="card">
      <h2>🔧 Supabase Configuration</h2>
      <div class="status-item">
        <span class="label">Status:</span>
        <span
          class="value {data.status.supabase.configured ? 'success' : 'error'}"
        >
          {data.status.supabase.configured ? "✅ Configured" : "❌ Missing"}
        </span>
      </div>
      <div class="status-item">
        <span class="label">URL:</span>
        <code class="value">{data.status.supabase.url}</code>
      </div>
      <div class="status-item">
        <span class="label">API Key:</span>
        <code class="value">{data.status.supabase.anonKeyPreview}</code>
      </div>
    </div>

    <div class="card">
      <h2>🖥️ Server Information</h2>
      <div class="status-item">
        <span class="label">Origin:</span>
        <code class="value">{data.status.server.origin}</code>
      </div>
      <div class="status-item">
        <span class="label">Port:</span>
        <code class="value">{data.status.server.port}</code>
      </div>
      <div class="status-item">
        <span class="label">Environment:</span>
        <code class="value">{data.status.server.environment}</code>
      </div>
    </div>

    <div class="card">
      <h2>🔗 Available Endpoints</h2>
      {#each Object.entries(data.status.endpoints) as [name, url]}
        <div class="status-item">
          <span class="label">{name}:</span>
          <button onclick={() => testEndpoint(url)} class="link-btn">
            {url}
          </button>
        </div>
      {/each}
    </div>

    <div class="card">
      <h2>🔄 Password Reset Flow</h2>
      {#each Object.entries(data.status.flow) as [step, description]}
        <div class="flow-item">
          <span class="step">{step}:</span>
          <span class="description">{description}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="actions">
    <a href="/auth/forgot-password" class="btn primary"
      >🔐 Test Forgot Password</a
    >
    <a href="/dev/test" class="btn secondary">🧪 Database Test</a>
    <a href="/dev/test/images" class="btn secondary">� Image Test</a>
    <a href="/dev" class="btn secondary">🔧 Dev Tools Home</a>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
  }

  h1 {
    color: #1e293b;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .timestamp {
    text-align: center;
    color: #6b7280;
    font-size: 0.9rem;
    margin-bottom: 2rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .card h2 {
    color: #374151;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #f3f4f6;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .status-item:last-child {
    border-bottom: none;
  }

  .label {
    font-weight: 600;
    color: #374151;
  }

  .value {
    font-family: "SF Mono", Monaco, monospace;
    font-size: 0.9rem;
  }

  .value.success {
    color: #059669;
    font-weight: bold;
  }

  .value.error {
    color: #dc2626;
    font-weight: bold;
  }

  code.value {
    background: #f1f5f9;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link-btn {
    background: none;
    border: none;
    color: #2563eb;
    text-decoration: underline;
    cursor: pointer;
    font-family: "SF Mono", Monaco, monospace;
    font-size: 0.9rem;
    text-align: right;
  }

  .link-btn:hover {
    color: #1d4ed8;
  }

  .flow-item {
    display: flex;
    padding: 0.5rem 0;
    gap: 1rem;
  }

  .step {
    font-weight: 600;
    color: #2563eb;
    min-width: 60px;
  }

  .description {
    color: #374151;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }

  .btn {
    display: block;
    text-align: center;
    padding: 1rem 1.5rem;
    border-radius: 8px;
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
    transform: translateY(-1px);
  }

  .btn.secondary {
    background: #f8fafc;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn.secondary:hover {
    background: #f1f5f9;
    transform: translateY(-1px);
  }
</style>
