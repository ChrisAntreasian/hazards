<script lang="ts">
  import type { CreateResolutionReportRequest } from "$lib/types/database";
  import type { ImageUploadResult } from "$lib/types/images";
  import ImageUpload from "$lib/components/ImageUpload.svelte";
  import { createSupabaseLoadClient } from "$lib/supabase";

  interface Props {
    /** Hazard ID to submit resolution for */
    hazardId: string;
    /** Current user ID for image upload */
    userId: string;
    /** Current user session for image upload */
    session: any;
    /** Current user object for image upload */
    user: any;
    /** Callback when report is successfully submitted */
    onSuccess?: () => void;
    /** Callback when form is cancelled */
    onCancel?: () => void;
  }

  let { hazardId, userId, session, user, onSuccess, onCancel }: Props =
    $props();

  const supabase = createSupabaseLoadClient();

  let resolutionNote = $state("");
  let evidenceImageUrls = $state<string[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let success = $state(false);

  const maxNoteLength = 1000;
  const remainingChars = $derived(maxNoteLength - resolutionNote.length);

  // Handle image upload results
  const handleImageUpload = (event: CustomEvent<ImageUploadResult>) => {
    const result = event.detail;
    evidenceImageUrls = [...evidenceImageUrls, result.originalUrl];
  };

  async function handleSubmit() {
    error = null;
    loading = true;

    try {
      const body: CreateResolutionReportRequest = {
        resolution_note: resolutionNote.trim(),
      };

      // Include evidence images if any were uploaded
      if (evidenceImageUrls.length > 0) {
        body.evidence_url = evidenceImageUrls[0]; // Use first image for now
      }

      const response = await fetch(`/api/hazards/${hazardId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit resolution report");
      }

      success = true;

      // Call success callback after a brief delay to show success message
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : "An error occurred";
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    resolutionNote = "";
    evidenceImageUrls = [];
    error = null;
    onCancel?.();
  }

  const isValid = $derived(resolutionNote.trim().length >= 10);
</script>

<div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
  <h3 class="text-lg font-semibold text-gray-900 mb-4">
    Submit Resolution Report
  </h3>

  {#if success}
    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div class="flex items-center gap-2">
        <span class="text-green-600 text-xl">✓</span>
        <p class="text-green-800 font-medium">
          Resolution report submitted successfully!
        </p>
      </div>
      <p class="text-green-700 text-sm mt-2">
        Other users can now confirm or dispute your report.
      </p>
    </div>
  {:else}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div class="space-y-6">
        <!-- Resolution Note -->
        <div>
          <label
            for="resolution-note"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Resolution Details *
          </label>
          <textarea
            id="resolution-note"
            bind:value={resolutionNote}
            placeholder="Describe how the hazard was resolved (e.g., 'Tree removed by city crew', 'Weather cleared, roads dry')"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[120px] text-base"
            maxlength={maxNoteLength}
            required
            disabled={loading}
          ></textarea>
          <div class="flex justify-between items-center mt-2">
            <p class="text-sm text-gray-600">Minimum 10 characters</p>
            <p
              class="text-sm font-medium"
              class:text-gray-600={remainingChars > 100}
              class:text-yellow-600={remainingChars <= 100 &&
                remainingChars > 0}
              class:text-red-600={remainingChars <= 0}
            >
              {remainingChars} characters remaining
            </p>
          </div>
        </div>

        <!-- Evidence Photo Upload (Optional) -->
        <div>
          <div class="block text-sm font-medium text-gray-700 mb-2">
            Evidence Photos (Optional)
          </div>
          <ImageUpload
            {userId}
            {hazardId}
            maxFiles={3}
            disabled={loading}
            supabaseClient={supabase}
            currentSession={session}
            currentUser={user}
            on:upload={handleImageUpload}
          />
          <p class="text-sm text-gray-600 mt-2">
            Upload photos showing the resolved hazard (max 3 images)
          </p>
        </div>

        <!-- Error Message -->
        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-red-800 text-sm">{error}</p>
          </div>
        {/if}

        <!-- Info Box -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-blue-900 text-sm leading-relaxed">
            <strong>Note:</strong> Only one resolution report can be submitted per
            hazard. Other users will be able to confirm or dispute your report.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={!isValid || loading}
            class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold text-base
							hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
							disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {#if loading}
              <span class="flex items-center justify-center gap-2">
                <span class="animate-spin">⏳</span>
                Submitting...
              </span>
            {:else}
              Submit Report
            {/if}
          </button>

          {#if onCancel}
            <button
              type="button"
              onclick={handleCancel}
              disabled={loading}
              class="px-6 py-3 bg-white text-gray-700 rounded-lg font-semibold text-base border border-gray-300
								hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
								disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Cancel
            </button>
          {/if}
        </div>
      </div>
    </form>
  {/if}
</div>
