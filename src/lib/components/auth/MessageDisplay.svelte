<script lang="ts">
  interface Props {
    type: "success" | "error" | "info" | "warning";
    message: string;
    dismissible?: boolean;
    onDismiss?: () => void;
  }

  let { type, message, dismissible = false, onDismiss }: Props = $props();

  let dismissed = $state(false);

  function handleDismiss() {
    dismissed = true;
    onDismiss?.();
  }
</script>

{#if message && !dismissed}
  <div class="message message-{type}">
    <div class="message-content">
      <div class="message-icon">
        {#if type === "success"}
          ✅
        {:else if type === "error"}
          ❌
        {:else if type === "warning"}
          ⚠️
        {:else if type === "info"}
          ℹ️
        {/if}
      </div>

      <div class="message-text">
        {message}
      </div>

      {#if dismissible}
        <button
          class="dismiss-btn"
          onclick={handleDismiss}
          aria-label="Dismiss message"
        >
          ×
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .message {
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .message-content {
    display: flex;
    align-items: flex-start;
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .message-icon {
    flex-shrink: 0;
    font-size: 1rem;
  }

  .message-text {
    flex: 1;
    line-height: 1.5;
  }

  .dismiss-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    margin-left: 0.5rem;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .dismiss-btn:hover {
    opacity: 1;
  }

  .message-success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
  }

  .message-error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #dc2626;
  }

  .message-warning {
    background: #fef3c7;
    border: 1px solid #fbbf24;
    color: #92400e;
  }

  .message-info {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    color: #0369a1;
  }

  .message-success .dismiss-btn {
    color: #166534;
  }

  .message-error .dismiss-btn {
    color: #dc2626;
  }

  .message-warning .dismiss-btn {
    color: #92400e;
  }

  .message-info .dismiss-btn {
    color: #0369a1;
  }
</style>
