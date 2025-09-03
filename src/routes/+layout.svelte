<script lang="ts">
  import "../app.css";
  import { invalidate } from "$app/navigation";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    createSupabaseLoadClient,
    signOut,
    diagnoseSupabaseIssues,
    getSessionManually,
  } from "$lib/supabase.js";
  import {
    authStore,
    session as authSession,
    user,
    isAuthenticated,
  } from "$lib/stores/auth.js";
  import { preserveAuthState } from "$lib/utils/sessionUtils.js";

  let { children, data } = $props();
  const supabase = createSupabaseLoadClient();

  $effect(() => {
    console.log(
      "🔍 Auth initialization - using server-side session management"
    );
    console.log("- Server session:", data.session ? "EXISTS" : "NULL");
    console.log("- Server user:", data.user ? "EXISTS" : "NULL");

    // Initialize with server data if available
    if (data.session && data.user) {
      console.log("✅ Initializing with server session data");
      authStore.initialize(data.user, data.session);

      // Don't try to set session in client - let server handle it
    } else {
      console.log("❌ No server session - user not logged in");
      // No server session, mark as initialized
      authStore.dispatch({
        type: "INITIALIZE",
        payload: { user: null, session: null },
      });
    }

    // Set up session preservation
    preserveAuthState();

    // Note: Removed onAuthStateChange listener as client auth methods hang
    // Auth state is now managed server-side and passed through data.session
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
        {#if $isAuthenticated}
          <a href="/dashboard">Dashboard</a>
          <a href="/profile">Profile</a>
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
