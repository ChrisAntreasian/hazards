<script lang="ts">
  interface Props {
    message?: string;
    title?: string;
  }

  let { message = "Content coming soon.", title = "" }: Props = $props();
</script>

<div class="coming-soon">
  {#if title}
    <h3>{title}</h3>
  {/if}
  <div class="placeholder">
    <span class="icon">🚧</span>
    <p>{message}</p>
  </div>
</div>

<style>
  .coming-soon {
    padding: 2rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 2px dashed #e2e8f0;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #475569;
    margin: 0 0 1rem 0;
  }

  .placeholder {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: #64748b;
  }

  .icon {
    font-size: 2rem;
  }

  p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
  }
</style>
