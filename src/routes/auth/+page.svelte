<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(() => {
    // Redirect to login page
    goto("/auth/log-in", { replaceState: true });
  });
</script>

<svelte:head>
  <title>Redirecting...</title>
</svelte:head>

<div class="redirect-container">
  <p>Redirecting to login...</p>
</div>

<style>
  .redirect-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 50vh;
    color: var(--color-text-secondary);
  }
</style>
