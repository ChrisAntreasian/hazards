<script lang="ts">
	import type { CreateResolutionReportRequest } from '$lib/types/database';

	interface Props {
		/** Hazard ID to submit resolution for */
		hazardId: string;
		/** Callback when report is successfully submitted */
		onSuccess?: () => void;
		/** Callback when form is cancelled */
		onCancel?: () => void;
	}

	let { hazardId, onSuccess, onCancel }: Props = $props();

	let resolutionNote = $state('');
	let evidenceUrl = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	const maxNoteLength = 1000;
	const remainingChars = $derived(maxNoteLength - resolutionNote.length);

	async function handleSubmit() {
		error = null;
		loading = true;

		try {
			const body: CreateResolutionReportRequest = {
				resolution_note: resolutionNote.trim(),
			};

			if (evidenceUrl.trim()) {
				body.evidence_url = evidenceUrl.trim();
			}

			const response = await fetch(`/api/hazards/${hazardId}/resolve`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to submit resolution report');
			}

			success = true;
			
			// Call success callback after a brief delay to show success message
			setTimeout(() => {
				onSuccess?.();
			}, 1500);
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		resolutionNote = '';
		evidenceUrl = '';
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
				<p class="text-green-800 font-medium">Resolution report submitted successfully!</p>
			</div>
			<p class="text-green-700 text-sm mt-2">
				Other users can now confirm or dispute your report.
			</p>
		</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<div class="space-y-4">
				<!-- Resolution Note -->
				<div>
					<label for="resolution-note" class="block text-sm font-medium text-gray-700 mb-1">
						Resolution Details *
					</label>
					<textarea
						id="resolution-note"
						bind:value={resolutionNote}
						placeholder="Describe how the hazard was resolved (e.g., 'Tree removed by city crew', 'Weather cleared, roads dry')"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
						rows="4"
						maxlength={maxNoteLength}
						required
						disabled={loading}
					></textarea>
					<div class="flex justify-between items-center mt-1">
						<p class="text-xs text-gray-500">
							Minimum 10 characters
						</p>
						<p 
							class="text-xs"
							class:text-gray-500={remainingChars > 100}
							class:text-yellow-600={remainingChars <= 100 && remainingChars > 0}
							class:text-red-600={remainingChars <= 0}
						>
							{remainingChars} characters remaining
						</p>
					</div>
				</div>

				<!-- Evidence URL (Optional) -->
				<div>
					<label for="evidence-url" class="block text-sm font-medium text-gray-700 mb-1">
						Evidence Photo URL (Optional)
					</label>
					<input
						id="evidence-url"
						type="url"
						bind:value={evidenceUrl}
						placeholder="https://example.com/photo.jpg"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						disabled={loading}
					/>
					<p class="text-xs text-gray-500 mt-1">
						Link to a photo showing the resolved hazard
					</p>
				</div>

				<!-- Error Message -->
				{#if error}
					<div class="bg-red-50 border border-red-200 rounded-lg p-3">
						<p class="text-red-800 text-sm">{error}</p>
					</div>
				{/if}

				<!-- Info Box -->
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
					<p class="text-blue-800 text-sm">
						<strong>Note:</strong> Only one resolution report can be submitted per hazard.
						Other users will be able to confirm or dispute your report.
					</p>
				</div>

				<!-- Actions -->
				<div class="flex gap-3 pt-2">
					<button
						type="submit"
						disabled={!isValid || loading}
						class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium
							hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
							disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
							class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium
								hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
								disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Cancel
						</button>
					{/if}
				</div>
			</div>
		</form>
	{/if}
</div>
