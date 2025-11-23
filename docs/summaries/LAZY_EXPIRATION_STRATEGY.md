# Lazy Expiration Strategy - No Cron Needed!

## Overview

Instead of using a cron job to expire hazards on a schedule, we use **lazy expiration** - hazards are marked as expired when they're accessed. This is simpler, more efficient, and eliminates cron infrastructure.

---

## How It Works

### 1. Detail Page Load (Eager Expiration)
When a user visits a hazard detail page:
```typescript
// src/routes/hazards/[id]/+page.server.ts
import { expireHazardIfNeeded } from '$lib/utils/expiration';

// After fetching hazard:
await expireHazardIfNeeded(supabase, hazard);
```

**What happens:**
- Checks if hazard is `auto_expire` type
- Checks if `expires_at < NOW()`
- If expired: Updates `resolved_at`, logs to audit trail
- UI immediately shows "Resolved" badge

### 2. List/Map Views (Lazy Filtering)
When showing hazards on map or in lists:
```typescript
// src/routes/map/+page.server.ts
import { filterExpiredHazards } from '$lib/utils/expiration';

// After fetching hazards:
const activeHazards = filterExpiredHazards(hazards);
```

**What happens:**
- Filters out expired hazards in memory (fast)
- No database updates needed
- Expired hazards hidden from view
- When user clicks one, detail page will mark it expired

---

## Why This Works Better Than Cron

### ✅ Advantages

1. **No Infrastructure**
   - No cron job to deploy
   - No scheduling to configure
   - One less thing to maintain and monitor

2. **More Efficient**
   - Only processes hazards that are accessed
   - Cron would check ALL hazards every hour
   - Most expired hazards aren't visited anyway

3. **Immediate Updates**
   - User sees expired state right away
   - No waiting for hourly cron
   - More responsive user experience

4. **Simpler Architecture**
   - All expiration logic in one place (`src/lib/utils/expiration.ts`)
   - No Edge Function deployment needed
   - Easier to test and debug

5. **Cost Effective**
   - No Edge Function execution charges
   - Fewer database writes (only when accessed)
   - Less compute overall

### ⚠️ Trade-offs

1. **Expired Hazards Stay in Database**
   - Not marked as resolved until accessed
   - But they're filtered from views anyway
   - No impact on user experience

2. **Audit Log Timing**
   - "Expired at" timestamp is when accessed, not exact expiration
   - Still shows how long overdue it was
   - Good enough for most use cases

3. **Database Growth**
   - Expired hazards accumulate if never accessed
   - Can run cleanup batch job occasionally (see below)
   - Or just let them stay - storage is cheap

---

## Utility Functions

### `expireHazardIfNeeded(supabase, hazard)`
**Use when:** Loading a specific hazard (detail page)
```typescript
// Marks hazard as resolved if expired
await expireHazardIfNeeded(supabase, hazard);
```

### `filterExpiredHazards(hazards)`
**Use when:** Displaying list of hazards (map, search results)
```typescript
// Returns only active hazards
const active = filterExpiredHazards(hazards);
```

### `isExpired(hazard)`
**Use when:** Need to check expiration without updating
```typescript
// Just returns true/false
if (isExpired(hazard)) {
  // Show "This hazard is expired" message
}
```

### `expireAllExpiredHazards(supabase)`
**Use when:** Occasional cleanup (optional)
```typescript
// Batch expire all overdue hazards
const count = await expireAllExpiredHazards(supabase);
console.log(`Expired ${count} hazards`);
```

---

## Where Lazy Expiration Is Applied

### ✅ Already Implemented

1. **Hazard Detail Page** (`src/routes/hazards/[id]/+page.server.ts`)
   - Calls `expireHazardIfNeeded()` on page load
   - Updates database if expired
   - UI shows resolved state

2. **Map View** (`src/routes/map/+page.server.ts`)
   - Calls `filterExpiredHazards()` after fetching
   - Expired hazards hidden from map
   - No markers for expired hazards

### 🔲 Recommended to Add (Optional)

3. **Dashboard/My Reports** (if you have these)
   ```typescript
   const myHazards = filterExpiredHazards(allMyHazards);
   ```

4. **Search Results** (if you have search)
   ```typescript
   const searchResults = filterExpiredHazards(results);
   ```

5. **API Endpoints** (if you expose hazards via API)
   ```typescript
   // Filter before returning JSON
   return filterExpiredHazards(hazards);
   ```

---

## Optional: Periodic Cleanup

If you want to clean up expired hazards for database maintenance (not required for functionality):

### Option 1: Manual Script
```typescript
// scripts/expire-hazards.ts
import { createClient } from '@supabase/supabase-js';
import { expireAllExpiredHazards } from '$lib/utils/expiration';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const count = await expireAllExpiredHazards(supabase);
console.log(`Expired ${count} hazards`);
```

Run manually: `npx tsx scripts/expire-hazards.ts`

### Option 2: Admin UI Button
```svelte
<!-- src/routes/admin/+page.svelte -->
<button on:click={cleanupExpiredHazards}>
  Cleanup Expired Hazards
</button>

<script>
  async function cleanupExpiredHazards() {
    const res = await fetch('/api/admin/expire-hazards', { method: 'POST' });
    const data = await res.json();
    alert(`Expired ${data.count} hazards`);
  }
</script>
```

### Option 3: Weekly Cron (if you really want one)
```typescript
// supabase/functions/weekly-cleanup/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async () => {
  const supabase = createClient(/* ... */);
  
  // Your expiration logic
  const count = await expireAllExpiredHazards(supabase);
  
  return new Response(JSON.stringify({ expired_count: count }));
});
```

Schedule: `0 0 * * 0` (weekly on Sunday midnight)

---

## Testing Lazy Expiration

### Quick Test (30 seconds)

```sql
-- Create expired hazard
INSERT INTO hazards (...) VALUES (
  ...,
  'auto_expire',
  NOW() - INTERVAL '1 hour'  -- Already expired
);
```

**Test steps:**
1. Visit hazard detail page
2. Check database - `resolved_at` should now be set
3. Go to map - hazard shouldn't appear
4. Check audit log - entry should exist

### Test Filtering

```sql
-- Create 3 hazards: active, expired, permanent
INSERT INTO hazards (...) VALUES 
  (..., 'auto_expire', NOW() + INTERVAL '1 hour'),  -- Active
  (..., 'auto_expire', NOW() - INTERVAL '1 hour'),  -- Expired
  (..., 'permanent', NULL);  -- Permanent

-- Fetch from map endpoint
-- Should only show 2 (active + permanent)
```

---

## Migration from Cron Approach

If you already deployed the Edge Function:

### Remove Cron Schedule
```bash
# Unschedule the cron job
supabase functions schedule expire-hazards --cron ""

# Or via dashboard: Edge Functions → expire-hazards → Cron Jobs → Delete
```

### Optional: Delete Edge Function
```bash
# Not necessary, but if you want to clean up
supabase functions delete expire-hazards
```

### Update Documentation
- ~~Deploy expire-hazards function~~ Not needed
- ~~Schedule cron job~~ Not needed
- ✅ Lazy expiration happens automatically

---

## Performance Considerations

### Database Impact
- **Reads:** No change (same queries)
- **Writes:** Fewer! Only write when hazard accessed
- **Filtering:** Happens in application memory (fast)

### Page Load Impact
- **Detail page:** +1 database UPDATE (only if expired)
- **List/Map:** +0 database queries (just filtering)
- **Overall:** Negligible impact (<50ms even if update needed)

### Scale
- ✅ Works fine up to 100k+ hazards
- Filtering is O(n) in memory (very fast)
- Only bottleneck is database writes, but only on detail view

---

## Troubleshooting

### "Expired hazards still showing on map"
- Check that you're calling `filterExpiredHazards()` after fetch
- Verify `expires_at` and `expiration_type` are in SELECT query
- Clear browser cache

### "Hazard not marking as expired"
- Check `expireHazardIfNeeded()` is being called
- Verify Supabase client has write permissions
- Check server logs for errors
- Ensure `expiration_audit_log` table exists

### "Want to clean up old expired hazards"
- Run the batch cleanup function
- Or create admin UI button
- Or set up optional weekly cron

---

## Summary

**Lazy expiration is the recommended approach for most applications.**

✅ **Use lazy expiration when:**
- You want simple architecture
- You don't need exact expiration timestamps
- Most hazards are visited occasionally
- You want to minimize infrastructure

❌ **Use cron instead when:**
- Need exact expiration at specific time
- Hazards must be resolved even if never visited
- Generating reports that need accurate "expired at" times
- You already have cron infrastructure

For this hazards app, **lazy expiration is the better choice**. It's simpler, more efficient, and provides the same user experience.

---

**Result:** No cron job needed! 🎉
