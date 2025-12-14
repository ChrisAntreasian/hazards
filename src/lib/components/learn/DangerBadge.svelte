<script lang="ts">
  import {
    getDangerLevel,
    type DangerLevelInfo,
  } from "$lib/utils/learn-navigation";

  interface Props {
    level: number | null;
    size?: "small" | "medium" | "large";
    showLabel?: boolean;
    showDescription?: boolean;
  }

  let {
    level,
    size = "medium",
    showLabel = true,
    showDescription = false,
  }: Props = $props();

  const info = $derived(getDangerLevel(level));
</script>

{#if info}
  <div class="danger-badge {size} {info.bgColor}">
    <span class="icon">{info.icon}</span>
    {#if showLabel}
      <span class="label {info.color}">{info.label}</span>
    {/if}
    {#if showDescription}
      <span class="description">{info.description}</span>
    {/if}
  </div>
{/if}

<style>
  .danger-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-weight: 500;
  }

  .danger-badge.small {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
  }

  .danger-badge.small .icon {
    font-size: 0.875rem;
  }

  .danger-badge.medium {
    font-size: 0.875rem;
  }

  .danger-badge.medium .icon {
    font-size: 1rem;
  }

  .danger-badge.large {
    font-size: 1rem;
    padding: 0.375rem 0.75rem;
  }

  .danger-badge.large .icon {
    font-size: 1.25rem;
  }

  .label {
    font-weight: 600;
  }

  .description {
    font-size: 0.75rem;
    color: #64748b;
    margin-left: 0.25rem;
  }

  /* Tailwind-like colors */
  :global(.bg-green-100) {
    background-color: #dcfce7;
  }
  :global(.bg-yellow-100) {
    background-color: #fef9c3;
  }
  :global(.bg-orange-100) {
    background-color: #ffedd5;
  }
  :global(.bg-red-100) {
    background-color: #fee2e2;
  }
  :global(.bg-red-200) {
    background-color: #fecaca;
  }

  :global(.text-green-700) {
    color: #15803d;
  }
  :global(.text-yellow-700) {
    color: #a16207;
  }
  :global(.text-orange-700) {
    color: #c2410c;
  }
  :global(.text-red-700) {
    color: #b91c1c;
  }
  :global(.text-red-900) {
    color: #7f1d1d;
  }
</style>
