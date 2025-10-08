<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  // Tab configuration
  const tabs = [
    { id: "users", label: "Users", href: "/admin/users", icon: "👥" },
    {
      id: "categories",
      label: "Categories",
      href: "/admin/categories",
      icon: "📂",
    },
    { id: "config", label: "Configuration", href: "/admin/config", icon: "⚙️" },
    {
      id: "analytics",
      label: "Analytics",
      href: "/admin/analytics",
      icon: "📊",
    },
  ];

  $: currentPath = $page.url.pathname;
  $: activeTab =
    tabs.find((tab) => currentPath.startsWith(tab.href))?.id || "users";

  function handleTabClick(href: string) {
    goto(href);
  }
</script>

<svelte:head>
  <title>Admin Panel - Hazards App</title>
</svelte:head>

<div class="admin-layout">
  <div class="admin-header">
    <h1>Admin Panel</h1>
    <p class="subtitle">Manage users, content, and system configuration</p>
  </div>

  <nav class="admin-tabs">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.id}
        onclick={() => handleTabClick(tab.href)}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </nav>

  <main class="admin-content">
    <slot />
  </main>
</div>

<style>
  .admin-layout {
    min-height: 100vh;
    background: #f8fafc;
  }

  .admin-header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 2rem;
    text-align: center;
  }

  .admin-header h1 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 2rem;
    font-weight: 700;
  }

  .subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 1rem;
  }

  .admin-tabs {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 0 2rem;
    display: flex;
    gap: 0;
    overflow-x: auto;
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 1rem 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: #374151;
    background: #f9fafb;
  }

  .tab-btn.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
    background: #eff6ff;
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  .tab-label {
    font-size: 0.9rem;
  }

  .admin-content {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .admin-header {
      padding: 1rem;
    }

    .admin-header h1 {
      font-size: 1.5rem;
    }

    .admin-tabs {
      padding: 0 1rem;
    }

    .tab-btn {
      padding: 0.75rem 1rem;
    }

    .tab-label {
      display: none;
    }

    .admin-content {
      padding: 1rem;
    }
  }
</style>
