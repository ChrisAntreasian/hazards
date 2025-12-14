# Trust Score Implementation - Session Notes

**Date:** November 23, 2025  
**Status:** Planning Complete, Ready to Implement  
**Branch:** map-unification

---

## 📋 Quick Reference

**Comprehensive Plan:** `docs/planning/TRUST_SCORE_IMPLEMENTATION_PLAN.md` (48 pages, 3800+ lines)

**Implementation Files to Create:**
- `supabase/migrations/20251123000001_add_trust_score_system.sql`
- `src/lib/utils/trust-score.ts`
- `src/lib/components/TrustScoreBadge.svelte`
- `src/lib/components/TrustScoreBreakdown.svelte`
- `src/lib/components/TrustScoreHistory.svelte`
- `src/lib/components/TrustScoreAdmin.svelte`
- `src/routes/leaderboard/+page.svelte`
- `src/routes/admin/trust-score/+page.svelte`

---

## 🎯 User Decisions Summary

### 1. Implementation Timing
**Decision:** Test expiration features first, then implement trust score  
**Reason:** Don't disrupt testing cycle with hot reload from code changes

### 2. User Flagging Feature
**Decision:** ✅ Include in initial release  
**Reason:** Not too big of a lift, enhances community moderation

### 3. Public Leaderboard
**Decision:** ✅ Build it  
**Reason:** Gamification encourages user engagement

### 4. Admin Manual Overrides
**Decision:** ✅ Manual score adjustments persist  
**Confirmation:** Already working in existing code (UserManagement.svelte)

### 5. Negative Scores
**Decision:** 🚫 Floor at 0 (no negative scores allowed)  
**Implementation:** `Math.max(0, newScore)` in all calculations

### 6. Display Locations
**Decision:** Moderation page for now  
**Future:** Can expand to other pages later

---

## 🏗️ Architecture Overview

### Event Sourcing Approach (Recommended Option C)

**Why Event Sourcing:**
- ✅ Full audit trail of all point changes
- ✅ Transparent (users can see how score calculated)
- ✅ Configurable (change point values without recalculation)
- ✅ Flexible (can replay events, generate reports)
- ✅ Fast queries (cached total in users table)

**Database Schema:**
```sql
-- Audit trail of all trust score changes
trust_score_events (
  id, user_id, event_type, points_change,
  previous_score, new_score, related_content_id,
  related_content_type, notes, created_at
)

-- Configurable point values
trust_score_config (
  id, action_key, points, description,
  is_active, updated_at, updated_by
)

-- Cached total (fast queries)
users.trust_score (already exists)
```

**Alternative Options Rejected:**
- ❌ Option A (Query on-demand): Too slow, no history
- ❌ Option B (Aggregated stats): Fast but not transparent

---

## 💯 Point Values (User-Defined)

| Action | Points | Trigger |
|--------|--------|---------|
| **Positive Actions** | | |
| Hazard approved by moderator | +10 | Moderation queue approval |
| Resolution participation (confirmed) | +5 | 3+ confirmations reached |
| Moderator action (approve/reject) | +3 | Moderator processes item |
| Hazard upvoted by community | +2 | Another user upvotes your hazard |
| Vote cast (any vote) | +2 | User votes on hazard |
| Flag accepted by moderator | +2 | Your flag leads to action |
| **Negative Actions** | | |
| Spam report confirmed | -50 | Moderator confirms spam |
| Content flagged AND rejected | -20 | Flag accepted + content removed |
| Hazard rejected by moderator | -10 | Moderation queue rejection |
| Hazard downvoted | -2 | Another user downvotes your hazard |
| False flag (rejected) | -2 | Your flag dismissed by moderator |

**Constraints:**
- Minimum score: 0 (floor enforced)
- Maximum score: None (unlimited growth)
- Starting score: 0 (new users)

---

## 🏆 Trust Score Tiers (6 Levels)

| Tier | Score Range | Badge | Permissions |
|------|-------------|-------|-------------|
| New User | 0-49 | 🌱 | View only (if anonymous=false) |
| Contributor | 50-199 | 🌿 | Can post, rate, upload images |
| Trusted | 200-499 | 🌳 | Reduced moderation scrutiny |
| Community Leader | 500-999 | 🏅 | Can edit educational content |
| Expert | 1000-1999 | 🥈 | Advanced permissions |
| Guardian | 2000+ | 🥇 | Minimal moderation, high trust |

**Used in:**
- Auto-approve thresholds (200+, 500+)
- Display badges (profile, moderation queue)
- Permission gating (content editing)

---

## 🔧 Implementation Phases

### Phase 1: Database Migration (Week 1)
**File:** `supabase/migrations/20251123000001_add_trust_score_system.sql`

**Create:**
1. `trust_score_events` table with indexes
2. `trust_score_config` table with default values (11 action types)
3. `update_trust_score()` function (trigger helper)
4. Triggers for automatic score updates:
   - Hazard approved/rejected
   - Votes cast (up/down)
   - Resolution confirmations
   - Moderator actions
   - Flags accepted/rejected

**Testing:**
- Verify triggers fire on test actions
- Check point values calculated correctly
- Confirm users.trust_score updates

### Phase 2: Backend Utilities (Week 1-2)
**File:** `src/lib/utils/trust-score.ts`

**Functions:**
```typescript
getUserTrustScore(userId): Promise<TrustScoreData>
getTrustScoreHistory(userId, limit): Promise<TrustScoreEvent[]>
getTrustScoreTier(score): TrustScoreTier
adjustTrustScore(userId, points, reason): Promise<void> // Admin only
getTrustScoreConfig(): Promise<TrustScoreConfig>
updateTrustScoreConfig(config): Promise<void> // Admin only
```

**Types:**
- TrustScoreEvent
- TrustScoreData
- TrustScoreTier
- TrustScoreConfig

**Testing:**
- Unit tests for each function
- Test tier calculation logic
- Verify admin-only functions check permissions

### Phase 3: UI Components (Week 2)
**Components to Build:**

1. **TrustScoreBadge.svelte** (~150 lines)
   - Props: score, showTier, compact, clickable
   - Displays: Score + tier icon
   - Usage: Profile header, user lists, hazard detail

2. **TrustScoreBreakdown.svelte** (~300 lines)
   - Props: userId, showHistory
   - Displays: Total score, category breakdown, progress bar
   - Usage: Profile page, moderation queue

3. **TrustScoreHistory.svelte** (~250 lines)
   - Props: userId, limit, filters
   - Displays: Timeline of events, points changes
   - Features: Date filtering, pagination

4. **TrustScoreAdmin.svelte** (~400 lines)
   - Features: Edit point values, manual adjustments, audit log
   - Usage: Admin trust score page

**Integration:**
- Add to profile page (badge + breakdown + history)
- Add to moderation queue (badge + breakdown)
- Create admin page (full admin component)

### Phase 4: Feature Integration (Week 2)
**Files to Modify:**

1. **src/lib/utils/moderation.ts**
   - Add trust score updates in `processAction()`
   - +10 for approve, -10/-20 for reject

2. **src/routes/api/hazards/[id]/vote/+server.ts**
   - Add trust score updates after vote
   - +2 to voter, +2/-2 to hazard owner

3. **Database trigger** (already in migration)
   - Resolution confirmations auto-update
   - +5 when threshold reached

4. **User flags API** (if implementing flagging)
   - +2 if flag accepted
   - -2 if flag rejected

**Testing:**
- Verify points update for all 11 actions
- Test with multiple users
- Check audit trail created correctly

### Phase 5: Leaderboard (Week 2-3)
**File:** `src/routes/leaderboard/+page.svelte`

**Features:**
- Top 100 users by trust score
- Filters: All time, this month, this week
- User search
- Shows: Rank, username, score, tier badge
- Responsive design

**Backend:** `src/routes/leaderboard/+page.server.ts`
- Load top users with scores
- Cache results (1 hour)
- Pagination

### Phase 6: User Flagging (Week 3 - OPTIONAL)
**Database Migration:** Add to trust score migration

```sql
CREATE TABLE hazard_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id UUID NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  additional_notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hazard_id, user_id) -- One flag per user per hazard
);
```

**Components:**
1. **HazardFlagButton.svelte** (~100 lines)
   - Shows "🚩 Flag Hazard" button
   - Opens modal on click

2. **FlagHazardModal.svelte** (~200 lines)
   - Reason dropdown (spam, inappropriate, dangerous, etc.)
   - Additional notes textarea
   - Submit confirmation

**API:** `src/routes/api/hazards/[id]/flag/+server.ts`
- POST: Create flag, add to moderation queue
- GET: Check if user already flagged

**Integration:**
- Add HazardFlagButton to hazard detail page
- Moderator reviews in ModerationQueue.svelte
- Trust score updates on flag accepted/rejected

---

## 🔄 Integration Points

### 1. Moderation Queue
**File:** `src/lib/utils/moderation.ts`

**Update `processAction()` function:**
```typescript
export async function processAction(action: 'approve' | 'reject' | 'flag', itemId: string) {
  // Existing logic...
  
  // Add trust score update
  if (action === 'approve') {
    await updateTrustScore(item.user_id, 'hazard_approved', itemId);
  } else if (action === 'reject') {
    await updateTrustScore(item.user_id, 'hazard_rejected', itemId);
  }
}
```

### 2. Voting System
**File:** `src/routes/api/hazards/[id]/vote/+server.ts`

**Add after successful vote:**
```typescript
// POST handler
if (voteInserted) {
  // Update voter's score
  await updateTrustScore(session.user.id, 'vote_cast', hazardId);
  
  // Update hazard owner's score
  if (voteType === 'up') {
    await updateTrustScore(hazard.user_id, 'hazard_upvoted', hazardId);
  } else {
    await updateTrustScore(hazard.user_id, 'hazard_downvoted', hazardId);
  }
}
```

### 3. Resolution Confirmations
**Trigger:** Already included in database migration

**Function called when 3+ confirmations:**
```sql
-- Auto-updates when confirmation count reaches threshold
CALL update_trust_score(
  hazard.user_id,
  'resolution_participation',
  hazard.id
);
```

### 4. User Flags (Optional)
**File:** `src/routes/api/hazards/[id]/flag/+server.ts`

**Moderator review callback:**
```typescript
if (flag_status === 'accepted') {
  await updateTrustScore(flag.user_id, 'flag_accepted', hazardId);
} else if (flag_status === 'rejected') {
  await updateTrustScore(flag.user_id, 'flag_rejected', hazardId);
}
```

---

## 🧪 Testing Strategy

### Database Tests
```sql
-- Test trust score updates
SELECT * FROM trust_score_events ORDER BY created_at DESC LIMIT 10;

-- Verify config loaded
SELECT * FROM trust_score_config WHERE is_active = true;

-- Check user scores
SELECT id, email, trust_score FROM users ORDER BY trust_score DESC LIMIT 10;

-- Test trigger firing
-- (Create test hazard, approve it, check if score updated)
```

### Integration Tests
1. Create test hazard → Check +0 (pending)
2. Moderator approves → Check +10
3. User upvotes → Check voter +2, owner +2
4. Submit resolution → Check +5 at threshold
5. Flag hazard (accepted) → Check flagger +2
6. Flag hazard (rejected) → Check flagger -2
7. Moderator rejects → Check owner -10

### UI Tests
1. Badge displays correct tier icon
2. Breakdown shows accurate point sources
3. History shows all events in chronological order
4. Admin can edit point values
5. Leaderboard shows top users correctly

---

## 📊 Success Metrics

**After 1 week:**
- ✅ Database migration deployed
- ✅ Triggers firing correctly
- ✅ Basic UI components working
- ✅ Integration with moderation complete

**After 2 weeks:**
- ✅ All UI components polished
- ✅ Leaderboard page live
- ✅ Trust scores visible throughout app
- ✅ Admin tools functional

**After 3 weeks:**
- ✅ User flagging implemented (optional)
- ✅ All 11 action types tested
- ✅ Documentation complete
- ✅ Ready for production

**User Engagement Goals:**
- 50%+ of active users earning points
- Top 10 users with 500+ score
- <5% negative actions (flags, rejections)
- Leaderboard checked 10+ times/day

---

## 🚨 Potential Issues & Solutions

### Issue: Score Inflation
**Symptom:** Too many users reach high tiers too quickly

**Solution:**
- Adjust point values in `trust_score_config`
- Add diminishing returns for repeated actions
- Increase tier thresholds

### Issue: Gaming the System
**Symptom:** Users create fake accounts to upvote themselves

**Detection:**
- Track voting patterns (same IPs, timing)
- Flag suspicious activity in audit log

**Prevention:**
- Require email verification
- Limit votes per hour/day
- IP-based rate limiting

### Issue: Negative Spiral
**Symptom:** Users with low scores can't recover

**Solution:**
- Redemption mechanic (participate in X hazards → small bonus)
- Educational content to help improve contributions
- Clear guidelines on what earns/loses points

### Issue: Database Performance
**Symptom:** trust_score_events table grows too large

**Solutions:**
- Archive events older than 1 year
- Partition table by date
- Index on user_id + created_at

---

## 📚 Related Documentation

**Primary:**
- `docs/planning/TRUST_SCORE_IMPLEMENTATION_PLAN.md` - Full 48-page plan

**Reference:**
- `src/lib/utils/helpers.ts` - formatTrustScore() function (existing)
- `src/lib/components/admin/UserManagement.svelte` - Manual score UI (existing)
- `src/lib/components/ModerationQueue.svelte` - Moderation UI (existing)
- `supabase/migrations/20250821033446_initial_schema.sql` - users.trust_score column

**Testing:**
- `docs/summaries/EXPIRATION_QUICK_TEST_GUIDE.md` - Template for testing guide

---

## 🎯 Next Actions (In Order)

### 1. Wait for Expiration Testing ⏸️
User is currently testing expiration features using `EXPIRATION_QUICK_TEST_GUIDE.md`

### 2. Phase 1: Database Migration 🚀
**When:** After user says "let's go" or "start trust score"

**Task:** Create `supabase/migrations/20251123000001_add_trust_score_system.sql`

**Contents:**
- trust_score_events table
- trust_score_config table with 11 default actions
- update_trust_score() function
- 11 triggers for automatic updates
- Indexes for performance

**Estimated Time:** 4-6 hours

### 3. Phase 2: Backend Functions
**Task:** Create `src/lib/utils/trust-score.ts`

**Functions:** 6 functions + TypeScript types

**Estimated Time:** 3-4 hours

### 4. Phase 3: UI Components
**Task:** Create 4 Svelte components

**Components:**
- TrustScoreBadge.svelte
- TrustScoreBreakdown.svelte
- TrustScoreHistory.svelte
- TrustScoreAdmin.svelte

**Estimated Time:** 8-10 hours

### 5. Phase 4: Integration
**Task:** Update existing files (moderation, voting, etc.)

**Estimated Time:** 2-3 hours

### 6. Phase 5: Leaderboard
**Task:** Create `/leaderboard` page

**Estimated Time:** 4-5 hours

### 7. Phase 6: User Flagging (Optional)
**Task:** Complete flagging feature

**Estimated Time:** 6-8 hours

**Total Implementation Time:** 27-39 hours (3-5 days of work)

---

## 💬 Conversation Context

**Started:** November 23, 2025  
**Session Focus:** Planning trust score system after completing expiration features

**Key Moments:**
1. User asked to describe trust score understanding
2. Agent performed extensive codebase analysis
3. User provided 10 detailed clarifying answers
4. Agent recommended event sourcing (Option C)
5. User answered 6 final questions about implementation
6. Created comprehensive 48-page plan
7. Ready to implement after expiration testing complete

**Current State:**
- ✅ Lazy expiration system implemented
- ✅ Expiration testing guide created
- ⏸️ User testing expiration features
- 📋 Trust score fully planned
- 🚀 Ready to start on user approval

---

## 🔑 Key Takeaways

1. **Event sourcing is the best approach** for transparency and flexibility
2. **Floor score at 0** - no negative scores
3. **Include user flagging** in initial release
4. **Build leaderboard** for gamification
5. **Start with moderation page** for score display
6. **All point values configurable** via trust_score_config table
7. **11 action types** cover all user behaviors
8. **6 trust tiers** provide clear progression path

---

## 📞 Session Recovery Commands

**If session ends, run these to continue:**

1. **Read comprehensive plan:**
   ```bash
   code docs/planning/TRUST_SCORE_IMPLEMENTATION_PLAN.md
   ```

2. **Read session notes (this file):**
   ```bash
   code docs/planning/TRUST_SCORE_SESSION_NOTES.md
   ```

3. **Check todo list:**
   ```bash
   # Ask agent to: "Show me the trust score todo list"
   ```

4. **Start implementation:**
   ```bash
   # Tell agent: "Let's start Phase 1 of trust score implementation"
   ```

**Important context to provide new agent:**
- User decisions are final (see "User Decisions Summary" section)
- Event sourcing architecture chosen (Option C)
- Point values user-defined (see table above)
- Implementation phases planned (7 phases, 27-39 hours)
- Ready to start after expiration testing complete

---

**Status:** Ready to implement when user gives approval ✅

**Next Message:** Wait for user to say "let's go" or "start trust score implementation"
