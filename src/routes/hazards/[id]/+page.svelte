<script lang="ts">
  import { goto } from "$app/navigation";
  import { invalidate } from "$app/navigation";
  import { page } from "$app/stores";
  import MapLocationPicker from "$lib/components/MapLocationPicker.svelte";
  import HazardVoting from "$lib/components/HazardVoting.svelte";
  import ExpirationStatusBadge from "$lib/components/ExpirationStatusBadge.svelte";
  import TimeRemaining from "$lib/components/TimeRemaining.svelte";
  import SeasonalBadge from "$lib/components/SeasonalBadge.svelte";
  import ResolutionReportForm from "$lib/components/ResolutionReportForm.svelte";
  import ResolutionConfirmation from "$lib/components/ResolutionConfirmation.svelte";
  import ResolutionHistory from "$lib/components/ResolutionHistory.svelte";
  import type { PageData } from "./$types";
  import type { ExpirationStatusResponse } from "$lib/types/database";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  // Make hazard reactive so we can update it from API responses
  let hazard = $state(data.hazard);
  const user = data.user;
  const ratings = data.ratings;
  const averageRatings = data.averageRatings;

  // Check if current user owns this hazard (use derived for reactivity)
  const isOwner = $derived(user?.id === hazard.user_id);
  const canEdit = $derived(isOwner && hazard.status === "pending");

  // Initialize vote counts with defaults (for when migration hasn't been applied yet)
  let votesUp = $state(hazard.votes_up ?? 0);
  let votesDown = $state(hazard.votes_down ?? 0);
  let voteScore = $state(hazard.vote_score ?? 0);

  // Expiration system state - loaded from server
  let expirationStatus = $state<ExpirationStatusResponse | null>(
    data.expirationStatus || null
  );
  let showResolutionForm = $state(false);

  // Reload expiration status (for after user actions like extend/resolve)
  async function loadExpirationStatus() {
    try {
      const response = await fetch(
        `/api/hazards/${hazard.id}/expiration-status`
      );
      if (response.ok) {
        expirationStatus = await response.json();
      } else {
        console.error("Failed to load expiration status:", response.status);
      }
    } catch (error) {
      console.error("Failed to load expiration status:", error);
    }
  }

  // Reload all page data (hazard + expiration status)
  async function reloadPageData() {
    // Invalidate the page data to trigger a reload from the server
    await invalidate(`/hazards/${hazard.id}`);
    // Also reload expiration status
    await loadExpirationStatus();
  }

  async function handleExtendExpiration() {
    if (!hazard.expires_at) return;

    const currentExpiry = new Date(hazard.expires_at);
    const newExpiry = new Date(currentExpiry.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours

    try {
      const response = await fetch(`/api/hazards/${hazard.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expires_at: newExpiry.toISOString(),
          reason: "Extended by 24 hours",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Reload page data to show updated expiration time
        await reloadPageData();
        
        alert("Expiration extended by 24 hours");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to extend expiration");
      }
    } catch (error) {
      console.error("Failed to extend expiration:", error);
      alert("An error occurred while extending expiration");
    }
  }

  async function handleResolutionSuccess() {
    showResolutionForm = false;
    await reloadPageData();
  }

  async function handleConfirmationChange() {
    // Reload all page data - hazard might be auto-resolved by trigger
    await reloadPageData();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatCoordinates(lat: number, lng: number) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  function getSeverityLabel(level: number) {
    const labels = ["", "Low", "Moderate", "Significant", "High", "Extreme"];
    return labels[level] || "Unknown";
  }

  function getSeverityColor(level: number) {
    if (level >= 4) return "severity-high";
    if (level === 3) return "severity-medium";
    return "severity-low";
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "approved":
        return "status-approved";
      case "rejected":
        return "status-rejected";
      case "pending":
        return "status-pending";
      case "flagged":
        return "status-flagged";
      default:
        return "status-unknown";
    }
  }

  function handleEdit() {
    goto(`/hazards/edit/${hazard.id}`);
  }

  function handleBackToReports() {
    goto("/my-reports");
  }
</script>

<svelte:head>
  <title>{hazard.title} - Hazard Details</title>
  <meta name="description" content={hazard.description} />
</svelte:head>

<div class="hazard-details-page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-actions">
      <button
        type="button"
        class="btn btn-secondary"
        onclick={handleBackToReports}
      >
        ← Back to My Reports
      </button>
      {#if canEdit}
        <button type="button" class="btn btn-primary" onclick={handleEdit}>
          ✏️ Edit Hazard
        </button>
      {/if}
    </div>

    <div class="hazard-status">
      <span class="status-badge {getStatusColor(hazard.status)}">
        {hazard.status.toUpperCase()}
      </span>
      <span class="severity-badge {getSeverityColor(hazard.severity_level)}">
        Severity: {getSeverityLabel(hazard.severity_level)}
      </span>
    </div>
  </div>

  <!-- Main Content -->
  <div class="hazard-content">
    <!-- Title and Basic Info -->
    <section class="basic-info">
      <h1>{hazard.title}</h1>

      <div class="meta-info">
        <div class="meta-item">
          <span class="meta-label">Category:</span>
          <span class="meta-value">
            {hazard.hazard_categories?.icon}
            {hazard.hazard_categories?.name}
          </span>
        </div>

        <div class="meta-item">
          <span class="meta-label">Reported:</span>
          <span class="meta-value">{formatDate(hazard.created_at)}</span>
        </div>

        {#if hazard.reported_active_date}
          <div class="meta-item">
            <span class="meta-label">Last Active:</span>
            <span class="meta-value"
              >{formatDate(hazard.reported_active_date)}</span
            >
          </div>
        {/if}

        <div class="meta-item">
          <span class="meta-label">Reporter:</span>
          <span class="meta-value">
            {hazard.users?.email || "Anonymous"}
            {#if hazard.users?.trust_score}
              <span class="trust-score"
                >(Trust: {hazard.users.trust_score})</span
              >
            {/if}
          </span>
        </div>

        {#if hazard.is_seasonal}
          <div class="meta-item seasonal">
            <span class="meta-label">🔄 Seasonal:</span>
            <span class="meta-value">This hazard recurs annually</span>
          </div>
        {/if}
      </div>
    </section>

    <!-- Description -->
    <section class="description-section">
      <h2>Description</h2>
      <div class="description-content">
        {hazard.description}
      </div>
    </section>

    <!-- Community Voting -->
    <section class="voting-section">
      <h2>Community Feedback</h2>
      <div class="voting-container">
        <HazardVoting
          hazardId={hazard.id}
          bind:votesUp
          bind:votesDown
          bind:voteScore
          isOwnHazard={isOwner}
        />
      </div>
      <p class="voting-help-text">
        Vote to help the community verify this hazard's accuracy. Upvote if you
        can confirm this hazard exists, downvote if it seems inaccurate or
        resolved.
      </p>
    </section>

    <!-- Expiration & Resolution Status -->
    {#if expirationStatus}
      <section class="expiration-section">
        <h2>Hazard Status & Resolution</h2>

        <!-- Status Badges -->
        <div class="status-badges">
          <ExpirationStatusBadge status={expirationStatus.status} />

          {#if hazard.expiration_type === "auto_expire" && hazard.expires_at}
            <TimeRemaining expiresAt={hazard.expires_at} />
          {/if}

          {#if hazard.expiration_type === "seasonal" && hazard.seasonal_pattern}
            <SeasonalBadge pattern={hazard.seasonal_pattern} />
          {/if}

          {#if hazard.expiration_type === "permanent"}
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border bg-gray-100 text-gray-800 border-gray-300"
            >
              <span class="text-xs">∞</span>
              <span>Permanent Feature</span>
            </span>
          {/if}
        </div>

        <!-- Extend Button (for auto_expire and user_resolvable) -->
        {#if expirationStatus.can_extend && hazard.expiration_type === "auto_expire"}
          <div class="extend-section">
            <button
              type="button"
              class="btn btn-secondary"
              onclick={handleExtendExpiration}
            >
              ⏰ Extend Expiration by 24 Hours
            </button>
            {#if hazard.extended_count > 0}
              <p class="text-sm text-gray-600">
                Extended {hazard.extended_count} time{hazard.extended_count !==
                1
                  ? "s"
                  : ""}
              </p>
            {/if}
          </div>
        {/if}

        <!-- Resolution Section -->
        {#if hazard.expiration_type === "user_resolvable" && !hazard.resolved_at}
          <div class="resolution-section">
            {#if expirationStatus.resolution_report}
              <!-- Show existing resolution report -->
              <ResolutionHistory
                report={expirationStatus.resolution_report}
                confirmedCount={expirationStatus.confirmations.confirmed}
                disputedCount={expirationStatus.confirmations.disputed}
              />

              <!-- Confirmation buttons (if not report owner or hazard owner) -->
              {#if !isOwner && user && expirationStatus.resolution_report.reported_by !== user.id}
                <div class="confirmation-actions">
                  <ResolutionConfirmation
                    hazardId={hazard.id}
                    onConfirmationChange={handleConfirmationChange}
                  />
                </div>
              {/if}
            {:else if expirationStatus.can_resolve}
              <!-- Show resolution form or button to show it -->
              {#if showResolutionForm}
                <ResolutionReportForm
                  hazardId={hazard.id}
                  userId={user.id}
                  session={data.session}
                  user={user}
                  onSuccess={handleResolutionSuccess}
                  onCancel={() => (showResolutionForm = false)}
                />
              {:else}
                <div class="resolution-prompt">
                  <p class="text-gray-700 mb-3">
                    Has this hazard been resolved? Submit a resolution report to
                    let the community know.
                  </p>
                  <button
                    type="button"
                    class="btn btn-primary"
                    onclick={() => (showResolutionForm = true)}
                  >
                    ✓ Submit Resolution Report
                  </button>
                </div>
              {/if}
            {/if}
          </div>
        {/if}

        <!-- Resolved Message -->
        {#if hazard.resolved_at}
          <div class="resolved-message">
            <div
              class="flex items-center gap-2 text-green-700 font-semibold mb-2"
            >
              <span class="text-xl">✓</span>
              <span>This hazard has been resolved</span>
            </div>
            {#if hazard.resolution_note}
              <p
                class="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200"
              >
                {hazard.resolution_note}
              </p>
            {/if}
            <p class="text-sm text-gray-500 mt-2">
              Resolved on {formatDate(hazard.resolved_at)}
            </p>
          </div>
        {/if}
      </section>
    {/if}

    <!-- Location and Map -->
    <section class="location-section">
      <h2>Location</h2>

      <div class="location-info">
        <div class="coordinates">
          <span class="coordinates-label">Coordinates:</span>
          <span class="coordinates-value">
            {formatCoordinates(hazard.latitude, hazard.longitude)}
          </span>
        </div>

        {#if hazard.area}
          <div class="area-info">
            <span class="area-label">Affected Area:</span>
            <span class="area-value"
              >Polygon with {hazard.area.coordinates[0]?.length - 1 || 0} vertices</span
            >
          </div>
        {/if}
      </div>

      <!-- Interactive Map -->
      <div class="map-container">
        {#key hazard.id}
          <MapLocationPicker
            initialLocation={{ lat: hazard.latitude, lng: hazard.longitude }}
            initialArea={hazard.area}
            readonly={true}
            zoom={hazard.zoom || 13}
            height="400px"
          />
        {/key}
      </div>
    </section>

    <!-- Images -->
    {#if hazard.hazard_images && hazard.hazard_images.length > 0}
      <section class="images-section">
        <h2>Images ({hazard.hazard_images.length})</h2>

        <div class="images-grid">
          {#each hazard.hazard_images.filter((img: any) => img.moderation_status === "approved" || isOwner) as image}
            <div class="image-card">
              <div class="image-card-inner">
                <button
                  type="button"
                  class="image-preview"
                  onclick={() => window.open(image.image_url, "_blank")}
                  title="Click to view full size"
                >
                  <img
                    src={image.thumbnail_url || image.image_url}
                    alt="Hazard scene"
                    loading="lazy"
                  />
                  <div class="image-overlay">
                    <span class="view-icon">🔍</span>
                  </div>
                </button>

                <div class="image-card-footer">
                  <div class="image-date">
                    📅 {formatDate(image.upload_date)}
                  </div>
                  {#if image.votes_up || image.votes_down}
                    <div class="image-votes">
                      <span class="vote-up">👍 {image.votes_up}</span>
                      <span class="vote-down">👎 {image.votes_down}</span>
                    </div>
                  {/if}
                  {#if image.moderation_status !== "approved" && isOwner}
                    <div
                      class="moderation-badge status-{image.moderation_status}"
                    >
                      {image.moderation_status}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Community Ratings -->
    {#if averageRatings.count > 0}
      <section class="ratings-section">
        <h2>Community Ratings</h2>

        <div class="ratings-summary">
          <div class="rating-item">
            <span class="rating-label">Average Severity:</span>
            <span class="rating-value"
              >{averageRatings.severity?.toFixed(1)}/5.0</span
            >
          </div>

          <div class="rating-item">
            <span class="rating-label">Average Accuracy:</span>
            <span class="rating-value"
              >{averageRatings.accuracy?.toFixed(1)}/5.0</span
            >
          </div>

          <div class="rating-item">
            <span class="rating-label">Total Ratings:</span>
            <span class="rating-value">{averageRatings.count}</span>
          </div>
        </div>
      </section>
    {/if}

    <!-- Technical Details -->
    <section class="technical-section">
      <details>
        <summary>Technical Details</summary>

        <div class="technical-grid">
          <div class="technical-item">
            <span class="technical-label">Hazard ID:</span>
            <span class="technical-value">{hazard.id}</span>
          </div>

          <div class="technical-item">
            <span class="technical-label">Region:</span>
            <span class="technical-value">{hazard.region_id}</span>
          </div>

          <div class="technical-item">
            <span class="technical-label">Trust Score:</span>
            <span class="technical-value">{hazard.trust_score}</span>
          </div>

          <div class="technical-item">
            <span class="technical-label">Verification Count:</span>
            <span class="technical-value">{hazard.verification_count}</span>
          </div>

          <div class="technical-item">
            <span class="technical-label">Geohash:</span>
            <span class="technical-value">{hazard.geohash}</span>
          </div>

          <div class="technical-item">
            <span class="technical-label">Last Updated:</span>
            <span class="technical-value">{formatDate(hazard.updated_at)}</span>
          </div>
        </div>
      </details>
    </section>
  </div>
</div>

<style>
  .hazard-details-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 1rem;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .hazard-status {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .status-badge,
  .severity-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-approved {
    background: #dcfce7;
    color: #166534;
  }
  .status-pending {
    background: #fef3c7;
    color: #92400e;
  }
  .status-rejected {
    background: #fee2e2;
    color: #991b1b;
  }
  .status-flagged {
    background: #fecaca;
    color: #b91c1c;
  }

  .severity-high {
    background: #fee2e2;
    color: #991b1b;
  }
  .severity-medium {
    background: #fed7aa;
    color: #ea580c;
  }
  .severity-low {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .hazard-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .basic-info h1 {
    font-size: 2.5rem;
    color: #1e293b;
    margin-bottom: 1.5rem;
    line-height: 1.2;
  }

  .meta-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .meta-item.seasonal {
    background: #f0f9ff;
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid #0ea5e9;
  }

  .meta-label {
    font-weight: 600;
    color: #64748b;
    font-size: 0.9rem;
  }

  .meta-value {
    color: #1e293b;
    font-size: 1rem;
  }

  .trust-score {
    color: #64748b;
    font-size: 0.9rem;
  }

  .description-section h2,
  .location-section h2,
  .images-section h2,
  .ratings-section h2 {
    font-size: 1.5rem;
    color: #1e293b;
    margin-bottom: 1rem;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0.5rem;
  }

  .description-content {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    line-height: 1.6;
    font-size: 1.1rem;
    color: #374151;
  }

  .location-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .coordinates,
  .area-info {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .coordinates-label,
  .area-label {
    display: block;
    font-weight: 600;
    color: #64748b;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .coordinates-value,
  .area-value {
    font-family: monospace;
    font-size: 1rem;
    color: #1e293b;
  }

  .map-container {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .image-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .image-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }

  .image-card-inner {
    display: flex;
    flex-direction: column;
  }

  .image-preview {
    position: relative;
    width: 100%;
    height: 220px;
    border: none;
    background: #f8fafc;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
  }

  .image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease;
  }

  .image-preview:hover .image-overlay {
    background: rgba(0, 0, 0, 0.4);
  }

  .view-icon {
    font-size: 2rem;
    opacity: 0;
    transform: scale(0.8);
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;
  }

  .image-preview:hover .view-icon {
    opacity: 1;
    transform: scale(1);
  }

  .image-preview:hover img {
    transform: scale(1.05);
  }

  .image-card-footer {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
  }

  .image-date {
    font-size: 0.85rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .image-votes {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
  }

  .vote-up,
  .vote-down {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .vote-up {
    color: #16a34a;
  }

  .vote-down {
    color: #dc2626;
  }

  .moderation-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .moderation-badge.status-pending {
    background: #fef3c7;
    color: #92400e;
  }

  .moderation-badge.status-flagged {
    background: #fecaca;
    color: #b91c1c;
  }

  .moderation-badge.status-rejected {
    background: #fee2e2;
    color: #991b1b;
  }

  .ratings-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .rating-item {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    text-align: center;
  }

  .rating-label {
    display: block;
    font-weight: 600;
    color: #64748b;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .rating-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
  }

  .technical-section {
    margin-top: 2rem;
  }

  .technical-section summary {
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .technical-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .technical-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .technical-item:last-child {
    border-bottom: none;
  }

  .technical-label {
    font-weight: 500;
    color: #64748b;
  }

  .technical-value {
    font-family: monospace;
    color: #1e293b;
  }

  /* Voting Section */
  .voting-section {
    background: var(--color-surface, #f8fafc);
    border-radius: 12px;
    padding: 2rem;
    border: 2px solid var(--color-border, #e2e8f0);
  }

  .voting-section h2 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .voting-container {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .voting-help-text {
    text-align: center;
    color: var(--color-text-secondary, #64748b);
    font-size: 0.875rem;
    margin: 1rem 0 0;
    line-height: 1.5;
  }

  /* Expiration Section */
  .expiration-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    border: 2px solid #e2e8f0;
  }

  .expiration-section h2 {
    margin-top: 0;
    margin-bottom: 1.5rem;
  }

  .status-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .extend-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .extend-section button {
    margin-bottom: 0.5rem;
  }

  .resolution-section {
    margin-top: 1.5rem;
  }

  .confirmation-actions {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .resolution-prompt {
    padding: 1.5rem;
    background: #f0f9ff;
    border-radius: 8px;
    border: 1px solid #0ea5e9;
    text-align: center;
  }

  .resolved-message {
    padding: 1.5rem;
    background: #f0fdf4;
    border-radius: 8px;
    border: 2px solid #86efac;
  }

  @media (max-width: 768px) {
    .hazard-details-page {
      padding: 1rem;
    }

    .page-header {
      flex-direction: column;
      align-items: stretch;
    }

    .hazard-status {
      align-items: flex-start;
    }

    .basic-info h1 {
      font-size: 2rem;
    }

    .meta-info {
      grid-template-columns: 1fr;
    }

    .location-info {
      grid-template-columns: 1fr;
    }

    .images-grid {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .ratings-summary {
      grid-template-columns: 1fr;
    }

    .technical-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
