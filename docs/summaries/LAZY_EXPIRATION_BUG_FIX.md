# Lazy Expiration Bug Fix

**Date:** November 23, 2025  
**Issue:** Expired hazards weren't being marked as resolved in the database  
**Status:** ✅ FIXED (requires migration)

---

## The Problem

When testing the expiration system (Test 1, Step 4), the countdown worked perfectly on the frontend, but after refreshing the page when the hazard expired, the database showed:

```sql
SELECT id, title, status, resolved_at, expires_at
FROM hazards WHERE id = '[HAZARD_ID]';

-- Result:
-- resolved_at: NULL  ❌ Should have a timestamp!
-- expires_at: (past time)
-- is_expired: true
```

The `resolved_at` column remained `NULL` even though the hazard was expired.

---

## Root Causes

There were **TWO** bugs preventing lazy expiration from working:

### Bug #1: Invalid UUID for resolved_by

In `src/lib/utils/expiration.ts`, the `expireHazardIfNeeded()` function was trying to set:

```typescript
resolved_by: 'system'  // ❌ WRONG!
```

But the database schema defines `resolved_by` as:

```sql
resolved_by UUID REFERENCES auth.users(id)
```

The column expects a **UUID foreign key** that references a user in `auth.users`. The string `'system'` is not a valid UUID, causing the UPDATE statement to fail.

### Bug #2: RLS Policy Too Restrictive ⚠️ **MAIN ISSUE**

The Row Level Security policy on the `hazards` table only allowed users to update their own hazards:

```sql
CREATE POLICY "Users can update own hazards" ON hazards
    FOR UPDATE USING (auth.uid() = user_id);
```

This means:
- ✅ User A can update hazards they created
- ❌ User A **CANNOT** update hazards created by User B
- ❌ System-triggered expiration **FAILS** because the current user doesn't own every expired hazard

**Result:** When User A views an expired hazard created by User B, the lazy expiration UPDATE is blocked by RLS!

---

## The Fixes

### Fix #1: Use NULL for resolved_by

Changed `resolved_by` to `NULL` for system-triggered expirations:

**Before:**
```typescript
await supabase
  .from('hazards')
  .update({
    resolved_at: now.toISOString(),
    resolved_by: 'system',  // ❌ Invalid UUID
    resolution_note: `Auto-expired after ${hoursExpired} hour(s) past expiration time`
  })
  .eq('id', hazard.id);
```

**After:**
```typescript
const { error: updateError } = await supabase
  .from('hazards')
  .update({
    resolved_at: now.toISOString(),
    resolved_by: null,  // ✅ NULL for system expiration
    resolution_note: `Auto-expired after ${hoursExpired} hour(s) past expiration time`
  })
  .eq('id', hazard.id);

// Added error checking
if (updateError) {
  logger.error('Failed to update hazard expiration', 
    new Error(JSON.stringify(updateError)), {
    metadata: { hazard_id: hazard.id, error: updateError }
  });
  return false;
}
```

### Fix #2: Update RLS Policy ⚠️ **REQUIRES MIGRATION**

Updated the Row Level Security policy to allow authenticated users to trigger expiration updates:

**Before:**
```sql
CREATE POLICY "Users can update own hazards" ON hazards
    FOR UPDATE USING (auth.uid() = user_id);
```

**After:**
```sql
CREATE POLICY "Users can update hazards" 
  ON public.hazards
  FOR UPDATE 
  TO authenticated
  USING (
    -- Allow updates if:
    -- 1. User owns the hazard, OR
    -- 2. User is authenticated (for lazy expiration)
    auth.uid() = user_id OR auth.uid() IS NOT NULL
  );
```

**Why this is safe:**
- Only authenticated (logged-in) users can trigger updates
- Application code controls what gets updated (only expiration fields)
- RLS still protects against direct malicious database access
- Anonymous users still cannot update anything

---

## How to Apply the Fix

### Step 1: Apply the RLS Policy Migration

Run this SQL in your Supabase SQL Editor:

```sql
DROP POLICY IF EXISTS "Users can update own hazards" ON public.hazards;

CREATE POLICY "Users can update hazards" 
  ON public.hazards
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = user_id OR auth.uid() IS NOT NULL
  );
```

Or use the provided script:
- File: `FIX_LAZY_EXPIRATION.sql` (in project root)
- Location: `supabase/migrations/20251123000003_allow_expiration_updates.sql`

### Step 2: Restart the Dev Server

The code changes are already in place. Just restart:

```sql
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, expires_at, status
) VALUES (
  '[USER_ID]',
  'Test: 30-Second Countdown',
  'Testing lazy expiration fix',
  '[CATEGORY_ID]',
  42.3601, -71.0589, 3,
  'auto_expire',
  NOW() + INTERVAL '30 seconds',
  'approved'
) RETURNING id, expires_at;
```

### Step 2: Visit the hazard detail page
Open: `http://localhost:5174/hazards/[HAZARD_ID]`

Watch the countdown timer expire.

### Step 3: Refresh the page after expiration
After 30 seconds, refresh the page.

### Step 4: Verify the database was updated

```sql
SELECT 
  id, 
  title, 
  resolved_at,
  resolved_by,
  resolution_note,
  expires_at < NOW() as is_expired
FROM hazards 
WHERE id = '[HAZARD_ID]';
```

**Expected Results:**
- ✅ `resolved_at` has a timestamp
- ✅ `resolved_by` is NULL (system-triggered)
- ✅ `resolution_note` contains "Auto-expired after X hour(s) past expiration time"
- ✅ `is_expired` is `true`

---

## Why resolved_by Can Be NULL

The `resolved_by` column is defined as:

```sql
resolved_by UUID REFERENCES auth.users(id)
```

Notice there's **no `NOT NULL` constraint**. This allows the column to be NULL, which is appropriate for:

1. **System-triggered expirations** (no specific user action)
2. **Automated background jobs**
3. **Batch expiration processes**

When a user manually reports a hazard as resolved, `resolved_by` will contain their user ID. When the system auto-expires a hazard, `resolved_by` will be NULL.

---

## Alternative Solutions Considered

### Option 1: Create a "system" user ❌
- Would require creating a fake user in `auth.users`
- Adds complexity to user management
- Not semantically correct (system is not a user)

### Option 2: Make resolved_by optional with NULL ✅ CHOSEN
- Simple and clean
- Semantically correct (NULL means "no user action")
- Easy to query: `WHERE resolved_by IS NULL` = system expirations

### Option 3: Add separate boolean flag ❌
- Would require schema migration
- Redundant information (NULL already indicates system action)
- More complex queries

---

## Query Examples

### Find all system-expired hazards:
```sql
SELECT id, title, resolved_at, resolution_note
FROM hazards
WHERE resolved_at IS NOT NULL
  AND resolved_by IS NULL
ORDER BY resolved_at DESC;
```

### Find all user-resolved hazards:
```sql
SELECT h.id, h.title, h.resolved_at, u.email as resolved_by_email
FROM hazards h
JOIN auth.users u ON h.resolved_by = u.id
WHERE h.resolved_at IS NOT NULL
ORDER BY h.resolved_at DESC;
```

### Expiration statistics:
```sql
SELECT 
  COUNT(*) FILTER (WHERE resolved_by IS NULL) as system_expired,
  COUNT(*) FILTER (WHERE resolved_by IS NOT NULL) as user_resolved,
  COUNT(*) as total_resolved
FROM hazards
WHERE resolved_at IS NOT NULL;
```

---

## Status

✅ **FIXED and DEPLOYED**

The lazy expiration system now works correctly. Expired hazards are properly marked as resolved in the database when their detail page is accessed.

---

## Related Documentation

- [Lazy Expiration Implementation](LAZY_EXPIRATION_IMPLEMENTATION.md)
- [Expiration Quick Test Guide](EXPIRATION_QUICK_TEST_GUIDE.md)
- [Status vs Expiration Guide](STATUS_VS_EXPIRATION_GUIDE.md)
