<script lang="ts">
	/**
	 * Educational content card component
	 * Main component for displaying comprehensive educational content about a hazard
	 */
	import type { EducationalContent, ContentFileType, USRegion } from '$lib/types/educational';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import ContentNavigationTabs from './ContentNavigationTabs.svelte';
	import RegionalContentSelector from './RegionalContentSelector.svelte';

	export let content: EducationalContent;
	export let showImages: boolean = true;
	export let defaultTab: ContentFileType = 'overview';
	export let defaultRegion: USRegion = 'northeast';

	let activeTab = defaultTab;
	let selectedRegion = defaultRegion;

	// Filter out regional_notes for main tabs (it gets its own section)
	$: mainContentFiles = content.files.filter((f) => f.type !== 'regional_notes');
	$: regionalNotesFile = content.files.find((f) => f.type === 'regional_notes');

	function handleTabChange(fileType: ContentFileType) {
		activeTab = fileType;
	}

	function handleRegionChange(region: USRegion) {
		selectedRegion = region;
	}
</script>

<div class="educational-content-card">
	<!-- Header -->
	<div class="content-header">
		<h2 class="content-title">{content.displayName}</h2>
		<div class="content-meta">
			<span class="category-badge">{content.category}</span>
			<span class="subcategory-badge">{content.subcategory}</span>
		</div>
	</div>

	<!-- Images Gallery (if available and enabled) -->
	{#if showImages && content.images.length > 0}
		<div class="images-gallery">
			<h3 class="gallery-title">Photos</h3>
			<div class="gallery-grid">
				{#each content.images as imageUrl (imageUrl)}
					<div class="gallery-item">
						<img src={imageUrl} alt="{content.displayName} example" loading="lazy" />
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Main Content Tabs -->
	<div class="main-content">
		<ContentNavigationTabs files={mainContentFiles} {activeTab} onTabChange={handleTabChange} let:content let:file>
			<article class="content-section">
				<MarkdownRenderer content={content} />
			</article>
		</ContentNavigationTabs>
	</div>

	<!-- Regional Content (if available) -->
	{#if content.regionalContent.length > 0}
		<div class="regional-content">
			<h3 class="regional-title">Regional Information</h3>
			<p class="regional-description">
				This hazard may vary by region. Select your area to see location-specific information.
			</p>
			<RegionalContentSelector
				regionalContent={content.regionalContent}
				{selectedRegion}
				onRegionChange={handleRegionChange}
				let:content
			>
				<article class="content-section">
					<MarkdownRenderer content={content} />
				</article>
			</RegionalContentSelector>
		</div>
	{/if}

	<!-- Footer Meta -->
	{#if content.lastPublished}
		<div class="content-footer">
			<p class="last-updated">
				Last updated: {content.lastPublished.toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</p>
		</div>
	{/if}
</div>

<style>
	.educational-content-card {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		background-color: var(--color-bg-card, #fff);
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.content-header {
		border-bottom: 2px solid var(--color-border, #e5e7eb);
		padding-bottom: 1rem;
	}

	.content-title {
		font-size: 1.875rem;
		font-weight: 700;
		margin: 0 0 0.75rem 0;
		color: var(--color-text-heading, #000);
	}

	.content-meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.category-badge,
	.subcategory-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.category-badge {
		background-color: var(--color-bg-badge-primary, #dbeafe);
		color: var(--color-text-badge-primary, #1e40af);
	}

	.subcategory-badge {
		background-color: var(--color-bg-badge-secondary, #f3e8ff);
		color: var(--color-text-badge-secondary, #6b21a8);
	}

	.images-gallery {
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.5rem;
		padding: 1rem;
		background-color: var(--color-bg-gallery, #fafafa);
	}

	.gallery-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--color-text-heading, #000);
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.gallery-item {
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: 0.5rem;
		background-color: var(--color-bg-image, #e5e7eb);
	}

	.gallery-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s;
	}

	.gallery-item:hover img {
		transform: scale(1.05);
	}

	.main-content {
		margin: 0;
	}

	.regional-content {
		border-top: 1px solid var(--color-border, #e5e7eb);
		padding-top: 1.5rem;
	}

	.regional-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: var(--color-text-heading, #000);
	}

	.regional-description {
		margin: 0 0 1rem 0;
		color: var(--color-text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.content-section {
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.content-footer {
		border-top: 1px solid var(--color-border, #e5e7eb);
		padding-top: 1rem;
		text-align: center;
	}

	.last-updated {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
		font-style: italic;
	}

	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.educational-content-card {
			padding: 1rem;
			gap: 1rem;
		}

		.content-title {
			font-size: 1.5rem;
		}

		.gallery-grid {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 0.75rem;
		}

		.regional-content {
			padding-top: 1rem;
		}
	}
</style>
