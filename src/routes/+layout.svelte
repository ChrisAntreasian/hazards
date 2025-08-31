<script lang="ts">
  import "../app.css";
  import { invalidate } from "$app/navigation";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { createSupabaseLoadClient, signOut } from "$lib/supabase.js";
  import {
    session as authSession,
    updateAuthState,
    clearAuthState,
  } from "$lib/stores/auth.js";

  let { children, data } = $props();

  let { session } = $state(data);
  const supabase = createSupabaseLoadClient();

  onMount(() => {
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, _session) => {
        console.log(
          "Auth state changed:",
          event,
          _session ? "session exists" : "no session"
        );

        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          _session?.expires_at !== session?.expires_at
        ) {
          // Update both local and global auth state
          session = _session;
          updateAuthState(_session);
          // Also invalidate to refresh server data
          invalidate("supabase:auth");
        }
      });

      return () => subscription.unsubscribe();
    }
  });

  $effect(() => {
    updateAuthState(data.session);
    session = data.session;
    console.log("Session updated:", session ? "logged in" : "logged out");
  });

  $effect(() => {
    session = data.session;
    console.log("Session updated:", session ? "logged in" : "logged out");
  });

  async function handleSignOut() {
    if (supabase) {
      console.log("Signing out...");
      const { error } = await signOut(supabase);
      if (!error) {
        console.log("Sign out successful");
        // Update session state immediately
        session = null;
        // Force a full page reload to clear all auth state
        window.location.href = "/";
      } else {
        console.error("Sign out error:", error);
        alert("Error signing out: " + error.message);
      }
    } else {
      console.error("Supabase client not available");
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
        {#if session}
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
