<script lang="ts">
	import type { ExpirationStatus } from '$lib/types/database';

	interface Props {
		/** Current expiration status */
		status: ExpirationStatus;
		/** Optional compact mode for smaller displays */
		compact?: boolean;
	}

	let { status, compact = false }: Props = $props();

	/**
	 * Get badge styling based on status
	 */
	const statusConfig = $derived.by(() => {
		switch (status) {
			case 'active':
				return {
					color: 'bg-green-100 text-green-800 border-green-300',
					icon: '✓',
					label: compact ? 'Active' : 'Active',
					description: 'This hazard is currently active'
				};
			case 'expiring_soon':
				return {
					color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
					icon: '⏰',
					label: compact ? 'Expiring' : 'Expiring Soon',
					description: 'This hazard will expire within 24 hours'
				};
			case 'expired':
				return {
					color: 'bg-gray-100 text-gray-800 border-gray-300',
					icon: '✕',
					label: compact ? 'Expired' : 'Expired',
					description: 'This hazard has expired'
				};
			case 'dormant':
				return {
					color: 'bg-blue-100 text-blue-800 border-blue-300',
					icon: '❄',
					label: compact ? 'Dormant' : 'Dormant',
					description: 'This seasonal hazard is currently dormant'
				};
			case 'pending_resolution':
				return {
					color: 'bg-purple-100 text-purple-800 border-purple-300',
					icon: '⌛',
					label: compact ? 'Pending' : 'Pending Resolution',
					description: 'This hazard has been reported resolved and is awaiting confirmation'
				};
			case 'resolved':
				return {
					color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
					icon: '✓',
					label: compact ? 'Resolved' : 'Resolved',
					description: 'This hazard has been resolved'
				};
			default:
				return {
					color: 'bg-gray-100 text-gray-800 border-gray-300',
					icon: '?',
					label: 'Unknown',
					description: 'Status unknown'
				};
		}
	});
</script>

<span
	class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border {statusConfig.color}"
	title={statusConfig.description}
	role="status"
	aria-label={statusConfig.description}
>
	<span class="text-xs" aria-hidden="true">{statusConfig.icon}</span>
	<span>{statusConfig.label}</span>
</span>

<style>
	/* Add subtle animation for expiring_soon status */
	span.bg-yellow-100 {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}
</style>
