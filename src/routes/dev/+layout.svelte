<script lang="ts">
  import { page } from "$app/stores";
  import { dev } from "$app/environment";
  import { goto } from "$app/navigation";
  
  interface Props {
    children: import('svelte').Snippet;
  }
  
  let { children }: Props = $props();
  
  // Redirect to home if not in development mode
  if (!dev) {
    goto("/");
  }
  
  let currentPath = $derived($page.url.pathname);
</script>

<div class="dev-layout">
  <div class="dev-header">
    <div class="dev-nav">
      <h1>🔧 Development Tools</h1>
      <nav class="dev-menu">
        <a href="/dev" class:active={currentPath === "/dev"}>Overview</a>
        <a href="/dev/status" class:active={currentPath === "/dev/status"}>System Status</a>
        <a href="/dev/test" class:active={currentPath === "/dev/test"}>Database Test</a>
        <a href="/dev/test/images" class:active={currentPath === "/dev/test/images"}>Image Test</a>
        <a href="/" class="home-link">← Back to App</a>
      </nav>
    </div>
  </div>
  
  <div class="dev-content">
    {@render children()}
  </div>
</div>

<style>
  .dev-layout {
    min-height: 100vh;
    background: #f8fafc;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .dev-header {
    background: #1e293b;
    color: white;
    padding: 1rem 2rem;
    border-bottom: 3px solid #3b82f6;
  }

  .dev-nav h1 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .dev-menu {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .dev-menu a {
    color: #cbd5e1;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .dev-menu a:hover {
    background: #334155;
    color: white;
  }

  .dev-menu a.active {
    background: #3b82f6;
    color: white;
  }

  .dev-menu a.home-link {
    margin-left: auto;
    background: #059669;
    color: white;
  }

  .dev-menu a.home-link:hover {
    background: #047857;
  }

  .dev-content {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .dev-header {
      padding: 1rem;
    }

    .dev-menu {
      gap: 0.5rem;
    }

    .dev-menu a.home-link {
      margin-left: 0;
      width: 100%;
      text-align: center;
      margin-top: 0.5rem;
    }

    .dev-content {
      padding: 1rem;
    }
  }
</style>
