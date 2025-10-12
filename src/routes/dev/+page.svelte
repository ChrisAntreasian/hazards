<script lang="ts">
  import { dev } from "$app/environment";

  let tools = [
    {
      title: "System Status",
      description:
        "View Supabase configuration, server info, and endpoint status",
      href: "/dev/status",
      icon: "🚀",
    },
    {
      title: "Database Test",
      description: "Test database connectivity and query basic tables",
      href: "/dev/test",
      icon: "🧪",
    },
    {
      title: "Image Upload Test",
      description: "Test complete image upload pipeline: drag-drop upload, WebP conversion, thumbnails, voting, and gallery display",
      href: "/dev/test/images",
      icon: "📸",
    },
  ];
</script>

<svelte:head>
  <title>Development Tools - Hazards App</title>
</svelte:head>

<div class="dev-overview">
  <div class="welcome-card">
    <h1>🔧 Development Tools</h1>
    <p class="description">
      Welcome to the development dashboard. These tools help with debugging,
      testing, and monitoring during development.
    </p>

    {#if !dev}
      <div class="warning-banner">
        ⚠️ <strong>Warning:</strong> Development tools are only available in development
        mode.
      </div>
    {/if}
  </div>

  <div class="tools-grid">
    {#each tools as tool}
      <a href={tool.href} class="tool-card">
        <div class="tool-icon">{tool.icon}</div>
        <h3>{tool.title}</h3>
        <p>{tool.description}</p>
        <div class="tool-arrow">→</div>
      </a>
    {/each}
  </div>

  <div class="api-section">
    <h2>🔗 API Endpoints</h2>
    <div class="api-grid">
      <div class="api-card">
        <h3>🩺 Diagnostic</h3>
        <p>Simple health check endpoint for testing API functionality</p>
        <code>/dev/api/diagnostic</code>
        <button
          onclick={() => window.open("/dev/api/diagnostic", "_blank")}
          class="api-btn"
        >
          Test Endpoint
        </button>
      </div>

      <div class="api-card">
        <h3>🔐 Reset URL Test</h3>
        <p>Test password reset URL generation without sending emails</p>
        <code>/dev/api/test-reset-url</code>
        <div class="api-note">
          POST endpoint - use from status page or dev tools
        </div>
      </div>
    </div>
  </div>

  <div class="info-section">
    <h2>About Development Tools</h2>
    <div class="info-grid">
      <div class="info-card">
        <h3>🎯 Purpose</h3>
        <p>
          These tools are designed to help developers debug issues, test
          functionality, and monitor system health during development.
        </p>
      </div>

      <div class="info-card">
        <h3>🔒 Security</h3>
        <p>
          Development tools are automatically disabled in production
          environments and should not be accessible to end users.
        </p>
      </div>

      <div class="info-card">
        <h3>🚀 Performance</h3>
        <p>
          These pages may include verbose logging and testing code that could
          impact performance. Use only for development.
        </p>
      </div>
    </div>
  </div>
</div>

<style>
  .dev-overview {
    max-width: 1000px;
    margin: 0 auto;
  }

  .welcome-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    text-align: center;
  }

  .welcome-card h1 {
    margin: 0 0 1rem 0;
    color: #1e293b;
    font-size: 2rem;
    font-weight: 700;
  }

  .description {
    color: #64748b;
    font-size: 1.1rem;
    line-height: 1.6;
    margin: 0;
  }

  .warning-banner {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    color: #92400e;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    text-align: left;
  }

  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .tool-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 2rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
    position: relative;
    display: block;
  }

  .tool-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);
  }

  .tool-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .tool-card h3 {
    margin: 0 0 0.75rem 0;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .tool-card p {
    margin: 0;
    color: #64748b;
    line-height: 1.5;
  }

  .tool-arrow {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    font-size: 1.25rem;
    color: #cbd5e1;
    transition: all 0.2s ease;
  }

  .tool-card:hover .tool-arrow {
    color: #3b82f6;
    transform: translateX(4px);
  }

  .api-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 2px solid #f1f5f9;
  }

  .api-section h2 {
    text-align: center;
    color: #1e293b;
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 2rem;
  }

  .api-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .api-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .api-card h3 {
    margin: 0 0 0.75rem 0;
    color: #374151;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .api-card p {
    margin: 0 0 1rem 0;
    color: #6b7280;
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .api-card code {
    background: #1e293b;
    color: #e2e8f0;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    font-family: "Courier New", monospace;
    font-size: 0.875rem;
    display: block;
    margin-bottom: 1rem;
  }

  .api-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .api-btn:hover {
    background: #2563eb;
  }

  .api-note {
    font-size: 0.8rem;
    color: #9ca3af;
    margin-top: 0.5rem;
  }

  .info-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 2px solid #f1f5f9;
  }

  .info-section h2 {
    text-align: center;
    color: #1e293b;
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 2rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .info-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .info-card h3 {
    margin: 0 0 0.75rem 0;
    color: #374151;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .info-card p {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
    font-size: 0.95rem;
  }

  @media (max-width: 768px) {
    .tools-grid {
      grid-template-columns: 1fr;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .welcome-card {
      padding: 1.5rem;
    }

    .welcome-card h1 {
      font-size: 1.75rem;
    }

    .tool-card {
      padding: 1.5rem;
    }
  }
</style>
