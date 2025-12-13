<script lang="ts">
	import { goto } from '$app/navigation';
	import TrustScoreBadge from '$lib/components/TrustScoreBadge.svelte';
	import { getTrustScoreTier } from '$lib/utils/trust-score';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let searchQuery = $state('');

	let filteredLeaderboard = $derived(
		searchQuery
			? data.leaderboard.filter(entry => 
					entry.email?.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: data.leaderboard
	);

	function changeTimeframe(timeframe: string) {
		goto(`?timeframe=${timeframe}`);
	}
</script>

<svelte:head>
	<title>Trust Score Leaderboard | Hazards</title>
	<meta name="description" content="Top contributors to the Hazards community ranked by trust score" />
</svelte:head>

<div class="leaderboard-page">
	<div class="page-header">
		<div class="header-content">
			<h1>🏆 Trust Score Leaderboard</h1>
			<p>Recognizing our most trusted community members</p>
		</div>
	</div>

	<div class="leaderboard-container">
		<!-- Filters -->
		<div class="filters-section">
			<div class="timeframe-tabs">
				<button
					class="tab"
					class:active={data.timeframe === 'all'}
					onclick={() => changeTimeframe('all')}
				>
					All Time
				</button>
				<button
					class="tab"
					class:active={data.timeframe === 'month'}
					onclick={() => changeTimeframe('month')}
				>
					This Month
				</button>
				<button
					class="tab"
					class:active={data.timeframe === 'week'}
					onclick={() => changeTimeframe('week')}
				>
					This Week
				</button>
			</div>

			<div class="search-box">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search users..."
				/>
			</div>
		</div>

		<!-- Leaderboard Table -->
		{#if filteredLeaderboard.length === 0}
			<div class="no-results">
				<p>No users found{searchQuery ? ` matching "${searchQuery}"` : ''}</p>
			</div>
		{:else}
			<div class="leaderboard-table">
				<div class="table-header">
					<div class="rank-col">Rank</div>
					<div class="user-col">User</div>
					<div class="score-col">Trust Score</div>
					<div class="tier-col">Tier</div>
				</div>

				{#each filteredLeaderboard as entry, index}
					<div class="table-row" class:top-three={index < 3}>
						<div class="rank-col">
							{#if index === 0}
								<span class="medal gold">🥇</span>
							{:else if index === 1}
								<span class="medal silver">🥈</span>
							{:else if index === 2}
								<span class="medal bronze">🥉</span>
							{:else}
								<span class="rank-number">{index + 1}</span>
							{/if}
						</div>
					<div class="user-col">
						<div class="user-info">
							<span class="username">{entry.email || 'Anonymous User'}</span>
							<span class="user-id">{entry.userId.slice(0, 8)}...</span>
						</div>
					</div>
						<div class="score-col">
							<span class="score">{entry.score.toLocaleString()}</span>
						</div>
						<div class="tier-col">
							<TrustScoreBadge score={entry.score} compact={true} />
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Info Footer -->
		<div class="info-footer">
			<p>
				Trust scores are earned through positive community contributions including reporting hazards,
				voting, confirming resolutions, and helping moderate content.
			</p>
		</div>
	</div>
</div>

<style>
	.leaderboard-page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #dbeafe 0%, #f3f4f6 300px);
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		padding: 3rem 1rem;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
	}

	.header-content h1 {
		font-size: 2.5rem;
		font-weight: 800;
		color: #111827;
		margin: 0 0 0.5rem 0;
	}

	.header-content p {
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0;
	}

	.leaderboard-container {
		max-width: 1200px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	.filters-section {
		background: white;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
	}

	.timeframe-tabs {
		display: flex;
		gap: 0.5rem;
		background: #f3f4f6;
		padding: 0.25rem;
		border-radius: 0.5rem;
	}

	.tab {
		padding: 0.5rem 1rem;
		border: none;
		background: transparent;
		color: #6b7280;
		font-weight: 500;
		font-size: 0.875rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab:hover {
		background: #e5e7eb;
	}

	.tab.active {
		background: white;
		color: #3b82f6;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.search-box {
		flex: 1;
		min-width: 250px;
		max-width: 400px;
	}

	.search-box input {
		width: 100%;
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.search-box input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.no-results {
		background: white;
		border-radius: 0.75rem;
		padding: 3rem;
		text-align: center;
		color: #6b7280;
	}

	.leaderboard-table {
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.table-header {
		display: grid;
		grid-template-columns: 80px 1fr 150px 200px;
		gap: 1rem;
		padding: 1rem 1.5rem;
		background: #f9fafb;
		border-bottom: 2px solid #e5e7eb;
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: #6b7280;
	}

	.table-row {
		display: grid;
		grid-template-columns: 80px 1fr 150px 200px;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #f3f4f6;
		align-items: center;
		transition: background 0.2s;
	}

	.table-row:hover {
		background: #f9fafb;
	}

	.table-row.top-three {
		background: linear-gradient(to right, #fef3c7 0%, white 100%);
	}

	.rank-col {
		text-align: center;
	}

	.medal {
		font-size: 1.5rem;
	}

	.rank-number {
		font-weight: 600;
		font-size: 1.125rem;
		color: #6b7280;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.username {
		font-weight: 500;
		color: #111827;
	}

	.user-id {
		font-size: 0.75rem;
		color: #9ca3af;
		font-family: monospace;
	}

	.score {
		font-weight: 700;
		font-size: 1.125rem;
		color: #3b82f6;
	}

	.info-footer {
		margin-top: 2rem;
		padding: 1.5rem;
		background: white;
		border-radius: 0.75rem;
		text-align: center;
		color: #6b7280;
		font-size: 0.875rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.header-content h1 {
			font-size: 1.875rem;
		}

		.filters-section {
			flex-direction: column;
			align-items: stretch;
		}

		.search-box {
			max-width: 100%;
		}

		.table-header {
			grid-template-columns: 60px 1fr 100px;
			padding: 0.75rem 1rem;
		}

		.table-row {
			grid-template-columns: 60px 1fr 100px;
			padding: 0.75rem 1rem;
		}

		.tier-col {
			display: none;
		}

		.score-col {
			text-align: right;
		}
	}
</style>
