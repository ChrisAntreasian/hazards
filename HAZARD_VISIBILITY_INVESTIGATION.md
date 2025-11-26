# Hazard Visibility Investigation

**Date:** November 23, 2025  
**Issue:** Test hazards not showing on map or hazard pages  

---

## Problem Statement

After creating several test hazards while testing the expiration feature, they are not appearing on:
1. The map page (`/map`)
2. Any hazard list pages

---

## Why Hazards Might Not Show

Based on the code analysis, there are **FOUR FILTERS** that could prevent hazards from showing on the map:

### 1. Status Filter (Most Likely Issue)
```typescript
.eq('status', 'approved')  // Only approved hazards show
```

**Test hazards are likely 'pending' status by default!**

When you create a hazard via SQL INSERT, if you don't specify status or set `status='pending'`, it won't show on the map.

### 2. Coordinates Filter
```typescript
.not('latitude', 'is', null)
.not('longitude', 'is', null)
```

Hazards without lat/lng coordinates are filtered out.

### 3. Resolved Filter
```typescript
// In filterExpiredHazards()
if (hazard.resolved_at) {
  return false; // Hide resolved hazards
}
```

Any hazard with `resolved_at` set is hidden.

### 4. Expiration Filter
```typescript
// In filterExpiredHazards()
if (hazard.expiration_type === 'auto_expire' && hazard.expires_at) {
  const expiresAt = new Date(hazard.expires_at);
  if (expiresAt <= now) {
    return false; // Hide expired hazards
  }
}
```

Hazards that have passed their `expires_at` date are filtered out.

---

## How to Diagnose

### Step 1: Run Diagnostic Query

I've created a comprehensive SQL query at:
**`DIAGNOSTIC_HAZARDS_QUERY.sql`**

Run this in Supabase SQL Editor. It will show you:
- ✅ All recent test hazards with their status
- ✅ Why each hazard is or isn't showing on the map
- ✅ Summary statistics
- ✅ Grouped lists by visibility status

### Step 2: Check Results

The query will tell you **exactly why** each hazard isn't showing with messages like:
- `❌ NO - status not approved`
- `❌ NO - missing coordinates`
- `❌ NO - already resolved`
- `❌ NO - expired`
- `✅ YES - should appear on map`

---

## Most Likely Solutions

### Solution 1: Update Test Hazards to 'approved' Status

If hazards have `status='pending'`, update them:

```sql
-- Update all test hazards to approved status
UPDATE hazards
SET status = 'approved'
WHERE title LIKE '%Test%'
  AND status = 'pending';
```

### Solution 2: Mark Expired Hazards as Resolved

If hazards are expired but not resolved:

```sql
-- Resolve all expired test hazards
UPDATE hazards
SET 
  resolved_at = NOW(),
  resolved_by = NULL,
  resolution_note = 'Expired during testing'
WHERE title LIKE '%Test%'
  AND expires_at < NOW()
  AND resolved_at IS NULL;
```

### Solution 3: Extend Expiration on Active Tests

If you want to keep testing with these hazards:

```sql
-- Extend all test hazards by 24 hours
UPDATE hazards
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE title LIKE '%Test%'
  AND expires_at < NOW()
  AND resolved_at IS NULL;
```

---

## Understanding the Filters

### Map Query Flow

```
1. Query Database
   ↓
2. Filter: status = 'approved'
   ↓
3. Filter: has lat/lng
   ↓
4. Load into memory
   ↓
5. Filter: resolved_at = null
   ↓
6. Filter: not expired (if auto_expire type)
   ↓
7. Display on map
```

### Why These Filters Exist

**Status Filter:**
- Ensures only moderated hazards show publicly
- Prevents spam/low-quality reports from appearing

**Coordinate Filter:**
- Map requires geographic coordinates
- Can't place markers without lat/lng

**Resolved Filter:**
- Keeps map clean and current
- Resolved hazards are no longer relevant

**Expiration Filter:**
- Auto-expire hazards are time-limited
- Expired hazards are no longer accurate
- Lazy expiration waits for page visit to mark as resolved

---

## Testing Best Practices

When creating test hazards via SQL, **always include:**

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
  status  -- ⚠️ IMPORTANT: Set to 'approved'
) VALUES (
  '[USER_ID]',
  'Test Hazard',
  'Description',
  '[CATEGORY_ID]',
  42.3601,
  -71.0589,
  3,
  'auto_expire',
  NOW() + INTERVAL '1 hour',
  'approved'  -- ✅ This makes it show on map!
);
```

---

## Quick Fix Commands

### Get All Test Hazard IDs and Status

```sql
SELECT 
  id,
  title,
  status,
  expiration_type,
  expires_at,
  resolved_at,
  CASE
    WHEN status != 'approved' THEN 'Fix: Set status to approved'
    WHEN resolved_at IS NOT NULL THEN 'Already resolved'
    WHEN expires_at < NOW() THEN 'Fix: Extend expires_at or resolve'
    ELSE 'Should show on map'
  END as action_needed
FROM hazards
WHERE created_at > NOW() - INTERVAL '24 hours'
   OR title LIKE '%Test%'
ORDER BY created_at DESC;
```

### Make All Test Hazards Visible

```sql
-- Make recent test hazards visible on map
UPDATE hazards
SET 
  status = 'approved',
  expires_at = CASE 
    WHEN expires_at < NOW() THEN NOW() + INTERVAL '24 hours'
    ELSE expires_at
  END,
  resolved_at = NULL
WHERE (created_at > NOW() - INTERVAL '24 hours' OR title LIKE '%Test%')
  AND status != 'approved'
RETURNING id, title, status, expires_at;
```

---

## Verification Steps

After applying fixes:

1. **Refresh the map page** (`/map`)
2. **Check browser console** for:
   ```
   Loaded X hazards, Y active after filtering
   ```
3. **Look for markers** on the map around Boston (42.36, -71.06)
4. **Click a marker** to verify popup shows hazard details

---

## Adding Debug Logging

If you still have issues, add this to map server load:

```typescript
// In src/routes/map/+page.server.ts
// After filterExpiredHazards() call

console.log('=== MAP DEBUG ===');
console.log('Total hazards from DB:', hazards?.length || 0);
console.log('After filters:', activeHazards.length);
console.log('Filtered hazards:', activeHazards.map(h => ({
  id: h.id,
  title: h.title,
  status: h.status,
  expires_at: h.expires_at,
  resolved_at: h.resolved_at
})));
```

Then check your terminal/server logs when loading `/map`.

---

## Next Steps

1. ✅ **Run diagnostic query** (`DIAGNOSTIC_HAZARDS_QUERY.sql`)
2. ✅ **Identify the issue** (status? expired? resolved?)
3. ✅ **Apply appropriate fix** (update status, extend expiration, etc.)
4. ✅ **Refresh map** and verify hazards appear
5. ✅ **Update test guide** to always set `status='approved'`

---

## Test Guide Update Needed

The `EXPIRATION_QUICK_TEST_GUIDE.md` should be updated to **always include `status='approved'`** in all INSERT statements.

Currently some test hazards may be created with `status='pending'` which won't show on the map!

**Required change:** All test SQL should use `status='approved'` instead of `status='pending'`.

---

**Summary:**
- Most likely issue: Test hazards have `status='pending'` instead of `'approved'`
- Run the diagnostic query to confirm
- Update status to `'approved'` to make them visible
- Future tests should always create hazards with approved status
