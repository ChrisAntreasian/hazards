<script lang="ts">
  import type {
    SystemConfiguration,
    ModerationConfig,
    ValidationConfig,
    NotificationConfig,
    NotificationType,
    FeatureFlags,
  } from "$lib/types/admin.js";

  let config = $state<SystemConfiguration | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let activeSection = $state("moderation");
  let hasChanges = $state(false);

  // Track changes for each section
  let moderationChanges = $state<Partial<ModerationConfig>>({});
  let validationChanges = $state<Partial<ValidationConfig>>({});
  let notificationChanges = $state<Partial<NotificationConfig>>({});
  let featureChanges = $state<Partial<FeatureFlags>>({});

  const sections = [
    { id: "moderation", label: "Moderation", icon: "⚖️" },
    { id: "validation", label: "Validation", icon: "✅" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "features", label: "Features", icon: "🚀" },
  ];

  $effect(() => {
    loadConfig();
  });

  async function loadConfig() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch("/api/admin/config");
      const result = await response.json();

      if (result.success) {
        config = result.data;
        resetChanges();
      } else {
        error = result.error || "Failed to load configuration";
      }
    } catch (err) {
      error = "Network error loading configuration";
      console.error("Error loading config:", err);
    } finally {
      isLoading = false;
    }
  }

  async function saveConfig() {
    if (!config || !hasChanges) return;

    isLoading = true;
    error = null;

    try {
      const updates: Partial<SystemConfiguration> = {};

      if (Object.keys(moderationChanges).length > 0) {
        updates.moderation = { ...config.moderation, ...moderationChanges };
      }

      if (Object.keys(validationChanges).length > 0) {
        updates.validation = { ...config.validation, ...validationChanges };
      }

      if (Object.keys(notificationChanges).length > 0) {
        updates.notifications = {
          ...config.notifications,
          ...notificationChanges,
        };
      }

      if (Object.keys(featureChanges).length > 0) {
        updates.features = { ...config.features, ...featureChanges };
      }

      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        config = result.data;
        resetChanges();
      } else {
        error = result.error || "Failed to save configuration";
      }
    } catch (err) {
      error = "Network error saving configuration";
      console.error("Error saving config:", err);
    } finally {
      isLoading = false;
    }
  }

  function resetChanges() {
    moderationChanges = {};
    validationChanges = {};
    notificationChanges = {};
    featureChanges = {};
    hasChanges = false;
  }

  function updateModerationConfig(key: keyof ModerationConfig, value: any) {
    moderationChanges[key] = value;
    hasChanges = true;
  }

  function updateValidationConfig(key: keyof ValidationConfig, value: any) {
    validationChanges[key] = value;
    hasChanges = true;
  }

  function updateNotificationConfig(key: keyof NotificationConfig, value: any) {
    notificationChanges[key] = value;
    hasChanges = true;
  }

  function updateFeatureConfig(key: keyof FeatureFlags, value: any) {
    featureChanges[key] = value;
    hasChanges = true;
  }

  function getCurrentModerationValue(key: keyof ModerationConfig) {
    return moderationChanges[key] !== undefined
      ? moderationChanges[key]
      : config?.moderation[key];
  }

  function getCurrentValidationValue(key: keyof ValidationConfig) {
    return validationChanges[key] !== undefined
      ? validationChanges[key]
      : config?.validation[key];
  }

  function getCurrentNotificationValue(key: keyof NotificationConfig) {
    return notificationChanges[key] !== undefined
      ? notificationChanges[key]
      : config?.notifications[key];
  }

  // Type-safe helpers for boolean values
  function getModerationBooleanValue(key: keyof ModerationConfig): boolean {
    const value = getCurrentModerationValue(key);
    return typeof value === "boolean" ? value : false;
  }

  function getValidationBooleanValue(key: keyof ValidationConfig): boolean {
    const value = getCurrentValidationValue(key);
    return typeof value === "boolean" ? value : false;
  }

  function getNotificationBooleanValue(key: keyof NotificationConfig): boolean {
    const value = getCurrentNotificationValue(key);
    return typeof value === "boolean" ? value : false;
  }

  function getValidationStringArrayValue(
    key: keyof ValidationConfig
  ): string[] {
    const value = getCurrentValidationValue(key);
    return Array.isArray(value) ? value : [];
  }

  function getNotificationStringArrayValue(
    key: keyof NotificationConfig
  ): NotificationType[] {
    const value = getCurrentNotificationValue(key);
    return Array.isArray(value) ? value : [];
  }

  function getCurrentFeatureValue(key: keyof FeatureFlags) {
    return featureChanges[key] !== undefined
      ? featureChanges[key]
      : config?.features[key];
  }
</script>

<div class="config-management">
  <div class="header">
    <h2>System Configuration</h2>
    {#if hasChanges}
      <div class="save-controls">
        <button onclick={resetChanges} disabled={isLoading}>
          Discard Changes
        </button>
        <button class="btn-primary" onclick={saveConfig} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="alert alert-error">
      {error}
      <button onclick={() => (error = null)} class="alert-close">×</button>
    </div>
  {/if}

  <div class="config-content">
    <!-- Section Navigation -->
    <nav class="config-nav">
      {#each sections as section}
        <button
          class="nav-button"
          class:active={activeSection === section.id}
          onclick={() => (activeSection = section.id)}
        >
          <span class="nav-icon">{section.icon}</span>
          <span class="nav-label">{section.label}</span>
        </button>
      {/each}
    </nav>

    <!-- Configuration Sections -->
    <main class="config-main">
      {#if isLoading && !config}
        <div class="loading">Loading configuration...</div>
      {:else if config}
        {#if activeSection === "moderation"}
          <div class="config-section">
            <h3>Moderation Settings</h3>
            <p class="section-description">
              Configure how hazard submissions are reviewed and processed
              through the moderation pipeline.
            </p>

            <div class="form-group">
              <label for="moderation-mode">Moderation Mode</label>
              <select
                id="moderation-mode"
                value={getCurrentModerationValue("mode")}
                onchange={(e) => {
                  const target = e.target as HTMLSelectElement;
                  updateModerationConfig("mode", target.value);
                }}
                disabled={isLoading}
              >
                <option value="manual"
                  >Manual - All submissions require human review</option
                >
                <option value="automated"
                  >Automated - AI handles all moderation decisions</option
                >
                <option value="hybrid"
                  >Hybrid - AI pre-screens, humans review edge cases</option
                >
              </select>
              <small
                >Choose how submissions are processed through moderation</small
              >
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="auto-approve-threshold"
                  >Auto-Approve Threshold</label
                >
                <input
                  id="auto-approve-threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={getCurrentModerationValue("auto_approve_threshold")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateModerationConfig(
                      "auto_approve_threshold",
                      parseFloat(target.value)
                    );
                  }}
                  disabled={isLoading}
                />
                <small
                  >Confidence threshold for automatic approval (0.0 - 1.0)</small
                >
              </div>

              <div class="form-group">
                <label for="auto-reject-threshold">Auto-Reject Threshold</label>
                <input
                  id="auto-reject-threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={getCurrentModerationValue("auto_reject_threshold")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateModerationConfig(
                      "auto_reject_threshold",
                      parseFloat(target.value)
                    );
                  }}
                  disabled={isLoading}
                />
                <small
                  >Confidence threshold for automatic rejection (0.0 - 1.0)</small
                >
              </div>
            </div>

            <div class="form-group">
              <label for="max-pending-queue">Max Pending Queue Size</label>
              <input
                id="max-pending-queue"
                type="number"
                min="100"
                max="10000"
                step="100"
                value={getCurrentModerationValue("max_pending_queue_size")}
                onchange={(e) => {
                  const target = e.target as HTMLInputElement;
                  updateModerationConfig(
                    "max_pending_queue_size",
                    parseInt(target.value)
                  );
                }}
                disabled={isLoading}
              />
              <small
                >Maximum number of submissions in the pending moderation queue</small
              >
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={getModerationBooleanValue(
                    "require_moderator_approval"
                  )}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateModerationConfig(
                      "require_moderator_approval",
                      target.checked
                    );
                  }}
                  disabled={isLoading}
                />
                Require Moderator Approval for High-Risk Submissions
              </label>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={getModerationBooleanValue("trusted_user_bypass")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateModerationConfig(
                      "trusted_user_bypass",
                      target.checked
                    );
                  }}
                  disabled={isLoading}
                />
                Allow Trusted Users to Bypass Moderation
              </label>
            </div>
          </div>
        {:else if activeSection === "validation"}
          <div class="config-section">
            <h3>Validation Settings</h3>
            <p class="section-description">
              Configure validation rules for hazard submissions and content
              quality requirements.
            </p>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={getValidationBooleanValue("strict_location_bounds")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateValidationConfig(
                      "strict_location_bounds",
                      target.checked
                    );
                  }}
                  disabled={isLoading}
                />
                Strict Location Bounds Enforcement
              </label>
              <small
                >Only allow hazards within predefined geographic boundaries</small
              >
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={getValidationBooleanValue("require_images")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateValidationConfig("require_images", target.checked);
                  }}
                  disabled={isLoading}
                />
                Require Images for All Hazard Submissions
              </label>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="min-description-length"
                  >Minimum Description Length</label
                >
                <input
                  id="min-description-length"
                  type="number"
                  min="1"
                  max="500"
                  value={getCurrentValidationValue("min_description_length")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateValidationConfig(
                      "min_description_length",
                      parseInt(target.value)
                    );
                  }}
                  disabled={isLoading}
                />
                <small>Minimum number of characters required</small>
              </div>

              <div class="form-group">
                <label for="max-image-size">Maximum Image Size (MB)</label>
                <input
                  id="max-image-size"
                  type="number"
                  min="1"
                  max="100"
                  value={getCurrentValidationValue("max_image_size_mb")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateValidationConfig(
                      "max_image_size_mb",
                      parseInt(target.value)
                    );
                  }}
                  disabled={isLoading}
                />
                <small>Maximum file size for image uploads</small>
              </div>
            </div>

            <div class="form-group">
              <label for="allowed-file-types">Allowed File Types</label>
              <div class="checkbox-group">
                {#each [{ value: "image/jpeg", label: "JPEG" }, { value: "image/png", label: "PNG" }, { value: "image/webp", label: "WebP" }, { value: "image/gif", label: "GIF" }] as fileType}
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      checked={getValidationStringArrayValue(
                        "allowed_file_types"
                      ).includes(fileType.value)}
                      onchange={(e) => {
                        const target = e.target as HTMLInputElement;
                        const current =
                          getValidationStringArrayValue("allowed_file_types");
                        const updated = target.checked
                          ? [...current, fileType.value]
                          : current.filter((t: string) => t !== fileType.value);
                        updateValidationConfig("allowed_file_types", updated);
                      }}
                      disabled={isLoading}
                    />
                    {fileType.label}
                  </label>
                {/each}
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={getValidationBooleanValue(
                    "duplicate_detection_enabled"
                  )}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateValidationConfig(
                      "duplicate_detection_enabled",
                      target.checked
                    );
                  }}
                  disabled={isLoading}
                />
                Enable Duplicate Detection
              </label>
              <small
                >Automatically detect and prevent duplicate hazard submissions</small
              >
              <div class="alert alert-warning">
                <span class="alert-icon">🚧</span>
                <div>
                  <strong>Not Implemented:</strong> Duplicate detection requires
                  geospatial algorithms, content similarity analysis, and machine
                  learning models for accurate matching.
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={getValidationBooleanValue(
                    "profanity_filter_enabled"
                  )}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateValidationConfig(
                      "profanity_filter_enabled",
                      target.checked
                    );
                  }}
                  disabled={isLoading}
                />
                Enable Profanity Filter
              </label>
              <small
                >Automatically filter inappropriate language in submissions</small
              >
              <div class="alert alert-info">
                <span class="alert-icon">ℹ️</span>
                <div>
                  <strong>Partially Implemented:</strong> Basic profanity detection
                  exists in validation. Advanced filtering with context awareness
                  and multiple languages needs implementation.
                </div>
              </div>
            </div>
          </div>
        {:else if activeSection === "notifications"}
          <div class="config-section">
            <h3>Notification Settings</h3>
            <p class="section-description">
              Configure how users receive notifications about hazards and system
              updates.
            </p>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={getNotificationBooleanValue("email_notifications")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateNotificationConfig(
                      "email_notifications",
                      target.checked
                    );
                  }}
                  disabled={isLoading}
                />
                Enable Email Notifications
              </label>
              <div class="alert alert-warning">
                <span class="alert-icon">🚧</span>
                <div>
                  <strong>Not Implemented:</strong> Email notification system requires
                  SMTP configuration, template engine, and background job processing
                  for digest emails.
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={getNotificationBooleanValue("real_time_updates")}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateNotificationConfig(
                      "real_time_updates",
                      target.checked
                    );
                  }}
                  disabled={isLoading}
                />
                Enable Real-Time Updates
              </label>
              <small>Push notifications for immediate hazard alerts</small>
              <div class="alert alert-warning">
                <span class="alert-icon">🚧</span>
                <div>
                  <strong>Not Implemented:</strong> Real-time updates require WebSocket
                  infrastructure, push notification service, and geolocation-based
                  alert targeting.
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="digest-frequency">Digest Email Frequency</label>
              <select
                id="digest-frequency"
                value={getCurrentNotificationValue("digest_frequency")}
                onchange={(e) => {
                  const target = e.target as HTMLSelectElement;
                  updateNotificationConfig("digest_frequency", target.value);
                }}
                disabled={isLoading}
              >
                <option value="disabled">Disabled</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div class="form-group">
              <label for="notification-types">Enabled Notification Types</label>
              <div class="checkbox-group">
                {#each [{ value: "new_hazard_nearby", label: "New Hazards Nearby" }, { value: "moderation_status_change", label: "Moderation Status Changes" }, { value: "trust_score_change", label: "Trust Score Updates" }, { value: "system_announcements", label: "System Announcements" }, { value: "weekly_digest", label: "Weekly Digest" }] as notificationType}
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      checked={getNotificationStringArrayValue(
                        "notification_types"
                      ).includes(notificationType.value as NotificationType)}
                      onchange={(e) => {
                        const target = e.target as HTMLInputElement;
                        const current =
                          getNotificationStringArrayValue("notification_types");
                        const updated = target.checked
                          ? [...current, notificationType.value]
                          : current.filter(
                              (t: string) => t !== notificationType.value
                            );
                        updateNotificationConfig("notification_types", updated);
                      }}
                      disabled={isLoading}
                    />
                    {notificationType.label}
                  </label>
                {/each}
              </div>
              <div class="alert alert-warning">
                <span class="alert-icon">🚧</span>
                <div>
                  <strong>Not Implemented:</strong> Notification delivery system
                  needs background services, user preference management, and integration
                  with email/push providers.
                </div>
              </div>
            </div>
          </div>
        {:else if activeSection === "features"}
          <div class="config-section">
            <h3>Feature Flags</h3>
            <p class="section-description">
              Enable or disable system features and experimental functionality.
            </p>

            <div class="feature-grid">
              <div class="feature-card">
                <div class="feature-header">
                  <h4>User-Generated Templates</h4>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={getCurrentFeatureValue(
                        "user_generated_templates"
                      )}
                      onchange={(e) =>
                        updateFeatureConfig(
                          "user_generated_templates",
                          (e.target as HTMLInputElement)?.checked || false
                        )}
                      disabled={isLoading}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p>
                  Allow users to create and share hazard submission templates
                </p>
                <div class="alert alert-info">
                  <span class="alert-icon">ℹ️</span>
                  <div>
                    <strong>Partially Implemented:</strong> Basic template database
                    exists. User creation workflow, approval process, and sharing
                    mechanisms need development.
                  </div>
                </div>
              </div>

              <div class="feature-card">
                <div class="feature-header">
                  <h4>Advanced Mapping</h4>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={getCurrentFeatureValue("advanced_mapping")}
                      onchange={(e) =>
                        updateFeatureConfig(
                          "advanced_mapping",
                          (e.target as HTMLInputElement)?.checked || false
                        )}
                      disabled={isLoading}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p>Enhanced map features with clustering and heat maps</p>
                <div class="alert alert-warning">
                  <span class="alert-icon">🚧</span>
                  <div>
                    <strong>Not Implemented:</strong> Requires map clustering algorithms,
                    heat map visualization, advanced Leaflet plugins, and performance
                    optimization.
                  </div>
                </div>
              </div>

              <div class="feature-card">
                <div class="feature-header">
                  <h4>Community Voting</h4>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={getCurrentFeatureValue("community_voting")}
                      onchange={(e) =>
                        updateFeatureConfig(
                          "community_voting",
                          (e.target as HTMLInputElement)?.checked || false
                        )}
                      disabled={isLoading}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p>Allow community voting on hazard severity and accuracy</p>
                <div class="alert alert-warning">
                  <span class="alert-icon">🚧</span>
                  <div>
                    <strong>Not Implemented:</strong> Requires voting UI, reputation
                    algorithms, consensus mechanisms, and anti-gaming measures.
                  </div>
                </div>
              </div>

              <div class="feature-card">
                <div class="feature-header">
                  <h4>Hazard Comments</h4>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={getCurrentFeatureValue("hazard_comments")}
                      onchange={(e) =>
                        updateFeatureConfig(
                          "hazard_comments",
                          (e.target as HTMLInputElement)?.checked || false
                        )}
                      disabled={isLoading}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p>Enable user comments and discussions on hazard reports</p>
                <div class="alert alert-warning">
                  <span class="alert-icon">🚧</span>
                  <div>
                    <strong>Not Implemented:</strong> Requires comment database schema,
                    moderation workflow, threading system, and notification integration.
                  </div>
                </div>
              </div>

              <div class="feature-card">
                <div class="feature-header">
                  <h4>Real-Time Collaboration</h4>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={getCurrentFeatureValue(
                        "real_time_collaboration"
                      )}
                      onchange={(e) =>
                        updateFeatureConfig(
                          "real_time_collaboration",
                          (e.target as HTMLInputElement)?.checked || false
                        )}
                      disabled={isLoading}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p>Live collaborative editing of hazard information</p>
                <div class="alert alert-warning">
                  <span class="alert-icon">🚧</span>
                  <div>
                    <strong>Not Implemented:</strong> Requires operational transformation
                    algorithms, conflict resolution, WebSocket infrastructure, and
                    concurrent editing UI.
                  </div>
                </div>
              </div>

              <div class="feature-card">
                <div class="feature-header">
                  <h4>AI-Assisted Categorization</h4>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={getCurrentFeatureValue(
                        "ai_assisted_categorization"
                      )}
                      onchange={(e) =>
                        updateFeatureConfig(
                          "ai_assisted_categorization",
                          (e.target as HTMLInputElement)?.checked || false
                        )}
                      disabled={isLoading}
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p>
                  Automatic categorization suggestions using machine learning
                </p>
                <div class="alert alert-warning">
                  <span class="alert-icon">🚧</span>
                  <div>
                    <strong>Not Implemented:</strong> Requires ML model training,
                    image recognition API integration, NLP processing, and confidence
                    scoring.
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {:else}
        <div class="empty-state">
          <p>Unable to load system configuration.</p>
          <button onclick={loadConfig}>Retry</button>
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  .config-management {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .header h2 {
    margin: 0;
    color: #1f2937;
    font-size: 1.875rem;
    font-weight: 600;
  }

  .save-controls {
    display: flex;
    gap: 0.75rem;
  }

  .save-controls button {
    padding: 0.75rem 1.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
  }

  .btn-primary {
    background: #3b82f6 !important;
    color: white !important;
    border-color: #3b82f6 !important;
  }

  .config-content {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 2rem;
    align-items: start;
  }

  .config-nav {
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    padding: 0.5rem;
    position: sticky;
    top: 1rem;
  }

  .nav-button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    border: none;
    background: none;
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.15s ease-in-out;
    text-align: left;
  }

  .nav-button:hover {
    background: #f9fafb;
    color: #374151;
  }

  .nav-button.active {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .nav-icon {
    font-size: 1.125rem;
    flex-shrink: 0;
  }

  .nav-label {
    flex: 1;
  }

  .config-main {
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    min-height: 600px;
  }

  .config-section {
    padding: 2rem;
  }

  .config-section h3 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .section-description {
    margin: 0 0 2rem 0;
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: border-color 0.15s ease-in-out;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group small {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: normal;
    margin-bottom: 0;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0.125rem 0 0 0;
    flex-shrink: 0;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .feature-card {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.5rem;
    background: #f9fafb;
  }

  .feature-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .feature-card h4 {
    margin: 0;
    color: #1f2937;
    font-size: 1rem;
    font-weight: 600;
  }

  .feature-card p {
    margin: 0;
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #d1d5db;
    border-radius: 24px;
    transition: 0.2s;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: 0.2s;
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: #3b82f6;
  }

  .toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  .loading,
  .empty-state {
    padding: 3rem 2rem;
    text-align: center;
    color: #6b7280;
  }

  .alert {
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .alert-error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .alert-warning {
    background: #fffbeb;
    color: #92400e;
    border: 1px solid #f59e0b;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .alert-info {
    background: #eff6ff;
    color: #1e40af;
    border: 1px solid #3b82f6;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .alert-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .alert-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .config-content {
      grid-template-columns: 1fr;
    }

    .config-nav {
      display: flex;
      overflow-x: auto;
      padding: 0.5rem;
    }

    .nav-button {
      flex-shrink: 0;
      white-space: nowrap;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .feature-grid {
      grid-template-columns: 1fr;
    }

    .save-controls {
      flex-direction: column;
      width: 100%;
    }

    .header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
  }
</style>
