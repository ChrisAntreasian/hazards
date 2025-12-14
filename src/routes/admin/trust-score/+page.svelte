<script lang="ts">
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";
  import TrustScoreAdmin from "$lib/components/TrustScoreAdmin.svelte";
  import {
    updateTrustScoreConfig,
    adjustTrustScore,
  } from "$lib/utils/trust-score";
  import type { PageData } from "./$types";
  import type { TrustScoreConfig } from "$lib/utils/trust-score";

  let { data }: { data: PageData } = $props();

  async function handleSave(configs: TrustScoreConfig[]) {
    const supabase = $page.data.supabase;

    // Update each config value
    for (const config of configs) {
      await updateTrustScoreConfig(
        supabase,
        config.actionKey,
        config.points,
        data.user.id
      );
    }

    // Reload page data to show updated values
    await invalidateAll();
  }

  async function handleAdjust(userId: string, points: number, reason: string) {
    const supabase = $page.data.supabase;

    await adjustTrustScore(supabase, userId, points, reason, data.user.id);
  }
</script>

<svelte:head>
  <title>Trust Score Administration | Hazards</title>
</svelte:head>

<div class="admin-page">
  <TrustScoreAdmin
    configs={data.configs}
    onSave={handleSave}
    onAdjust={handleAdjust}
  />
</div>

<style>
  .admin-page {
    min-height: 100vh;
    background: #f3f4f6;
    padding: 2rem 0;
  }
</style>
