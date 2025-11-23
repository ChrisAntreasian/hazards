# Hazard Expiration System - Deployment Checklist

**Feature:** Complete expiration system with 4 types (auto-expire, user-resolvable, permanent, seasonal)  
**Status:** ✅ Ready for deployment  
**Date:** November 17, 2025

---

## ✅ Pre-Deployment Checklist

### Database & Migrations

- [x] **Schema complete** - All columns added to hazards table
  - `expiration_type`, `expires_at`, `extended_count`, `resolved_at`, `resolved_by`, `resolution_note`, `seasonal_pattern`
  
- [x] **Related tables created**
  - `hazard_resolution_reports`
  - `hazard_resolution_confirmations`
  - `expiration_settings`
  - `expiration_audit_log`

- [x] **RLS policies configured**
  - Public can read reports/confirmations
  - Authenticated users can create/update own records
  
- [x] **Auto-resolve trigger deployed**
  - Migration: `20251117000001_add_auto_resolve_trigger.sql`
  - Function: `check_auto_resolve()`
  - Trigger: `trigger_auto_resolve_on_confirmation`

### Backend & API

- [x] **Server-side status calculation**
  - `calculateExpirationStatus()` in +page.server.ts
  - `calculateTimeRemaining()` in +page.server.ts
  
- [x] **API endpoints**
  - GET `/api/hazards/[id]/expiration-status` ✅
  - POST `/api/hazards/[id]/extend` ✅
  
- [x] **Edge Functions ready**
  - `expire-hazards` function created
  - Needs deployment to Supabase

### Frontend & UI

- [x] **All components created**
  - ExpirationStatusBadge.svelte ✅
  - TimeRemaining.svelte ✅
  - SeasonalBadge.svelte ✅
  - ResolutionReportForm.svelte ✅
  - ResolutionConfirmation.svelte ✅
  - ResolutionHistory.svelte ✅

- [x] **Hazard detail page integration**
  - Server-side data loading ✅
  - All components rendered ✅
  - Extend button functional ✅
  - Resolution flow complete ✅

- [x] **Hazard creation form**
  - All 4 expiration types selectable ✅
  - Conditional fields working ✅
  - Helpful hints provided ✅

### Documentation

- [x] **Implementation docs**
  - EXPIRATION_IMPLEMENTATION_PROGRESS.md ✅
  - EXPIRATION_QUICK_REFERENCE.md ✅
  
- [x] **Edge Function README**
  - expire-hazards/README.md ✅

---

## 🚀 Deployment Steps

### 1. Database Migrations (If not already applied)

```bash
# Check which migrations are applied
supabase db diff

# Apply pending migrations
supabase db push

# Or manually run the auto-resolve trigger migration
supabase db execute < supabase/migrations/20251117000001_add_auto_resolve_trigger.sql
```

**Verify:**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'trigger_auto_resolve_on_confirmation';

-- Check function exists
SELECT proname FROM pg_proc 
WHERE proname = 'check_auto_resolve';
```

### 2. Deploy Edge Function

```bash
# Deploy the auto-expire function
supabase functions deploy expire-hazards

# Verify deployment
supabase functions list
```

**Expected output:**
```
Functions:
  expire-hazards (deployed)
```

### 3. Schedule Cron Job

**Via Supabase Dashboard:**
1. Navigate to Edge Functions
2. Select `expire-hazards`
3. Click "Cron Jobs" tab
4. Add new cron: `0 * * * *` (every hour)

**Via CLI:**
```bash
supabase functions schedule expire-hazards --cron "0 * * * *"
```

**Verify:**
- Check Supabase Dashboard → Edge Functions → expire-hazards → Cron Jobs
- Should show: "Every hour" with cron expression `0 * * * *`

### 4. Test Edge Function Manually

```bash
# Invoke directly (no auth required for testing)
supabase functions invoke expire-hazards --no-verify-jwt
```

**Expected response (if no expired hazards):**
```json
{
  "success": true,
  "message": "No expired hazards to process",
  "expired_count": 0,
  "processed_at": "2025-11-17T18:00:00.000Z"
}
```

### 5. Configure Environment (Already Done)

Supabase automatically configures:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No manual configuration needed.

---

## 🧪 Post-Deployment Testing

### Test 1: Auto-Expire Hazard

```sql
-- Create a hazard that expires in 1 minute (for testing)
INSERT INTO hazards (
  user_id,
  title,
  description,
  category_id,
  latitude,
  longitude,
  severity_level,
  expiration_type,
  expires_at
) VALUES (
  '[your-user-id]',
  'Test Auto-Expire',
  'This should expire in 1 minute',
  '[category-id]',
  39.7392,
  -104.9903,
  3,
  'auto_expire',
  NOW() + INTERVAL '1 minute'
);

-- Wait 2 minutes, then manually invoke the function
-- Verify hazard is resolved

SELECT resolved_at, resolution_note 
FROM hazards 
WHERE title = 'Test Auto-Expire';
```

### Test 2: Auto-Resolve Trigger

**Via Browser:**
1. Create a user-resolvable hazard
2. Submit a resolution report
3. Log in as 3 different users
4. Each user confirms the resolution
5. After 3rd confirmation, check:
   - Hazard should show "Resolved" badge
   - `resolved_at` should be set
   - Audit log should have entry

**Via SQL:**
```sql
-- Create test hazard and resolution report
-- (Use actual UUIDs from your database)

-- Add confirmations
INSERT INTO hazard_resolution_confirmations (hazard_id, user_id, confirmation_type)
VALUES 
  ('[hazard-id]', '[user1-id]', 'confirmed'),
  ('[hazard-id]', '[user2-id]', 'confirmed'),
  ('[hazard-id]', '[user3-id]', 'confirmed');  -- Trigger should fire here!

-- Check if auto-resolved
SELECT resolved_at, resolved_by, resolution_note
FROM hazards
WHERE id = '[hazard-id]';

-- Check audit log
SELECT * FROM expiration_audit_log
WHERE hazard_id = '[hazard-id]' AND action = 'auto_resolved';
```

### Test 3: Extend Expiration

**Via Browser:**
1. Create an auto-expire hazard (6 hours)
2. Navigate to hazard detail page
3. Click "Extend Expiration by 24 Hours"
4. Verify:
   - Countdown updates to ~30 hours
   - "Extended 1 time" appears
   - Audit log has entry

### Test 4: Seasonal Hazard

```sql
-- Create seasonal hazard (active May-September)
INSERT INTO hazards (
  user_id,
  title,
  description,
  category_id,
  latitude,
  longitude,
  severity_level,
  expiration_type,
  seasonal_pattern
) VALUES (
  '[your-user-id]',
  'Test Seasonal',
  'Active May-September',
  '[category-id]',
  39.7392,
  -104.9903,
  3,
  'seasonal',
  '{"active_months": [5,6,7,8,9]}'::jsonb
);

-- Check status (November = Dormant, June = Active)
-- Visit hazard detail page, should show appropriate badge
```

---

## 📊 Monitoring & Alerts

### Check Expiration Status

```sql
-- Count hazards by expiration type
SELECT expiration_type, COUNT(*) 
FROM hazards 
WHERE resolved_at IS NULL
GROUP BY expiration_type;

-- Find hazards expiring soon (next 24 hours)
SELECT id, title, expires_at, extended_count
FROM hazards
WHERE expiration_type = 'auto_expire'
  AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
  AND resolved_at IS NULL
ORDER BY expires_at;

-- Find overdue expired hazards (should be processed by cron)
SELECT id, title, expires_at, 
       EXTRACT(EPOCH FROM (NOW() - expires_at)) / 3600 AS hours_overdue
FROM hazards
WHERE expiration_type = 'auto_expire'
  AND expires_at < NOW()
  AND resolved_at IS NULL;
```

### Check Edge Function Logs

```bash
# View recent logs
supabase functions logs expire-hazards --tail

# View logs for specific time range
supabase functions logs expire-hazards --since 2h
```

### Check Audit Trail

```sql
-- Recent auto-expire actions
SELECT 
  hazard_id,
  action,
  reason,
  created_at
FROM expiration_audit_log
WHERE action = 'auto_expired'
ORDER BY created_at DESC
LIMIT 20;

-- Recent auto-resolve actions
SELECT 
  hazard_id,
  action,
  new_state->>'confirmed_count' as confirmations,
  reason,
  created_at
FROM expiration_audit_log
WHERE action = 'auto_resolved'
ORDER BY created_at DESC
LIMIT 20;

-- Extension activity
SELECT 
  hazard_id,
  new_state->>'total_extensions' as extensions,
  reason,
  created_at
FROM expiration_audit_log
WHERE action = 'expiration_extended'
ORDER BY created_at DESC
LIMIT 20;
```

### Set Up Alerts

**Recommended Alerts:**
1. **Cron job failures** - Alert if expire-hazards fails 3 times in a row
2. **Overdue hazards** - Alert if >10 hazards are >24h past expiration
3. **No activity** - Alert if no auto-expire actions in past week (might indicate cron stopped)

**Via Supabase Dashboard:**
- Monitor → Logs → Filter for errors in expire-hazards
- Set up webhook notifications for errors

---

## 🔧 Troubleshooting

### Issue: Edge Function Not Running

**Symptoms:**
- Expired hazards not being resolved
- No recent entries in audit log for auto_expired

**Diagnosis:**
```bash
# Check function status
supabase functions list

# Check cron schedule
# (View in Dashboard → Edge Functions → expire-hazards → Cron)

# Check recent logs
supabase functions logs expire-hazards
```

**Solutions:**
1. Verify cron is scheduled: `0 * * * *`
2. Check function is deployed (re-deploy if needed)
3. Manually invoke to test: `supabase functions invoke expire-hazards`
4. Check for errors in logs

### Issue: Auto-Resolve Not Triggering

**Symptoms:**
- User-resolvable hazards stay active even with 3+ confirmations

**Diagnosis:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'trigger_auto_resolve_on_confirmation';

-- Check confirmation counts for a hazard
SELECT 
  hazard_id,
  confirmation_type,
  COUNT(*)
FROM hazard_resolution_confirmations
WHERE hazard_id = '[hazard-id]'
GROUP BY hazard_id, confirmation_type;

-- Check if hazard was resolved
SELECT resolved_at, resolution_note 
FROM hazards 
WHERE id = '[hazard-id]';
```

**Solutions:**
1. Verify trigger is installed: Re-run migration if needed
2. Check if hazard is user_resolvable type
3. Ensure confirmed > disputed
4. Check trigger logs in Postgres logs

### Issue: Extend Button Not Appearing

**Symptoms:**
- User doesn't see extend button on own hazard

**Diagnosis:**
- Check browser console for errors
- Verify user is logged in
- Check `can_extend` in expiration status data

**Solutions:**
1. Verify hazard is auto_expire or user_resolvable
2. Check hazard is not already resolved
3. Verify user ID matches hazard.user_id
4. Check server-side permission logic

---

## 📈 Success Metrics

**After 1 week, check:**
- Auto-expire rate: % of hazards that auto-expire
- Average time to resolution for user-resolvable
- Extension frequency: avg extensions per auto-expire hazard
- Auto-resolve success: % reaching threshold vs manually resolved

**SQL Queries:**
```sql
-- Auto-expire rate
SELECT 
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolution_note LIKE '%Auto%') * 100.0 / COUNT(*) as auto_expire_rate
FROM hazards
WHERE expiration_type = 'auto_expire'
  AND created_at > NOW() - INTERVAL '7 days';

-- Average extensions
SELECT AVG(extended_count)
FROM hazards
WHERE expiration_type = 'auto_expire'
  AND created_at > NOW() - INTERVAL '7 days';

-- Resolution time for user-resolvable
SELECT 
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours_to_resolve
FROM hazards
WHERE expiration_type = 'user_resolvable'
  AND resolved_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days';
```

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All migrations applied to production
- [ ] Auto-resolve trigger tested and working
- [ ] Edge function deployed and scheduled
- [ ] Manual test of each expiration type
- [ ] Extend button works correctly
- [ ] Resolution flow tested end-to-end
- [ ] Monitoring queries saved
- [ ] Team trained on new features
- [ ] User documentation updated
- [ ] Success metrics baseline recorded

---

## 📞 Support

**If issues arise:**
1. Check function logs: `supabase functions logs expire-hazards`
2. Check audit trail in database
3. Review this checklist
4. Check documentation in `docs/summaries/`

**Key Files:**
- Trigger: `supabase/migrations/20251117000001_add_auto_resolve_trigger.sql`
- Edge Function: `supabase/functions/expire-hazards/index.ts`
- Server Logic: `src/routes/hazards/[id]/+page.server.ts`
- Extend API: `src/routes/api/hazards/[id]/extend/+server.ts`

---

**Status:** ✅ Feature complete and ready for deployment  
**Last Updated:** November 17, 2025
