<script lang="ts">
  import ModerationQueue from "$lib/components/ModerationQueue.svelte";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Content Moderation - Hazards</title>
  <meta
    name="description"
    content="Review and moderate community-submitted hazard reports"
  />
</svelte:head>

<div class="moderation-page">
  <ModerationQueue userId={data.user.id} userRole={data.user.role} />
</div>

<style>
  .moderation-page {
    min-height: calc(100vh - 200px); /* Account for header/footer */
    padding: 0; /* Remove default padding since ModerationQueue handles its own */
    margin: -2rem; /* Counteract the main padding */
  }

  @media (max-width: 768px) {
    .moderation-page {
      margin: -1rem;
    }
  }
</style>
