# Trust Score System - Implementation Plan

**Date:** November 23, 2025  
**Status:** Ready to implement  
**Approach:** Real-time calculation with event tracking

---

## 🎯 Goals

1. **Reward Quality Contributors** - Users earn points through helpful actions
2. **Prevent Gaming** - Penalize poor quality submissions
3. **Transparent** - Users see breakdown of their score
4. **Automated** - Real-time updates via database triggers
5. **Configurable** - Admin can adjust point values

---

## 📊 Trust Score Actions & Point Values

### ✅ Positive Actions (Gain Points)

| Action | Points | Trigger | Notes |
|--------|--------|---------|-------|
| **Hazard Approved** | +10 | When moderator approves | Hazard status: pending → approved |
| **Hazard Upvoted** | +2 | When another user upvotes your hazard | Each upvote (from `hazard_votes` table) |
| **Participate in Resolution** | +5 | When you confirm resolution AND it gets resolved | Resolution threshold reached (3+ confirmations) |
| **Moderator Approves Hazard** | +3 | When you approve a hazard as moderator | Moderation action type: 'approve' |
| **Moderator Rejects Hazard** | +3 | When you reject a hazard as moderator | Moderation action type: 'reject' |
| **You Upvote a Hazard** | +2 | When you cast an upvote | Vote type: 'up' |
| **You Downvote a Hazard** | +2 | When you cast a downvote | Vote type: 'down' |
| **User Flag Accepted** | +2 | When you flag a hazard AND moderator takes action | Moderator approves/rejects after your flag |

### ❌ Negative Actions (Lose Points)

| Action | Points | Trigger | Notes |
|--------|--------|---------|-------|
| **Hazard Rejected** | -10 | When moderator rejects | Hazard status: pending → rejected |
| **Hazard Downvoted** | -2 | When another user downvotes your hazard | Each downvote (from `hazard_votes` table) |
| **Hazard Flagged & Rejected** | -20 | When your hazard is flagged AND rejected | Combined penalty for poor quality |
| **Spam Report** | -50 | When moderator marks as spam | Severe penalty for abuse |
| **User Flag Rejected** | -2 | When you flag a hazard AND moderator rejects your flag | Discourages false flags |

---

## 🏗️ Database Schema

### New Table: `trust_score_events`

Tracks every action that affects trust scores for transparency and debugging.

```sql
CREATE TABLE public.trust_score_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'hazard_approved', 'hazard_upvoted', etc.
    points_change INTEGER NOT NULL, -- Positive or negative
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    related_content_id UUID, -- Hazard, vote, or confirmation ID
    related_content_type TEXT, -- 'hazard', 'vote', 'confirmation', 'moderation'
    notes TEXT, -- Optional context
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_trust_events_user (user_id, created_at DESC),
    INDEX idx_trust_events_type (event_type),
    INDEX idx_trust_events_content (related_content_id)
);
```

### New Table: `trust_score_config`

Allows admins to configure point values without code changes.

```sql
CREATE TABLE public.trust_score_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_key TEXT UNIQUE NOT NULL, -- 'hazard_approved', 'hazard_rejected', etc.
    points INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default values
INSERT INTO public.trust_score_config (action_key, points, description) VALUES
    ('hazard_approved', 10, 'Your hazard was approved by a moderator'),
    ('hazard_rejected', -10, 'Your hazard was rejected by a moderator'),
    ('hazard_upvoted', 2, 'Another user upvoted your hazard'),
    ('hazard_downvoted', -2, 'Another user downvoted your hazard'),
    ('hazard_flagged_rejected', -20, 'Your hazard was flagged and rejected'),
    ('spam_report', -50, 'Your content was marked as spam'),
    ('resolution_participation', 5, 'You helped resolve a hazard'),
    ('moderator_action', 3, 'You approved or rejected a hazard as moderator'),
    ('user_vote_cast', 2, 'You voted on a hazard'),
    ('flag_accepted', 2, 'Your flag resulted in moderator action'),
    ('flag_rejected', -2, 'Your flag was dismissed by moderator');
```

---

## 🔄 Implementation Strategy

### Phase 1: Database & Triggers ⭐ START HERE

**Goal:** Set up tables and automatic score calculation

**Tasks:**
1. Create `trust_score_events` table
2. Create `trust_score_config` table
3. Create trigger functions for each action type
4. Create utility function to update trust scores
5. Test with SQL queries

**Files to create:**
- `supabase/migrations/20251123000001_add_trust_score_system.sql`

---

### Phase 2: Backend Functions

**Goal:** Reusable functions for trust score operations

**Tasks:**
1. Create `src/lib/utils/trust-score.ts` with utility functions
2. Add functions to calculate score changes
3. Add functions to fetch score history
4. Add functions to get leaderboard data

**Functions needed:**
```typescript
// Get user's current score and breakdown
export async function getUserTrustScore(userId: string): Promise<TrustScoreData>

// Get recent score events for a user
export async function getTrustScoreHistory(userId: string, limit: number): Promise<TrustScoreEvent[]>

// Manually adjust score (admin only)
export async function adjustTrustScore(userId: string, points: number, reason: string): Promise<void>

// Get trust score leaderboard
export async function getTrustScoreLeaderboard(limit: number): Promise<LeaderboardEntry[]>

// Get config values
export async function getTrustScoreConfig(): Promise<TrustScoreConfig>

// Update config (admin only)
export async function updateTrustScoreConfig(config: TrustScoreConfig): Promise<void>
```

---

### Phase 3: UI Components

**Goal:** Display trust scores and history to users

**Components to create:**

#### 1. `TrustScoreBadge.svelte`
**Purpose:** Small inline badge showing score + tier  
**Usage:** Profile header, dashboard, user lists  
**Props:**
```typescript
{
  score: number;
  showTier?: boolean; // Show tier label
  compact?: boolean; // Minimal version
  clickable?: boolean; // Link to detail page
}
```

#### 2. `TrustScoreBreakdown.svelte`
**Purpose:** Full breakdown of score components  
**Usage:** Profile page, admin panel  
**Props:**
```typescript
{
  userId: string;
  showHistory?: boolean; // Include recent events
}
```
**Features:**
- Total score with tier badge
- Category breakdown (hazards: +X, votes: +Y, etc.)
- Progress bar to next tier
- Recent score events timeline

#### 3. `TrustScoreHistory.svelte`
**Purpose:** Timeline of score events  
**Usage:** Profile page, admin audit trail  
**Props:**
```typescript
{
  userId: string;
  limit?: number; // Default 20
}
```
**Features:**
- Date, action, points change, new total
- Link to related content (hazard, vote, etc.)
- Filter by event type
- Pagination for long histories

#### 4. `TrustScoreAdmin.svelte` (Admin Only)
**Purpose:** Configure point values  
**Usage:** /admin/trust-score page  
**Features:**
- Edit point values for each action
- See impact on existing users
- Manual score adjustments
- Audit log of admin changes

---

### Phase 4: Integration Points

**Where to add trust score triggers:**

#### A. Hazard Moderation
**File:** `src/lib/utils/moderation.ts` → `processAction()`

```typescript
// After approving hazard
if (action.type === 'approve') {
  await updateTrustScore(hazard.user_id, 'hazard_approved', hazard.id);
}

// After rejecting hazard
if (action.type === 'reject') {
  const isFlagged = currentItem.flagged_reasons.length > 0;
  const actionKey = isFlagged ? 'hazard_flagged_rejected' : 'hazard_rejected';
  await updateTrustScore(hazard.user_id, actionKey, hazard.id);
}

// Moderator gets points
await updateTrustScore(moderatorId, 'moderator_action', hazard.id);
```

#### B. Hazard Voting
**File:** `src/routes/api/hazards/[id]/vote/+server.ts`

```typescript
// After vote is cast
if (vote_type === 'up') {
  await updateTrustScore(session.user.id, 'user_vote_cast', hazardId);
  await updateTrustScore(hazard.user_id, 'hazard_upvoted', hazardId);
} else {
  await updateTrustScore(session.user.id, 'user_vote_cast', hazardId);
  await updateTrustScore(hazard.user_id, 'hazard_downvoted', hazardId);
}
```

#### C. Resolution Confirmations
**File:** Via database trigger on `hazard_resolution_confirmations`

```sql
-- When confirmation added, check if threshold reached
-- If reached, give +5 to all who confirmed
CREATE TRIGGER trust_score_resolution_confirmed
AFTER INSERT ON hazard_resolution_confirmations
FOR EACH ROW
EXECUTE FUNCTION update_trust_score_on_resolution();
```

#### D. User Flags (NEW FEATURE)
**File:** New API endpoint `/api/hazards/[id]/flag`

```typescript
// User submits flag
POST /api/hazards/[id]/flag
{
  reason: string;
  details?: string;
}

// Store flag in new table: hazard_flags
// When moderator acts on flagged hazard:
//   - If moderator rejects: give flagger +2
//   - If moderator approves: give flagger -2
```

---

## 🆕 Missing Feature: User Hazard Flagging

### Current State
- ❌ No user-facing "Flag Hazard" button
- ✅ Moderators can flag items in moderation queue
- ✅ System can auto-flag during pre-screening

### Recommendation: Implement User Flagging

**Why:**
- Community self-policing
- Helps moderators prioritize
- Rewards users for quality control (+2 trust score)

**Implementation:**

#### 1. New Table: `hazard_flags`

```sql
CREATE TABLE public.hazard_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_id UUID NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL, -- 'spam', 'inappropriate', 'inaccurate', 'duplicate', 'resolved', 'other'
    details TEXT, -- Optional explanation
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One flag per user per hazard
    UNIQUE(hazard_id, user_id)
);
```

#### 2. UI Component: `HazardFlagButton.svelte`

**Location:** Hazard detail page, near voting buttons

```svelte
<button class="flag-btn" onclick={openFlagModal}>
  🚩 Flag Hazard
</button>

{#if showFlagModal}
  <FlagHazardModal
    hazardId={hazard.id}
    onClose={closeFlagModal}
    onSubmit={submitFlag}
  />
{/if}
```

**Modal fields:**
- Reason (dropdown): Spam, Inappropriate, Inaccurate, Duplicate, Resolved, Other
- Details (textarea): Optional explanation
- Submit button

#### 3. API Endpoint: `/api/hazards/[id]/flag`

```typescript
POST /api/hazards/[id]/flag
{
  reason: 'inaccurate',
  details: 'This hazard was resolved last week'
}

// Creates hazard_flags record
// Adds to moderation_queue if auto-flagging threshold reached (e.g., 3 flags)
// Returns success
```

#### 4. Moderator Review Flow

When moderator reviews flagged hazard:
- Approve hazard → All flaggers get -2 (false flag)
- Reject hazard → All flaggers get +2 (good catch)
- Flag action in moderation queue shows list of flaggers

---

## 📈 Trust Score Tiers

Based on planning docs, we have 6 tiers:

| Tier | Score Range | Badge | Label | Permissions | Auto-Approve |
|------|-------------|-------|-------|-------------|--------------|
| 0 | 0-49 | 🌱 | New User | Standard | No |
| 1 | 50-199 | 🌿 | Contributor | Standard | No |
| 2 | 200-499 | 🌳 | Trusted | Standard | Yes (200+) |
| 3 | 500-999 | 🏅 | Community Leader | Standard | Yes |
| 4 | 1000-1999 | 🥈 | Expert | Standard | Yes |
| 5 | 2000+ | 🥇 | Guardian | Standard | Yes |

**Note:** Currently, tiers are **cosmetic only**. Auto-approve based on score (not tier) is already implemented in `content-prescreening.ts`:
- 200+ score: Reduced scrutiny (0.5x multiplier)
- 500+ score: Minimal scrutiny (0.3x multiplier)

**Future:** Could add tier-based permissions (e.g., Guardians can moderate)

---

## 🔍 Activity Tracking Options (Question 4)

You asked for pros/cons of different approaches:

### Option A: Query Existing Tables On-Demand

**How it works:**
```sql
-- Calculate score by querying all tables
SELECT 
  (SELECT COUNT(*) FROM hazards WHERE user_id = ? AND status = 'approved') * 10
  + (SELECT COUNT(*) FROM hazard_votes v JOIN hazards h ON v.hazard_id = h.id WHERE h.user_id = ? AND v.vote_type = 'up') * 2
  - ...etc
```

**Pros:**
- ✅ Simple - no new tables
- ✅ Always accurate (source of truth)
- ✅ No synchronization issues

**Cons:**
- ❌ Slow for leaderboards (must calculate every user)
- ❌ Complex queries (many JOINs)
- ❌ Can't show history (no audit trail)
- ❌ No transparency (users don't see why score changed)

**Verdict:** ❌ Not recommended

---

### Option B: Aggregated Stats Table

**How it works:**
```sql
CREATE TABLE user_activity_stats (
    user_id UUID PRIMARY KEY,
    hazards_approved INT DEFAULT 0,
    hazards_rejected INT DEFAULT 0,
    upvotes_received INT DEFAULT 0,
    downvotes_received INT DEFAULT 0,
    total_score INT DEFAULT 0,
    updated_at TIMESTAMPTZ
);

-- Update via triggers
CREATE TRIGGER increment_hazards_approved
AFTER UPDATE ON hazards
WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
FOR EACH ROW
EXECUTE FUNCTION increment_user_stat('hazards_approved', 10);
```

**Pros:**
- ✅ Fast queries (single table)
- ✅ Good for leaderboards
- ✅ Shows breakdown by category

**Cons:**
- ❌ No history (can't see timeline)
- ❌ Synchronization risk (stats can drift from reality)
- ❌ Hard to audit changes
- ❌ Doesn't support configurable points (hardcoded in triggers)

**Verdict:** ⚠️ Good for performance, bad for transparency

---

### Option C: Event Sourcing (`trust_score_events` table) ⭐ **RECOMMENDED**

**How it works:**
```sql
-- Record every event
INSERT INTO trust_score_events (user_id, event_type, points_change, previous_score, new_score, related_content_id)
VALUES (?, 'hazard_approved', 10, 0, 10, ?);

-- Update users.trust_score
UPDATE users SET trust_score = trust_score + 10 WHERE id = ?;

-- Get score: Just read users.trust_score (fast)
-- Get history: Query trust_score_events (transparent)
-- Get breakdown: Group by event_type
```

**Pros:**
- ✅ Full audit trail (transparency)
- ✅ Can replay events (debug/recalculate)
- ✅ Shows timeline of changes
- ✅ Fast queries (users.trust_score indexed)
- ✅ Supports configurable points (read from config table)
- ✅ Easy to add new event types

**Cons:**
- ⚠️ Larger database (events accumulate)
- ⚠️ Need to keep users.trust_score in sync with events

**Solutions to cons:**
- Archive old events (>1 year) to separate table
- Use database triggers to keep score in sync
- Add CHECK constraint to verify integrity

**Verdict:** ✅ **BEST CHOICE** - Balances performance, transparency, and flexibility

---

## 🎯 Recommended Approach: Option C with Enhancements

### Hybrid Strategy:

1. **`trust_score_events`** - Full event log (transparency)
2. **`users.trust_score`** - Cached total (performance)
3. **Database triggers** - Keep them in sync (reliability)
4. **`trust_score_config`** - Point values (configurability)

### Data Flow:

```
Action happens (hazard approved)
    ↓
Trigger fires (update_trust_score_on_hazard_approval)
    ↓
Read config (SELECT points FROM trust_score_config WHERE action_key = 'hazard_approved')
    ↓
Insert event (trust_score_events)
    ↓
Update total (users.trust_score += points)
    ↓
User sees new score immediately
```

---

## 🔧 Example Trigger Implementation

```sql
CREATE OR REPLACE FUNCTION update_trust_score(
    p_user_id UUID,
    p_event_type TEXT,
    p_related_content_id UUID,
    p_related_content_type TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_points INTEGER;
    v_previous_score INTEGER;
    v_new_score INTEGER;
BEGIN
    -- Get points from config
    SELECT points INTO v_points
    FROM trust_score_config
    WHERE action_key = p_event_type AND is_active = true;
    
    IF v_points IS NULL THEN
        RAISE EXCEPTION 'No config found for event type: %', p_event_type;
    END IF;
    
    -- Get current score
    SELECT trust_score INTO v_previous_score
    FROM users
    WHERE id = p_user_id;
    
    -- Calculate new score (floor at 0)
    v_new_score := GREATEST(0, v_previous_score + v_points);
    
    -- Insert event
    INSERT INTO trust_score_events (
        user_id, event_type, points_change, previous_score, new_score,
        related_content_id, related_content_type, notes
    ) VALUES (
        p_user_id, p_event_type, v_points, v_previous_score, v_new_score,
        p_related_content_id, p_related_content_type, p_notes
    );
    
    -- Update user's total score
    UPDATE users
    SET trust_score = v_new_score,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Example trigger for hazard approval
CREATE TRIGGER trust_score_hazard_approved
AFTER UPDATE ON hazards
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
EXECUTE FUNCTION update_trust_score(NEW.user_id, 'hazard_approved', NEW.id, 'hazard');
```

---

## 📝 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create migration file
- [ ] Create `trust_score_events` table
- [ ] Create `trust_score_config` table
- [ ] Insert default config values
- [ ] Create `update_trust_score()` function
- [ ] Test with SQL queries

### Phase 2: Triggers (Week 1)
- [ ] Trigger: Hazard approved (+10)
- [ ] Trigger: Hazard rejected (-10)
- [ ] Trigger: Hazard upvoted (+2 to owner, +2 to voter)
- [ ] Trigger: Hazard downvoted (-2 to owner, +2 to voter)
- [ ] Trigger: Resolution confirmed (+5 when threshold reached)
- [ ] Test all triggers

### Phase 3: Backend (Week 1-2)
- [ ] Create `trust-score.ts` utility file
- [ ] Function: getUserTrustScore()
- [ ] Function: getTrustScoreHistory()
- [ ] Function: adjustTrustScore() (admin)
- [ ] Function: getTrustScoreConfig()
- [ ] Function: updateTrustScoreConfig() (admin)
- [ ] Add to moderation processAction()
- [ ] Add to voting API endpoint

### Phase 4: UI Components (Week 2)
- [ ] `TrustScoreBadge.svelte` - Inline badge
- [ ] `TrustScoreBreakdown.svelte` - Full details
- [ ] `TrustScoreHistory.svelte` - Timeline
- [ ] Add badge to profile page
- [ ] Add breakdown to profile page
- [ ] Add history to profile page

### Phase 5: Admin Tools (Week 2)
- [ ] `TrustScoreAdmin.svelte` - Config editor
- [ ] Create `/admin/trust-score` page
- [ ] Manual adjustment form
- [ ] Config value editor
- [ ] Audit log viewer

### Phase 6: User Flagging (Week 3 - Optional)
- [ ] Create `hazard_flags` table
- [ ] `HazardFlagButton.svelte` component
- [ ] `FlagHazardModal.svelte` component
- [ ] API endpoint: POST /api/hazards/[id]/flag
- [ ] Moderator review flow integration
- [ ] Triggers for flag accepted/rejected

---

## 🧪 Testing Strategy

### Unit Tests
- Test `update_trust_score()` function
- Test config value retrieval
- Test score calculation edge cases

### Integration Tests
- Create hazard → approve → verify +10 points
- Vote on hazard → verify both users get +2
- Reject hazard → verify -10 points
- Flag hazard → moderator action → verify +2/-2

### Manual Testing
- Check profile page displays score
- Submit hazard and watch score update
- Vote and see immediate feedback
- Admin: adjust config values
- Admin: manually adjust user score

---

## 📊 Success Metrics

After 2 weeks of implementation:
- ✅ All users have trust scores
- ✅ Scores update in real-time
- ✅ Users can see score breakdown
- ✅ Admins can configure point values
- ✅ Audit trail shows all score changes

After 1 month of live usage:
- 📈 Track average score by user cohort
- 📈 Monitor score distribution (histogram)
- 📈 Identify top contributors (leaderboard)
- 📈 Flag suspicious score changes

---

## 🚀 Next Steps

**Immediate:**
1. Review and approve this plan
2. Clarify any remaining questions
3. Start Phase 1: Database schema

**This Week:**
- Implement database tables and triggers
- Test score calculation in SQL
- Create basic utility functions

**Next Week:**
- Build UI components
- Integrate with existing features
- Admin configuration page

**Future Enhancements:**
- User flagging system
- Leaderboard page
- Score-based privileges
- Activity decay (if needed later)

---

**Ready to proceed? Let's build this! 🎉**
