# Hazard Expiration System - Quick Reference
**For Developers & Future Reference**

---

## 🎯 Four Expiration Types

### 1. **auto_expire**
- **Use Case:** Temporary conditions (weather, spills, temporary closures)
- **Behavior:** Automatically expires after set duration
- **Fields:** `expires_at` (timestamp), `extended_count` (integer)
- **Actions:** Owner can extend by 24 hours (unlimited times)
- **Requires:** Cron job to actually expire them
- **Examples:** Thunderstorm (6h), Ice (24h), Flood (72h)

### 2. **user_resolvable**
- **Use Case:** Conditions that get fixed (potholes, fallen trees, broken equipment)
- **Behavior:** Requires resolution report + community confirmations
- **Fields:** `resolved_at`, `resolved_by`, `resolution_note`
- **Actions:** Submit report → Others confirm → Auto-resolves at threshold (default: 3)
- **Trigger:** `check_auto_resolve()` on confirmations
- **Examples:** Pothole, Graffiti, Broken bench

### 3. **permanent**
- **Use Case:** Permanent features or ongoing hazards
- **Behavior:** Never expires, stays active indefinitely
- **Fields:** None (just expiration_type)
- **Actions:** Only manual deletion/removal
- **Examples:** Cliff edge, Steep drop, Permanent obstacle

### 4. **seasonal**
- **Use Case:** Hazards that recur annually in specific months
- **Behavior:** Shows as Active during season, Dormant off-season
- **Fields:** `seasonal_pattern` (jsonb: `{active_months: [5,6,7,8,9]}`)
- **Actions:** Status calculated dynamically based on current month
- **Optional:** Cron job to cache status
- **Examples:** Spring flooding, Fall leaf hazards, Winter ice

---

## 📊 Database Schema

### **hazards table columns:**
```sql
expiration_type TEXT DEFAULT 'user_resolvable' 
  CHECK (expiration_type IN ('auto_expire', 'user_resolvable', 'permanent', 'seasonal'))
  
expires_at TIMESTAMPTZ NULL  -- Only for auto_expire

extended_count INTEGER DEFAULT 0  -- How many times extended

resolved_at TIMESTAMPTZ NULL  -- When resolved (all types can be resolved)
resolved_by UUID NULL  -- Who resolved it
resolution_note TEXT NULL  -- Why/how resolved

seasonal_pattern JSONB NULL  -- {active_months: [1,2,3,...]}
  -- Example: {active_months: [5,6,7,8,9]} = May-September

expiration_notified_at TIMESTAMPTZ NULL  -- Last notification sent (for reminders)
```

### **Related tables:**
```sql
-- Resolution reports (one per hazard)
hazard_resolution_reports (
  id UUID PK,
  hazard_id UUID UNIQUE,  -- One report per hazard
  reported_by UUID,
  resolution_note TEXT,
  evidence_url TEXT NULL,
  trust_score_at_report INTEGER,
  created_at TIMESTAMPTZ
)

-- Confirmations/disputes (multiple per hazard)
hazard_resolution_confirmations (
  id UUID PK,
  hazard_id UUID,
  user_id UUID,
  confirmation_type TEXT CHECK (IN ('confirmed', 'disputed')),
  note TEXT NULL,
  created_at TIMESTAMPTZ
)

-- Admin configuration (one per category)
expiration_settings (
  id UUID PK,
  category_id UUID NULL,
  category_path TEXT UNIQUE,
  default_expiration_type TEXT,
  auto_expire_duration INTERVAL NULL,
  seasonal_pattern JSONB NULL,
  confirmation_threshold INTEGER DEFAULT 3,
  allow_user_override BOOLEAN DEFAULT TRUE,
  updated_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Audit trail
expiration_audit_log (
  id UUID PK,
  hazard_id UUID,
  action TEXT,  -- 'expiration_extended', 'auto_resolved', 'manually_resolved', etc.
  performed_by UUID NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT NULL,
  created_at TIMESTAMPTZ
)
```

---

## 🔧 Backend Functions

### **Server-Side (hazards/[id]/+page.server.ts)**

```typescript
// Calculate current status
function calculateExpirationStatus(hazard, confirmations): ExpirationStatus {
  // Returns: 'active' | 'expiring_soon' | 'expired' | 'dormant' | 'pending_resolution' | 'resolved'
}

// Calculate seconds remaining
function calculateTimeRemaining(hazard): number | null {
  // Returns: seconds until expiration, or null if not auto_expire
}
```

### **Auto-Resolve Trigger (SQL)**

```sql
CREATE FUNCTION check_auto_resolve() RETURNS TRIGGER
-- Automatically called when confirmation is added
-- Checks if threshold is met (confirmed >= 3 AND confirmed > disputed)
-- If yes: Updates hazards.resolved_at, logs to audit trail
```

### **API Endpoints**

```typescript
// Get expiration status and resolution info
GET /api/hazards/[id]/expiration-status
Response: {
  hazard_id: string,
  status: ExpirationStatus,
  time_remaining: number | null,
  resolution_report: Report | null,
  confirmations: { confirmed: number, disputed: number },
  can_extend: boolean,
  can_resolve: boolean
}

// Extend expiration (add 24 hours)
POST /api/hazards/[id]/extend
Body: { expires_at: string, reason?: string }
Response: {
  success: boolean,
  hazard: Hazard,
  extension_info: {
    old_expiration: string,
    new_expiration: string,
    extension_hours: number,
    total_extensions: number
  }
}
```

---

## 🎨 UI Components

### **ExpirationStatusBadge.svelte**
```svelte
<ExpirationStatusBadge status={expirationStatus.status} compact={false} />
```
Shows: Active (green), Expiring Soon (yellow), Expired (gray), Dormant (blue), Pending Resolution (purple), Resolved (emerald)

### **TimeRemaining.svelte**
```svelte
<TimeRemaining expiresAt={hazard.expires_at} />
```
Shows: "Expires in 5h 23m" (updates every minute)

### **SeasonalBadge.svelte**
```svelte
<SeasonalBadge pattern={hazard.seasonal_pattern} />
```
Shows: "🔄 Active May-September" or "❄ Dormant Oct-April"

### **ResolutionReportForm.svelte**
```svelte
<ResolutionReportForm 
  hazardId={hazard.id}
  onSuccess={() => {/* refresh */}}
  onCancel={() => {/* close */}}
/>
```
Form to submit resolution report with note and optional evidence URL

### **ResolutionConfirmation.svelte**
```svelte
<ResolutionConfirmation
  hazardId={hazard.id}
  onConfirmationChange={() => {/* refresh */}}
/>
```
Buttons: "✓ Confirm Resolution" and "✗ Report Still Active"

### **ResolutionHistory.svelte**
```svelte
<ResolutionHistory
  report={expirationStatus.resolution_report}
  confirmedCount={expirationStatus.confirmations.confirmed}
  disputedCount={expirationStatus.confirmations.disputed}
/>
```
Shows existing resolution report with confirmation/dispute counts

---

## 🔄 User Workflows

### **Creating Hazard with Expiration:**
1. User fills out hazard form
2. Selects expiration type (radio buttons)
3. **If auto_expire:** Sets duration in hours (1-168)
4. **If seasonal:** Selects active months (checkboxes)
5. Form submits → Server calculates `expires_at` if needed
6. Redirects to hazard detail page
7. **Status shows:** Active badge, countdown (if auto_expire), extend button (if owner)

### **Extending Auto-Expire Hazard:**
1. Owner visits hazard detail page
2. Sees "⏰ Extend Expiration by 24 Hours" button
3. Clicks → API call adds 24 hours to `expires_at`
4. `extended_count` increments
5. Page refreshes, shows new expiration time
6. Can extend unlimited times

### **Resolving User-Resolvable Hazard:**
1. **User A** visits hazard, clicks "✓ Submit Resolution Report"
2. Fills form: note + optional evidence URL
3. Submits → Creates entry in `hazard_resolution_reports`
4. Page shows: "Resolution reported by User A" + confirmation buttons

5. **User B** visits, sees report, clicks "✓ Confirm Resolution"
6. Creates confirmation in `hazard_resolution_confirmations`
7. Shows: "1 confirmed, 0 disputed (need 3)"

8. **User C** confirms → "2 confirmed"

9. **User D** confirms → "3 confirmed" 
10. **Trigger fires** → Auto-resolves hazard!
11. Page shows: "✓ This hazard has been resolved"

### **Seasonal Hazard Behavior:**
1. User creates seasonal hazard: May-September
2. In **May-Sept:** Shows "✓ Active" badge + "🔄 Active May-September"
3. In **Oct-Apr:** Shows "❄ Dormant" badge + "❄ Dormant Oct-April"
4. Status calculated dynamically on page load
5. No user action needed to toggle status

---

## 🚀 Deployment Notes

### **Required Migrations:**
```bash
# Already applied:
20251026000001_add_hazard_area_column.sql
20251102000001_add_hazard_zoom_column.sql
20251117000001_add_auto_resolve_trigger.sql  # ← Today's migration
```

### **Cron Jobs to Set Up:**

**1. Auto-Expire Job (HIGH PRIORITY)**
```bash
# Supabase Edge Function
# File: supabase/functions/expire-hazards/index.ts
# Schedule: Every hour (0 * * * *)
# Purpose: Set resolved_at for expired auto_expire hazards
```

**2. Seasonal Status Job (OPTIONAL)**
```bash
# Supabase Edge Function
# File: supabase/functions/update-seasonal-status/index.ts
# Schedule: Daily at midnight (0 0 * * *)
# Purpose: Cache seasonal active/dormant status
# Note: Currently calculated dynamically, cron optional
```

### **RLS Policies:**
All tables already have RLS policies:
- ✅ Public can read resolution reports and confirmations
- ✅ Authenticated users can create reports/confirmations
- ✅ Users can update/delete own confirmations

### **Monitoring:**
Set up alerts for:
- Auto-expire cron failures
- Trigger errors (check Supabase logs)
- High unresolved rate (metric)
- Low confirmation rate (metric)

---

## 🧪 Testing Examples

### **Manual Test: Auto-Expire**
```typescript
// 1. Create hazard via form or DB
const hazard = await createHazard({
  title: 'Test Storm',
  expiration_type: 'auto_expire',
  expires_at: addHours(new Date(), 1) // 1 hour
});

// 2. Visit /hazards/[id]
// ✅ Should see: "Active" badge
// ✅ Should see: "Expires in 59m 30s"
// ✅ Should see: "Extend Expiration" button (if owner)

// 3. Click extend
// ✅ Should add 24 hours
// ✅ Should show "Expires in 24h 59m"
// ✅ Should show "Extended 1 time"

// 4. Wait for expiration (or set to past)
// ✅ Should show: "Expired" badge
// ✅ Should NOT show: countdown or extend button
```

### **Manual Test: User-Resolvable**
```typescript
// 1. Create hazard
const hazard = await createHazard({
  title: 'Test Pothole',
  expiration_type: 'user_resolvable'
});

// 2. User A submits resolution
// ✅ Report form appears
// ✅ Submit creates report

// 3. User B confirms
// ✅ "1 confirmed, 0 disputed" shows
// ✅ Threshold: 3 confirmations needed

// 4. Users C and D confirm
// ✅ After 3rd: Auto-resolves!
// ✅ Shows: "✓ Resolved" badge
// ✅ Shows: Resolution note
```

---

## 📚 Code Snippets

### **Query Expiring Hazards:**
```sql
-- Get all hazards expiring in next 24 hours
SELECT id, title, expires_at, extended_count
FROM hazards
WHERE expiration_type = 'auto_expire'
  AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
  AND resolved_at IS NULL
ORDER BY expires_at ASC;
```

### **Manual Extend (SQL):**
```sql
-- Extend hazard by 24 hours
UPDATE hazards
SET 
  expires_at = expires_at + INTERVAL '24 hours',
  extended_count = extended_count + 1
WHERE id = 'hazard-uuid-here';
```

### **Check Auto-Resolve Threshold:**
```sql
-- See how many confirmations a hazard has
SELECT 
  h.id,
  h.title,
  COUNT(*) FILTER (WHERE c.confirmation_type = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE c.confirmation_type = 'disputed') as disputed
FROM hazards h
LEFT JOIN hazard_resolution_confirmations c ON c.hazard_id = h.id
WHERE h.expiration_type = 'user_resolvable'
  AND h.resolved_at IS NULL
GROUP BY h.id, h.title;
```

---

## 🎯 Key Takeaways

1. **Four types** cover all use cases: temporary, resolvable, permanent, seasonal
2. **Auto-resolve trigger** handles user-resolvable automatically (no cron needed)
3. **Extend endpoint** fully implemented and tested
4. **Server-side loading** faster and more reliable than client-side
5. **All UI components** built and ready to use
6. **Cron job needed** for auto-expire (high priority)
7. **Manual testing** recommended before full production rollout

---

**Last Updated:** November 17, 2025
