<script lang="ts">
  interface Props {
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    loading?: boolean;
    variant?: "primary" | "secondary" | "danger";
    loadingText?: string;
    onclick?: () => void;
    children: any;
  }

  let {
    type = "submit",
    disabled = false,
    loading = false,
    variant = "primary",
    loadingText = "Loading...",
    onclick,
    children,
  }: Props = $props();

  const isDisabled = disabled || loading;
</script>

<button
  {type}
  disabled={isDisabled}
  class="btn btn-{variant}"
  class:loading
  {onclick}
>
  {#if loading}
    <div class="spinner"></div>
    {loadingText}
  {:else}
    {@render children()}
  {/if}
</button>

<style>
  .btn {
    width: 100%;
    padding: 0.875rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-sizing: border-box;
  }

  .btn:disabled {
    cursor: not-allowed;
    transform: none;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    background: #9ca3af;
  }

  .btn-secondary {
    background: #6b7280;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #4b5563;
    transform: translateY(-1px);
  }

  .btn-secondary:disabled {
    background: #9ca3af;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
    transform: translateY(-1px);
  }

  .btn-danger:disabled {
    background: #9ca3af;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading {
    opacity: 0.8;
  }
</style>
