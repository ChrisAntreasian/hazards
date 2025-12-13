# Trust Score System Quick Test Guide

**Purpose:** Fast, practical testing for all trust score features  
**Time Required:** 15-20 minutes total  
**Prerequisites:** Logged into app, have access to Supabase SQL Editor, admin account for admin features

---

## 🎯 Test Overview

This guide covers 8 test scenarios:
1. ✅ Initial trust score setup and badge display
2. ✅ Voting trust score updates (+2 voter, ±2 hazard owner)
3. ✅ Moderation trust score updates (±10 for approve/reject)
4. ✅ Hazard flagging trust score (+2 for flag, ±2 for outcome)
5. ✅ Trust score tiers and progression
6. ✅ Leaderboard with filters and search
7. ✅ Admin configuration editor
8. ✅ Admin manual score adjustments

---

## 📋 Pre-Test Setup

### Get Your IDs

Run these queries in Supabase SQL Editor:

```sql
-- 1. Get your user ID from public.users (not auth.users)
SELECT id, email, trust_score, role FROM public.users WHERE email = 'your@email.com';
-- Copy the ID - you'll use this as [USER_ID]
-- Note current trust_score

-- 2. Create a second test user (if needed)
-- Do this in Supabase Auth dashboard or use existing account

-- 3. Get a category ID for creating test hazards
SELECT id, name FROM hazard_categories LIMIT 5;
-- Pick any category ID - you'll use this as [CATEGORY_ID]

-- 4. Check trust score configuration
SELECT action_key, points, description FROM trust_score_config ORDER BY points DESC;
-- Should see 11 event types with point values
```

**Save these values** - you'll need them for tests below.

---

## Test 1: Initial Setup & Badge Display 🏅

**Goal:** Verify trust score infrastructure and badge display

### Step 1: Check Your Starting Trust Score

```sql
-- View your current trust score
SELECT 
  u.id,
  u.email,
  u.trust_score,
  CASE 
    WHEN u.trust_score >= 2000 THEN 'Guardian'
    WHEN u.trust_score >= 1000 THEN 'Expert'
    WHEN u.trust_score >= 500 THEN 'Community Leader'
    WHEN u.trust_score >= 200 THEN 'Trusted'
    WHEN u.trust_score >= 50 THEN 'Contributor'
    ELSE 'New User'
  END as tier
FROM public.users u
WHERE u.email = 'your@email.com';
```

**Expected:**
- New users start at 0 points (New User tier)
- Existing users may have accumulated points

### Step 2: Create Test Hazard for Badge Display

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, status
) VALUES (
  '[USER_ID]',
  'Trust Score Test: Badge Display',
  'Test hazard to verify trust score badges appear',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 3,
  'permanent',
  'approved'
) RETURNING id;
```

### Step 3: Visit Hazard Detail Page

Open: `http://localhost:5175/hazards/[HAZARD_ID]`

**You should see:**
- Your email in the "Reporter" section
- Trust score badge next to your email (e.g., "Trust: 0" for new users)
- Badge color matches your tier (gray for New User, green for Contributor, etc.)

### Step 4: Check Trust Score Events Table

```sql
-- Should be empty for brand new users
SELECT * FROM trust_score_events WHERE user_id = '[USER_ID]';
```

**Expected:**
- Empty result set for new users
- Or existing events if you've done actions before

---

## Test 2: Voting Trust Score Updates 👍👎

**Goal:** Verify voting awards points to both voter and hazard owner

### Step 1: Create Votable Hazard (User 1)

As User 1, create a hazard:

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, status
) VALUES (
  '[USER_1_ID]',
  'Trust Score Test: Voting',
  'Testing voting trust score updates',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 3,
  'permanent',
  'approved'
) RETURNING id;
```

### Step 2: Check Pre-Vote Scores

```sql
-- Record starting scores
SELECT id, email, trust_score FROM public.users 
WHERE id IN ('[USER_1_ID]', '[USER_2_ID]');
```

### Step 3: Upvote as User 2

1. Log in as User 2
2. Visit hazard: `http://localhost:5175/hazards/[HAZARD_ID]`
3. Click the 👍 upvote button

**You should see:**
- Vote count increases by 1
- Vote score increases by 1
- No immediate visual feedback for trust score (updates in background)

### Step 4: Verify Trust Score Updates

```sql
-- Check updated scores
SELECT id, email, trust_score FROM public.users 
WHERE id IN ('[USER_1_ID]', '[USER_2_ID]');

-- Expected:
-- User 1 (hazard owner): +2 points (hazard_upvoted)
-- User 2 (voter): +2 points (vote_cast)
```

### Step 5: Check Trust Score Events

```sql
-- View audit trail
SELECT 
  user_id,
  event_type,
  points_change,
  previous_score,
  new_score,
  created_at
FROM trust_score_events
WHERE user_id IN ('[USER_1_ID]', '[USER_2_ID]')
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- 2 events: one for `vote_cast` (+2), one for `hazard_upvoted` (+2)
- Both have correct previous_score and new_score
- Timestamps are recent

### Step 6: Test Downvote

1. As User 2, change vote to 👎 downvote
2. Vote score should decrease by 2 (removes +1, adds -1)

```sql
-- Check scores after downvote
SELECT id, email, trust_score FROM public.users 
WHERE id IN ('[USER_1_ID]', '[USER_2_ID]');

-- Expected:
-- User 1: -4 total change (was +2, now -2 = net -4)
-- User 2: No change (still +2 for voting)

-- Check events
SELECT * FROM trust_score_events
WHERE user_id = '[USER_1_ID]'
ORDER BY created_at DESC
LIMIT 2;

-- Expected: hazard_upvoted (+2), then hazard_downvoted (-2)
```

---

## Test 3: Moderation Trust Score Updates 🛡️

**Goal:** Verify moderation awards/penalizes content owners

### Step 1: Create Hazard Pending Moderation

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, status
) VALUES (
  '[USER_ID]',
  'Trust Score Test: Moderation',
  'Testing moderation trust score updates',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 3,
  'permanent',
  'pending'  -- Needs moderation
) RETURNING id;
```

### Step 2: Add to Moderation Queue

```sql
INSERT INTO moderation_queue (
  content_id, type, reason, status
) VALUES (
  '[HAZARD_ID]', 'hazard', 'New submission', 'pending'
) RETURNING id;
```

### Step 3: Check Pre-Moderation Score

```sql
SELECT id, email, trust_score FROM public.users WHERE id = '[USER_ID]';
```

### Step 4: Approve Hazard (as Moderator)

1. Log in as admin/moderator
2. Visit: `http://localhost:5175/moderation`
3. Find your test hazard in the queue
4. Click "Approve"

**OR via SQL:**
```sql
-- Simulate approval
UPDATE moderation_queue 
SET status = 'approved', resolved_at = NOW()
WHERE content_id = '[HAZARD_ID]';

UPDATE hazards 
SET status = 'approved'
WHERE id = '[HAZARD_ID]';

-- Manually trigger trust score update
SELECT update_trust_score(
  '[USER_ID]',
  'hazard_approved',
  '[HAZARD_ID]',
  'hazard',
  'Approved by moderator'
);
```

### Step 5: Verify Trust Score Increase

```sql
-- Check score after approval
SELECT id, email, trust_score FROM public.users WHERE id = '[USER_ID]';

-- Expected: +10 points (hazard_approved)

-- Check event
SELECT * FROM trust_score_events
WHERE user_id = '[USER_ID]' AND event_type = 'hazard_approved'
ORDER BY created_at DESC LIMIT 1;
```

### Step 6: Test Rejection (Create New Hazard)

```sql
-- Create another hazard
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, status
) VALUES (
  '[USER_ID]',
  'Trust Score Test: Rejection',
  'Testing rejection penalty',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 2,
  'permanent',
  'pending'
) RETURNING id;

-- Reject it
SELECT update_trust_score(
  '[USER_ID]',
  'hazard_rejected',
  '[NEW_HAZARD_ID]',
  'hazard',
  'Rejected by moderator'
);

-- Check score
SELECT trust_score FROM public.users WHERE id = '[USER_ID]';
-- Expected: -10 points (but floor at 0)
```

---

## Test 4: Hazard Flagging Trust Score 🚩

**Goal:** Verify flagging awards/penalizes based on outcome

### Step 1: Create Flaggable Hazard (User 1)

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, status
) VALUES (
  '[USER_1_ID]',
  'Trust Score Test: Flagging',
  'Testing flag trust score updates',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 3,
  'permanent',
  'approved'
) RETURNING id;
```

### Step 2: Check Pre-Flag Score (User 2)

```sql
SELECT id, email, trust_score FROM public.users WHERE id = '[USER_2_ID]';
```

### Step 3: Flag Hazard (as User 2)

1. Log in as User 2
2. Visit: `http://localhost:5175/hazards/[HAZARD_ID]`
3. Scroll to voting section
4. Click "🚩 Flag Hazard" button
5. Select reason: "spam"
6. Add notes: "This appears to be spam content"
7. Submit

**You should see:**
- Success message: "Flag submitted successfully"
- Button changes to "Flagged" (disabled)

### Step 4: Verify Flag Created

```sql
-- Check flag record
SELECT * FROM hazard_flags
WHERE hazard_id = '[HAZARD_ID]' AND user_id = '[USER_2_ID]';

-- Expected: status = 'pending'

-- Check trust score increased
SELECT trust_score FROM public.users WHERE id = '[USER_2_ID]';
-- Expected: +2 points (hazard_flagged trigger)
```

### Step 5: Moderator Upholds Flag (Reject Hazard)

As moderator, process the flag:

```sql
-- Get moderation queue item
SELECT * FROM moderation_queue
WHERE content_id = '[HAZARD_ID]' AND type = 'hazard'
ORDER BY created_at DESC LIMIT 1;

-- Reject the hazard (upholding the flag)
UPDATE hazards SET status = 'rejected' WHERE id = '[HAZARD_ID]';

-- Update flag status
UPDATE hazard_flags 
SET status = 'upheld', reviewed_at = NOW()
WHERE hazard_id = '[HAZARD_ID]' AND user_id = '[USER_2_ID]';
```

### Step 6: Verify Flag Upheld Trust Score

```sql
-- Check flagger's score
SELECT trust_score FROM public.users WHERE id = '[USER_2_ID]';

-- Expected: Additional +2 (flag_upheld trigger) = total +4 from flagging

-- Check events
SELECT * FROM trust_score_events
WHERE user_id = '[USER_2_ID]'
ORDER BY created_at DESC LIMIT 2;

-- Expected: hazard_flagged (+2), then flag_upheld (+2)
```

### Step 7: Test False Flag (Create New Hazard)

```sql
-- Create legitimate hazard
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, status
) VALUES (
  '[USER_1_ID]',
  'Trust Score Test: False Flag',
  'Legitimate hazard for testing false flag penalty',
  '[CATEGORY_ID]',
  42.3602, -71.0590, 3,
  'permanent',
  'approved'
) RETURNING id;

-- User 2 flags it (falsely)
INSERT INTO hazard_flags (hazard_id, user_id, reason, status)
VALUES ('[NEW_HAZARD_ID]', '[USER_2_ID]', 'spam', 'pending');

-- Moderator dismisses flag (hazard is fine)
UPDATE hazards SET status = 'approved' WHERE id = '[NEW_HAZARD_ID]';

UPDATE hazard_flags 
SET status = 'dismissed', reviewed_at = NOW()
WHERE hazard_id = '[NEW_HAZARD_ID]' AND user_id = '[USER_2_ID]';

-- Check penalty
SELECT trust_score FROM public.users WHERE id = '[USER_2_ID]';
-- Expected: -2 points (flag_dismissed trigger)
```

---

## Test 5: Trust Score Tiers & Progression 📊

**Goal:** Verify tier badges and progression display

### Step 1: View Current Tier

Visit your profile or any hazard you created:

**Badge should show:**
- 0-49: 🌱 New User (gray)
- 50-199: 🌿 Contributor (green)
- 200-499: 🌳 Trusted (blue)
- 500-999: 🏅 Community Leader (amber)
- 1000-1999: 🥈 Expert (silver)
- 2000+: 🥇 Guardian (gold)

### Step 2: Manually Set Score to Test Tiers

```sql
-- Test each tier
-- New User (0)
UPDATE public.users SET trust_score = 0 WHERE id = '[USER_ID]';

-- Contributor (50)
UPDATE public.users SET trust_score = 50 WHERE id = '[USER_ID]';

-- Trusted (200)
UPDATE public.users SET trust_score = 200 WHERE id = '[USER_ID]';

-- Community Leader (500)
UPDATE public.users SET trust_score = 500 WHERE id = '[USER_ID]';

-- Expert (1000)
UPDATE public.users SET trust_score = 1000 WHERE id = '[USER_ID]';

-- Guardian (2000)
UPDATE public.users SET trust_score = 2000 WHERE id = '[USER_ID]';
```

After each update, refresh hazard detail page and verify badge changes.

### Step 3: View Trust Score Breakdown (Future Feature)

If TrustScoreBreakdown component is integrated:

1. Visit profile or hazard detail
2. Click "View Trust Score Details"
3. Should see:
   - Current score and tier
   - Progress bar to next tier
   - Breakdown by event type (positive/negative)
   - Recent activity

---

## Test 6: Leaderboard with Filters 🏆

**Goal:** Verify leaderboard displays and filters correctly

### Step 1: Visit Leaderboard

Open: `http://localhost:5175/leaderboard`

**You should see:**
- Top 100 users by trust score
- Three timeframe tabs: All Time, This Month, This Week
- Search box for filtering by email
- Rank, User, Score, Tier columns
- 🥇 🥈 🥉 medals for top 3

### Step 2: Test Timeframe Filters

1. Click "This Month" tab
   - URL changes to `?timeframe=month`
   - Shows only users with score changes in last 30 days

2. Click "This Week" tab
   - URL changes to `?timeframe=week`
   - Shows only users with score changes in last 7 days

3. Click "All Time" tab
   - Shows all users ranked by total score

### Step 3: Test Search

1. Type your email in search box
2. Leaderboard filters to show only matching users
3. Clear search - full list returns

### Step 4: Verify Ranking

```sql
-- Check leaderboard data matches database
SELECT 
  u.email,
  u.trust_score,
  RANK() OVER (ORDER BY u.trust_score DESC) as rank
FROM public.users u
WHERE u.trust_score > 0
ORDER BY u.trust_score DESC
LIMIT 10;

-- Compare with leaderboard display
```

### Step 5: Check Top 3 Styling

- Top 3 users should have gold gradient background
- Rank 1: 🥇 gold medal
- Rank 2: 🥈 silver medal
- Rank 3: 🥉 bronze medal

---

## Test 7: Admin Configuration Editor ⚙️

**Goal:** Verify admins can edit point values

### Step 1: Check Admin Access

```sql
-- Verify you have admin role
SELECT id, email, role FROM public.users WHERE email = 'your@email.com';
-- role should be 'admin' or 'moderator'

-- If not admin, grant yourself admin role
UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
```

### Step 2: Visit Admin Page

Open: `http://localhost:5175/admin/trust-score`

**If not admin:**
- Should see 403 Forbidden error

**If admin:**
- Should see two-column config editor
- Left column: Positive actions (green header)
- Right column: Negative actions (red header)
- Each action has editable point value input
- Manual adjustment form at bottom

### Step 3: Edit Point Values

1. Change "Hazard Approved" from +10 to +15
2. Change "Vote Cast" from +2 to +3
3. Banner appears: "You have unsaved changes"
4. Click "Save Changes"
5. Success message appears
6. Banner disappears

### Step 4: Verify Changes Saved

```sql
-- Check updated config
SELECT * FROM trust_score_config
WHERE action_key IN ('hazard_approved', 'vote_cast');

-- Expected:
-- hazard_approved: points = 15
-- vote_cast: points = 3
```

### Step 5: Test with New Action

1. Create new hazard
2. Get it approved
3. Check trust score increase

```sql
-- Should now award +15 (not +10)
SELECT * FROM trust_score_events
WHERE event_type = 'hazard_approved'
ORDER BY created_at DESC LIMIT 1;

-- points_change should be 15
```

### Step 6: Reset Config

```sql
-- Reset to defaults
UPDATE trust_score_config SET points = 10 WHERE action_key = 'hazard_approved';
UPDATE trust_score_config SET points = 2 WHERE action_key = 'vote_cast';
```

---

## Test 8: Admin Manual Score Adjustments 🔧

**Goal:** Verify admins can manually adjust user trust scores

### Step 1: Get Target User

```sql
SELECT id, email, trust_score FROM public.users LIMIT 5;
-- Pick a user to adjust
```

### Step 2: Use Manual Adjustment Form

On admin page (`http://localhost:5175/admin/trust-score`):

1. Scroll to "Manual Adjustment" section
2. Enter User ID: `[TARGET_USER_ID]`
3. Enter Points: `50` (positive adjustment)
4. Enter Reason: "Exceptional community contribution"
5. Click "Adjust Trust Score"
6. Success message appears

### Step 3: Verify Adjustment

```sql
-- Check updated score
SELECT id, email, trust_score FROM public.users WHERE id = '[TARGET_USER_ID]';
-- Should be +50

-- Check audit trail
SELECT * FROM trust_score_events
WHERE user_id = '[TARGET_USER_ID]'
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- event_type = 'moderator_action'
-- points_change = 50
-- notes = 'Exceptional community contribution'
```

### Step 4: Test Negative Adjustment

1. Enter same User ID
2. Enter Points: `-25` (penalty)
3. Enter Reason: "Repeated policy violations"
4. Submit

```sql
-- Check score decreased
SELECT trust_score FROM public.users WHERE id = '[TARGET_USER_ID]';
-- Should be -25 from previous (but never below 0)

-- Verify event
SELECT * FROM trust_score_events
WHERE user_id = '[TARGET_USER_ID]'
ORDER BY created_at DESC LIMIT 1;
```

### Step 5: Test Zero Floor

1. Try to set score to -1000 (should floor at 0)

```sql
-- Manually set to low score
UPDATE public.users SET trust_score = 10 WHERE id = '[TARGET_USER_ID]';

-- Apply -50 penalty
SELECT update_trust_score('[TARGET_USER_ID]', 'moderator_action', NULL, NULL, 'Test floor', -50);

-- Check score
SELECT trust_score FROM public.users WHERE id = '[TARGET_USER_ID]';
-- Should be 0 (not negative)
```

---

## 🧹 Test Cleanup

After testing, clean up test data:

```sql
-- Delete test hazards
DELETE FROM hazards 
WHERE title LIKE 'Trust Score Test:%';

-- Delete test flags
DELETE FROM hazard_flags
WHERE hazard_id NOT IN (SELECT id FROM hazards);

-- Reset test user scores (optional)
UPDATE public.users 
SET trust_score = 0 
WHERE email IN ('testuser1@example.com', 'testuser2@example.com');

-- Clear trust score events for test users (optional)
DELETE FROM trust_score_events
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE email IN ('testuser1@example.com', 'testuser2@example.com')
);

-- Verify cleanup
SELECT COUNT(*) FROM hazards WHERE title LIKE 'Trust Score Test:%';
SELECT COUNT(*) FROM trust_score_events WHERE notes LIKE '%test%';
```

---

## ✅ Test Checklist

- [ ] **Test 1:** Trust score badge displays on hazard detail page
- [ ] **Test 1:** Badge color matches tier (gray, green, blue, amber, silver, gold)
- [ ] **Test 2:** Upvote awards +2 to voter and +2 to hazard owner
- [ ] **Test 2:** Downvote awards +2 to voter and -2 to hazard owner
- [ ] **Test 2:** Trust score events created in database
- [ ] **Test 3:** Approval awards +10 to content owner
- [ ] **Test 3:** Rejection penalizes -10 to content owner
- [ ] **Test 4:** Flagging awards +2 to flagger
- [ ] **Test 4:** Flag upheld awards additional +2 to flagger
- [ ] **Test 4:** False flag penalizes -2 to flagger
- [ ] **Test 5:** Tier badges display correctly for all 6 tiers
- [ ] **Test 5:** Progress bar shows advancement to next tier
- [ ] **Test 6:** Leaderboard displays top 100 users
- [ ] **Test 6:** Timeframe filters work (all/month/week)
- [ ] **Test 6:** Search filters by email
- [ ] **Test 6:** Top 3 medals display with gold gradient
- [ ] **Test 7:** Admin can edit point values
- [ ] **Test 7:** Changes persist to database
- [ ] **Test 7:** New actions use updated point values
- [ ] **Test 8:** Manual adjustments update user scores
- [ ] **Test 8:** Audit trail records manual changes
- [ ] **Test 8:** Score floors at 0 (never negative)

---

## 🐛 Troubleshooting

### "Trust score badge not showing"
- Check `users.trust_score` column exists in database
- Verify TrustScoreBadge component is imported
- Check browser console for component errors

### "Points not updating after vote/flag"
- Verify database triggers are active: `SELECT * FROM pg_trigger WHERE tgname LIKE '%trust_score%';`
- Check `trust_score_events` table for failed events
- Ensure `update_trust_score()` RPC function exists

### "Admin page shows 403 Forbidden"
- Verify user role: `SELECT role FROM public.users WHERE id = '[USER_ID]';`
- Update to admin: `UPDATE public.users SET role = 'admin' WHERE id = '[USER_ID]';`

### "Leaderboard empty or missing users"
- Check users have non-zero trust scores
- Verify `getUserTrustScore()` function working
- Clear browser cache and refresh

### "Flag button not appearing"
- Must be logged in
- Cannot flag own hazards
- Check `userHasFlagged` API endpoint

---

## 📊 Expected Results Summary

| Test | Expected Duration | Pass Criteria |
|------|-------------------|---------------|
| 1. Badge Display | 2 min | Badge shows on hazard page, color matches tier |
| 2. Voting Updates | 3 min | Both voter and owner get +2/±2 points |
| 3. Moderation Updates | 3 min | Approval +10, rejection -10 |
| 4. Flagging Updates | 4 min | Flag +2, upheld +2, dismissed -2 |
| 5. Tier Progression | 2 min | All 6 tiers display correctly |
| 6. Leaderboard | 3 min | Top 100, filters work, search works |
| 7. Admin Config | 3 min | Can edit values, changes persist |
| 8. Manual Adjustments | 2 min | Score updates, audit trail created |

**Total Testing Time:** 15-20 minutes

---

## 🎉 Success Criteria

**Your trust score system is working correctly if:**
1. ✅ Trust score badges display with correct colors/icons
2. ✅ Voting awards points to both voter and content owner
3. ✅ Moderation awards/penalizes content owners appropriately
4. ✅ Flagging awards/penalizes based on flag outcome
5. ✅ All 6 tiers progress correctly (0 → 2000+)
6. ✅ Leaderboard displays top users with filters
7. ✅ Admins can edit point configuration
8. ✅ Admins can manually adjust user scores
9. ✅ All changes recorded in audit trail
10. ✅ Trust scores never go below 0

**If all tests pass:** Your trust score system is production-ready! 🚀

---

## 📝 Notes

- **Point values are configurable** - defaults shown, but admins can change
- **Triggers fire automatically** - no manual intervention needed for votes/flags
- **Audit trail is comprehensive** - every change recorded with reason
- **Scores floor at 0** - cannot go negative
- **Tiers are hardcoded** - 6 tiers from New User to Guardian

---

**Happy Testing!** 🧪✨
