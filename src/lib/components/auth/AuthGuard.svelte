<script lang="ts">
  import { useAuth } from '$lib/hooks/useAuth.js';
  import { loading, isAuthenticated } from '$lib/stores/auth.js';
  
  let { children, fallback = null, showLoading = true } = $props();
  
  const auth = useAuth();
</script>

{#if $loading && showLoading}
  <div class="auth-guard-loading">
    <div class="spinner"></div>
    <p>Checking authentication...</p>
  </div>
{:else if $isAuthenticated}
  {@render children()}
{:else}
  {#if fallback}
    {@render fallback()}
  {:else}
    <div class="auth-required">
      <h2>Authentication Required</h2>
      <p>Please <a href="/auth/log-in">sign in</a> to access this content.</p>
    </div>
  {/if}
{/if}

<style>
  .auth-guard-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .auth-required {
    text-align: center;
    padding: 2rem;
  }

  .auth-required h2 {
    color: #1e293b;
    margin-bottom: 1rem;
  }

  .auth-required a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-required a:hover {
    text-decoration: underline;
  }
</style>
