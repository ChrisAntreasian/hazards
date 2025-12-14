# Hazard Expiration System - Detailed Implementation Plan
**Created:** November 17, 2025  
**Status:** Planning Phase  
**Complexity:** High - Requires careful design and testing

## 🎯 Executive Summary

The hazard expiration system needs to handle different lifecycle patterns:
- **Weather events** that naturally expire (thunderstorms, ice)
- **Fixable issues** that users can report as resolved (fallen trees, accidents)
- **Geographic features** that never expire (cliffs, permanent hazards)
- **Seasonal patterns** that activate/deactivate based on time of year

This document provides a complete implementation roadmap with specific decisions on database design, UI flows, admin controls, and integration points.

---

## 📊 Part 1: Understanding the Problem

### Current State
- Hazards are created and remain in the database forever
- No way to indicate a hazard is resolved or outdated
- Users can't report that an issue is fixed
- No automatic cleanup of old/stale hazards
- Weather events stay active long after they've passed

### User Stories

**As a User:**
- I want to report when a hazard is resolved so others don't waste time checking it
- I want to know if a hazard is still active or expired
- I want to see when a temporary hazard will expire automatically
- I don't want to see expired hazards cluttering the map

**As a Hazard Creator:**
- I want my weather event reports to automatically expire when appropriate
- I want to be notified before my hazard expires so I can extend it if needed
- I want to mark my own hazard as resolved when the issue is fixed

**As an Admin:**
- I want to configure expiration durations for different hazard types
- I want to override expiration decisions when needed
- I want to restore incorrectly expired hazards
- I want to see patterns of expired vs active hazards

---

## 🏗️ Part 2: System Architecture

### 2.1 Expiration Type Taxonomy

```typescript
type ExpirationType = 
  | 'auto_expire'      // Time-based expiration (weather events)
  | 'user_resolvable'  // Can be marked resolved by community
  | 'permanent'        // Never expires (geographic features)
  | 'seasonal'         // Activates/deactivates by season

type ExpirationStatus = 
  | 'active'           // Currently active and visible
  | 'expiring_soon'    // Will expire in < 24 hours
  | 'expired'          // Past expiration time or manually resolved
  | 'resolved'         // Marked as resolved by users
  | 'dormant'          // Seasonal hazard in off-season
```

### 2.2 Decision Matrix: Which Type for Which Hazard?

| Hazard Category | Default Type | Auto-Duration | Reasoning |
|----------------|--------------|---------------|-----------|
| **Weather: Thunderstorm** | auto_expire | 6 hours | Passes quickly |
| **Weather: Ice/Snow** | auto_expire | 24-48 hours | Depends on temperature |
| **Weather: Flood** | auto_expire | 48-72 hours | Takes time to recede |
| **Infrastructure: Road Closure** | user_resolvable | - | Depends on repairs |
| **Infrastructure: Downed Power Line** | auto_expire | 12 hours | Emergency services respond |
| **Accidents: Car Accident** | user_resolvable | - | Cleared when reported |
| **Terrain: Fallen Tree** | user_resolvable | - | Removed when cleared |
| **Plants: Poison Ivy** | permanent | - | Doesn't go away |
| **Terrain: Cliff Edge** | permanent | - | Geographic feature |
| **Wildlife: Bee Nest** | seasonal | Summer | Active May-September |
| **Wildlife: Bear Activity** | seasonal | Spring/Fall | Migration patterns |
| **Plants: Pollen (Ragweed)** | seasonal | Late Summer | August-October |
| **Default (Unknown)** | user_resolvable | 7 days | Conservative default |

### 2.3 Database Schema

```sql
-- Add expiration columns to hazards table
ALTER TABLE public.hazards
ADD COLUMN IF NOT EXISTS expiration_type TEXT 
  CHECK (expiration_type IN ('auto_expire', 'user_resolvable', 'permanent', 'seasonal'))
  DEFAULT 'user_resolvable',
  
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_extend_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS extended_count INTEGER DEFAULT 0,

ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resolution_note TEXT,
ADD COLUMN IF NOT EXISTS resolution_verified_count INTEGER DEFAULT 0,

ADD COLUMN IF NOT EXISTS seasonal_pattern JSONB,
-- Example: {"active_months": [5,6,7,8,9], "active_start": "05-01", "active_end": "09-30"}

ADD COLUMN IF NOT EXISTS expiration_notified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_check TIMESTAMPTZ DEFAULT NOW();

-- Create resolution reports table (for tracking community resolution reports)
CREATE TABLE IF NOT EXISTS public.hazard_resolution_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  resolution_note TEXT NOT NULL,
  evidence_url TEXT, -- Optional photo of resolution
  trust_score_at_report INTEGER, -- Reporter's trust score when reported
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(hazard_id, reported_by) -- One report per user per hazard
);

-- Create expiration settings table (admin configurable)
CREATE TABLE IF NOT EXISTS public.expiration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_path TEXT NOT NULL UNIQUE, -- e.g., "weather/thunderstorm"
  default_expiration_type TEXT NOT NULL,
  auto_expire_duration INTERVAL, -- e.g., '6 hours', '2 days'
  seasonal_pattern JSONB,
  resolution_threshold INTEGER DEFAULT 3, -- Reports needed to auto-resolve
  allow_user_override BOOLEAN DEFAULT true, -- Can user choose different type?
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expiration audit log
CREATE TABLE IF NOT EXISTS public.expiration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'auto_expired', 'manually_resolved', 'extended', 'restored'
  performed_by UUID REFERENCES auth.users(id), -- NULL for system actions
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hazards_expiration_type ON public.hazards(expiration_type);
CREATE INDEX IF NOT EXISTS idx_hazards_expires_at ON public.hazards(expires_at) 
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hazards_resolved_at ON public.hazards(resolved_at)
  WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resolution_reports_hazard ON public.hazard_resolution_reports(hazard_id);
CREATE INDEX IF NOT EXISTS idx_expiration_audit_hazard ON public.expiration_audit_log(hazard_id, created_at DESC);
```

### 2.4 Computed Status Logic

```sql
-- Function to get current expiration status
CREATE OR REPLACE FUNCTION get_hazard_expiration_status(p_hazard_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_hazard RECORD;
  v_current_month INTEGER;
BEGIN
  SELECT * INTO v_hazard FROM public.hazards WHERE id = p_hazard_id;
  
  -- Check if manually resolved
  IF v_hazard.resolved_at IS NOT NULL THEN
    RETURN 'resolved';
  END IF;
  
  -- Check expiration type
  CASE v_hazard.expiration_type
    WHEN 'permanent' THEN
      RETURN 'active';
      
    WHEN 'auto_expire' THEN
      IF v_hazard.expires_at IS NULL THEN
        RETURN 'active';
      ELSIF v_hazard.expires_at <= NOW() THEN
        RETURN 'expired';
      ELSIF v_hazard.expires_at <= NOW() + INTERVAL '24 hours' THEN
        RETURN 'expiring_soon';
      ELSE
        RETURN 'active';
      END IF;
      
    WHEN 'seasonal' THEN
      IF v_hazard.seasonal_pattern IS NULL THEN
        RETURN 'active';
      END IF;
      
      v_current_month := EXTRACT(MONTH FROM NOW());
      
      IF v_current_month = ANY(
        SELECT jsonb_array_elements_text(v_hazard.seasonal_pattern->'active_months')::INTEGER
      ) THEN
        RETURN 'active';
      ELSE
        RETURN 'dormant';
      END IF;
      
    WHEN 'user_resolvable' THEN
      -- Check resolution report threshold
      IF (
        SELECT COUNT(*) FROM public.hazard_resolution_reports 
        WHERE hazard_id = p_hazard_id
      ) >= 3 THEN
        RETURN 'resolved';
      ELSE
        RETURN 'active';
      END IF;
      
    ELSE
      RETURN 'active';
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 Part 3: User Interface Design

### 3.1 Hazard Creation Form Updates

**Step 1: Category Selection**
- User selects hazard category (existing flow)
- System looks up default expiration settings for that category

**Step 2: Expiration Type Selection (NEW)**

```svelte
<!-- Show this section after category selection -->
<div class="expiration-type-section">
  <h3>How long will this hazard last?</h3>
  
  <div class="expiration-options">
    <!-- Option 1: Auto-expire (for temporary events) -->
    <label class="expiration-option" class:recommended={isRecommended('auto_expire')}>
      <input type="radio" name="expirationType" value="auto_expire" />
      <div class="option-content">
        <h4>⏰ Temporary Event</h4>
        <p>This hazard will automatically expire after a set time</p>
        {#if expirationSettings?.auto_expire_duration}
          <span class="duration-hint">
            Suggested: {formatDuration(expirationSettings.auto_expire_duration)}
          </span>
        {/if}
      </div>
    </label>
    
    <!-- Option 2: User Resolvable (most common) -->
    <label class="expiration-option" class:recommended={isRecommended('user_resolvable')}>
      <input type="radio" name="expirationType" value="user_resolvable" />
      <div class="option-content">
        <h4>🔧 Fixable Issue</h4>
        <p>This hazard will remain until the community reports it's resolved</p>
        <span class="hint">Best for obstacles, fallen trees, accidents, etc.</span>
      </div>
    </label>
    
    <!-- Option 3: Permanent (geographic features) -->
    <label class="expiration-option" class:recommended={isRecommended('permanent')}>
      <input type="radio" name="expirationType" value="permanent" />
      <div class="option-content">
        <h4>🏔️ Permanent Hazard</h4>
        <p>This hazard doesn't go away (geographic feature, permanent danger)</p>
        <span class="hint">Best for cliffs, poison ivy patches, steep terrain</span>
      </div>
    </label>
    
    <!-- Option 4: Seasonal (advanced) -->
    <label class="expiration-option" class:recommended={isRecommended('seasonal')}>
      <input type="radio" name="expirationType" value="seasonal" />
      <div class="option-content">
        <h4>🔄 Seasonal Hazard</h4>
        <p>This hazard only occurs during certain months</p>
        <span class="hint">Best for bee nests, pollen, seasonal wildlife</span>
      </div>
    </label>
  </div>
  
  <!-- Duration picker for auto_expire -->
  {#if selectedType === 'auto_expire'}
    <div class="duration-picker">
      <label>
        Expires after:
        <select bind:value={expirationDuration}>
          <option value="PT2H">2 hours</option>
          <option value="PT6H">6 hours</option>
          <option value="PT12H">12 hours</option>
          <option value="P1D">1 day</option>
          <option value="P2D">2 days</option>
          <option value="P3D">3 days</option>
          <option value="P7D">1 week</option>
          <option value="custom">Custom...</option>
        </select>
      </label>
      
      <label class="checkbox-option">
        <input type="checkbox" bind:checked={autoExtendEnabled} />
        Automatically extend if still active when I check the map
      </label>
    </div>
  {/if}
  
  <!-- Season picker for seasonal -->
  {#if selectedType === 'seasonal'}
    <div class="season-picker">
      <p>Select active months:</p>
      <div class="month-grid">
        {#each months as month, index}
          <label class="month-checkbox">
            <input 
              type="checkbox" 
              value={index + 1}
              bind:group={activeMonths}
            />
            {month}
          </label>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Help text based on category -->
  <div class="help-text">
    <p>
      {#if recommendedType}
        💡 Based on the category "{categoryName}", 
        we recommend: <strong>{getTypeLabel(recommendedType)}</strong>
      {/if}
    </p>
  </div>
</div>
```

**Default Behavior:**
- Pre-select the recommended type based on category
- Show helpful hints about each option
- Allow user to override if `allow_user_override` is true
- Auto-fill duration from category settings

### 3.2 Hazard Detail Page - Status Display

```svelte
<!-- Expiration Status Badge -->
<section class="expiration-status-section">
  {#if expirationStatus === 'active'}
    <div class="status-badge status-active">
      ✓ Active
      {#if expirationType === 'auto_expire' && expiresAt}
        <span class="expires-in">
          Expires in {formatTimeRemaining(expiresAt)}
        </span>
      {/if}
    </div>
    
  {:else if expirationStatus === 'expiring_soon'}
    <div class="status-badge status-expiring-soon">
      ⏰ Expiring Soon
      <span class="countdown">
        <Countdown targetDate={expiresAt} />
      </span>
    </div>
    
    {#if isOwner}
      <button class="btn btn-secondary" onclick={handleExtendExpiration}>
        Extend Duration
      </button>
    {/if}
    
  {:else if expirationStatus === 'expired'}
    <div class="status-badge status-expired">
      ⏹️ Expired
      <span class="expired-date">
        on {formatDate(expiresAt)}
      </span>
    </div>
    
    {#if isAdmin}
      <button class="btn btn-link" onclick={handleRestoreHazard}>
        Restore This Hazard
      </button>
    {/if}
    
  {:else if expirationStatus === 'resolved'}
    <div class="status-badge status-resolved">
      ✓ Resolved
      <span class="resolved-info">
        {resolutionReportCount} user{resolutionReportCount > 1 ? 's' : ''} confirmed
      </span>
    </div>
    
    {#if isAdmin}
      <button class="btn btn-link" onclick={handleRestoreHazard}>
        Mark as Unresolved
      </button>
    {/if}
    
  {:else if expirationStatus === 'dormant'}
    <div class="status-badge status-dormant">
      💤 Dormant (Seasonal)
      <span class="season-info">
        Active during: {formatActiveMonths(seasonalPattern.active_months)}
      </span>
    </div>
  {/if}
  
  <!-- Expiration Type Info -->
  <div class="expiration-info">
    <span class="info-label">Type:</span>
    <span class="info-value">{getTypeLabel(expirationType)}</span>
    
    {#if expirationType === 'user_resolvable'}
      <span class="resolution-hint">
        Report below if resolved
      </span>
    {/if}
  </div>
</section>

<!-- Resolution Reporting (for user_resolvable hazards) -->
{#if expirationType === 'user_resolvable' && expirationStatus === 'active'}
  <section class="resolution-section">
    <h3>Is this hazard resolved?</h3>
    
    {#if hasUserReported}
      <div class="already-reported">
        ✓ You've already reported this as resolved
        <p class="report-count">
          {resolutionReportCount} of 3 reports needed for automatic resolution
        </p>
      </div>
    {:else}
      <HazardResolutionForm
        hazardId={hazard.id}
        onSuccess={handleResolutionReported}
      />
    {/if}
    
    <!-- Show recent resolution reports -->
    {#if resolutionReports.length > 0}
      <details class="resolution-reports">
        <summary>
          View resolution reports ({resolutionReports.length})
        </summary>
        <div class="reports-list">
          {#each resolutionReports as report}
            <div class="report-item">
              <div class="report-header">
                <span class="reporter">{report.reported_by_email}</span>
                <span class="report-date">{formatDate(report.created_at)}</span>
              </div>
              <p class="report-note">{report.resolution_note}</p>
              {#if report.evidence_url}
                <img src={report.evidence_url} alt="Evidence" class="evidence-image" />
              {/if}
            </div>
          {/each}
        </div>
      </details>
    {/if}
  </section>
{/if}
```

### 3.3 Resolution Form Component

```svelte
<!-- HazardResolutionForm.svelte -->
<script lang="ts">
  interface Props {
    hazardId: string;
    onSuccess?: () => void;
  }
  
  let { hazardId, onSuccess }: Props = $props();
  
  let resolutionNote = $state('');
  let evidenceFile = $state<File | null>(null);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  
  async function handleSubmit() {
    if (!resolutionNote.trim()) {
      error = 'Please provide details about the resolution';
      return;
    }
    
    try {
      submitting = true;
      error = null;
      
      // Upload evidence if provided
      let evidenceUrl = null;
      if (evidenceFile) {
        evidenceUrl = await uploadEvidence(evidenceFile);
      }
      
      // Submit resolution report
      const response = await fetch(`/api/hazards/${hazardId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_note: resolutionNote,
          evidence_url: evidenceUrl
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit resolution report');
      }
      
      // Success!
      onSuccess?.();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit';
    } finally {
      submitting = false;
    }
  }
</script>

<form class="resolution-form" onsubmit|preventDefault={handleSubmit}>
  <div class="form-group">
    <label for="resolution-note">
      Describe how this hazard is resolved:
    </label>
    <textarea
      id="resolution-note"
      bind:value={resolutionNote}
      placeholder="e.g., 'Tree has been removed by city crew', 'Accident cleared', etc."
      rows="3"
      required
    />
  </div>
  
  <div class="form-group">
    <label for="evidence-file">
      Photo evidence (optional):
    </label>
    <input
      id="evidence-file"
      type="file"
      accept="image/*"
      onchange={(e) => evidenceFile = e.currentTarget.files?.[0] || null}
    />
    <p class="help-text">
      A photo helps verify the resolution
    </p>
  </div>
  
  {#if error}
    <div class="error-message" role="alert">
      {error}
    </div>
  {/if}
  
  <button 
    type="submit" 
    class="btn btn-primary"
    disabled={submitting || !resolutionNote.trim()}
  >
    {submitting ? 'Submitting...' : 'Report as Resolved'}
  </button>
</form>
```

### 3.4 Map Display Modifications

**Filter expired hazards by default:**
```typescript
// In map query
const { data: hazards } = await supabase
  .from('hazards')
  .select('*')
  .eq('status', 'approved')
  .or('resolved_at.is.null,expires_at.gt.now()') // Filter out expired
  .within(bounds);
```

**Show expiration indicator on markers:**
```svelte
<!-- Map marker popup -->
<div class="marker-popup">
  <h4>{hazard.title}</h4>
  
  {#if expirationStatus === 'expiring_soon'}
    <span class="expiring-badge">⏰ Expires in {timeRemaining}</span>
  {:else if expirationStatus === 'resolved'}
    <span class="resolved-badge">✓ Resolved</span>
  {/if}
  
  <!-- ... rest of popup ... -->
</div>
```

**Add filter toggle:**
```svelte
<label class="map-filter">
  <input type="checkbox" bind:checked={showExpired} />
  Show expired/resolved hazards
</label>
```

---

## 🛠️ Part 4: Admin Interface

### 4.1 Expiration Settings Management

**Admin Page: `/admin/expiration-settings`**

```svelte
<script lang="ts">
  let settings = $state<ExpirationSetting[]>([]);
  let editingId = $state<string | null>(null);
  
  async function loadSettings() {
    const { data } = await supabase
      .from('expiration_settings')
      .select('*, hazard_categories(name, path)')
      .order('category_path');
    settings = data || [];
  }
  
  async function updateSetting(id: string, updates: Partial<ExpirationSetting>) {
    await supabase
      .from('expiration_settings')
      .update(updates)
      .eq('id', id);
    await loadSettings();
  }
</script>

<div class="admin-expiration-settings">
  <header>
    <h1>Expiration Settings</h1>
    <p>Configure default expiration behavior for hazard categories</p>
  </header>
  
  <table class="settings-table">
    <thead>
      <tr>
        <th>Category</th>
        <th>Default Type</th>
        <th>Auto Duration</th>
        <th>Resolution Threshold</th>
        <th>User Override</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each settings as setting}
        <tr>
          <td>{setting.category_path}</td>
          <td>
            {#if editingId === setting.id}
              <select bind:value={setting.default_expiration_type}>
                <option value="auto_expire">Auto Expire</option>
                <option value="user_resolvable">User Resolvable</option>
                <option value="permanent">Permanent</option>
                <option value="seasonal">Seasonal</option>
              </select>
            {:else}
              {setting.default_expiration_type}
            {/if}
          </td>
          <td>
            {#if editingId === setting.id}
              <input type="text" bind:value={setting.auto_expire_duration} />
            {:else}
              {setting.auto_expire_duration || 'N/A'}
            {/if}
          </td>
          <td>
            {#if editingId === setting.id}
              <input type="number" bind:value={setting.resolution_threshold} min="1" max="10" />
            {:else}
              {setting.resolution_threshold}
            {/if}
          </td>
          <td>
            {#if editingId === setting.id}
              <input type="checkbox" bind:checked={setting.allow_user_override} />
            {:else}
              {setting.allow_user_override ? '✓' : '✗'}
            {/if}
          </td>
          <td>
            {#if editingId === setting.id}
              <button onclick={() => {
                updateSetting(setting.id, setting);
                editingId = null;
              }}>
                Save
              </button>
              <button onclick={() => editingId = null}>Cancel</button>
            {:else}
              <button onclick={() => editingId = setting.id}>Edit</button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  
  <button class="btn btn-primary" onclick={handleAddCategory}>
    Add Category Settings
  </button>
</div>
```

### 4.2 Expiration Dashboard

**Admin Page: `/admin/expiration-dashboard`**

Shows:
- **Expiring Soon:** List of hazards expiring in next 24 hours
- **Recently Expired:** Hazards that expired in last 7 days
- **Pending Resolution:** Hazards with resolution reports (not yet threshold)
- **Auto-Expired Today:** Count and list
- **Dormant Seasonal:** Hazards currently dormant

```svelte
<div class="expiration-dashboard">
  <div class="dashboard-stats">
    <div class="stat-card">
      <h3>{stats.expiring_soon}</h3>
      <p>Expiring in 24h</p>
    </div>
    <div class="stat-card">
      <h3>{stats.expired_today}</h3>
      <p>Expired Today</p>
    </div>
    <div class="stat-card">
      <h3>{stats.pending_resolution}</h3>
      <p>Pending Resolution</p>
    </div>
    <div class="stat-card">
      <h3>{stats.dormant_seasonal}</h3>
      <p>Dormant (Seasonal)</p>
    </div>
  </div>
  
  <!-- Expiring Soon List -->
  <section class="dashboard-section">
    <h2>Expiring Soon</h2>
    <table class="hazards-table">
      <!-- ... hazards expiring in < 24h ... -->
    </table>
  </section>
  
  <!-- Actions -->
  <section class="dashboard-actions">
    <button onclick={handleBulkExtend}>
      Bulk Extend Selected
    </button>
    <button onclick={handleForceExpire}>
      Force Expire Selected
    </button>
  </section>
</div>
```

### 4.3 Individual Hazard Admin Controls

On hazard detail page, admins see additional controls:

```svelte
{#if isAdmin}
  <section class="admin-controls">
    <h3>Admin Actions</h3>
    
    <div class="action-buttons">
      <button onclick={handleForceExpire}>
        Force Expire Now
      </button>
      
      <button onclick={handleChangeExpirationType}>
        Change Expiration Type
      </button>
      
      <button onclick={handleExtendExpiration}>
        Extend Duration
      </button>
      
      {#if expirationStatus === 'expired' || expirationStatus === 'resolved'}
        <button onclick={handleRestoreHazard}>
          Restore to Active
        </button>
      {/if}
    </div>
    
    <!-- Expiration History -->
    <details>
      <summary>Expiration History</summary>
      <div class="audit-log">
        {#each auditLog as entry}
          <div class="audit-entry">
            <span class="action">{entry.action}</span>
            <span class="actor">{entry.performed_by || 'System'}</span>
            <span class="date">{formatDate(entry.created_at)}</span>
            {#if entry.reason}
              <p class="reason">{entry.reason}</p>
            {/if}
          </div>
        {/each}
      </div>
    </details>
  </section>
{/if}
```

---

## ⚙️ Part 5: Background Jobs & Automation

### 5.1 Expiration Check Job

**Frequency:** Every 15 minutes

```typescript
// Supabase Edge Function or cron job
async function checkExpirations() {
  // Find hazards that should be expired
  const { data: expiredHazards } = await supabase
    .from('hazards')
    .select('*')
    .eq('expiration_type', 'auto_expire')
    .lte('expires_at', new Date().toISOString())
    .is('resolved_at', null);
  
  for (const hazard of expiredHazards) {
    // Mark as expired
    await supabase
      .from('hazards')
      .update({ 
        status: 'removed', // or keep 'approved' and filter by expired_at
        updated_at: new Date().toISOString()
      })
      .eq('id', hazard.id);
    
    // Log to audit
    await supabase
      .from('expiration_audit_log')
      .insert({
        hazard_id: hazard.id,
        action: 'auto_expired',
        previous_state: { status: hazard.status },
        new_state: { status: 'removed', expired: true },
        reason: 'Auto-expired based on expiration time'
      });
    
    // Notify creator (optional)
    await sendNotification(hazard.user_id, {
      type: 'hazard_expired',
      hazard_id: hazard.id,
      message: `Your hazard "${hazard.title}" has expired`
    });
  }
  
  // Check resolution threshold
  const { data: resolvableHazards } = await supabase
    .from('hazards')
    .select(`
      *,
      resolution_reports:hazard_resolution_reports(count)
    `)
    .eq('expiration_type', 'user_resolvable')
    .is('resolved_at', null);
  
  for (const hazard of resolvableHazards) {
    const reportCount = hazard.resolution_reports[0]?.count || 0;
    
    // Check if threshold met (from settings or default 3)
    const threshold = await getResolutionThreshold(hazard.category_id) || 3;
    
    if (reportCount >= threshold) {
      // Auto-resolve
      await supabase
        .from('hazards')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_note: `Auto-resolved after ${reportCount} community reports`
        })
        .eq('id', hazard.id);
      
      // Log to audit
      await supabase
        .from('expiration_audit_log')
        .insert({
          hazard_id: hazard.id,
          action: 'auto_resolved',
          reason: `${reportCount} resolution reports exceeded threshold of ${threshold}`
        });
    }
  }
}
```

### 5.2 Expiration Warning Job

**Frequency:** Every hour

```typescript
async function sendExpirationWarnings() {
  // Find hazards expiring in next 24 hours that haven't been notified
  const { data: expiringHazards } = await supabase
    .from('hazards')
    .select('*, users(email)')
    .eq('expiration_type', 'auto_expire')
    .lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
    .is('expiration_notified_at', null);
  
  for (const hazard of expiringHazards) {
    // Send notification
    await sendEmail(hazard.users.email, {
      subject: `Your hazard "${hazard.title}" expires soon`,
      body: `
        Your hazard will expire in ${getTimeRemaining(hazard.expires_at)}.
        
        If the hazard is still active, you can extend it:
        ${getHazardUrl(hazard.id)}
      `
    });
    
    // Mark as notified
    await supabase
      .from('hazards')
      .update({ expiration_notified_at: new Date().toISOString() })
      .eq('id', hazard.id);
  }
}
```

### 5.3 Seasonal Activation Job

**Frequency:** Daily at midnight

```typescript
async function updateSeasonalHazards() {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  // Find seasonal hazards
  const { data: seasonalHazards } = await supabase
    .from('hazards')
    .select('*')
    .eq('expiration_type', 'seasonal')
    .not('seasonal_pattern', 'is', null);
  
  for (const hazard of seasonalHazards) {
    const activeMonths = hazard.seasonal_pattern?.active_months || [];
    const shouldBeActive = activeMonths.includes(currentMonth);
    const isCurrentlyActive = hazard.status === 'approved';
    
    if (shouldBeActive && !isCurrentlyActive) {
      // Activate hazard
      await supabase
        .from('hazards')
        .update({ status: 'approved' })
        .eq('id', hazard.id);
      
      await logAuditAction(hazard.id, 'seasonal_activated');
      
    } else if (!shouldBeActive && isCurrentlyActive) {
      // Deactivate hazard
      await supabase
        .from('hazards')
        .update({ status: 'pending' }) // or create 'dormant' status
        .eq('id', hazard.id);
      
      await logAuditAction(hazard.id, 'seasonal_deactivated');
    }
  }
}
```

---

## 🔄 Part 6: Integration Points

### 6.1 Map Layer Filtering

```typescript
// MapHazardLayer.svelte
function shouldDisplayHazard(hazard: Hazard): boolean {
  // Don't show if manually resolved
  if (hazard.resolved_at) return showExpired;
  
  // Don't show if auto-expired
  if (hazard.expiration_type === 'auto_expire' && 
      hazard.expires_at && 
      new Date(hazard.expires_at) < new Date()) {
    return showExpired;
  }
  
  // Don't show dormant seasonal hazards
  if (hazard.expiration_type === 'seasonal') {
    const status = getExpirationStatus(hazard);
    if (status === 'dormant') return showExpired;
  }
  
  return true;
}
```

### 6.2 Dashboard Statistics

Update user dashboard to show:
- "Your expired hazards (last 30 days)"
- "Your hazards expiring soon"
- "Resolution reports you've made"

### 6.3 Trust Score Integration (Future)

Resolution reports should affect trust score:
- **+5 points** for helpful resolution report (verified by others)
- **-5 points** for incorrect resolution report (if hazard still active)

---

## 📊 Part 7: Implementation Phases

### Phase 1: Database Foundation (Days 1-2)
- [ ] Create migration with all tables and columns
- [ ] Add indexes
- [ ] Create helper functions
- [ ] Test migration on development database
- [ ] Seed expiration_settings with category defaults

### Phase 2: Basic Expiration Types (Days 3-5)
- [ ] Implement auto_expire logic
- [ ] Implement permanent hazard handling
- [ ] Implement user_resolvable with resolution reports
- [ ] Create expiration status calculation function
- [ ] Test each type independently

### Phase 3: Hazard Creation Form (Days 6-7)
- [ ] Add expiration type selection UI
- [ ] Add duration picker for auto_expire
- [ ] Load and apply category defaults
- [ ] Add form validation
- [ ] Update API endpoint to handle new fields

### Phase 4: Hazard Detail Page (Days 8-10)
- [ ] Add expiration status display
- [ ] Create HazardResolutionForm component
- [ ] Show resolution reports
- [ ] Add extend duration button (for owners)
- [ ] Add admin override controls

### Phase 5: Background Jobs (Days 11-13)
- [ ] Create expiration check job (Supabase Edge Function)
- [ ] Create warning notification job
- [ ] Set up cron schedules
- [ ] Test job execution
- [ ] Add job monitoring

### Phase 6: Admin Interface (Days 14-16)
- [ ] Create expiration settings admin page
- [ ] Create expiration dashboard
- [ ] Add bulk actions
- [ ] Create audit log viewer
- [ ] Add override controls on hazard detail

### Phase 7: Seasonal Hazards (Days 17-18)
- [ ] Implement seasonal pattern logic
- [ ] Add season picker UI
- [ ] Create seasonal activation job
- [ ] Test activation/deactivation

### Phase 8: Map Integration (Days 19-20)
- [ ] Update map queries to filter expired
- [ ] Add "show expired" toggle
- [ ] Update marker popups with status
- [ ] Test performance with large datasets

### Phase 9: Testing (Days 21-23)
- [ ] Unit tests for expiration logic
- [ ] Integration tests for jobs
- [ ] E2E tests for user flows
- [ ] Admin workflow tests
- [ ] Performance testing

### Phase 10: Documentation & Launch (Days 24-25)
- [ ] User guide for expiration types
- [ ] Admin documentation
- [ ] API documentation
- [ ] Migration guide for existing data
- [ ] Launch!

---

## 🚨 Key Decisions & Open Questions

### ✅ Decisions Made

1. **Default Expiration Type:** `user_resolvable` (safest, most flexible)
2. **Resolution Threshold:** 3 reports (configurable per category)
3. **Auto-Extend:** Optional, user must opt-in
4. **Expired Hazards:** Keep in database but filter from map by default
5. **Admin Override:** Always allowed for any expiration decision
6. **Audit Logging:** All expiration actions logged

### ❓ Questions to Decide

1. **Should expired hazards be archived or soft-deleted?**
   - **Option A:** Keep in database, filter by date (preferred)
   - **Option B:** Move to separate archive table
   - **Option C:** Hard delete after 90 days
   - **Recommendation:** Option A - keep for analytics and restoration

2. **Should we notify users when their hazard is resolved by community?**
   - **Option A:** Email notification immediately
   - **Option B:** Weekly digest
   - **Option C:** In-app notification only
   - **Recommendation:** Option C for MVP, Option B later

3. **Can users extend their own auto-expire hazards?**
   - **Option A:** Unlimited extensions
   - **Option B:** Limited extensions (e.g., max 3)
   - **Option C:** No extensions, create new hazard
   - **Recommendation:** Option B - max 2 extensions

4. **Should seasonal patterns support date ranges or just months?**
   - **Option A:** Just months (simpler)
   - **Option B:** Specific date ranges (more accurate)
   - **Recommendation:** Option A for MVP, Option B if needed

5. **What happens to votes/images when hazard expires?**
   - **Option A:** Keep everything, hazard just hidden
   - **Option B:** Archive associated data
   - **Recommendation:** Option A - historical data valuable

6. **Should resolution reports be anonymous?**
   - **Option A:** Show reporter email/name
   - **Option B:** Anonymous reports only
   - **Option C:** Reporter chooses
   - **Recommendation:** Option A - accountability important

---

## 📈 Success Metrics

### User Metrics
- % of hazards with expiration type selected
- Average time to resolution report
- Resolution report accuracy rate
- Auto-expire vs manual resolution ratio

### System Metrics
- Number of auto-expirations per day
- Number of resolution reports per day
- Average time from creation to expiration
- Extension request rate

### Quality Metrics
- False resolution rate (restored by admin)
- Expired hazard complaint rate
- User satisfaction with expiration system

---

## 🎯 MVP Scope (Launch Requirements)

**Must Have:**
- ✅ auto_expire type with duration picker
- ✅ user_resolvable with resolution reports
- ✅ permanent type
- ✅ Expiration status display on detail page
- ✅ Basic admin override controls
- ✅ Expiration check background job

**Should Have:**
- ✅ Expiration settings admin page
- ✅ Expiration dashboard for admins
- ✅ Warning notifications (24h before)
- ✅ Audit logging

**Could Have (Post-MVP):**
- ⏳ seasonal type
- ⏳ Seasonal activation job
- ⏳ Auto-extend option
- ⏳ Resolution report photos
- ⏳ Advanced analytics

---

## 💡 Future Enhancements

1. **Machine Learning:** Predict optimal expiration times based on historical data
2. **Smart Extensions:** Auto-extend if hazard receives recent votes/activity
3. **Weather Integration:** Adjust expiration based on actual weather (e.g., if storm extends)
4. **Geofence Notifications:** Alert users when near expiring hazard
5. **Community Verification:** Allow users to verify resolution reports
6. **Heatmap:** Show where hazards resolve fastest vs slowest
7. **Expiration Predictions:** Suggest expiration type based on ML

---

**Questions or concerns? Let's discuss before we start implementation!**
