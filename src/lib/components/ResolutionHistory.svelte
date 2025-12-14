<script lang="ts">
  import type { ResolutionReport } from "$lib/types/database";

  interface Props {
    /** Resolution report details */
    report: ResolutionReport;
    /** Number of confirmations */
    confirmedCount: number;
    /** Number of disputes */
    disputedCount: number;
    /** Threshold for auto-resolution */
    confirmationThreshold?: number;
  }

  let {
    report,
    confirmedCount,
    disputedCount,
    confirmationThreshold = 3,
  }: Props = $props();

  const totalVotes = $derived(confirmedCount + disputedCount);
  const confirmedPercentage = $derived(
    totalVotes > 0 ? Math.round((confirmedCount / totalVotes) * 100) : 0
  );
  const disputedPercentage = $derived(
    totalVotes > 0 ? Math.round((disputedCount / totalVotes) * 100) : 0
  );

  const willAutoResolve = $derived(
    confirmedCount >= confirmationThreshold && confirmedCount > disputedCount
  );

  const needsMoreConfirmations = $derived(
    confirmedCount < confirmationThreshold && confirmedCount > disputedCount
  );

  const remaining = $derived(
    Math.max(0, confirmationThreshold - confirmedCount)
  );

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
</script>

<div class="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
  <!-- Report Header -->
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm font-medium text-gray-700">Resolution Report</span>
        {#if willAutoResolve}
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300"
          >
            <span>⌛</span>
            <span>Auto-resolving</span>
          </span>
        {/if}
      </div>
      <p class="text-xs text-gray-500">
        Submitted {formatDate(report.created_at)}
      </p>
    </div>
  </div>

  <!-- Resolution Note -->
  <div class="bg-gray-50 rounded-lg p-3">
    <p class="text-sm text-gray-800 whitespace-pre-wrap">
      {report.resolution_note}
    </p>
  </div>

  <!-- Evidence Photo -->
  {#if report.evidence_url}
    <div>
      <p class="text-xs font-medium text-gray-700 mb-2">Evidence Photo:</p>
      <a
        href={report.evidence_url}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
      >
        <span>📷</span>
        <span>View Photo</span>
        <span class="text-xs">↗</span>
      </a>
    </div>
  {/if}

  <!-- Vote Counts -->
  <div class="space-y-2">
    <div class="flex items-center justify-between text-sm">
      <span class="font-medium text-gray-700">Community Feedback</span>
      <span class="text-gray-500"
        >{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span
      >
    </div>

    {#if totalVotes > 0}
      <!-- Progress Bar -->
      <div class="flex h-3 rounded-full overflow-hidden bg-gray-200">
        {#if confirmedCount > 0}
          <div
            class="bg-green-500 transition-all duration-300"
            style="width: {confirmedPercentage}%"
            title="{confirmedCount} confirmed ({confirmedPercentage}%)"
          ></div>
        {/if}
        {#if disputedCount > 0}
          <div
            class="bg-red-500 transition-all duration-300"
            style="width: {disputedPercentage}%"
            title="{disputedCount} disputed ({disputedPercentage}%)"
          ></div>
        {/if}
      </div>

      <!-- Vote Details -->
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-1 text-green-700">
          <span>✓</span>
          <span class="font-medium">{confirmedCount} Confirmed</span>
        </div>
        <div class="flex items-center gap-1 text-red-700">
          <span>✕</span>
          <span class="font-medium">{disputedCount} Disputed</span>
        </div>
      </div>
    {:else}
      <p class="text-sm text-gray-500 italic py-2">
        No confirmations yet. Be the first to verify!
      </p>
    {/if}

    <!-- Status Message -->
    {#if willAutoResolve}
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p class="text-sm text-purple-800">
          <strong>✓ Threshold met!</strong> This hazard will be automatically marked
          as resolved.
        </p>
      </div>
    {:else if needsMoreConfirmations}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p class="text-sm text-blue-800">
          Needs {remaining} more confirmation{remaining !== 1 ? "s" : ""} to auto-resolve
          (threshold: {confirmationThreshold})
        </p>
      </div>
    {:else if disputedCount > confirmedCount}
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p class="text-sm text-yellow-800">
          <strong>⚠ Disputed:</strong> More users report this hazard is still present
        </p>
      </div>
    {/if}
  </div>
</div>
