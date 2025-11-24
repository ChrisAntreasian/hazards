# Hazard Expiration Quick Test Guide

**Purpose:** Fast, practical testing for all hazard expiration features  
**Time Required:** 10-15 minutes total  
**Prerequisites:** Logged into app, have access to Supabase SQL Editor

---

## 🎯 Test Overview

This guide covers 7 test scenarios:
1. ✅ 30-second auto-expire countdown (watch it live!)
2. ✅ 2-minute auto-expire with lazy expiration
3. ✅ Already-expired hazard (instant resolve)
4. ✅ User-resolvable hazard with community confirmations
5. ✅ Extend expiration (add 24 hours)
6. ✅ Seasonal hazard (active/dormant status)
7. ✅ Permanent hazard (never expires)

---

## 📋 Pre-Test Setup

### Get Your IDs

Run these queries in Supabase SQL Editor to get the values you'll need:

```sql
-- 1. Get your user ID
SELECT id, email FROM auth.users WHERE email = 'your@email.com';
-- Copy the ID - you'll use this as [USER_ID]

-- 2. Get a category ID
SELECT id, name FROM hazard_categories LIMIT 5;
-- Pick any category ID - you'll use this as [CATEGORY_ID]
```

**Save these values** - you'll need them for all tests below.

---

## Test 1: 30-Second Countdown ⏱️ (Watch Live!)

**Goal:** See the expiration countdown timer update in real-time

### Step 1: Create Test Hazard

```sql
INSERT INTO hazards (
  user_id, 
  title, 
  description, 
  category_id,
  latitude, 
  longitude, 
  severity_level,
  expiration_type, 
  expires_at,
  status
) VALUES (
  '[USER_ID]',  -- Replace with your user ID
  '30-Second Test Countdown',
  'This hazard will expire in 30 seconds. Watch the countdown!',
  '[CATEGORY_ID]',  -- Replace with a category ID
  42.3601,  -- Boston coordinates
  -71.0589,
  3,
  'auto_expire',
  NOW() + INTERVAL '30 seconds',
  'approved'  -- Moderation status: approved to show on map
) RETURNING id, expires_at;
```

**Copy the returned `id`** - you'll visit this hazard.

### Step 2: Visit Hazard Detail Page

Open: `http://localhost:5173/hazards/[HAZARD_ID]`

### Step 3: Watch the Magic! ✨

**You should see:**
- ⏱️ Status badge: "Active"
- ⏱️ Countdown timer: "Expires in 30 seconds" (updates every second!)
- ⏱️ Green/yellow gradient as time runs out
- ⏱️ "Extend Expiration" button (if you're the owner)

**Wait 30 seconds and refresh the page:**
- ✅ Status badge changes to: "Resolved"
- ✅ Timer shows: "Expired [time] ago"
- ✅ "Extend" button disappears

### Step 4: Verify Database Update

```sql
SELECT 
  id, 
  title, 
  status,
  resolved_at,
  resolved_by,
  expires_at,
  expires_at < NOW() as is_expired
FROM hazards 
WHERE id = '[HAZARD_ID]';
```

**Expected:**
- `resolved_at` should now have a timestamp (when you refreshed the page)
- `resolved_by` should be NULL (system-triggered expiration)
- `is_expired` should be `true`

### Step 5: Check Map View

Visit: `http://localhost:5173/map`

**Expected:** Expired hazard should NOT appear on the map (filtered out)

### Step 6: Check Audit Log

```sql
SELECT * FROM expiration_audit_log 
WHERE hazard_id = '[HAZARD_ID]'
ORDER BY created_at DESC;
```

**Expected:** Entry showing when hazard was auto-resolved

---

## Test 2: 2-Minute Auto-Expire (Lazy Expiration) 🦥

**Goal:** Verify lazy expiration marks hazards as resolved when accessed

### Step 1: Create Already-Expired Hazard

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, expires_at, status
) VALUES (
  '[USER_ID]',
  '2-Minute Test (Already Expired)',
  'This hazard expired 1 hour ago but will be marked resolved when visited',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 3,
  'auto_expire',
  NOW() - INTERVAL '1 hour',  -- Already expired!
  'approved'  -- Moderation status: approved
) RETURNING id;
```

### Step 2: Check Database BEFORE Visiting

```sql
SELECT id, title, status, resolved_at, expires_at
FROM hazards WHERE id = '7d5f113b-8527-4efa-855a-44fd0f550cb4';
```

**Expected:**
- `status` = 'approved' (moderation status)
- `resolved_at` = NULL (not marked as resolved yet)

### Step 3: Visit Hazard Detail Page

Open: `http://localhost:5173/hazards/[HAZARD_ID]`

**You should see:**
- Status: "Resolved"
- Timer: "Expired 1 hour ago"
- Lazy expiration triggered!

### Step 4: Check Database AFTER Visiting

```sql
SELECT id, title, status, resolved_at, expires_at
FROM hazards WHERE id = '[HAZARD_ID]';
```

**Expected:**
- `resolved_at` now has a timestamp
- Database was updated by lazy expiration!

---

## Test 3: User-Resolvable Hazard 👥

**Goal:** Test community resolution confirmations

### Step 1: Create User-Resolvable Hazard

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, status
) VALUES (
  '[USER_ID]',
  'User-Resolvable Test: Fallen Tree',
  'Blocking trail, needs community confirmation when cleared',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 4,
  'user_resolvable',
  'approved'  -- Moderation status: approved
) RETURNING id;
```

### Step 2: Visit Hazard Page

Open: `http://localhost:5173/hazards/[HAZARD_ID]`

**You should see:**
- Status: "Active"
- "Submit Resolution Report" button
- No countdown timer (user-resolvable doesn't auto-expire)

### Step 3: Test Resolution Flow

**As the hazard owner:**
1. Click "Submit Resolution Report"
2. Add description: "Tree has been cleared by park service"
3. Optional: Add evidence URL
4. Submit

**As another user (login with different account):**
1. Visit same hazard
2. See "Resolution Report" section
3. Click "Confirm Resolution" button
4. Add another confirmation

### Step 4: Verify Confirmations

```sql
SELECT 
  hr.id,
  hr.title,
  COUNT(hrc.id) as confirmation_count,
  hr.status,
  hr.resolved_at
FROM hazards hr
LEFT JOIN hazard_resolution_confirmations hrc ON hr.id = hrc.hazard_id AND hrc.is_confirmed = true
WHERE hr.id = '[HAZARD_ID]'
GROUP BY hr.id, hr.title, hr.status, hr.resolved_at;
```

**Expected:**
- 1-2 confirmations recorded
- At 3 confirmations, hazard should auto-resolve (trigger fires)

**Note:** The trigger only fires when confirmations are **inserted via the UI or SQL INSERT**. Simply updating the hazard's `resolved_at` directly won't trigger the auto-resolution logic. You must actually insert confirmation records to test the trigger.

### Step 5: Manual Trigger Test (Optional)

If you want to test the trigger via SQL without using the UI:

```sql
-- Get additional user IDs for testing (need 3 different users)
SELECT id, email FROM auth.users LIMIT 5;

-- Insert confirmations one at a time
-- First confirmation
INSERT INTO hazard_resolution_confirmations (hazard_id, user_id, is_confirmed)
VALUES ('[HAZARD_ID]', '[USER_2_ID]', true);

-- Second confirmation  
INSERT INTO hazard_resolution_confirmations (hazard_id, user_id, is_confirmed)
VALUES ('[HAZARD_ID]', '[USER_3_ID]', true);

-- Third confirmation - trigger should fire and auto-resolve!
INSERT INTO hazard_resolution_confirmations (hazard_id, user_id, is_confirmed)
VALUES ('[HAZARD_ID]', '[USER_4_ID]', true);

-- Verify hazard is now resolved
SELECT id, title, resolved_at, resolved_by, resolution_note
FROM hazards WHERE id = '[HAZARD_ID]';
-- resolved_at should now have a timestamp
-- resolved_by should be NULL (community-resolved)
-- resolution_note should be 'Auto-resolved by community consensus'
```

---

## Test 4: Extend Expiration ⏰

**Goal:** Test extending auto-expire hazards

### Step 1: Create Short-Lived Hazard

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, expires_at, extended_count, status
) VALUES (
  '[USER_ID]',
  'Extend Test: 2-Minute Warning',
  'Test extending this hazard by 24 hours',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 3,
  'auto_expire',
  NOW() + INTERVAL '2 minutes',
  0,  -- Not extended yet
  'approved'  -- Moderation status: approved
) RETURNING id, expires_at;
```

**Copy the original `expires_at` timestamp.**

### Step 2: Visit and Extend

1. Open: `http://localhost:5173/hazards/[HAZARD_ID]`
2. You should see: "Expires in 2 minutes"
3. Click "Extend Expiration" button
4. Timer should update to "Expires in 24 hours, 2 minutes"

### Step 3: Verify Extension

```sql
SELECT 
  id,
  title,
  expires_at,
  extended_count,
  expires_at > NOW() + INTERVAL '23 hours' as extended_correctly
FROM hazards 
WHERE id = '[HAZARD_ID]';
```

**Expected:**
- `expires_at` is 24 hours later than original
- `extended_count` = 1
- `extended_correctly` = true

### Step 4: Test Multiple Extensions

1. Click "Extend Expiration" again
2. Timer updates again
3. Check database: `extended_count` = 2

**Optional:** Test extension limits (if implemented):
```sql
-- Set to max extensions (e.g., 3)
UPDATE hazards 
SET extended_count = 3
WHERE id = '[HAZARD_ID]';
```

Refresh page - "Extend" button should be disabled or hidden.

---

## Test 5: Seasonal Hazard 🍂

**Goal:** Test active/dormant seasonal behavior

### Step 1: Create Active Seasonal Hazard

```sql
-- Get current month
SELECT EXTRACT(MONTH FROM NOW()) as current_month;
-- Note: 1 = January, 6 = June, 12 = December

INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, seasonal_pattern, status
) VALUES (
  '[USER_ID]',
  'Seasonal Test: Summer Mosquitos',
  'Active during summer months only',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 3,
  'seasonal',
  '{"active_months": [5, 6, 7, 8, 9]}'::jsonb,  -- May-September
  'approved'  -- Moderation status: approved
) RETURNING id;
```

### Step 2: Visit During Active Season

**If current month is 5-9 (May-Sep):**
- Status badge: "Active" (green)
- Seasonal badge: "🍃 Active Season"
- Shows: "Active: May - September"

**If current month is NOT 5-9:**
- Status badge: "Dormant" (gray)
- Seasonal badge: "❄️ Dormant Season"
- Shows: "Dormant until May"

### Step 3: Test Month Transitions

```sql
-- Simulate different months by updating seasonal pattern
-- Make current month active
UPDATE hazards 
SET seasonal_pattern = jsonb_build_object(
  'active_months', 
  ARRAY[EXTRACT(MONTH FROM NOW())::int]
)
WHERE id = '[HAZARD_ID]';
```

Refresh page - should show "Active" now.

```sql
-- Make current month dormant (exclude it)
UPDATE hazards 
SET seasonal_pattern = jsonb_build_object(
  'active_months', 
  ARRAY[1, 2, 3]  -- Jan-Mar only
)
WHERE id = '[HAZARD_ID]';
```

Refresh page - should show "Dormant" now.

---

## Test 6: Permanent Hazard ♾️

**Goal:** Verify permanent hazards never expire

### Step 1: Create Permanent Hazard

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, expires_at, status
) VALUES (
  '[USER_ID]',
  'Permanent Test: Steep Cliff',
  'Geological hazard that will never expire',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 5,
  'permanent',
  NULL,  -- No expiration!
  'approved'  -- Moderation status: approved
) RETURNING id;
```

### Step 2: Visit Hazard Page

Open: `http://localhost:5173/hazards/[HAZARD_ID]`

**You should see:**
- Status: "Active"
- Badge: "♾️ Permanent"
- NO countdown timer
- NO expiration date
- NO extend button

### Step 3: Verify Filtering

Visit map: `http://localhost:5173/map`

**Expected:** Permanent hazard ALWAYS appears (never filtered out)

### Step 4: Verify Database

```sql
SELECT 
  id,
  title,
  expiration_type,
  expires_at,
  expires_at IS NULL as is_permanent
FROM hazards 
WHERE id = '[HAZARD_ID]';
```

**Expected:**
- `expires_at` = NULL
- `is_permanent` = true

---

## Test 7: Map Filtering 🗺️

**Goal:** Verify expired hazards don't appear on map

### Step 1: Create Mixed Hazards

```sql
-- Create 4 hazards: 2 active, 2 expired
INSERT INTO hazards (user_id, title, category_id, latitude, longitude, severity_level, expiration_type, expires_at, status, resolved_at)
VALUES 
  -- Active #1
  ('[USER_ID]', 'Map Test Active 1', '[CATEGORY_ID]', 42.3601, -71.0589, 3, 'auto_expire', NOW() + INTERVAL '1 hour', 'approved', NULL),
  -- Active #2
  ('[USER_ID]', 'Map Test Active 2', '[CATEGORY_ID]', 42.3602, -71.0590, 3, 'permanent', NULL, 'approved', NULL),
  -- Expired #1 (not yet marked as resolved)
  ('[USER_ID]', 'Map Test Expired 1', '[CATEGORY_ID]', 42.3603, -71.0591, 3, 'auto_expire', NOW() - INTERVAL '1 hour', 'approved', NULL),
  -- Expired #2 (marked as resolved)
  ('[USER_ID]', 'Map Test Expired 2', '[CATEGORY_ID]', 42.3604, -71.0592, 3, 'auto_expire', NOW() - INTERVAL '2 hours', 'approved', NOW() - INTERVAL '1 hour')
RETURNING id, title, expires_at, status, resolved_at;
```

### Step 2: Visit Map

Open: `http://localhost:5173/map`

Zoom to Boston area (coordinates: 42.36, -71.06)

**Expected:**
- ✅ "Map Test Active 1" appears (active, not expired)
- ✅ "Map Test Active 2" appears (permanent)
- ❌ "Map Test Expired 1" does NOT appear (filtered by `filterExpiredHazards()`)
- ❌ "Map Test Expired 2" does NOT appear (resolved_at is set)

**Result:** Only 2 markers should be visible

### Step 3: Verify Filtering Logic

Check browser console - should see:
```
Loaded X hazards, Y active after filtering
```

### Step 4: Test Lazy Expiration on Map

1. Visit "Map Test Expired 1" detail page directly
2. Lazy expiration marks it as resolved
3. Return to map
4. Verify it's still filtered out

---

## 🧹 Test Cleanup

After testing, clean up test hazards:

```sql
-- Delete test hazards (adjust titles as needed)
DELETE FROM hazards 
WHERE title LIKE '%Test%' 
  OR title LIKE 'Map Test%'
  OR title LIKE '30-Second%'
  OR title LIKE '2-Minute%';

-- Verify deletion
SELECT COUNT(*) FROM hazards WHERE title LIKE '%Test%';
-- Should return 0
```

---

## ✅ Test Checklist

Use this checklist to track your testing progress:

- [ ] **Test 1:** 30-second countdown visible and updates in real-time
- [ ] **Test 1:** Status changes to "Resolved" after expiration
- [ ] **Test 1:** Expired hazard doesn't appear on map
- [ ] **Test 2:** Lazy expiration marks expired hazard when visited
- [ ] **Test 2:** Audit log entry created
- [ ] **Test 3:** Can submit resolution report
- [ ] **Test 3:** Can confirm resolution (multiple users)
- [ ] **Test 3:** Auto-resolves at 3 confirmations
- [ ] **Test 4:** Can extend expiration by 24 hours
- [ ] **Test 4:** Extended count increments correctly
- [ ] **Test 4:** Extension limit enforced (if implemented)
- [ ] **Test 5:** Seasonal hazard shows "Active" during active months
- [ ] **Test 5:** Seasonal hazard shows "Dormant" outside active months
- [ ] **Test 6:** Permanent hazard never expires
- [ ] **Test 6:** Permanent hazard always appears on map
- [ ] **Test 7:** Map filters expired hazards correctly
- [ ] **Test 7:** Lazy expiration works from map view

---

## 🐛 Troubleshooting

### "Countdown timer not updating"
- Check browser console for JavaScript errors
- Verify TimeRemaining component is imported
- Check that `expires_at` is properly loaded from server

### "Expired hazard still showing on map"
- Verify `filterExpiredHazards()` is called in map page server
- Check that `expires_at` field is included in SELECT query
- Clear browser cache and refresh

### "Extend button not working"
- Verify you're logged in as the hazard owner
- Check browser console for API errors
- Verify `extended_count` column exists in database

### "Lazy expiration not triggering"
- Check that `expireHazardIfNeeded()` is called in page server
- Verify Supabase client has write permissions
- Check server logs for errors

### "Seasonal status not showing correctly"
- Verify `seasonal_pattern` column contains valid JSON
- Check that `active_months` array includes current month
- Confirm SeasonalBadge component is rendering

---

## 📊 Expected Results Summary

| Test | Expected Duration | Pass Criteria |
|------|-------------------|---------------|
| 1. 30-Second Countdown | 1 min | Timer updates every second, resolves after 30s |
| 2. Lazy Expiration | 30 sec | Expired hazard marked resolved when visited |
| 3. User-Resolvable | 2 min | Can submit/confirm, auto-resolves at 3 confirmations |
| 4. Extend Expiration | 1 min | Adds 24h, increments counter, updates timer |
| 5. Seasonal Hazard | 1 min | Shows active/dormant based on current month |
| 6. Permanent Hazard | 30 sec | Never expires, always visible |
| 7. Map Filtering | 1 min | Only active/non-expired hazards shown |

**Total Testing Time:** 10-15 minutes

---

## 🎉 Success Criteria

**Your expiration system is working correctly if:**
1. ✅ Countdown timers update in real-time
2. ✅ Hazards auto-resolve when expired
3. ✅ Lazy expiration marks hazards when accessed
4. ✅ Map filters out expired hazards
5. ✅ Extensions add 24 hours and increment counter
6. ✅ User-resolvable hazards need community confirmations
7. ✅ Seasonal hazards show active/dormant correctly
8. ✅ Permanent hazards never expire
9. ✅ Audit log records all expiration events

**If all tests pass:** Your expiration system is production-ready! 🚀

---

## 📝 Notes

- **Database timestamps:** All times are in UTC
- **Test accounts:** Create 2-3 test accounts to test multi-user confirmations
- **Browser cache:** Clear cache if components don't update properly
- **Development mode:** Hot reload may interfere with countdown timers - refresh page if needed

---

**Happy Testing!** 🧪✨
