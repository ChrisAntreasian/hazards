<script lang="ts">
	import { TRUST_SCORE_TIERS, type TrustScoreTier } from '$lib/utils/trust-score';

	export let score: number;
	export let tier: TrustScoreTier | undefined = undefined;
	export let showTier: boolean = true;
	export let compact: boolean = false;
	export let clickable: boolean = false;
	export let onClick: (() => void) | undefined = undefined;

	// Calculate tier if not provided
	$: computedTier =
		tier || (score >= 2000
			? 'Guardian'
			: score >= 1000
				? 'Expert'
				: score >= 500
					? 'Community Leader'
					: score >= 200
						? 'Trusted'
						: score >= 50
							? 'Contributor'
							: 'New User');

	$: tierConfig = TRUST_SCORE_TIERS[computedTier];
	$: formattedScore = score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score.toString();
</script>

<button
	class="trust-score-badge"
	class:compact
	class:clickable
	on:click={onClick}
	disabled={!clickable}
	type="button"
	aria-label="Trust score: {score} ({computedTier})"
	style="--tier-color: {tierConfig.color}"
>
	{#if showTier}
		<span class="tier-icon" aria-hidden="true">{tierConfig.icon}</span>
	{/if}
	<span class="score">{formattedScore}</span>
	{#if !compact && showTier}
		<span class="tier-name">{computedTier}</span>
	{/if}
</button>

<style>
	.trust-score-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		background: linear-gradient(135deg, var(--tier-color, #9ca3af) 0%, var(--tier-color, #9ca3af) 100%);
		color: white;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 600;
		border: 2px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
		cursor: default;
	}

	.trust-score-badge.compact {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		gap: 0.25rem;
	}

	.trust-score-badge.clickable {
		cursor: pointer;
	}

	.trust-score-badge.clickable:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		border-color: rgba(255, 255, 255, 0.4);
	}

	.trust-score-badge.clickable:active {
		transform: translateY(0);
	}

	.trust-score-badge:disabled {
		cursor: default;
		transform: none;
	}

	.tier-icon {
		font-size: 1.25em;
		line-height: 1;
	}

	.compact .tier-icon {
		font-size: 1em;
	}

	.score {
		font-weight: 700;
		letter-spacing: 0.025em;
	}

	.tier-name {
		opacity: 0.95;
		font-size: 0.85em;
		white-space: nowrap;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.trust-score-badge:not(.compact) {
			padding: 0.25rem 0.625rem;
			font-size: 0.8125rem;
		}

		.tier-name {
			display: none;
		}
	}
</style>
