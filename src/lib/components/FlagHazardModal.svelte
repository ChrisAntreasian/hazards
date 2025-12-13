<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		hazardId,
		isOpen = false,
		onClose,
		onSubmit
	}: {
		hazardId: string;
		isOpen: boolean;
		onClose: () => void;
		onSubmit: (data: { reason: string; notes: string }) => Promise<void>;
	} = $props();

	let reason = $state('');
	let notes = $state('');
	let isSubmitting = $state(false);
	let error = $state('');

	const flagReasons = [
		{ value: 'spam', label: 'Spam or advertising' },
		{ value: 'inappropriate', label: 'Inappropriate content' },
		{ value: 'dangerous_advice', label: 'Dangerous or misleading advice' },
		{ value: 'wrong_location', label: 'Wrong location' },
		{ value: 'duplicate', label: 'Duplicate hazard' },
		{ value: 'offensive', label: 'Offensive or abusive' },
		{ value: 'misinformation', label: 'Misinformation' },
		{ value: 'other', label: 'Other (explain below)' }
	];

	function resetForm() {
		reason = '';
		notes = '';
		error = '';
		isSubmitting = false;
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	async function handleSubmit() {
		// Validate
		if (!reason) {
			error = 'Please select a reason for flagging this hazard';
			return;
		}

		if (reason === 'other' && !notes.trim()) {
			error = 'Please provide additional details';
			return;
		}

		error = '';
		isSubmitting = true;

		try {
			await onSubmit({ reason, notes: notes.trim() });
			handleClose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to submit flag';
		} finally {
			isSubmitting = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop" role="button" tabindex="-1" onclick={handleBackdropClick} onkeydown={(e) => e.key === 'Escape' && handleClose()}>
		<div class="modal-content">
			<div class="modal-header">
				<h2>🚩 Flag Hazard</h2>
				<button class="close-button" onclick={handleClose} aria-label="Close">
					<span>×</span>
				</button>
			</div>

			<div class="modal-body">
				<p class="description">
					Help us maintain quality by reporting hazards that violate our community guidelines.
					All flags are reviewed by moderators.
				</p>

				{#if error}
					<div class="error-message">
						{error}
					</div>
				{/if}

				<div class="form-group">
					<label for="reason">
						Reason for flagging <span class="required">*</span>
					</label>
					<select
						id="reason"
						bind:value={reason}
						disabled={isSubmitting}
						class="form-select"
					>
						<option value="">Select a reason...</option>
						{#each flagReasons as flagReason}
							<option value={flagReason.value}>{flagReason.label}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="notes">
						Additional details {reason === 'other' ? '(required)' : '(optional)'}
					</label>
					<textarea
						id="notes"
						bind:value={notes}
						disabled={isSubmitting}
						placeholder="Provide more context about why you're flagging this hazard..."
						rows="4"
						class="form-textarea"
					></textarea>
				</div>

				<div class="info-box">
					<p><strong>Note:</strong> False flags may negatively impact your trust score.</p>
				</div>
			</div>

			<div class="modal-footer">
				<button class="button button-secondary" onclick={handleClose} disabled={isSubmitting}>
					Cancel
				</button>
				<button
					class="button button-primary"
					onclick={handleSubmit}
					disabled={isSubmitting || !reason}
				>
					{isSubmitting ? 'Submitting...' : 'Submit Flag'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: white;
		border-radius: 0.75rem;
		max-width: 32rem;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		line-height: 1;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.modal-body {
		padding: 1.5rem;
	}

	.description {
		margin: 0 0 1.5rem 0;
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.error-message {
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #fef2f2;
		border: 1px solid #fca5a5;
		border-radius: 0.5rem;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.required {
		color: #dc2626;
	}

	.form-select,
	.form-textarea {
		width: 100%;
		padding: 0.625rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: #111827;
		background: white;
		transition: border-color 0.2s;
	}

	.form-select:focus,
	.form-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-select:disabled,
	.form-textarea:disabled {
		background: #f9fafb;
		cursor: not-allowed;
	}

	.form-textarea {
		resize: vertical;
		min-height: 5rem;
		font-family: inherit;
	}

	.info-box {
		padding: 0.75rem;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		color: #1e40af;
	}

	.info-box p {
		margin: 0;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.button {
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.button-secondary {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.button-secondary:hover:not(:disabled) {
		background: #f9fafb;
	}

	.button-primary {
		background: #dc2626;
		color: white;
	}

	.button-primary:hover:not(:disabled) {
		background: #b91c1c;
	}

	@media (max-width: 640px) {
		.modal-content {
			max-height: 95vh;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding: 1rem;
		}

		.modal-footer {
			flex-direction: column;
		}

		.button {
			width: 100%;
		}
	}
</style>
