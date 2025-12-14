<script lang="ts">
  import type { SeasonalPattern } from "$lib/types/database";

  interface Props {
    /** Seasonal pattern with active months */
    pattern: SeasonalPattern;
    /** Optional compact display mode */
    compact?: boolean;
  }

  let { pattern, compact = false }: Props = $props();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const fullMonthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  /**
   * Get current month (1-12)
   */
  const currentMonth = $derived(new Date().getMonth() + 1);

  /**
   * Check if currently in active season
   */
  const isActive = $derived(pattern.active_months.includes(currentMonth));

  /**
   * Format active months as readable string
   */
  const formattedMonths = $derived.by(() => {
    if (!pattern.active_months || pattern.active_months.length === 0) {
      return "No active months";
    }

    const sorted = [...pattern.active_months].sort((a, b) => a - b);

    if (compact) {
      // Show only first and last month in compact mode
      if (sorted.length === 1) {
        return monthNames[sorted[0] - 1];
      }
      return `${monthNames[sorted[0] - 1]}-${monthNames[sorted[sorted.length - 1] - 1]}`;
    }

    // Group consecutive months
    const groups: number[][] = [];
    let currentGroup: number[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentGroup.push(sorted[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
      }
    }
    groups.push(currentGroup);

    // Format groups
    return groups
      .map((group) => {
        if (group.length === 1) {
          return fullMonthNames[group[0] - 1];
        } else if (group.length === 2) {
          return `${fullMonthNames[group[0] - 1]} & ${fullMonthNames[group[1] - 1]}`;
        } else {
          return `${fullMonthNames[group[0] - 1]} - ${fullMonthNames[group[group.length - 1] - 1]}`;
        }
      })
      .join(", ");
  });
</script>

<div class="inline-flex items-center gap-2">
  {#if isActive}
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border bg-green-100 text-green-800 border-green-300"
      title="Currently in active season"
    >
      <span class="text-xs" aria-hidden="true">🌿</span>
      <span>Active Season</span>
    </span>
  {:else}
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border bg-blue-100 text-blue-800 border-blue-300"
      title="Currently dormant"
    >
      <span class="text-xs" aria-hidden="true">❄</span>
      <span>Dormant</span>
    </span>
  {/if}

  {#if !compact}
    <span class="text-sm text-gray-600">
      Active: {formattedMonths}
    </span>
  {/if}
</div>

{#if compact}
  <div class="text-xs text-gray-500 mt-1">
    {formattedMonths}
  </div>
{/if}
