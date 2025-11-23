<script lang="ts">
  interface Props {
    /** Hazard ID */
    hazardId: string;
    /** Current user's confirmation (if any) */
    userConfirmation?: "confirmed" | "disputed" | null;
    /** Callback when confirmation changes */
    onConfirmationChange?: () => void;
  }

  let {
    hazardId,
    userConfirmation = null,
    onConfirmationChange,
  }: Props = $props();

  let loading = $state(false);
  let error = $state<string | null>(null);
  let currentConfirmation = $state(userConfirmation);

  async function handleConfirm(type: "confirmed" | "disputed") {
    error = null;
    loading = true;

    try {
      const response = await fetch(
        `/api/hazards/${hazardId}/resolution-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmation_type: type }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit confirmation");
      }

      currentConfirmation = type;
      onConfirmationChange?.();
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      loading = false;
    }
  }

  async function handleRemove() {
    error = null;
    loading = true;

    try {
      const response = await fetch(
        `/api/hazards/${hazardId}/resolution-confirmation`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove confirmation");
      }

      currentConfirmation = null;
      onConfirmationChange?.();
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      loading = false;
    }
  }
</script>

<div class="space-y-3">
  <h4 class="text-sm font-medium text-gray-700">Is this hazard resolved?</h4>

  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
      <p class="text-red-800 text-sm">{error}</p>
    </div>
  {/if}

  <div class="flex gap-3">
    <button
      type="button"
      onclick={() => handleConfirm("confirmed")}
      disabled={loading || currentConfirmation === "confirmed"}
      class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
				{currentConfirmation === 'confirmed'
        ? 'bg-green-600 text-white border-2 border-green-600'
        : 'bg-white text-green-700 border-2 border-green-300 hover:bg-green-50'}
				disabled:opacity-50 disabled:cursor-not-allowed
				focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
    >
      <span class="text-lg">✓</span>
      <span>Yes, Resolved</span>
    </button>

    <button
      type="button"
      onclick={() => handleConfirm("disputed")}
      disabled={loading || currentConfirmation === "disputed"}
      class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
				{currentConfirmation === 'disputed'
        ? 'bg-red-600 text-white border-2 border-red-600'
        : 'bg-white text-red-700 border-2 border-red-300 hover:bg-red-50'}
				disabled:opacity-50 disabled:cursor-not-allowed
				focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      <span class="text-lg">✕</span>
      <span>No, Still There</span>
    </button>
  </div>

  {#if currentConfirmation}
    <button
      type="button"
      onclick={handleRemove}
      disabled={loading}
      class="w-full px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100
				rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Remove my confirmation
    </button>
  {/if}

  {#if currentConfirmation === "confirmed"}
    <p
      class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2"
    >
      You confirmed this hazard is resolved
    </p>
  {:else if currentConfirmation === "disputed"}
    <p
      class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2"
    >
      You reported this hazard is still present
    </p>
  {/if}
</div>
