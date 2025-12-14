<script lang="ts">
  import {
    getTrustScoreTier,
    TRUST_SCORE_TIERS,
    type TrustScoreEvent,
  } from "$lib/utils/trust-score";

  let {
    userId,
    events = [],
    limit = 50,
    filters = [],
  }: {
    userId: string;
    events?: TrustScoreEvent[];
    limit?: number;
    filters?: string[];
  } = $props();

  // Event type icons and colors
  const eventConfig: Record<string, { icon: string; color: string }> = {
    hazard_approved: { icon: "✅", color: "#059669" },
    hazard_rejected: { icon: "❌", color: "#dc2626" },
    resolution_participation: { icon: "🤝", color: "#059669" },
    moderator_action: { icon: "🛡️", color: "#3b82f6" },
    flag_accepted: { icon: "🚩", color: "#059669" },
    flag_rejected: { icon: "⚠️", color: "#dc2626" },
    hazard_upvoted: { icon: "👍", color: "#059669" },
    hazard_downvoted: { icon: "👎", color: "#dc2626" },
    vote_cast: { icon: "🗳️", color: "#3b82f6" },
    content_flagged_rejected: { icon: "🚫", color: "#dc2626" },
    spam_report: { icon: "🗑️", color: "#dc2626" },
    manual_adjustment: { icon: "⚙️", color: "#6b7280" },
  };

  // Filter events by type
  let filteredEvents = $derived(
    filters.length > 0
      ? events.filter((e) => filters.includes(e.eventType))
      : events
  );

  // Group events by date
  let groupedEvents = $derived.by(() => {
    const groups: Record<string, TrustScoreEvent[]> = {};
    for (const event of filteredEvents.slice(0, limit)) {
      const date = new Date(event.createdAt).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    }
    return groups;
  });

  function formatEventType(eventType: string): string {
    return eventType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function getEventIcon(eventType: string): string {
    return eventConfig[eventType]?.icon || "📌";
  }

  function getEventColor(eventType: string, points: number): string {
    if (eventType === "manual_adjustment") {
      return eventConfig[eventType].color;
    }
    return points > 0 ? "#059669" : "#dc2626";
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    return `${Math.floor(seconds / 2592000)}mo ago`;
  }
</script>

<div class="trust-score-history">
  <div class="history-header">
    <h3>Trust Score History</h3>
    <div class="history-info">
      Showing {Math.min(filteredEvents.length, limit)} of {events.length} events
    </div>
  </div>

  {#if filteredEvents.length === 0}
    <div class="no-events">
      <p>
        No events found. {filters.length > 0
          ? "Try adjusting your filters."
          : "Start contributing to earn trust score!"}
      </p>
    </div>
  {:else}
    <div class="timeline">
      {#each Object.entries(groupedEvents) as [date, dayEvents]}
        <div class="date-group">
          <div class="date-header">
            <span class="date-label"
              >{new Date(date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}</span
            >
            <span class="date-count">{dayEvents.length} events</span>
          </div>

          <div class="events-list">
            {#each dayEvents as event}
              <div class="event-item">
                <div
                  class="event-icon"
                  style="color: {getEventColor(
                    event.eventType,
                    event.pointsChange
                  )}"
                >
                  {getEventIcon(event.eventType)}
                </div>
                <div class="event-content">
                  <div class="event-header">
                    <span class="event-type"
                      >{formatEventType(event.eventType)}</span
                    >
                    <span
                      class="event-points"
                      style="color: {getEventColor(
                        event.eventType,
                        event.pointsChange
                      )}"
                    >
                      {event.pointsChange > 0 ? "+" : ""}{event.pointsChange}
                    </span>
                  </div>
                  {#if event.notes}
                    <div class="event-reason">{event.notes}</div>
                  {/if}
                  <div class="event-meta">
                    <span class="event-time">
                      {formatTimeAgo(event.createdAt)}
                    </span>
                    <span class="event-score">
                      {event.previousScore} → {event.newScore}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .trust-score-history {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .history-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .history-info {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }

  .no-events {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .date-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .date-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background: white;
    padding: 0.5rem 0;
    z-index: 1;
  }

  .date-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .date-count {
    font-size: 0.75rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
  }

  .events-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-left: 1rem;
    border-left: 2px solid #e5e7eb;
  }

  .event-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    position: relative;
    margin-left: -1.75rem;
    transition: all 0.2s;
  }

  .event-item:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
    transform: translateX(4px);
  }

  .event-icon {
    font-size: 1.5rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .event-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .event-type {
    font-weight: 500;
    color: #111827;
    font-size: 0.875rem;
  }

  .event-points {
    font-weight: 700;
    font-size: 0.875rem;
  }

  .event-reason {
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
    margin-top: 0.25rem;
  }

  .event-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: #9ca3af;
    margin-top: 0.25rem;
  }

  .event-time {
    font-weight: 500;
  }

  .event-score {
    font-weight: 600;
    color: #6b7280;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .trust-score-history {
      padding: 1rem;
    }

    .history-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .event-item {
      padding: 0.5rem;
      margin-left: -1.5rem;
    }

    .event-icon {
      font-size: 1.25rem;
    }

    .event-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>
