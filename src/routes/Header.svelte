<script lang="ts">
  import { page } from "$app/state";
</script>

<header>
  <div class="logo">
    <a href="/">
      <span class="logo-icon">⚠️</span>
      <span class="logo-text">HazardTracker</span>
    </a>
  </div>

  <nav>
    <ul>
      <li aria-current={page.url.pathname === "/" ? "page" : undefined}>
        <a href="/">Home</a>
      </li>
      <li aria-current={page.url.pathname === "/map" ? "page" : undefined}>
        <a href="/map">🗺️ Map</a>
      </li>
      <li
        aria-current={page.url.pathname.startsWith("/learn") ? "page" : undefined}
      >
        <a href="/learn">📚 Learn</a>
      </li>
      <li
        aria-current={page.url.pathname === "/hazards/create"
          ? "page"
          : undefined}
      >
        <a href="/hazards/create">➕ Report</a>
      </li>
      <li
        aria-current={page.url.pathname === "/my-reports" ? "page" : undefined}
      >
        <a href="/my-reports">📋 My Reports</a>
      </li>
      <li
        aria-current={page.url.pathname === "/dashboard" ? "page" : undefined}
      >
        <a href="/dashboard">📊 Dashboard</a>
      </li>
    </ul>
  </nav>

  <div class="user-menu">
    <a href="/auth/log-in" class="btn btn-outline">Log In</a>
  </div>
</header>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: var(--color-bg-card);
    border-bottom: 1px solid var(--color-border);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .logo a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--color-primary);
    font-weight: bold;
    font-size: 1.5rem;
  }

  .logo-icon {
    font-size: 1.8rem;
  }

  .logo-text {
    color: var(--color-text-primary);
  }

  nav ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0.5rem;
  }

  nav li {
    position: relative;
  }

  nav a {
    display: block;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: var(--color-text-secondary);
    font-weight: 500;
    border-radius: 6px;
    transition: all 0.2s;
  }

  nav a:hover {
    background: var(--color-bg-muted);
    color: var(--color-primary);
  }

  li[aria-current="page"] a {
    background: var(--primary-50);
    color: var(--color-primary);
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-outline {
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }

  .btn-outline:hover {
    background: var(--color-primary);
    color: white;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    header {
      padding: 0.75rem 1rem;
    }

    .logo a {
      font-size: 1.25rem;
    }

    nav ul {
      gap: 0.25rem;
    }

    nav a {
      padding: 0.375rem 0.75rem;
      font-size: 0.9rem;
    }

    .btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.9rem;
    }
  }
</style>
