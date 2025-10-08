<script lang="ts">
  import "../app.css";
  import { invalidate } from "$app/navigation";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { createSupabaseLoadClient, signOut } from "$lib/supabase.js";
  import { dev } from "$app/environment";
  import {
    authStore,
    session as authSession,
    user,
    isAuthenticated,
    displayAsLoggedOut,
  } from "$lib/stores/auth.js";
  import { preserveAuthState } from "$lib/utils/sessionUtils.js";
  import { detectPasswordResetContext } from "$lib/utils/routeProtection.js";

  let { children, data } = $props();
  const supabase = createSupabaseLoadClient();

  // Track user role for conditional navigation
  let userRole = $state(data.userRole);

  $effect(() => {
    // Update auth state with server data
    if (data.session && data.user) {
      console.log("Auth: Initializing session for", data.user.email);
      authStore.updateAuthState(data.session, data.user);
    } else {
      authStore.clearAuthState();
    }

    // Update user role
    userRole = data.userRole;
  });

  // Detect password reset context from current route
  $effect(() => {
    const isInPasswordReset = detectPasswordResetContext($page.url.pathname);
    authStore.setPasswordReset(isInPasswordReset);
  });

  async function handleSignOut() {
    if (supabase) {
      authStore.setLoading(true);
      const { error } = await signOut(supabase);

      if (!error) {
        // Clear auth state immediately
        authStore.clearAuthState();

        // Force page reload to clear all state and reload from server
        window.location.href = "/auth/log-in";
      } else {
        console.error("Logout failed:", error);

        // Even if logout failed, clear local state
        authStore.clearAuthState();
        window.location.href = "/auth/log-in";
      }
    }
  }
</script>

<div class="app">
  <header>
    <nav class="navbar">
      <div class="nav-brand">
        <a href="/">🚨 Hazards</a>
      </div>
      <div class="nav-links">
        {#if $isAuthenticated && !$displayAsLoggedOut}
          <a href="/dashboard">Dashboard</a>
          <a href="/profile">Profile</a>
          {#if userRole === "admin" || userRole === "moderator"}
            <a href="/moderation" class="mod-link">⚖️ Moderation</a>
          {/if}
          {#if userRole === "admin"}
            <a href="/admin" class="admin-link">👑 Admin</a>
          {/if}
          {#if dev}
            <a href="/dev" class="dev-link">🔧 Dev</a>
          {/if}
          <button onclick={handleSignOut}>Sign Out</button>
        {:else}
          <a href="/auth/log-in">Login</a>
          <a href="/auth/register">Register</a>
        {/if}
      </div>
    </nav>
  </header>

  <main>
    {@render children()}
  </main>

  <footer>
    <p>&copy; 2025 Hazards App - Keep safe outdoors</p>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #2563eb;
    color: white;
  }

  .nav-brand a {
    font-size: 1.5rem;
    font-weight: bold;
    text-decoration: none;
    color: white;
  }

  .nav-links {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .nav-links a,
  .nav-links button {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .nav-links a:hover,
  .nav-links button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .nav-links .dev-link {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    font-size: 0.875rem;
  }

  .nav-links .dev-link:hover {
    background: rgba(59, 130, 246, 0.3);
  }

  .nav-links .mod-link {
    background: rgba(245, 158, 11, 0.2);
    border: 1px solid rgba(245, 158, 11, 0.3);
    font-size: 0.875rem;
  }

  .nav-links .mod-link:hover {
    background: rgba(245, 158, 11, 0.3);
  }

  .nav-links .admin-link {
    background: rgba(220, 38, 38, 0.2);
    border: 1px solid rgba(220, 38, 38, 0.3);
    font-size: 0.875rem;
  }

  .nav-links .admin-link:hover {
    background: rgba(220, 38, 38, 0.3);
  }

  main {
    flex: 1;
    padding: 2rem;
    width: 100%;
    max-width: none; /* Full width for map */
    margin: 0;
    box-sizing: border-box;
  }

  footer {
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    color: #64748b;
  }

  @media (max-width: 768px) {
    .navbar {
      padding: 1rem;
    }

    .nav-links {
      gap: 0.5rem;
    }

    .nav-links a,
    .nav-links button {
      padding: 0.5rem;
      font-size: 0.9rem;
    }

    main {
      padding: 1rem;
    }
  }
</style>
