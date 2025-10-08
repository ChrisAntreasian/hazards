<script lang="ts">
  import { onMount } from "svelte";

  let isLoading = $state(true);

  onMount(() => {
    // Simulate loading
    setTimeout(() => {
      isLoading = false;
    }, 1000);
  });
</script>

<div class="analytics-dashboard">
  <div class="header">
    <h2>Analytics Dashboard</h2>
    <p class="subtitle">Monitor application usage and performance metrics</p>
  </div>

  {#if isLoading}
    <div class="loading">Loading analytics...</div>
  {:else}
    <div class="alert alert-warning">
      <div class="alert-icon">🚧</div>
      <div>
        <h3>Feature Not Implemented</h3>
        <p>
          The analytics dashboard is currently under development. This feature
          will include:
        </p>
        <ul>
          <li>User engagement metrics</li>
          <li>Hazard submission statistics</li>
          <li>Geographic distribution of reports</li>
          <li>Performance monitoring</li>
          <li>Real-time activity feeds</li>
        </ul>
        <p>
          <strong>Implementation needed:</strong> Backend analytics tracking, data
          aggregation services, charting library integration, and real-time websocket
          connections.
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .analytics-dashboard {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .header h2 {
    margin: 0;
    color: #1f2937;
    font-size: 1.875rem;
    font-weight: 600;
  }

  .subtitle {
    margin: 0.5rem 0 0 0;
    color: #6b7280;
    font-size: 1rem;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #6b7280;
    font-size: 1.125rem;
  }

  .alert {
    border-radius: 0.5rem;
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .alert-warning {
    background: #fffbeb;
    border: 1px solid #f59e0b;
  }

  .alert-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .alert h3 {
    margin: 0 0 0.5rem 0;
    color: #92400e;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .alert p {
    margin: 0.5rem 0;
    color: #92400e;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .alert ul {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
    color: #92400e;
    font-size: 0.875rem;
  }

  .alert li {
    margin: 0.25rem 0;
  }
</style>
