# Week 7 Community Features - Comprehensive Testing Plan

## Overview
This document provides a complete testing plan for the newly implemented Week 7 community features:
1. **Hazard Voting System** - Upvote/downvote hazards
2. **Hazard Expiration System** - Four expiration types with resolution workflow

## Test Environment Setup

### Prerequisites
- ✅ All migrations applied to Supabase database
- ✅ At least 3 test user accounts created (for multi-user testing)
- ✅ Test hazards in various categories
- ✅ Development environment running locally

### Test Data Requirements
- **Users**: Minimum 3 accounts with different trust scores
- **Categories**: At least 2 categories with different expiration settings (e.g., "thunderstorm" with 6h auto-expire, "poison_ivy" with permanent)
- **Hazards**: Mix of voting test data and expiration test data

---

## PART 1: Hazard Voting System Tests

### Test Suite 1.1: Basic Voting Functionality

#### Test 1.1.1: Upvote a Hazard
**Objective**: Verify users can upvote a hazard

**Prerequisites**:
- User logged in
- At least one hazard exists that user did not create

**Steps**:
1. Navigate to hazard detail page
2. Locate "Community Voting" section
3. Click "Upvote" (👍) button
4. Observe vote count updates

**Expected Results**:
- ✅ Upvote count increments by 1
- ✅ Upvote button shows active/selected state
- ✅ Database `hazard_votes` table has new row with `vote_type='upvote'`
- ✅ Success feedback shown to user

**Database Verification**:
```sql
SELECT * FROM hazard_votes 
WHERE hazard_id = '<test_hazard_id>' 
  AND user_id = auth.uid();
```

---

#### Test 1.1.2: Downvote a Hazard
**Objective**: Verify users can downvote a hazard

**Prerequisites**:
- User logged in
- At least one hazard exists that user did not create

**Steps**:
1. Navigate to hazard detail page
2. Locate "Community Voting" section
3. Click "Downvote" (👎) button
4. Observe vote count updates

**Expected Results**:
- ✅ Downvote count increments by 1
- ✅ Downvote button shows active/selected state
- ✅ Database has vote record with `vote_type='downvote'`
- ✅ Success feedback shown

---

#### Test 1.1.3: Change Vote from Upvote to Downvote
**Objective**: Verify users can change their vote

**Prerequisites**:
- User has already upvoted a hazard (Test 1.1.1)

**Steps**:
1. Navigate to same hazard detail page
2. Click "Downvote" button (currently showing upvote active)
3. Observe vote counts update

**Expected Results**:
- ✅ Upvote count decrements by 1
- ✅ Downvote count increments by 1
- ✅ Net change is -2 for hazard score
- ✅ Database record updated (same row, changed `vote_type`)
- ✅ Downvote button now shows active state, upvote inactive

**Database Verification**:
```sql
SELECT vote_type, updated_at FROM hazard_votes 
WHERE hazard_id = '<test_hazard_id>' 
  AND user_id = auth.uid();
-- Should show 'downvote' with recent updated_at timestamp
```

---

#### Test 1.1.4: Remove Vote
**Objective**: Verify users can remove their vote entirely

**Prerequisites**:
- User has an active vote (upvote or downvote)

**Steps**:
1. Navigate to hazard with existing vote
2. Click the same vote button again (the one showing active)
3. Observe vote count updates

**Expected Results**:
- ✅ Vote count decrements by 1
- ✅ Button returns to inactive state
- ✅ Database record deleted from `hazard_votes`
- ✅ User can re-vote after removal

**Database Verification**:
```sql
SELECT COUNT(*) FROM hazard_votes 
WHERE hazard_id = '<test_hazard_id>' 
  AND user_id = auth.uid();
-- Should return 0
```

---

### Test Suite 1.2: Voting Permissions & Security

#### Test 1.2.1: Cannot Vote on Own Hazard
**Objective**: Verify users cannot vote on hazards they created

**Prerequisites**:
- User logged in
- User has created at least one hazard

**Steps**:
1. Navigate to own hazard detail page
2. Locate "Community Voting" section
3. Observe voting buttons

**Expected Results**:
- ✅ Voting buttons are disabled or hidden
- ✅ Message displayed: "You cannot vote on your own hazard"
- ✅ API returns 403 error if vote attempted via direct API call
- ✅ Vote counts still visible (read-only)

**API Test** (optional):
```bash
curl -X POST https://your-project.supabase.co/rest/v1/hazard_votes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hazard_id": "your_own_hazard_id", "vote_type": "upvote"}'
# Should return 403 Forbidden
```

---

#### Test 1.2.2: Unauthenticated Users Cannot Vote
**Objective**: Verify anonymous users cannot vote

**Prerequisites**:
- No user logged in (logged out)

**Steps**:
1. Navigate to any hazard detail page while logged out
2. Locate "Community Voting" section
3. Attempt to click voting buttons

**Expected Results**:
- ✅ Voting buttons are disabled or hidden
- ✅ Message displayed: "Log in to vote"
- ✅ Clicking button redirects to login or shows login prompt
- ✅ Vote counts still visible (read-only)

---

#### Test 1.2.3: One Vote Per User Per Hazard
**Objective**: Verify database constraint prevents duplicate votes

**Prerequisites**:
- User has voted on a hazard

**Steps**:
1. Use database admin or API to attempt inserting duplicate vote
2. Execute direct INSERT with same user_id and hazard_id

**Expected Results**:
- ✅ Database rejects duplicate with unique constraint violation
- ✅ Error code: `23505` (unique_violation)
- ✅ Constraint name: `hazard_votes_user_id_hazard_id_key`

**SQL Test**:
```sql
-- This should fail
INSERT INTO hazard_votes (user_id, hazard_id, vote_type)
VALUES (auth.uid(), '<existing_vote_hazard_id>', 'upvote');
-- Expected: ERROR:  duplicate key value violates unique constraint "hazard_votes_user_id_hazard_id_key"
```

---

### Test Suite 1.3: Vote Persistence & Synchronization

#### Test 1.3.1: Votes Persist Across Sessions
**Objective**: Verify votes remain after logout/login

**Prerequisites**:
- User has voted on several hazards

**Steps**:
1. Log out
2. Log back in with same account
3. Navigate to previously voted hazards
4. Observe vote button states

**Expected Results**:
- ✅ All vote buttons show correct active states
- ✅ Vote counts match pre-logout state
- ✅ User can still change votes normally

---

#### Test 1.3.2: Real-time Vote Updates (Multiple Users)
**Objective**: Verify vote counts update when other users vote

**Prerequisites**:
- Two users logged in on different browsers/devices
- Both viewing same hazard detail page

**Steps**:
1. User A: Navigate to hazard
2. User B: Navigate to same hazard
3. User A: Cast upvote
4. User B: Observe page

**Expected Results** (if real-time subscriptions enabled):
- ✅ User B sees vote count increment without refresh
- ✅ Page updates within 1-2 seconds

**Expected Results** (if polling or no real-time):
- ✅ User B sees updated count after manual page refresh
- ✅ No errors or inconsistencies

---

---

## PART 2: Hazard Expiration System Tests

### Test Suite 2.1: Hazard Creation with Expiration Types

#### Test 2.1.1: Create Auto-Expire Hazard (6 hours)
**Objective**: Create hazard that expires automatically

**Prerequisites**:
- User logged in
- Select category with auto-expire default (e.g., "thunderstorm")

**Steps**:
1. Navigate to Create Hazard page
2. Fill in required fields (title, description, location, category="thunderstorm")
3. In "Expiration & Resolution" section, verify "Auto-Expire" is pre-selected (from category defaults)
4. Set duration to 6 hours
5. Submit form
6. Navigate to created hazard detail page

**Expected Results**:
- ✅ Hazard created successfully
- ✅ Database: `expiration_type='auto_expire'`
- ✅ Database: `expires_at` timestamp is ~6 hours from now (verify with query below)
- ✅ Hazard detail page shows:
  - Green "Active" badge
  - Time remaining countdown (e.g., "Expires in 5 hours 59 minutes")
  - "Extend Expiration" button visible (for hazard owner)
- ✅ Extended count shows 0

**Database Verification**:
```sql
SELECT 
  expiration_type, 
  expires_at,
  expires_at - created_at as duration,
  extended_count
FROM hazards 
WHERE id = '<new_hazard_id>';
-- expires_at should be ~6 hours after created_at
```

---

#### Test 2.1.2: Create User-Resolvable Hazard (Default)
**Objective**: Create hazard that users can report as resolved

**Prerequisites**:
- User logged in
- Select category with user_resolvable default (e.g., "road_closure")

**Steps**:
1. Navigate to Create Hazard page
2. Fill in required fields, select category with user_resolvable default
3. In "Expiration & Resolution" section, verify "User-Resolvable" is pre-selected with "Recommended" badge
4. Submit form
5. Navigate to created hazard detail page

**Expected Results**:
- ✅ Hazard created successfully
- ✅ Database: `expiration_type='user_resolvable'`
- ✅ Database: `expires_at` is NULL
- ✅ Database: `seasonal_pattern` is NULL
- ✅ Hazard detail page shows:
  - Green "Active" badge
  - No expiration countdown
  - "Report as Resolved" button visible (for other users, not owner)
  - No "Extend Expiration" button
- ✅ Expiration settings loaded correctly from `expiration_settings` table

**Database Verification**:
```sql
SELECT 
  expiration_type, 
  expires_at,
  seasonal_pattern,
  resolved_at
FROM hazards 
WHERE id = '<new_hazard_id>';
-- expiration_type='user_resolvable', expires_at=NULL, seasonal_pattern=NULL, resolved_at=NULL
```

---

#### Test 2.1.3: Create Permanent Hazard
**Objective**: Create hazard that never expires

**Prerequisites**:
- User logged in

**Steps**:
1. Navigate to Create Hazard page
2. Fill in required fields, select any category
3. In "Expiration & Resolution" section, select "Permanent" radio button
4. Submit form
5. Navigate to created hazard detail page

**Expected Results**:
- ✅ Hazard created successfully
- ✅ Database: `expiration_type='permanent'`
- ✅ Database: `expires_at` is NULL
- ✅ Database: `seasonal_pattern` is NULL
- ✅ Hazard detail page shows:
  - Green/gray "Permanent Hazard" badge
  - No expiration countdown
  - No "Extend Expiration" button
  - No resolution options
- ✅ Status section explains hazard is permanent

**Database Verification**:
```sql
SELECT 
  expiration_type, 
  expires_at,
  seasonal_pattern
FROM hazards 
WHERE id = '<new_hazard_id>';
-- expiration_type='permanent', expires_at=NULL, seasonal_pattern=NULL
```

---

#### Test 2.1.4: Create Seasonal Hazard (May-September)
**Objective**: Create hazard active only during specific months

**Prerequisites**:
- User logged in
- Current month is either inside or outside test range (May-September)

**Steps**:
1. Navigate to Create Hazard page
2. Fill in required fields
3. In "Expiration & Resolution" section, select "Seasonal" radio button
4. Month selector grid appears with 12 buttons (Jan-Dec)
5. Click months: May, June, July, August, September (5 months selected)
6. Observe selected months highlighted in blue
7. Submit form
8. Navigate to created hazard detail page

**Expected Results**:
- ✅ Hazard created successfully
- ✅ Database: `expiration_type='seasonal'`
- ✅ Database: `expires_at` is NULL
- ✅ Database: `seasonal_pattern='{"active_months": [5,6,7,8,9]}'` (JSON)
- ✅ Hazard detail page shows:
  - **If current month is 5-9**: Green "Active" badge + "Active: May - September" badge
  - **If current month is 1-4 or 10-12**: Blue "Dormant" badge + "Active: May - September" (gray text)
- ✅ Seasonal badge displays active month ranges correctly

**Database Verification**:
```sql
SELECT 
  expiration_type, 
  seasonal_pattern,
  expires_at
FROM hazards 
WHERE id = '<new_hazard_id>';
-- expiration_type='seasonal', seasonal_pattern->>'active_months' should contain [5,6,7,8,9]
```

---

### Test Suite 2.2: Auto-Expire Functionality

#### Test 2.2.1: Extend Auto-Expire Hazard (Owner)
**Objective**: Verify hazard owner can extend expiration

**Prerequisites**:
- User created an auto-expire hazard (Test 2.1.1)
- Hazard not yet expired

**Steps**:
1. Navigate to own hazard detail page (auto-expire type)
2. Locate "Extend Expiration" button
3. Click button
4. Observe page updates

**Expected Results**:
- ✅ Success message: "Expiration extended by 24 hours"
- ✅ `expires_at` timestamp updated (+24 hours)
- ✅ `extended_count` increments by 1
- ✅ Time remaining countdown resets to show additional 24 hours
- ✅ `expiration_notified_at` reset to NULL
- ✅ Audit log records extension

**Database Verification**:
```sql
SELECT 
  expires_at,
  extended_count,
  expiration_notified_at
FROM hazards 
WHERE id = '<hazard_id>';
-- extended_count should be 1, expires_at should be +24h from before

SELECT * FROM expiration_audit_log
WHERE hazard_id = '<hazard_id>'
ORDER BY created_at DESC
LIMIT 1;
-- action_type='extended', should show "extended by 24 hours"
```

---

#### Test 2.2.2: Multiple Extensions (Unlimited)
**Objective**: Verify users can extend indefinitely

**Prerequisites**:
- User has auto-expire hazard with extended_count >= 1

**Steps**:
1. Navigate to hazard detail page
2. Click "Extend Expiration" button multiple times (3-5 times)
3. Wait 2-3 seconds between clicks
4. Observe extended count

**Expected Results**:
- ✅ Each extension succeeds
- ✅ `extended_count` increments each time (2, 3, 4...)
- ✅ No limit enforced (unlimited extensions allowed)
- ✅ Each extension adds 24 hours to `expires_at`
- ✅ Audit log shows all extensions

**Database Verification**:
```sql
SELECT extended_count, expires_at 
FROM hazards 
WHERE id = '<hazard_id>';
-- extended_count should match number of extension clicks

SELECT COUNT(*) FROM expiration_audit_log
WHERE hazard_id = '<hazard_id>' 
  AND action_type = 'extended';
-- Should match extended_count
```

---

#### Test 2.2.3: Moderator Can Extend Others' Hazards
**Objective**: Verify moderator permissions for extensions

**Prerequisites**:
- User A: Created auto-expire hazard
- User B: Has moderator role

**Steps**:
1. User B (moderator): Navigate to User A's hazard detail page
2. Observe "Extend Expiration" button visible
3. Click button
4. Verify extension succeeds

**Expected Results**:
- ✅ Moderator sees "Extend Expiration" button on all hazards
- ✅ Extension succeeds for hazards they don't own
- ✅ Audit log shows moderator's user_id in `action_by`
- ✅ Regular users (non-moderators) do NOT see extend button on others' hazards

**Permission Verification**:
```sql
-- Check moderator role
SELECT role FROM auth.users WHERE id = '<moderator_user_id>';
-- Should be 'moderator' or 'admin'

-- Check audit log
SELECT action_by FROM expiration_audit_log
WHERE hazard_id = '<hazard_id>' 
  AND action_type = 'extended'
ORDER BY created_at DESC LIMIT 1;
-- Should be moderator's user_id, not hazard owner's
```

---

#### Test 2.2.4: Expiration Warning Display (<24 hours)
**Objective**: Verify visual warning when expiration is imminent

**Prerequisites**:
- Auto-expire hazard with <24 hours remaining (create with 1-hour duration, or extend existing hazard to be close to expiration)

**Steps**:
1. Create auto-expire hazard with 1-hour duration
2. Navigate to hazard detail page
3. Observe status badge and time remaining

**Expected Results**:
- ✅ Status badge changes to yellow "Expiring Soon" with animated pulse
- ✅ Time remaining displays with warning styling (red text, pulsing)
- ✅ Warning icon or exclamation mark shown
- ✅ Countdown updates in real-time (every second)

---

#### Test 2.2.5: Hazard Status After Expiration
**Objective**: Verify hazard appears as expired after `expires_at` passes

**Prerequisites**:
- Auto-expire hazard with `expires_at` in the past (create with 1-minute duration and wait)

**Steps**:
1. Create auto-expire hazard with 1-minute duration
2. Wait 2 minutes
3. Navigate to hazard detail page
4. Call `/api/hazards/[id]/expiration-status` endpoint

**Expected Results**:
- ✅ Status badge shows gray "Expired"
- ✅ Time remaining shows "Expired X minutes ago"
- ✅ No "Extend Expiration" button (cannot extend after expiration)
- ✅ API returns `status='expired'`
- ✅ `time_remaining` is negative number

**API Verification**:
```bash
curl https://your-project.supabase.co/api/hazards/<hazard_id>/expiration-status
# Response should have: {"status": "expired", "time_remaining": <negative seconds>}
```

---

### Test Suite 2.3: User-Resolvable Resolution Flow

#### Test 2.3.1: Submit Resolution Report
**Objective**: Verify users can submit detailed resolution report

**Prerequisites**:
- User logged in (User B, not hazard owner)
- User-resolvable hazard exists (created by User A)
- No resolution report submitted yet

**Steps**:
1. Navigate to hazard detail page
2. Locate "Resolution" section
3. Click "Report as Resolved" button
4. Form appears with:
   - `resolution_note` textarea (10-1000 chars required)
   - `evidence_url` input (optional)
   - Character counter
5. Enter note: "I visited this location today at 3pm. The hazard has been cleared. No signs of the reported issue."
6. Optionally add evidence URL (photo link)
7. Click "Submit Report"
8. Observe page updates

**Expected Results**:
- ✅ Success message: "Resolution report submitted"
- ✅ Database: Row inserted in `hazard_resolution_reports` with:
  - `hazard_id` = hazard ID
  - `reported_by` = User B's ID
  - `resolution_note` = entered text
  - `evidence_url` = entered URL (if provided)
  - `trust_score_at_report` = User B's trust score
- ✅ Resolution form replaced with "Resolution History" component showing:
  - Report details with reporter identity
  - Timestamp ("2 minutes ago")
  - Evidence photo link (if provided)
  - Confirmation counts: 0 confirmed, 0 disputed
  - Progress bar (empty)
- ✅ Confirmation buttons appear for other users
- ✅ Audit log records report submission

**Database Verification**:
```sql
SELECT * FROM hazard_resolution_reports
WHERE hazard_id = '<hazard_id>';
-- Should have exactly 1 row (unique constraint on hazard_id)

SELECT * FROM expiration_audit_log
WHERE hazard_id = '<hazard_id>' 
  AND action_type = 'resolution_reported';
```

---

#### Test 2.3.2: Cannot Submit Duplicate Resolution Report
**Objective**: Verify unique constraint prevents multiple reports per hazard

**Prerequisites**:
- Hazard already has a resolution report (Test 2.3.1)

**Steps**:
1. User C: Navigate to same hazard
2. Attempt to click "Report as Resolved" button
3. Observe UI state

**Expected Results**:
- ✅ "Report as Resolved" button is hidden (report already exists)
- ✅ Only "Resolution History" and confirmation buttons visible
- ✅ If attempted via API, returns 400 error: "Resolution report already exists for this hazard"

**API Test** (optional):
```bash
curl -X POST https://your-project.supabase.co/rest/v1/api/hazards/<hazard_id>/resolve \
  -H "Authorization: Bearer USER_C_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution_note": "Duplicate report attempt", "evidence_url": null}'
# Should return 400 Bad Request
```

---

#### Test 2.3.3: Hazard Owner Cannot Submit Resolution Report
**Objective**: Verify owners cannot report their own hazards as resolved

**Prerequisites**:
- User A: Created user-resolvable hazard

**Steps**:
1. User A: Navigate to own hazard detail page
2. Observe "Resolution" section

**Expected Results**:
- ✅ "Report as Resolved" button is disabled or hidden
- ✅ Message displayed: "You cannot report your own hazard as resolved"
- ✅ If attempted via API, returns 403 error

---

#### Test 2.3.4: Confirm Resolution (Vote Yes)
**Objective**: Verify users can confirm resolution report

**Prerequisites**:
- Resolution report exists (Test 2.3.1)
- User C logged in (not reporter, not hazard owner)

**Steps**:
1. User C: Navigate to hazard with resolution report
2. Locate "Resolution Confirmation" section with two buttons:
   - "Yes, Resolved" (green)
   - "No, Still There" (red)
3. Click "Yes, Resolved"
4. Observe page updates

**Expected Results**:
- ✅ Success feedback
- ✅ Database: Row inserted in `hazard_resolution_confirmations`:
  - `hazard_id` = hazard ID
  - `user_id` = User C's ID
  - `confirmation_type` = 'confirmed'
- ✅ Resolution History shows:
  - Confirmed count: 1
  - Progress bar: Green section at 33% (1 out of 3 threshold)
  - Status message: "Needs 2 more confirmations to auto-resolve"
- ✅ "Yes, Resolved" button shows active state (green highlight)
- ✅ Audit log records confirmation

**Database Verification**:
```sql
SELECT confirmation_type, user_id 
FROM hazard_resolution_confirmations
WHERE hazard_id = '<hazard_id>';
-- Should have 1 row with confirmation_type='confirmed'

SELECT * FROM expiration_audit_log
WHERE hazard_id = '<hazard_id>' 
  AND action_type = 'confirmation_added';
```

---

#### Test 2.3.5: Dispute Resolution (Vote No)
**Objective**: Verify users can dispute resolution report

**Prerequisites**:
- Resolution report exists with 1 confirmation (Test 2.3.4)
- User D logged in (different from reporter and previous confirmer)

**Steps**:
1. User D: Navigate to hazard
2. Click "No, Still There" (red button)
3. Observe updates

**Expected Results**:
- ✅ Database: Row inserted with `confirmation_type='disputed'`
- ✅ Resolution History shows:
  - Confirmed count: 1
  - Disputed count: 1
  - Progress bar: Green 50%, Red 50%
  - Status message: "Disputed: More users report the hazard is still present"
- ✅ "No, Still There" button shows active state (red highlight)
- ✅ Audit log records dispute

---

#### Test 2.3.6: Change Confirmation Vote
**Objective**: Verify users can change their confirmation vote

**Prerequisites**:
- User C has confirmed resolution (Test 2.3.4)

**Steps**:
1. User C: Navigate to same hazard
2. Currently "Yes, Resolved" button is highlighted
3. Click "No, Still There" button
4. Observe updates

**Expected Results**:
- ✅ Database: Same row updated (not new row):
  - `confirmation_type` changed to 'disputed'
  - `updated_at` timestamp updated
  - `note` preserved or cleared
- ✅ Resolution History shows:
  - Confirmed count: 0 (decremented)
  - Disputed count: 2 (incremented)
  - Progress bar updates to show more red
- ✅ Button states swap: "No, Still There" now active
- ✅ Audit log records vote change

**Database Verification**:
```sql
SELECT COUNT(*) FROM hazard_resolution_confirmations
WHERE hazard_id = '<hazard_id>' AND user_id = '<user_c_id>';
-- Should still be 1 row (not 2)

SELECT confirmation_type, updated_at 
FROM hazard_resolution_confirmations
WHERE hazard_id = '<hazard_id>' AND user_id = '<user_c_id>';
-- confirmation_type should be 'disputed', updated_at should be recent
```

---

#### Test 2.3.7: Remove Confirmation Vote
**Objective**: Verify users can remove their confirmation entirely

**Prerequisites**:
- User has an active confirmation (confirmed or disputed)

**Steps**:
1. Navigate to hazard with own confirmation
2. Observe small "Remove" or "×" button near active confirmation button
3. Click remove button
4. Observe updates

**Expected Results**:
- ✅ Database: Row deleted from `hazard_resolution_confirmations`
- ✅ Confirmation count decrements by 1
- ✅ Both buttons return to inactive state
- ✅ User can re-confirm later
- ✅ Audit log records removal

**Database Verification**:
```sql
SELECT COUNT(*) FROM hazard_resolution_confirmations
WHERE hazard_id = '<hazard_id>' AND user_id = '<user_id>';
-- Should be 0 after removal
```

---

#### Test 2.3.8: Auto-Resolution at Threshold (3 Confirmations)
**Objective**: Verify hazard auto-resolves when confirmed ≥ 3 AND confirmed > disputed

**Prerequisites**:
- Hazard has resolution report
- 2 users have confirmed (Test 2.3.4, plus one more)

**Steps**:
1. User E: Navigate to hazard
2. Click "Yes, Resolved" (3rd confirmation)
3. Observe immediate updates

**Expected Results**:
- ✅ Database trigger fires: `check_resolution_threshold()`
- ✅ Hazard record updated:
  - `resolved_at` = current timestamp
  - `resolved_by` = reporter's user_id
  - `status` may change to 'resolved' (if status field used for this)
- ✅ Hazard detail page shows:
  - Green "Resolved" badge
  - Resolution note displayed prominently
  - Timestamp: "Resolved 2 minutes ago"
  - No more confirmation buttons (voting closed)
  - Resolution History still visible (read-only)
- ✅ Audit log records auto-resolution
- ✅ Confirmation counts show final tally: 3 confirmed, 0 disputed

**Database Verification**:
```sql
SELECT resolved_at, resolved_by, resolution_note 
FROM hazards 
WHERE id = '<hazard_id>';
-- resolved_at should be NOT NULL with recent timestamp

SELECT COUNT(*) FROM hazard_resolution_confirmations
WHERE hazard_id = '<hazard_id>' AND confirmation_type = 'confirmed';
-- Should be 3

SELECT * FROM expiration_audit_log
WHERE hazard_id = '<hazard_id>' 
  AND action_type = 'auto_resolved';
```

---

#### Test 2.3.9: No Auto-Resolution When Disputed > Confirmed
**Objective**: Verify hazard does NOT auto-resolve if disputes outweigh confirmations

**Prerequisites**:
- New user-resolvable hazard with resolution report
- 2 users confirmed, 3 users disputed (5 total votes)

**Steps**:
1. Setup: Get 2 confirmations, 3 disputes
2. Add 6th confirmation (bringing it to 3 confirmed, 3 disputed - tie)
3. Observe no auto-resolution (requires confirmed > disputed)
4. Add 7th confirmation (4 confirmed, 3 disputed)
5. Now check for auto-resolution

**Expected Results**:
- ✅ At 3 confirmed, 3 disputed: NO auto-resolution (trigger doesn't fire)
- ✅ At 4 confirmed, 3 disputed: YES auto-resolution (confirmed > disputed AND confirmed ≥ 3)
- ✅ Trigger logic validated: both conditions required

**Database Trigger Logic**:
```sql
-- Trigger should only resolve when:
-- confirmed_count >= confirmation_threshold (3) 
-- AND confirmed_count > disputed_count
```

---

#### Test 2.3.10: Resolution Report Update (Own Report Only)
**Objective**: Verify reporter can update their resolution report

**Prerequisites**:
- User B submitted resolution report (Test 2.3.1)
- Hazard not yet resolved

**Steps**:
1. User B: Navigate to hazard with own report
2. Click "Edit Report" button (if UI provides this)
3. Update `resolution_note` to: "Update: I revisited at 5pm, still confirmed resolved."
4. Submit update

**Expected Results**:
- ✅ Database: Same row updated (not new row)
- ✅ `resolution_note` replaced with new text
- ✅ `evidence_url` can be updated
- ✅ Resolution History shows updated note
- ✅ Other users' confirmations remain unchanged
- ✅ Audit log records update

**API Endpoint**: `PATCH /api/hazards/[id]/resolve`

**Permissions**:
- ✅ Only reporter can update (ownership check)
- ✅ Cannot update after hazard resolved

---

### Test Suite 2.4: Seasonal Hazard Behavior

#### Test 2.4.1: Seasonal Hazard Active During Season
**Objective**: Verify seasonal hazard shows as active during configured months

**Prerequisites**:
- Seasonal hazard with active months including current month (e.g., May-September, tested in July)

**Steps**:
1. Create seasonal hazard in Test 2.1.4 or use existing
2. Ensure current date is within active months
3. Navigate to hazard detail page
4. Call expiration status API

**Expected Results**:
- ✅ Status badge: Green "Active"
- ✅ Seasonal badge: "Active: May - September" (shows month ranges)
- ✅ API returns `status='active'`
- ✅ Hazard visible in map and lists
- ✅ Users can interact normally (vote, report resolution, etc.)

**Database Helper Function**:
```sql
SELECT public.get_hazard_expiration_status('<hazard_id>'::UUID);
-- Should return 'active' if current month in seasonal_pattern->active_months
```

---

#### Test 2.4.2: Seasonal Hazard Dormant Outside Season
**Objective**: Verify seasonal hazard shows as dormant outside configured months

**Prerequisites**:
- Seasonal hazard with active months NOT including current month (e.g., May-September, tested in January)

**Steps**:
1. If testing outside active season, use existing hazard
2. If testing inside season, modify database to change active_months:
   ```sql
   UPDATE hazards 
   SET seasonal_pattern = '{"active_months": [12, 1, 2]}'::jsonb
   WHERE id = '<hazard_id>';
   -- This makes it active only Dec-Feb
   ```
3. Navigate to hazard detail page (in March)
4. Call expiration status API

**Expected Results**:
- ✅ Status badge: Blue "Dormant"
- ✅ Seasonal badge: "Active: December - February" (gray text)
- ✅ Message: "This hazard is currently dormant and will become active during its season"
- ✅ API returns `status='dormant'`
- ✅ Hazard may be hidden from main map or shown with dormant indicator
- ✅ Users may have limited interactions (read-only)

**Database Verification**:
```sql
SELECT public.get_hazard_expiration_status('<hazard_id>'::UUID);
-- Should return 'dormant' if current month NOT in active_months
```

---

#### Test 2.4.3: Seasonal Transition (Month Change)
**Objective**: Verify seasonal hazard automatically transitions between active/dormant

**Prerequisites**:
- Seasonal hazard with transition happening (e.g., active_months [5,6,7,8,9], test on September 30th and October 1st)

**Manual Test** (requires date change):
1. Create seasonal hazard with current month as last active month (e.g., September in May-September range)
2. Wait until midnight when month changes (or manually adjust system date if testing environment allows)
3. Navigate to hazard detail page after month change
4. Observe status change from "Active" to "Dormant"

**Expected Results**:
- ✅ Status automatically updates (no migration needed)
- ✅ Database helper function returns correct status based on current date
- ✅ No manual updates required (purely calculated)

**Automated Test** (if possible):
- Use database function with mocked date parameter
- Or: Use time-travel queries in PostgreSQL

---

### Test Suite 2.5: Expiration Edge Cases & Security

#### Test 2.5.1: Expired Hazard Cannot Be Extended
**Objective**: Verify expired hazards cannot be extended

**Prerequisites**:
- Auto-expire hazard with `expires_at` in the past (expired)

**Steps**:
1. Navigate to expired hazard as owner
2. Observe "Extend Expiration" button state
3. Attempt to extend via API if button hidden

**Expected Results**:
- ✅ "Extend Expiration" button is hidden or disabled
- ✅ API returns 400 error: "Cannot extend expired hazard"
- ✅ UI shows "Expired" status prominently

---

#### Test 2.5.2: Cannot Confirm Own Resolution Report
**Objective**: Verify reporters cannot confirm their own resolution

**Prerequisites**:
- User B submitted resolution report

**Steps**:
1. User B: Navigate to hazard with own report
2. Observe confirmation buttons

**Expected Results**:
- ✅ Confirmation buttons ("Yes, Resolved" / "No, Still There") are hidden or disabled
- ✅ Message: "You cannot confirm your own resolution report"
- ✅ API returns 403 error if attempted

---

#### Test 2.5.3: Cannot Confirm Resolution of Own Hazard
**Objective**: Verify hazard owners cannot confirm resolutions of their hazards

**Prerequisites**:
- User A: Created hazard
- User B: Submitted resolution report

**Steps**:
1. User A (owner): Navigate to own hazard with resolution report
2. Observe confirmation buttons

**Expected Results**:
- ✅ Confirmation buttons hidden/disabled
- ✅ Message: "You cannot confirm resolution of your own hazard"
- ✅ API returns 403 error if attempted

---

#### Test 2.5.4: Resolution Note Validation (10-1000 chars)
**Objective**: Verify resolution note length requirements

**Prerequisites**:
- User attempting to submit resolution report

**Steps**:
1. Navigate to report form
2. Enter note with <10 characters (e.g., "Fixed")
3. Attempt submit
4. Observe validation error
5. Enter note with >1000 characters (long paragraph)
6. Attempt submit
7. Observe validation error

**Expected Results**:
- ✅ Client-side validation prevents submit with <10 chars
- ✅ Error message: "Resolution note must be at least 10 characters"
- ✅ Client-side validation prevents submit with >1000 chars
- ✅ Error message: "Resolution note cannot exceed 1000 characters"
- ✅ Character counter shows red when out of range
- ✅ API also validates (returns 400 if client validation bypassed)

---

#### Test 2.5.5: Invalid Expiration Type Rejected
**Objective**: Verify database function rejects invalid expiration types

**Prerequisites**:
- Access to database or API

**Steps**:
1. Attempt to create hazard with invalid `expiration_type`
2. Use database function or API endpoint

**SQL Test**:
```sql
SELECT public.create_hazard(
  p_title := 'Test Hazard',
  p_description := 'Testing invalid expiration type',
  p_category_id := '<valid_category_id>'::UUID,
  p_latitude := 40.7128,
  p_longitude := -74.0060,
  p_severity_level := 3,
  p_expiration_type := 'invalid_type' -- Invalid
);
```

**Expected Results**:
- ✅ Function returns error JSON:
  ```json
  {
    "success": false,
    "error_message": "Invalid expiration_type. Must be one of: auto_expire, user_resolvable, permanent, seasonal",
    "error_code": "INVALID_EXPIRATION_TYPE"
  }
  ```
- ✅ No hazard created in database
- ✅ Transaction rolled back

---

### Test Suite 2.6: Audit Logging

#### Test 2.6.1: All Expiration Actions Logged
**Objective**: Verify comprehensive audit trail for all expiration-related actions

**Prerequisites**:
- Perform various expiration actions (extend, resolve, confirm, dispute)

**Steps**:
1. Create auto-expire hazard
2. Extend expiration
3. Submit resolution report (user-resolvable)
4. Add confirmations and disputes
5. Auto-resolve hazard
6. Query audit log

**Expected Results**:
- ✅ Each action has corresponding audit log entry with:
  - `action_type`: 'extended', 'resolution_reported', 'confirmation_added', 'confirmation_removed', 'confirmation_changed', 'auto_resolved'
  - `action_by`: Correct user_id
  - `action_details`: JSON with relevant info (e.g., hours extended, vote type)
  - `created_at`: Accurate timestamps
- ✅ Logs are append-only (no UPDATE or DELETE)
- ✅ Full audit trail reconstructable

**Database Query**:
```sql
SELECT 
  action_type,
  action_by,
  action_details,
  created_at
FROM expiration_audit_log
WHERE hazard_id = '<test_hazard_id>'
ORDER BY created_at ASC;
-- Should show chronological history of all actions
```

---

---

## PART 3: Integration & End-to-End Tests

### Test Suite 3.1: Full User Journey - Auto-Expire Hazard

**Scenario**: User reports temporary thunderstorm hazard, extends it, then it expires

**Steps**:
1. User A: Create auto-expire hazard (category: thunderstorm, 6 hours)
2. Verify hazard appears on map with active status
3. User A: Extend expiration after 2 hours (+24h)
4. Verify extended_count = 1
5. Wait or manually set expiration to past
6. Verify hazard shows as expired on map/list
7. Verify expired hazard cannot be extended again

**Expected Results**:
- ✅ Complete lifecycle works smoothly
- ✅ Map markers update with status changes
- ✅ All database fields updated correctly
- ✅ Audit log has 2 entries (creation + extension)

---

### Test Suite 3.2: Full User Journey - User-Resolvable Hazard

**Scenario**: User reports road closure, community confirms resolution

**Steps**:
1. User A: Create user-resolvable hazard (category: road_closure)
2. Hazard appears on map with active status
3. User B: Submit resolution report with evidence photo
4. User C: Confirm resolution (1/3)
5. User D: Confirm resolution (2/3)
6. User E: Confirm resolution (3/3) → Auto-resolve
7. Verify hazard shows as resolved on map
8. Verify resolved hazard no longer accepts new confirmations

**Expected Results**:
- ✅ Complete resolution workflow functions
- ✅ Auto-resolution triggers at threshold
- ✅ All confirmation votes counted correctly
- ✅ Resolution note and timestamp displayed
- ✅ Voting closed after resolution

---

### Test Suite 3.3: Full User Journey - Seasonal Hazard

**Scenario**: User reports bee activity seasonal hazard (May-September)

**Steps**:
1. User A: Create seasonal hazard (May-September) during active month (e.g., July)
2. Verify hazard shows "Active" status
3. Manually change system date to October (or update database active_months)
4. Verify hazard shows "Dormant" status
5. Verify hazard behavior differs (hidden from map, or shown with dormant badge)
6. Change date back to active month
7. Verify hazard becomes active again

**Expected Results**:
- ✅ Seasonal transitions work automatically
- ✅ Status calculations accurate
- ✅ Map display updates appropriately

---

---

## PART 4: Performance & Scalability Tests

### Test 4.1: Large Number of Votes
**Objective**: Verify voting system handles high vote counts

**Steps**:
1. Simulate or create hazard with 100+ upvotes and downvotes
2. Add new vote
3. Measure response time

**Expected Results**:
- ✅ Vote submission completes <2 seconds
- ✅ Database indexes used (check EXPLAIN ANALYZE)
- ✅ No performance degradation

---

### Test 4.2: Large Number of Confirmations
**Objective**: Verify resolution system handles many confirmations

**Steps**:
1. Create user-resolvable hazard
2. Submit resolution report
3. Add 50+ confirmations (mix of confirmed/disputed)
4. Measure page load time

**Expected Results**:
- ✅ Page loads <3 seconds
- ✅ Progress bar calculates correctly
- ✅ All votes displayed accurately

---

### Test 4.3: Concurrent Extensions
**Objective**: Verify race conditions handled for simultaneous extensions

**Steps**:
1. Two users (or simulated concurrent requests) attempt to extend same hazard simultaneously
2. Use testing tool to send parallel API requests

**Expected Results**:
- ✅ Both extensions succeed (not conflicting)
- ✅ `extended_count` increments by 2
- ✅ Both audit log entries recorded
- ✅ No deadlocks or lost updates

---

---

## PART 5: Database Integrity Tests

### Test 5.1: RLS Policies Enforced
**Objective**: Verify Row Level Security policies prevent unauthorized access

**Prerequisites**:
- Two users with different accounts

**Steps**:
1. User A: Create hazard and vote on it (should fail)
2. User B: Attempt to update User A's vote record via SQL
3. Verify RLS blocks unauthorized operations

**Expected Results**:
- ✅ Users cannot modify others' votes
- ✅ Users cannot modify others' resolution confirmations
- ✅ RLS policies allow read access but restrict write access appropriately

---

### Test 5.2: Foreign Key Constraints
**Objective**: Verify referential integrity enforced

**Steps**:
1. Attempt to insert vote with non-existent hazard_id
2. Attempt to insert confirmation with non-existent hazard_id
3. Attempt to delete hazard with existing votes

**Expected Results**:
- ✅ Invalid foreign keys rejected
- ✅ Cascade deletes work if configured (or prevent delete)
- ✅ Database maintains consistency

---

### Test 5.3: Unique Constraints
**Objective**: Verify all unique constraints enforced

**Constraints to test**:
1. `hazard_votes (user_id, hazard_id)` - one vote per user per hazard
2. `hazard_resolution_reports (hazard_id)` - one report per hazard
3. `hazard_resolution_confirmations (user_id, hazard_id)` - one confirmation per user per hazard

**Expected Results**:
- ✅ All duplicate attempts rejected with unique constraint violations

---

---

## PART 6: Remaining Features Tests (Not Yet Implemented)

### Test Suite 6.1: Admin Expiration Settings Interface
**Status**: ⏳ Pending Implementation (Task 8)

**Future Tests**:
- Admin can view all category expiration settings
- Admin can edit default_expiration_type per category
- Admin can modify auto_expire_duration
- Admin can adjust confirmation_threshold
- Settings changes reflect in hazard creation form
- Non-admin users cannot access admin settings

---

### Test Suite 6.2: Anonymous Posting Setting
**Status**: ⏳ Pending Implementation (Task 9)

**Future Tests**:
- User can enable/disable anonymous posting in profile settings
- When enabled, hazard creation shows "Anonymous" instead of email
- When enabled, resolution reports show "Anonymous"
- Votes always anonymous (already implemented)
- Database stores actual user_id for moderation (privacy preserved for public view)

---

---

## Test Execution Summary

### Priority Levels

**P0 - Critical (Must Test Before Production)**:
- ✅ Test 1.1.1: Upvote hazard
- ✅ Test 1.1.2: Downvote hazard
- ✅ Test 1.2.1: Cannot vote on own hazard
- ✅ Test 2.1.1: Create auto-expire hazard
- ✅ Test 2.1.2: Create user-resolvable hazard
- ✅ Test 2.2.1: Extend expiration
- ✅ Test 2.3.1: Submit resolution report
- ✅ Test 2.3.4: Confirm resolution
- ✅ Test 2.3.8: Auto-resolution at threshold

**P1 - High (Should Test Soon)**:
- Test 1.1.3: Change vote
- Test 1.1.4: Remove vote
- Test 1.2.2: Unauthenticated cannot vote
- Test 2.1.3: Create permanent hazard
- Test 2.1.4: Create seasonal hazard
- Test 2.2.2: Multiple extensions
- Test 2.3.5: Dispute resolution
- Test 2.3.6: Change confirmation vote
- Test 2.4.1: Seasonal active during season

**P2 - Medium (Test When Time Permits)**:
- Test 1.2.3: One vote per user constraint
- Test 2.2.3: Moderator can extend
- Test 2.2.4: Expiration warning display
- Test 2.3.2: Cannot submit duplicate report
- Test 2.3.9: No auto-resolution when disputed
- Test 2.4.2: Seasonal dormant outside season

**P3 - Low (Nice to Have)**:
- Test 1.3.1: Votes persist across sessions
- Test 2.2.5: Hazard status after expiration
- Test 2.3.10: Resolution report update
- Test 2.5.4: Resolution note validation
- Test 4.1-4.3: Performance tests
- Test 5.1-5.3: Database integrity tests

---

## Test Environment Checklist

Before beginning tests, ensure:
- [ ] Local development environment running
- [ ] Supabase project accessible
- [ ] All migrations applied (verify with `mcp_supabase_list_migrations`)
- [ ] At least 3 test user accounts created
- [ ] Test hazards in various categories exist
- [ ] Database has expiration_settings with defaults loaded
- [ ] Browser developer tools open (for inspecting network requests)
- [ ] Supabase dashboard open (for database verification queries)

---

## Bug Reporting Template

When bugs are found during testing:

**Bug Title**: [Component] Brief description

**Severity**: Critical / High / Medium / Low

**Test Case**: Reference test number (e.g., Test 2.3.4)

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. ...

**Expected Result**: What should happen

**Actual Result**: What actually happened

**Screenshots/Logs**: Attach relevant evidence

**Database State**: Include relevant query results

**Environment**:
- Browser: Chrome/Firefox/Safari version
- OS: Windows/Mac/Linux
- Supabase Project: Development/Staging

---

## Testing Progress Tracker

Use this checklist to track testing progress:

### Voting System
- [ ] Test 1.1.1: Upvote hazard
- [ ] Test 1.1.2: Downvote hazard
- [ ] Test 1.1.3: Change vote
- [ ] Test 1.1.4: Remove vote
- [ ] Test 1.2.1: Cannot vote on own hazard
- [ ] Test 1.2.2: Unauthenticated cannot vote
- [ ] Test 1.2.3: One vote per user
- [ ] Test 1.3.1: Votes persist
- [ ] Test 1.3.2: Real-time updates

### Auto-Expire Hazards
- [ ] Test 2.1.1: Create auto-expire hazard
- [ ] Test 2.2.1: Extend expiration
- [ ] Test 2.2.2: Multiple extensions
- [ ] Test 2.2.3: Moderator extend
- [ ] Test 2.2.4: Warning display
- [ ] Test 2.2.5: After expiration

### User-Resolvable Hazards
- [ ] Test 2.1.2: Create user-resolvable
- [ ] Test 2.3.1: Submit resolution
- [ ] Test 2.3.2: No duplicate report
- [ ] Test 2.3.3: Owner cannot report
- [ ] Test 2.3.4: Confirm resolution
- [ ] Test 2.3.5: Dispute resolution
- [ ] Test 2.3.6: Change confirmation
- [ ] Test 2.3.7: Remove confirmation
- [ ] Test 2.3.8: Auto-resolution
- [ ] Test 2.3.9: No auto-resolve when disputed
- [ ] Test 2.3.10: Update report

### Permanent & Seasonal Hazards
- [ ] Test 2.1.3: Create permanent
- [ ] Test 2.1.4: Create seasonal
- [ ] Test 2.4.1: Seasonal active
- [ ] Test 2.4.2: Seasonal dormant
- [ ] Test 2.4.3: Seasonal transition

### Security & Edge Cases
- [ ] Test 2.5.1: Expired cannot extend
- [ ] Test 2.5.2: Cannot confirm own report
- [ ] Test 2.5.3: Cannot confirm own hazard
- [ ] Test 2.5.4: Note validation
- [ ] Test 2.5.5: Invalid type rejected

### Integration Tests
- [ ] Test 3.1: Auto-expire journey
- [ ] Test 3.2: User-resolvable journey
- [ ] Test 3.3: Seasonal journey

### Performance & Integrity
- [ ] Test 4.1: Large number of votes
- [ ] Test 4.2: Large confirmations
- [ ] Test 4.3: Concurrent extensions
- [ ] Test 5.1: RLS policies
- [ ] Test 5.2: Foreign keys
- [ ] Test 5.3: Unique constraints

---

## Conclusion

This test plan covers all critical functionality of the Week 7 community features. Execute tests in priority order (P0 → P1 → P2 → P3) and report any bugs using the template provided.

**Estimated Testing Time**:
- P0 Tests: 2-3 hours
- P1 Tests: 2-3 hours
- P2 Tests: 2-3 hours
- P3 Tests: 1-2 hours
- **Total**: 7-11 hours for comprehensive testing

After completing testing, provide a summary report with:
1. Total tests executed
2. Pass/fail count
3. Critical bugs found
4. Recommendations for production readiness
