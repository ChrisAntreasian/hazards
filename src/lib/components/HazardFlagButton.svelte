<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let { hazardId, userHasFlagged = false, disabled = false }: {
		hazardId: string;
		userHasFlagged?: boolean;
		disabled?: boolean;
	} = $props();

	const dispatch = createEventDispatcher();

	function handleClick() {
		if (!disabled && !userHasFlagged) {
			dispatch('flag');
		}
	}
</script>

<button
	class="flag-button"
	class:flagged={userHasFlagged}
	{disabled}
	onclick={handleClick}
	aria-label={userHasFlagged ? 'Already flagged' : 'Flag this hazard'}
>
	<span class="icon">🚩</span>
	<span class="label">
		{userHasFlagged ? 'Flagged' : 'Flag Hazard'}
	</span>
</button>

<style>
	.flag-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s;
	}

	.flag-button:hover:not(:disabled):not(.flagged) {
		background: #fef2f2;
		border-color: #fca5a5;
		color: #dc2626;
	}

	.flag-button.flagged {
		background: #fef2f2;
		border-color: #fca5a5;
		color: #dc2626;
		cursor: default;
	}

	.flag-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.icon {
		font-size: 1rem;
	}

	.label {
		white-space: nowrap;
	}

	@media (max-width: 640px) {
		.flag-button {
			padding: 0.375rem 0.75rem;
			font-size: 0.8125rem;
		}
	}
</style>
