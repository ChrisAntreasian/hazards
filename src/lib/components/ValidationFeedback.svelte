<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { ValidationError } from "$lib/validation/hazard-validation.js";

  interface Props {
    errors?: ValidationError[];
    warnings?: string[];
    showDetails?: boolean;
  }

  let {
    errors = [],
    warnings = [],
    showDetails = $bindable(false)
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    retry: void;
    dismiss: void;
  }>();

  const hasErrors = $derived(errors.length > 0);
  const hasWarnings = $derived(warnings.length > 0);

  function getFieldLabel(fieldPath: string): string {
    const fieldMap: Record<string, string> = {
      title: "Title",
      description: "Description",
      "location.latitude": "Latitude",
      "location.longitude": "Longitude",
      location: "Location",
      category_path: "Category",
      severity_level: "Severity Level",
      images: "Images",
      additional_notes: "Additional Notes",
      location_accurate: "Location Confirmation",
      content_appropriate: "Content Confirmation",
      own_photo: "Photo Rights Confirmation",
    };

    return fieldMap[fieldPath] || fieldPath;
  }

  function getErrorIcon(code: string): string {
    switch (code) {
      case "too_small":
      case "too_big":
        return "📏";
      case "invalid_type":
        return "❌";
      case "custom":
        return "⚠️";
      default:
        return "🚫";
    }
  }
</script>

{#if hasErrors || hasWarnings}
  <div
    class="validation-feedback"
    class:has-errors={hasErrors}
    class:has-warnings={hasWarnings && !hasErrors}
  >
    <!-- Error Section -->
    {#if hasErrors}
      <div class="error-section">
        <div class="error-header">
          <span class="error-icon">🚫</span>
          <h3>Submission Issues Found</h3>
          <button
            type="button"
            class="toggle-details"
            onclick={() => (showDetails = !showDetails)}
            aria-expanded={showDetails}
          >
            {showDetails ? "▼" : "▶"}
            {errors.length} error{errors.length === 1 ? "" : "s"}
          </button>
        </div>

        {#if showDetails}
          <div class="error-list">
            {#each errors as error}
              <div class="error-item">
                <div class="error-field">
                  <span class="field-icon">{getErrorIcon(error.code)}</span>
                  <strong>{getFieldLabel(error.field)}</strong>
                </div>
                <p class="error-message">{error.message}</p>
                <code class="error-code">Code: {error.code}</code>
              </div>
            {/each}
          </div>
        {/if}

        <div class="error-actions">
          <button
            type="button"
            class="retry-button"
            onclick={() => dispatch("retry")}
          >
            🔄 Fix and Retry
          </button>
        </div>
      </div>
    {/if}

    <!-- Warning Section -->
    {#if hasWarnings && !hasErrors}
      <div class="warning-section">
        <div class="warning-header">
          <span class="warning-icon">⚠️</span>
          <h3>Please Review</h3>
          <button
            type="button"
            class="toggle-details"
            onclick={() => (showDetails = !showDetails)}
            aria-expanded={showDetails}
          >
            {showDetails ? "▼" : "▶"}
            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
          </button>
        </div>

        {#if showDetails}
          <div class="warning-list">
            {#each warnings as warning}
              <div class="warning-item">
                <span class="warning-bullet">⚠️</span>
                <p>{warning}</p>
              </div>
            {/each}
          </div>
        {/if}

        <div class="warning-actions">
          <p class="warning-note">
            You can proceed, but please review the warnings above.
          </p>
          <button
            type="button"
            class="dismiss-button"
            onclick={() => dispatch("dismiss")}
          >
            ✓ Acknowledge and Continue
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .validation-feedback {
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .has-errors {
    border-left: 4px solid #dc3545;
  }

  .has-warnings {
    border-left: 4px solid #ffc107;
  }

  .error-section,
  .warning-section {
    padding: 1rem;
  }

  .error-section {
    background: linear-gradient(135deg, #fdf2f2 0%, #fef5f5 100%);
    border: 1px solid #fed7d7;
  }

  .warning-section {
    background: linear-gradient(135deg, #fffdf2 0%, #fefef5 100%);
    border: 1px solid #fef3cd;
  }

  .error-header,
  .warning-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .error-icon,
  .warning-icon {
    font-size: 1.25rem;
  }

  .error-header h3 {
    color: #dc3545;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .warning-header h3 {
    color: #856404;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .toggle-details {
    margin-left: auto;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .toggle-details:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  .error-list,
  .warning-list {
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .error-item {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #fed7d7;
  }

  .error-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .field-icon {
    font-size: 1rem;
  }

  .error-field strong {
    color: #dc3545;
    font-size: 0.95rem;
  }

  .error-message {
    margin: 0.5rem 0;
    color: #721c24;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .error-code {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-family: "Courier New", monospace;
  }

  .warning-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #fef3cd;
  }

  .warning-bullet {
    font-size: 1rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  .warning-item p {
    margin: 0;
    color: #856404;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .error-actions,
  .warning-actions {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .retry-button {
    background: #dc3545;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .retry-button:hover {
    background: #c82333;
  }

  .dismiss-button {
    background: #ffc107;
    color: #212529;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .dismiss-button:hover {
    background: #e0a800;
  }

  .warning-note {
    margin: 0;
    color: #856404;
    font-size: 0.85rem;
    font-style: italic;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .validation-feedback {
      margin: 0.5rem 0;
    }

    .error-section,
    .warning-section {
      padding: 0.75rem;
    }

    .error-header,
    .warning-header {
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .toggle-details {
      flex-basis: 100%;
      text-align: left;
      margin-left: 0;
      margin-top: 0.5rem;
    }

    .error-actions,
    .warning-actions {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }

    .retry-button,
    .dismiss-button {
      width: 100%;
    }
  }
</style>
