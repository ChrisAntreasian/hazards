<script lang="ts">
  import {
    createSupabaseLoadClient,
    isSupabaseConfigured,
  } from "$lib/supabase.js";

  let connectionStatus = $state("Testing...");
  let dbTables: string[] = $state([]);
  let regions: any[] = $state([]);
  let categories: any[] = $state([]);
  let error = $state("");

  const supabase = createSupabaseLoadClient();

  $effect(() => {
    testConnection();
  });

  async function testConnection() {
    if (!supabase) {
      connectionStatus = "❌ Supabase not configured";
      return;
    }

    try {
      // Test 1: Basic connection - test with a simple query first
      connectionStatus = "🔄 Testing connection...";

      // Test basic connection with health check
      const { data: healthData, error: healthError } = await supabase
        .from("regions")
        .select("count(*)", { count: "exact", head: true });

      if (healthError) {
        console.log("Dev: Health check failed -", healthError.message);
        error = "Database connection failed. Please check configuration.";
        connectionStatus = "❌ Connection failed";
        return;
      }

      connectionStatus = "✅ Connected to Supabase";

      // Test 2: Query regions table
      const { data: regionsData, error: regionsError } = await supabase
        .from("regions")
        .select("*");

      if (regionsError) {
        console.log("Dev: Regions query error -", regionsError.message);
        if (
          regionsError.message.includes("permission denied") ||
          regionsError.message.includes("session missing")
        ) {
          regions = [];
          error =
            "Some data requires authentication. Please login to see all features.";
        } else {
          throw regionsError;
        }
      } else {
        regions = regionsData || [];
      }

      // Test 3: Query hazard categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("hazard_categories")
        .select("*")
        .order("level", { ascending: true });

      if (categoriesError) {
        console.log("Dev: Categories query error -", categoriesError.message);
        if (
          categoriesError.message.includes("permission denied") ||
          categoriesError.message.includes("session missing")
        ) {
          categories = [];
        } else {
          throw categoriesError;
        }
      } else {
        categories = categoriesData || [];
      }
    } catch (e: any) {
      connectionStatus = "❌ Connection failed";
      error = e.message || "Unknown error";
      console.error("Dev: Database test error -", e.message);
    }
  }

  async function testUserRegistration() {
    alert("Use the actual registration page for testing: /auth/register");
  }
</script>

<svelte:head>
  <title>Database Test - Hazards App</title>
</svelte:head>

<div class="test-container">
  <h1>🧪 Database Connection Test</h1>

  <div class="test-section">
    <h2>Connection Status</h2>
    <div class="status-card">
      <p class="status">{connectionStatus}</p>
      {#if error}
        <div class="error">
          <strong>Error:</strong>
          {error}
        </div>
      {/if}
    </div>
  </div>

  <div class="test-section">
    <h2>Configuration Check</h2>
    <div class="config-card">
      <p>
        ✅ Supabase URL: {isSupabaseConfigured() ? "Configured" : "Missing"}
      </p>
      <p>✅ Anon Key: {isSupabaseConfigured() ? "Configured" : "Missing"}</p>
      <p>✅ Environment: {import.meta.env.VITE_APP_ENV || "development"}</p>
    </div>
  </div>

  {#if regions.length > 0}
    <div class="test-section">
      <h2>📍 Regions Data</h2>
      <div class="data-card">
        {#each regions as region}
          <div class="region-item">
            <strong>{region.name}</strong> ({region.id})
            <br />
            <small>Timezone: {region.timezone}</small>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if categories.length > 0}
    <div class="test-section">
      <h2>📂 Hazard Categories</h2>
      <div class="data-card">
        {#each categories as category}
          <div
            class="category-item"
            style="margin-left: {category.level * 20}px;"
          >
            {category.icon} <strong>{category.name}</strong>
            <br />
            <small>Path: {category.path} | Level: {category.level}</small>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="test-section">
    <h2>🔐 Authentication Test</h2>
    <div class="auth-test-card">
      <p>Test user registration (creates a temporary test account):</p>
      <button onclick={testUserRegistration} class="btn btn-test">
        Test User Registration
      </button>
      <p class="note">
        Note: This will create a test user and send a confirmation email.
      </p>
    </div>
  </div>

  <div class="test-section">
    <h2>🔗 Useful Links</h2>
    <div class="links-card">
      <a href="/auth/log-in" class="btn btn-secondary">Test Login Page</a>
      <a href="/auth/register" class="btn btn-secondary"
        >Test Registration Page</a
      >
      <a
        href="https://vmnutxcgbfomkrscwgcy.supabase.co/project/default/editor"
        target="_blank"
        class="btn btn-secondary"
      >
        Open Supabase Dashboard
      </a>
    </div>
  </div>

  <div class="back-link">
    <a href="/">← Back to Home</a>
  </div>
</div>

<style>
  .test-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    text-align: center;
    color: #1e293b;
    margin-bottom: 2rem;
  }

  .test-section {
    margin-bottom: 2rem;
  }

  .test-section h2 {
    color: #374151;
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }

  .status-card,
  .config-card,
  .data-card,
  .auth-test-card,
  .links-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .status {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #dc2626;
    padding: 1rem;
    border-radius: 6px;
    margin-top: 1rem;
  }

  .config-card p {
    margin: 0.5rem 0;
    color: #374151;
  }

  .region-item,
  .category-item {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    color: #374151;
  }

  .region-item:last-child,
  .category-item:last-child {
    border-bottom: none;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    margin: 0.5rem 0.5rem 0.5rem 0;
    transition: all 0.2s;
  }

  .btn-test {
    background: #8b5cf6;
    color: white;
  }

  .btn-test:hover {
    background: #7c3aed;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
  }

  .note {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }

  .links-card {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .back-link {
    text-align: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
  }

  .back-link a {
    color: #6b7280;
    text-decoration: none;
  }

  .back-link a:hover {
    color: #2563eb;
  }

  @media (max-width: 640px) {
    .test-container {
      padding: 1rem;
    }

    .links-card {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      text-align: center;
    }
  }
</style>
