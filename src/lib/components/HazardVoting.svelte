<script lang="ts">
  import { onMount } from "svelte";
  import type { VoteStatusResult, VoteResponse } from "$lib/types/database";

  interface Props {
    hazardId: string;
    votesUp: number;
    votesDown: number;
    voteScore: number;
    isOwnHazard?: boolean;
    compact?: boolean;
  }

  let {
    hazardId,
    votesUp = $bindable(0),
    votesDown = $bindable(0),
    voteScore = $bindable(0),
    isOwnHazard = false,
    compact = false,
  }: Props = $props();

  // Component state
  let currentVote: "up" | "down" | null = $state(null);
  let canVote = $state(true);
  let loading = $state(true);
  let voting = $state(false);
  let error = $state<string | null>(null);

  // Optimistic update state
  let optimisticVotesUp = $state(votesUp);
  let optimisticVotesDown = $state(votesDown);
  let optimisticVoteScore = $state(voteScore);

  // Sync props to optimistic state when they change
  $effect(() => {
    if (!voting) {
      optimisticVotesUp = votesUp;
      optimisticVotesDown = votesDown;
      optimisticVoteScore = voteScore;
    }
  });

  // Fetch initial vote status
  onMount(async () => {
    await fetchVoteStatus();
  });

  async function fetchVoteStatus() {
    try {
      loading = true;
      error = null;

      const response = await fetch(`/api/hazards/${hazardId}/vote-status`);

      if (!response.ok) {
        throw new Error("Failed to fetch vote status");
      }

      const status: VoteStatusResult = await response.json();
      currentVote = status.vote_type ?? null;
      canVote = status.can_vote;
    } catch (err) {
      console.error("Error fetching vote status:", err);
      error = "Failed to load vote status";
      canVote = false;
    } finally {
      loading = false;
    }
  }

  async function handleVote(voteType: "up" | "down") {
    if (!canVote || voting || isOwnHazard) return;

    // Store previous state for rollback
    const previousVote = currentVote;
    const previousVotesUp = optimisticVotesUp;
    const previousVotesDown = optimisticVotesDown;
    const previousVoteScore = optimisticVoteScore;

    try {
      voting = true;
      error = null;

      // Optimistic update
      if (currentVote === voteType) {
        // Clicking same vote = remove vote
        if (currentVote === "up") {
          optimisticVotesUp--;
        } else {
          optimisticVotesDown--;
        }
        optimisticVoteScore = optimisticVotesUp - optimisticVotesDown;
        currentVote = null;

        // Make API call to remove vote
        const response = await fetch(`/api/hazards/${hazardId}/vote`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove vote");
        }

        const result = await response.json();

        // Update with server values
        votesUp = result.hazard_votes.votes_up;
        votesDown = result.hazard_votes.votes_down;
        voteScore = result.hazard_votes.vote_score;
      } else {
        // Changing vote or casting new vote
        // Adjust counts optimistically
        if (currentVote === "up") {
          optimisticVotesUp--;
        } else if (currentVote === "down") {
          optimisticVotesDown--;
        }

        if (voteType === "up") {
          optimisticVotesUp++;
        } else {
          optimisticVotesDown++;
        }

        optimisticVoteScore = optimisticVotesUp - optimisticVotesDown;
        currentVote = voteType;

        // Make API call
        const response = await fetch(`/api/hazards/${hazardId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote_type: voteType }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to cast vote");
        }

        const result: VoteResponse = await response.json();

        // Update with server values
        votesUp = result.hazard_votes.votes_up;
        votesDown = result.hazard_votes.votes_down;
        voteScore = result.hazard_votes.vote_score;
      }
    } catch (err) {
      // Rollback on error
      currentVote = previousVote;
      optimisticVotesUp = previousVotesUp;
      optimisticVotesDown = previousVotesDown;
      optimisticVoteScore = previousVoteScore;

      console.error("Error voting:", err);
      error = err instanceof Error ? err.message : "Failed to vote";

      // Clear error after 3 seconds
      setTimeout(() => {
        error = null;
      }, 3000);
    } finally {
      voting = false;
    }
  }

  function getVoteButtonClass(voteType: "up" | "down") {
    const base = "vote-btn";
    const active = currentVote === voteType ? "active" : "";
    const disabled = !canVote || voting || isOwnHazard ? "disabled" : "";
    return `${base} ${base}-${voteType} ${active} ${disabled}`.trim();
  }

  function getTooltip() {
    if (isOwnHazard) return "You cannot vote on your own hazard";
    if (!canVote) return "You must be logged in to vote";
    if (voting) return "Processing...";
    return "";
  }
</script>

<div class="hazard-voting" class:compact>
  {#if loading}
    <div class="voting-skeleton">
      <div class="skeleton-btn"></div>
      <div class="skeleton-score"></div>
      <div class="skeleton-btn"></div>
    </div>
  {:else}
    <div class="voting-controls">
      <button
        type="button"
        class={getVoteButtonClass("up")}
        onclick={() => handleVote("up")}
        disabled={!canVote || voting || isOwnHazard}
        title={getTooltip()}
        aria-label="Upvote hazard"
      >
        <svg
          class="vote-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5l7 7-7-7-7 7 7-7zm0 0v14" />
        </svg>
        {#if !compact}
          <span class="vote-count">{optimisticVotesUp}</span>
        {/if}
      </button>

      <div
        class="vote-score"
        class:positive={optimisticVoteScore > 0}
        class:negative={optimisticVoteScore < 0}
      >
        <span class="score-value"
          >{optimisticVoteScore > 0 ? "+" : ""}{optimisticVoteScore}</span
        >
        {#if !compact}
          <span class="score-label">score</span>
        {/if}
      </div>

      <button
        type="button"
        class={getVoteButtonClass("down")}
        onclick={() => handleVote("down")}
        disabled={!canVote || voting || isOwnHazard}
        title={getTooltip()}
        aria-label="Downvote hazard"
      >
        <svg
          class="vote-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 19l-7-7 7 7 7-7-7 7zm0 0V5" />
        </svg>
        {#if !compact}
          <span class="vote-count">{optimisticVotesDown}</span>
        {/if}
      </button>
    </div>

    {#if error}
      <div class="vote-error" role="alert">
        {error}
      </div>
    {/if}

    {#if isOwnHazard && !compact}
      <p class="vote-message">You cannot vote on your own hazard</p>
    {/if}
  {/if}
</div>

<style>
  .hazard-voting {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .hazard-voting.compact {
    gap: 0.25rem;
  }

  .voting-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    border-radius: 8px;
    background: var(--color-surface);
  }

  .compact .voting-controls {
    gap: 0.5rem;
    padding: 0.25rem;
  }

  .vote-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border: 2px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-background);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 60px;
  }

  .compact .vote-btn {
    min-width: 40px;
    padding: 0.25rem 0.5rem;
  }

  .vote-btn:hover:not(.disabled) {
    border-color: var(--color-primary);
    background: var(--color-surface);
    transform: translateY(-2px);
  }

  .vote-btn:active:not(.disabled) {
    transform: translateY(0);
  }

  .vote-btn.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .vote-btn-up.active {
    border-color: var(--color-success);
    background: var(--color-success-light, #e8f5e9);
    color: var(--color-success);
  }

  .vote-btn-down.active {
    border-color: var(--color-error);
    background: var(--color-error-light, #ffebee);
    color: var(--color-error);
  }

  .vote-icon {
    width: 24px;
    height: 24px;
  }

  .compact .vote-icon {
    width: 18px;
    height: 18px;
  }

  .vote-count {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .vote-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    background: var(--color-surface);
    min-width: 80px;
  }

  .compact .vote-score {
    min-width: 50px;
    padding: 0.25rem 0.5rem;
  }

  .score-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .compact .score-value {
    font-size: 1.125rem;
  }

  .score-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .vote-score.positive .score-value {
    color: var(--color-success);
  }

  .vote-score.negative .score-value {
    color: var(--color-error);
  }

  .vote-error {
    padding: 0.5rem 1rem;
    background: var(--color-error-light, #ffebee);
    color: var(--color-error);
    border-radius: 4px;
    font-size: 0.875rem;
    text-align: center;
    animation: slideIn 0.2s ease;
  }

  .vote-message {
    margin: 0;
    padding: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-align: center;
  }

  .voting-skeleton {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
  }

  .skeleton-btn,
  .skeleton-score {
    background: var(--color-border);
    border-radius: 6px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-btn {
    width: 60px;
    height: 60px;
  }

  .skeleton-score {
    width: 80px;
    height: 60px;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive */
  @media (max-width: 640px) {
    .voting-controls {
      gap: 0.5rem;
    }

    .vote-btn {
      min-width: 50px;
      padding: 0.375rem 0.5rem;
    }

    .vote-icon {
      width: 20px;
      height: 20px;
    }

    .score-value {
      font-size: 1.25rem;
    }
  }
</style>
