<!--
 * @fileoverview Optimized image component with lazy loading and responsive sizing
 * Improves performance by deferring image loading until needed
 * 
 * @component OptimizedImage
 * @author HazardTracker Development Team
 * @version 1.0.0
-->

<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		src: string;
		alt: string;
		width?: number;
		height?: number;
		loading?: 'lazy' | 'eager';
		class?: string;
		placeholder?: string;
	}

	let { 
		src, 
		alt, 
		width, 
		height, 
		loading = 'lazy',
		class: className = '',
		placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg=='
	}: Props = $props();

	let imageElement = $state<HTMLImageElement>();
	let loaded = $state(false);
	let error = $state(false);
	let observer = $state<IntersectionObserver | null>(null);

	onMount(() => {
		if (loading === 'lazy' && 'IntersectionObserver' in window) {
			observer = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && imageElement) {
						imageElement.src = src;
						observer?.unobserve(imageElement);
					}
				});
			}, { rootMargin: '50px' });

			if (imageElement) {
				observer.observe(imageElement);
			}

			return () => {
				observer?.disconnect();
			};
		}
	});

	function handleLoad() {
		loaded = true;
	}

	function handleError() {
		error = true;
	}
</script>

<div class="image-container {className}" style="width: {width}px; height: {height}px;">
	<img
		bind:this={imageElement}
		src={loading === 'eager' ? src : placeholder}
		{alt}
		{width}
		{height}
		class:loaded
		class:error
		on:load={handleLoad}
		on:error={handleError}
		loading={loading}
	/>
	
	{#if !loaded && !error}
		<div class="loading-overlay">
			<div class="loading-spinner"></div>
		</div>
	{/if}
	
	{#if error}
		<div class="error-overlay">
			<p>Failed to load image</p>
		</div>
	{/if}
</div>

<style>
	.image-container {
		position: relative;
		display: inline-block;
		overflow: hidden;
		background: var(--color-bg-muted);
		border-radius: 6px;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: opacity 0.3s ease;
		opacity: 0;
	}

	img.loaded {
		opacity: 1;
	}

	img.error {
		opacity: 0.5;
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-muted);
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-border);
		border-top: 2px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--error-50);
		color: var(--color-error);
		font-size: 0.875rem;
		text-align: center;
	}
</style>