<script lang="ts">
  import { isSupabaseConfigured } from "$lib/supabase.js";

  interface Props {
    title: string;
    subtitle: string;
    children: any;
  }

  let { title, subtitle, children }: Props = $props();

  const configured = isSupabaseConfigured();
</script>

<svelte:head>
  <title>{title} - Hazards App</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <h1>{title}</h1>
    <p class="subtitle">{subtitle}</p>

    {#if !configured}
      <div class="warning">
        <h3>⚠️ Supabase Not Configured</h3>
        <p>To enable authentication, please:</p>
        <ol>
          <li>Create a Supabase project</li>
          <li>Update your <code>.env.local</code> file</li>
          <li>Run the database migration</li>
        </ol>
        <p>See <code>SUPABASE_SETUP.md</code> for detailed instructions.</p>
      </div>
    {:else}
      {@render children()}
    {/if}

    <div class="back-link">
      <a href="/">← Back to Home</a>
    </div>
  </div>
</div>

<style>
  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem;
  }

  .auth-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    max-width: 420px;
    width: 100%;
    border: 1px solid #e2e8f0;
  }

  h1 {
    text-align: center;
    margin-bottom: 0.5rem;
    color: #1e293b;
    font-size: 1.75rem;
  }

  .subtitle {
    text-align: center;
    color: #64748b;
    margin-bottom: 2rem;
    font-size: 0.95rem;
  }

  .warning {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .warning h3 {
    color: #92400e;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .warning p {
    color: #92400e;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .warning ol {
    color: #92400e;
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .warning code {
    background: #fbbf24;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .back-link {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .back-link a {
    color: #64748b;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back-link a:hover {
    color: #2563eb;
  }

  @media (max-width: 480px) {
    .auth-container {
      padding: 1rem;
    }

    .auth-card {
      padding: 1.5rem;
      margin: 0.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }
  }
</style>
