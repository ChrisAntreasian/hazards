<script lang="ts">
  import { page } from "$app/stores";
  import type { TrustScoreConfig } from "$lib/utils/trust-score";

  let {
    configs = [],
    onSave,
    onAdjust,
  }: {
    configs?: TrustScoreConfig[];
    onSave?: (configs: TrustScoreConfig[]) => Promise<void>;
    onAdjust?: (
      userId: string,
      points: number,
      reason: string
    ) => Promise<void>;
  } = $props();

  let editedConfigs = $state<TrustScoreConfig[]>(
    JSON.parse(JSON.stringify(configs))
  );
  let hasChanges = $derived(
    JSON.stringify(editedConfigs) !== JSON.stringify(configs)
  );
  let isSaving = $state(false);
  let saveMessage = $state("");

  let adjustUserId = $state("");
  let adjustPoints = $state(0);
  let adjustReason = $state("");
  let isAdjusting = $state(false);
  let adjustMessage = $state("");

  let positiveConfigs = $derived(
    editedConfigs
      .filter((c) => c.points > 0)
      .sort((a, b) => b.points - a.points)
  );
  let negativeConfigs = $derived(
    editedConfigs
      .filter((c) => c.points < 0)
      .sort((a, b) => a.points - b.points)
  );

  function formatActionKey(key: string): string {
    return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function updatePointValue(actionKey: string, newValue: number) {
    const index = editedConfigs.findIndex((c) => c.actionKey === actionKey);
    if (index !== -1) {
      editedConfigs[index].points = newValue;
    }
  }

  async function handleSave() {
    if (!onSave || !hasChanges) return;
    isSaving = true;
    saveMessage = "";
    try {
      await onSave(editedConfigs);
      saveMessage = "✅ Configuration saved successfully!";
      setTimeout(() => (saveMessage = ""), 3000);
    } catch (error) {
      saveMessage = "❌ Failed to save configuration";
      console.error("Save error:", error);
    } finally {
      isSaving = false;
    }
  }

  function handleReset() {
    editedConfigs = JSON.parse(JSON.stringify(configs));
    saveMessage = "";
  }

  async function handleAdjust() {
    if (!onAdjust || !adjustUserId || adjustPoints === 0 || !adjustReason) {
      adjustMessage = "❌ Please fill all fields";
      return;
    }
    isAdjusting = true;
    adjustMessage = "";
    try {
      await onAdjust(adjustUserId, adjustPoints, adjustReason);
      adjustMessage = "✅ Trust score adjusted successfully!";
      adjustUserId = "";
      adjustPoints = 0;
      adjustReason = "";
      setTimeout(() => (adjustMessage = ""), 3000);
    } catch (error) {
      adjustMessage = "❌ Failed to adjust trust score";
      console.error("Adjust error:", error);
    } finally {
      isAdjusting = false;
    }
  }
</script>

<div class="admin-container">
  <div class="admin-header">
    <h2>Trust Score Administration</h2>
    <p>Configure point values and manually adjust user scores</p>
  </div>

  <div class="config-section card">
    <h3>Point Configuration</h3>

    {#if hasChanges}
      <div class="changes-banner">
        <span>You have unsaved changes</span>
        <div class="button-group">
          <button
            onclick={handleReset}
            class="btn-secondary"
            disabled={isSaving}>Cancel</button
          >
          <button onclick={handleSave} class="btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    {/if}

    {#if saveMessage}
      <div class="message {saveMessage.includes('✅') ? 'success' : 'error'}">
        {saveMessage}
      </div>
    {/if}

    <div class="config-grid">
      <div class="config-category">
        <h4 class="positive">✅ Positive Actions</h4>
        <div class="config-list">
          {#each positiveConfigs as config}
            <div class="config-item">
              <label for={config.actionKey}
                >{formatActionKey(config.actionKey)}</label
              >
              <div class="input-group">
                <span>-</span>
                <input
                  id={config.actionKey}
                  type="number"
                  min="0"
                  max="100"
                  value={Math.abs(config.points)}
                  oninput={(e) =>
                    updatePointValue(
                      config.actionKey,
                      -parseInt(e.currentTarget.value)
                    )}
                />
                <span>pts</span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="config-category">
        <h4 class="negative">⚠️ Negative Actions</h4>
        <div class="config-list">
          {#each negativeConfigs as config}
            <div class="config-item">
              <label for={config.actionKey}
                >{formatActionKey(config.actionKey)}</label
              >
              <div class="input-group">
                <span>-</span>
                <input
                  id={config.actionKey}
                  type="number"
                  min="0"
                  max="100"
                  value={Math.abs(config.points)}
                  oninput={(e) =>
                    updatePointValue(
                      config.actionKey,
                      -parseInt(e.currentTarget.value)
                    )}
                />
                <span>pts</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="adjust-section card">
    <h3>Manual Score Adjustment</h3>
    <p>
      Manually adjust a user's trust score. Use this for exceptional
      circumstances only.
    </p>

    {#if adjustMessage}
      <div class="message {adjustMessage.includes('✅') ? 'success' : 'error'}">
        {adjustMessage}
      </div>
    {/if}

    <form
      class="adjust-form"
      onsubmit={(e) => {
        e.preventDefault();
        handleAdjust();
      }}
    >
      <div class="form-row">
        <div class="form-group">
          <label for="userId">User ID</label>
          <input
            id="userId"
            type="text"
            bind:value={adjustUserId}
            placeholder="Enter user UUID"
            required
          />
        </div>
        <div class="form-group">
          <label for="points">Points</label>
          <input
            id="points"
            type="number"
            bind:value={adjustPoints}
            placeholder="e.g., +10 or -20"
            required
          />
        </div>
      </div>
      <div class="form-group">
        <label for="reason">Reason (Required)</label>
        <textarea
          id="reason"
          bind:value={adjustReason}
          placeholder="Explain why this adjustment is being made..."
          rows="3"
          required
        ></textarea>
      </div>
      <button
        type="submit"
        class="btn-primary"
        disabled={isAdjusting ||
          !adjustUserId ||
          adjustPoints === 0 ||
          !adjustReason}
      >
        {isAdjusting ? "Adjusting..." : "Apply Adjustment"}
      </button>
    </form>
  </div>
</div>

<style>
  .admin-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  .admin-header h2 {
    font-size: 1.875rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }
  .admin-header p {
    font-size: 1rem;
    color: #6b7280;
    margin: 0 0 2rem 0;
  }
  .card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }
  .card h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 1rem 0;
  }
  .changes-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .changes-banner span {
    font-weight: 500;
    color: #92400e;
  }
  .button-group {
    display: flex;
    gap: 0.5rem;
  }
  .message {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-weight: 500;
  }
  .message.success {
    background: #dcfce7;
    color: #059669;
    border: 1px solid #86efac;
  }
  .message.error {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fca5a5;
  }
  .config-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }
  .config-category h4 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .config-category h4.positive {
    color: #059669;
  }
  .config-category h4.negative {
    color: #dc2626;
  }
  .config-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }
  .config-item label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    text-transform: capitalize;
  }
  .input-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .input-group span {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
  }
  .input-group input {
    width: 70px;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
  }
  .adjust-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .form-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }
  .form-group input,
  .form-group textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  .btn-primary,
  .btn-secondary {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  .btn-primary {
    background: #3b82f6;
    color: white;
  }
  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }
  .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
  .btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #f3f4f6;
  }
  @media (max-width: 768px) {
    .admin-container {
      padding: 1rem;
    }
    .config-grid {
      grid-template-columns: 1fr;
    }
    .form-row {
      grid-template-columns: 1fr;
    }
    .changes-banner {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style>
