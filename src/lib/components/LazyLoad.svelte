<!--
 * @fileoverview Lazy loading component wrapper for performance optimization
 * Dynamically imports components only when needed, reducing initial bundle size
 * 
 * @component LazyLoad
 * @author HazardTracker Development Team
 * @version 1.0.0
-->

<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		/** Function that returns a promise of the component to load */
		loader: () => Promise<any>;
		/** Props to pass to the loaded component */
		componentProps?: Record<string, any>;
		/** Loading placeholder content */
		loadingText?: string;
		/** Error fallback content */
		errorText?: string;
	}

	let { 
		loader, 
		componentProps = {}, 
		loadingText = 'Loading...', 
		errorText = 'Failed to load component' 
	}: Props = $props();

	let Component = $state<any>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const module = await loader();
			Component = module.default || module;
			loading = false;
		} catch (err) {
			console.error('Lazy load error:', err);
			error = errorText;
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="lazy-loading">
		<div class="loading-spinner"></div>
		<p>{loadingText}</p>
	</div>
{:else if error}
	<div class="lazy-error">
		<p>{error}</p>
	</div>
{:else if Component}
	<Component {...componentProps} />
{/if}

<style>
	.lazy-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		color: var(--color-text-secondary);
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top: 3px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.lazy-error {
		padding: 1rem;
		background: var(--error-50);
		border: 1px solid var(--error-200);
		border-radius: 6px;
		color: var(--color-error);
		text-align: center;
	}
</style>