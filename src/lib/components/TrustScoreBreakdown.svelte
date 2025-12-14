<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import TrustScoreBadge from "./TrustScoreBadge.svelte";
  import {
    getTrustScoreTier,
    getTierProgress,
    TRUST_SCORE_TIERS,
    type TrustScoreBreakdown as BreakdownType,
  } from "$lib/utils/trust-score";

  let {
    userId,
    score,
    breakdown = [],
    showHistory = false,
  }: {
    userId: string;
    score: number;
    breakdown?: BreakdownType[];
    showHistory?: boolean;
  } = $props();

  let tier = $derived(getTrustScoreTier(score));
  let tierConfig = $derived(TRUST_SCORE_TIERS[tier]);
  let progress = $derived(getTierProgress(score));

  // Calculate next tier
  let nextTierInfo = $derived.by(() => {
    const tiers = Object.entries(TRUST_SCORE_TIERS).sort(
      ([, a], [, b]) => a.minScore - b.minScore
    );
    for (const [tierName, tierData] of tiers) {
      if (score < tierData.minScore) {
        return {
          name: tierName,
          pointsNeeded: tierData.minScore - score,
          icon: tierData.icon,
        };
      }
    }
    return null; // Max tier reached
  });

  // Categorize breakdown into positive and negative
  let positiveActions = $derived(breakdown.filter((b) => b.totalPoints > 0));
  let negativeActions = $derived(breakdown.filter((b) => b.totalPoints < 0));
  let totalPositive = $derived(
    positiveActions.reduce((sum, b) => sum + b.totalPoints, 0)
  );
  let totalNegative = $derived(
    negativeActions.reduce((sum, b) => sum + b.totalPoints, 0)
  );
</script>

<div class="trust-score-breakdown">
  <!-- Header -->
  <div class="breakdown-header">
    <TrustScoreBadge {score} {tier} showTier={true} />
    <div class="tier-info">
      <div class="tier-description">{tierConfig.description}</div>
      {#if nextTierInfo}
        <div class="next-tier">
          <span class="next-tier-icon">{nextTierInfo.icon}</span>
          <span>{nextTierInfo.pointsNeeded} points to {nextTierInfo.name}</span>
        </div>
      {:else}
        <div class="next-tier max-tier">🎉 Maximum tier achieved!</div>
      {/if}
    </div>
  </div>

  <!-- Progress Bar -->
  {#if nextTierInfo}
    <div class="progress-container">
      <div class="progress-bar">
        <div
          class="progress-fill"
          style="width: {progress}%; background: {tierConfig.color}"
        ></div>
      </div>
      <div class="progress-label">{progress.toFixed(0)}% to next tier</div>
    </div>
  {/if}

  <!-- Breakdown Stats -->
  {#if breakdown.length > 0}
    <div class="stats-grid">
      <div class="stat-card positive">
        <div class="stat-label">Positive Actions</div>
        <div class="stat-value">+{totalPositive}</div>
        <div class="stat-count">{positiveActions.length} types</div>
      </div>
      <div class="stat-card negative">
        <div class="stat-label">Negative Actions</div>
        <div class="stat-value">{totalNegative}</div>
        <div class="stat-count">{negativeActions.length} types</div>
      </div>
      <div class="stat-card total">
        <div class="stat-label">Net Score</div>
        <div class="stat-value">{score}</div>
        <div class="stat-count">
          {breakdown.reduce((sum, b) => sum + b.eventCount, 0)} total actions
        </div>
      </div>
    </div>

    <!-- Detailed Breakdown -->
    <div class="breakdown-details">
      <h3>Activity Breakdown</h3>

      {#if positiveActions.length > 0}
        <div class="breakdown-section">
          <h4 class="section-title positive">✅ Positive Contributions</h4>
          <div class="breakdown-list">
            {#each positiveActions as action}
              <div class="breakdown-item">
                <div class="item-header">
                  <span class="item-type"
                    >{action.eventType.replace(/_/g, " ")}</span
                  >
                  <span class="item-points positive">+{action.totalPoints}</span
                  >
                </div>
                <div class="item-details">
                  <span class="item-count">{action.eventCount} times</span>
                  {#if action.description}
                    <span class="item-description">{action.description}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if negativeActions.length > 0}
        <div class="breakdown-section">
          <h4 class="section-title negative">⚠️ Points Deducted</h4>
          <div class="breakdown-list">
            {#each negativeActions as action}
              <div class="breakdown-item">
                <div class="item-header">
                  <span class="item-type"
                    >{action.eventType.replace(/_/g, " ")}</span
                  >
                  <span class="item-points negative">{action.totalPoints}</span>
                </div>
                <div class="item-details">
                  <span class="item-count">{action.eventCount} times</span>
                  {#if action.description}
                    <span class="item-description">{action.description}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="no-activity">
      <p>No activity yet. Start contributing to earn trust score!</p>
    </div>
  {/if}

  <!-- View History Link -->
  {#if showHistory}
    <div class="history-link">
      <a href="/profile?tab=trust-score" class="btn-link">View Full History →</a
      >
    </div>
  {/if}
</div>

<style>
  .trust-score-breakdown {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .breakdown-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .tier-info {
    flex: 1;
  }

  .tier-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .next-tier {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #3b82f6;
  }

  .next-tier.max-tier {
    color: #10b981;
  }

  .next-tier-icon {
    font-size: 1.25rem;
  }

  .progress-container {
    margin-bottom: 1.5rem;
  }

  .progress-bar {
    height: 0.75rem;
    background: #e5e7eb;
    border-radius: 9999px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 9999px;
  }

  .progress-label {
    text-align: center;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
  }

  .stat-card.positive {
    background: #dcfce7;
    border: 1px solid #86efac;
  }

  .stat-card.negative {
    background: #fee2e2;
    border: 1px solid #fca5a5;
  }

  .stat-card.total {
    background: #dbeafe;
    border: 1px solid #93c5fd;
  }

  .stat-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }

  .stat-count {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .breakdown-details h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 1rem;
  }

  .breakdown-section {
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-title.positive {
    color: #059669;
  }

  .section-title.negative {
    color: #dc2626;
  }

  .breakdown-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .breakdown-item {
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .item-type {
    font-weight: 500;
    color: #111827;
    text-transform: capitalize;
  }

  .item-points {
    font-weight: 700;
    font-size: 0.875rem;
  }

  .item-points.positive {
    color: #059669;
  }

  .item-points.negative {
    color: #dc2626;
  }

  .item-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .item-count {
    font-weight: 500;
  }

  .item-description {
    font-style: italic;
  }

  .no-activity {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }

  .history-link {
    margin-top: 1.5rem;
    text-align: center;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn-link {
    color: #3b82f6;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.2s;
  }

  .btn-link:hover {
    color: #2563eb;
    text-decoration: underline;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .trust-score-breakdown {
      padding: 1rem;
    }

    .breakdown-header {
      flex-direction: column;
      gap: 1rem;
    }

    .stats-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }
</style>
