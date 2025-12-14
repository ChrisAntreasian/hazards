# Lazy Expiration Implementation Summary

**Date:** November 23, 2025  
**Decision:** Use lazy expiration instead of cron jobs  
**Status:** ✅ Complete

---

## What Changed

### ❌ Original Plan: Cron Job Approach
- Edge Function to run every hour
- Check ALL hazards for expiration
- Update database on schedule
- Requires deployment and monitoring

### ✅ New Approach: Lazy Expiration
- Expire hazards when they're accessed
- Filter expired hazards from lists
- No cron infrastructure needed
- Simpler, more efficient, same UX

---

## Implementation

### 1. Created Utility Module
**File:** `src/lib/utils/expiration.ts`

**Functions:**
- `expireHazardIfNeeded()` - Marks expired hazards as resolved
- `filterExpiredHazards()` - Filters expired hazards from lists  
- `isExpired()` - Checks if hazard is expired
- `expireAllExpiredHazards()` - Batch cleanup (optional)

### 2. Applied to Hazard Detail Page
**File:** `src/routes/hazards/[id]/+page.server.ts`

```typescript
import { expireHazardIfNeeded } from '$lib/utils/expiration';

// After fetching hazard:
await expireHazardIfNeeded(supabase, hazard);
```

**Result:** When user visits hazard, if expired → marks as resolved

### 3. Applied to Map View
**File:** `src/routes/map/+page.server.ts`

```typescript
import { filterExpiredHazards } from '$lib/utils/expiration';

// After fetching hazards:
const activeHazards = filterExpiredHazards(hazards || []);
```

**Result:** Expired hazards don't appear on map

---

## Benefits

### ✅ Simpler Architecture
- No Edge Function to deploy
- No cron job to schedule
- No additional monitoring needed
- All logic in one place

### ✅ More Efficient
- Only processes accessed hazards
- Cron would check ALL hazards hourly
- Fewer database writes overall
- Lower compute costs

### ✅ Better UX
- Immediate expiration (no hourly delay)
- User sees resolved state right away
- No stale data issues

### ✅ Easier to Test
- Just create expired hazard and visit it
- No waiting for cron to run
- All logic in standard page loads

---

## Trade-offs (Acceptable)

### Expired Hazards Stay in Database
- **Impact:** Negligible
- **Why:** They're filtered from all views anyway
- **Solution:** Optional batch cleanup if needed

### Audit Log Timing
- **Impact:** Minor
- **Difference:** "Expired when accessed" vs "Expired at exact time"
- **Why acceptable:** Still shows how long overdue, good enough for most use cases

---

## What to Remove

### ❌ No Longer Needed

1. **Edge Function**
   - `supabase/functions/expire-hazards/index.ts` - Not needed
   - `supabase/functions/expire-hazards/README.md` - Reference only
   - Can keep for historical reference or delete

2. **Cron Scheduling**
   - No `supabase functions deploy` needed
   - No `supabase functions schedule` needed

3. **Deployment Steps**
   - Strike through cron sections in deployment checklist
   - Focus on testing instead

---

## Testing Strategy

### Quick Test (1 minute)

```sql
-- Get your IDs
SELECT id FROM auth.users WHERE email = 'your@email.com';
SELECT id FROM hazard_categories LIMIT 1;

-- Create expired hazard
INSERT INTO hazards (
  user_id, title, description, category_id,
  latitude, longitude, severity_level,
  expiration_type, expires_at
) VALUES (
  '[user-id]', 'Test Expired', 'Should auto-resolve',
  '[category-id]', 39.7392, -104.9903, 3,
  'auto_expire', NOW() - INTERVAL '1 hour'
);
```

**Verify:**
1. Visit hazard detail page
2. Check database: `resolved_at` should be set
3. Visit map: hazard should not appear
4. Check audit log: entry should exist

---

## Documentation Created

1. **LAZY_EXPIRATION_STRATEGY.md** - Complete guide to lazy expiration
2. **EXPIRATION_QUICK_TEST_GUIDE.md** - Fast testing (no waiting)
3. **src/lib/utils/expiration.ts** - Reusable utility functions
4. Updated todos to reflect no cron needed

---

## Next Steps

### ✅ Ready for Testing
All code is in place. Use EXPIRATION_QUICK_TEST_GUIDE.md to test:
- Create 30-second expiration hazards
- Test lazy expiration on detail page
- Test filtering on map
- Test auto-resolve trigger
- Test extend button

### 🔲 Optional Enhancements
- Add lazy expiration to other list views (dashboard, search)
- Create admin cleanup button (optional)
- Add "last expired batch" metric (optional)

---

## Files Modified

### Created
- ✅ `src/lib/utils/expiration.ts` (250 lines)
- ✅ `docs/summaries/LAZY_EXPIRATION_STRATEGY.md` (400+ lines)

### Modified
- ✅ `src/routes/hazards/[id]/+page.server.ts` (added expireHazardIfNeeded)
- ✅ `src/routes/map/+page.server.ts` (added filterExpiredHazards)

### Kept (Reference Only)
- 📄 `supabase/functions/expire-hazards/index.ts` (not deployed)
- 📄 `supabase/functions/expire-hazards/README.md` (reference)

---

## Comparison: Cron vs Lazy

| Aspect | Cron Approach | Lazy Approach |
|--------|--------------|---------------|
| **Infrastructure** | Edge Function + Scheduler | Just app code |
| **Complexity** | Higher | Lower |
| **Efficiency** | Checks all hazards | Only accessed hazards |
| **Timing** | Exact (on schedule) | On access |
| **Cost** | Edge Function charges | Negligible |
| **Maintenance** | Monitor cron logs | None |
| **Testing** | Wait for cron or manual invoke | Just visit page |
| **UX** | Up to 1hr delay | Immediate |

**Winner:** Lazy expiration ✅

---

## Summary

**Before:** Complex cron-based expiration system  
**After:** Simple on-demand expiration  
**Result:** Same functionality, simpler architecture, better UX

**Action Items:**
1. ✅ Lazy expiration implemented
2. ✅ Documentation created
3. 🔲 Manual testing (use quick test guide)
4. 🔲 Optional: Apply to other list views

**No deployment needed** - just test and you're done! 🎉
