<script lang="ts">
  interface Props {
    icon?: string;
    title: string;
    description?: string | null;
    shortDescription?: string | null;
    color?: string;
  }

  let {
    icon = "",
    title,
    description = null,
    shortDescription = null,
    color = "from-blue-500 to-indigo-600",
  }: Props = $props();

  // Use short description if available, otherwise full description
  const displayDescription = $derived(shortDescription || description);
</script>

<header class="content-header">
  {#if icon}
    <div class="icon-wrapper bg-gradient-to-br {color}">
      <span class="icon">{icon}</span>
    </div>
  {/if}
  <div class="text-content">
    <h1>{title}</h1>
    {#if displayDescription}
      <p class="description">{displayDescription}</p>
    {/if}
  </div>
</header>

<style>
  .content-header {
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .icon-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 2.5rem;
  }

  .text-content {
    flex: 1;
    min-width: 0;
  }

  h1 {
    font-size: 2rem;
    font-weight: bold;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
    line-height: 1.2;
  }

  .description {
    font-size: 1.125rem;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  @media (max-width: 640px) {
    .content-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .icon-wrapper {
      width: 64px;
      height: 64px;
    }

    .icon {
      font-size: 2rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .description {
      font-size: 1rem;
    }
  }
</style>
