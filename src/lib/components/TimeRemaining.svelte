<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		/** Expiration timestamp (ISO 8601 string) */
		expiresAt: string;
		/** Optional compact display mode */
		compact?: boolean;
		/** Show warning style when time is low */
		showWarning?: boolean;
	}

	let { expiresAt, compact = false, showWarning = true }: Props = $props();

	let timeRemaining = $state<number | null>(null); // seconds
	let intervalId: number | undefined;

	/**
	 * Calculate time remaining in seconds
	 */
	function updateTimeRemaining() {
		const now = new Date();
		const expires = new Date(expiresAt);
		const remainingMs = expires.getTime() - now.getTime();

		if (remainingMs <= 0) {
			timeRemaining = 0;
		} else {
			timeRemaining = Math.floor(remainingMs / 1000);
		}
	}

	/**
	 * Format time remaining as human-readable string
	 */
	const formattedTime = $derived.by(() => {
		if (timeRemaining === null || timeRemaining === 0) {
			return 'Expired';
		}

		const seconds = timeRemaining;
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (compact) {
			if (days > 0) return `${days}d`;
			if (hours > 0) return `${hours}h`;
			if (minutes > 0) return `${minutes}m`;
			return `${seconds}s`;
		}

		if (days > 0) {
			const remainingHours = hours % 24;
			return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} day${days !== 1 ? 's' : ''}`;
		}

		if (hours > 0) {
			const remainingMinutes = minutes % 60;
			return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hour${hours !== 1 ? 's' : ''}`;
		}

		if (minutes > 0) {
			return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
		}

		return `${seconds} second${seconds !== 1 ? 's' : ''}`;
	});

	/**
	 * Determine if we should show warning styling
	 */
	const isWarning = $derived.by(() => {
		if (!showWarning || timeRemaining === null) return false;

		const hours = timeRemaining / 3600;
		return hours <= 24; // Warning if 24 hours or less
	});

	/**
	 * Determine if expired
	 */
	const isExpired = $derived(timeRemaining === 0);

	onMount(() => {
		updateTimeRemaining();
		// Update every second
		intervalId = window.setInterval(updateTimeRemaining, 1000);
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

<div
	class="inline-flex items-center gap-2"
	class:text-red-600={isExpired}
	class:text-yellow-600={isWarning && !isExpired}
	class:text-gray-600={!isWarning && !isExpired}
>
	{#if !compact}
		<span class="text-sm font-medium">
			{#if isExpired}
				⏱️ Expired
			{:else if isWarning}
				⏰ Expires in:
			{:else}
				⏱️ Expires in:
			{/if}
		</span>
	{/if}
	
	<span 
		class="font-mono text-sm"
		class:font-bold={isWarning}
		title={`Expires at ${new Date(expiresAt).toLocaleString()}`}
	>
		{formattedTime}
	</span>
</div>

<style>
	/* Add pulsing animation for warning state */
	.text-yellow-600 {
		animation: warning-pulse 2s ease-in-out infinite;
	}

	@keyframes warning-pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}
</style>
