<script lang="ts">
  interface AuthLink {
    text: string;
    href: string;
    highlight?: boolean;
  }

  interface Props {
    links: AuthLink[];
  }

  let { links }: Props = $props();
</script>

{#if links.length > 0}
  <div class="auth-links">
    {#each links as link}
      <p>
        <a href={link.href} class:highlight={link.highlight}>
          {link.text}
        </a>
      </p>
    {/each}
  </div>
{/if}

<style>
  .auth-links {
    text-align: center;
    margin-top: 1.5rem;
  }

  .auth-links p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    color: #64748b;
  }

  .auth-links a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-links a:hover {
    text-decoration: underline;
  }

  .auth-links a.highlight {
    font-weight: 600;
    color: #1d4ed8;
  }
</style>
