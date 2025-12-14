# Auto-Expire Hazards Edge Function

## Purpose
Automatically expire `auto_expire` type hazards that have passed their `expires_at` timestamp.

## Schedule
Run hourly via Supabase cron: `0 * * * *`

## What It Does
1. Queries all hazards where:
   - `expiration_type = 'auto_expire'`
   - `expires_at <= NOW()`
   - `resolved_at IS NULL`
2. For each expired hazard:
   - Sets `resolved_at = NOW()`
   - Sets `resolution_note` with expiration details
   - Logs to `expiration_audit_log`
3. Returns summary of processed hazards

## Deployment

### 1. Deploy the function
```bash
# From project root
supabase functions deploy expire-hazards
```

### 2. Set up environment variables (already configured)
The function uses:
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

### 3. Schedule with cron
Via Supabase Dashboard:
1. Go to Edge Functions → expire-hazards
2. Click "Add cron job"
3. Schedule: `0 * * * *` (every hour)
4. Or via CLI:
```bash
supabase functions schedule expire-hazards --cron "0 * * * *"
```

### 4. Test manually
```bash
# Invoke directly
supabase functions invoke expire-hazards --no-verify-jwt

# Or via curl
curl -X POST https://[project-ref].supabase.co/functions/v1/expire-hazards \
  -H "Authorization: Bearer [anon-key]"
```

## Response Format

### Success (with expired hazards)
```json
{
  "success": true,
  "message": "Processed 3 expired hazards",
  "expired_count": 3,
  "successfully_expired": 3,
  "failed": 0,
  "hazard_ids": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ],
  "processed_at": "2025-11-17T18:00:00.000Z"
}
```

### Success (no expired hazards)
```json
{
  "success": true,
  "message": "No expired hazards to process",
  "expired_count": 0,
  "processed_at": "2025-11-17T18:00:00.000Z"
}
```

### Error
```json
{
  "success": false,
  "error": "Error message here",
  "processed_at": "2025-11-17T18:00:00.000Z"
}
```

## Monitoring

### Check logs
```bash
supabase functions logs expire-hazards --tail
```

### Query audit trail
```sql
SELECT * 
FROM expiration_audit_log 
WHERE action = 'auto_expired'
ORDER BY created_at DESC
LIMIT 20;
```

### Check expired hazards
```sql
-- Hazards that should have expired but haven't been processed
SELECT id, title, expires_at, extended_count
FROM hazards
WHERE expiration_type = 'auto_expire'
  AND expires_at < NOW()
  AND resolved_at IS NULL;
```

## Troubleshooting

### Function not running
- Check cron schedule in Supabase Dashboard
- Verify function is deployed: `supabase functions list`
- Check logs for errors

### Hazards not expiring
- Verify `expires_at` is in the past
- Check `resolved_at` is NULL
- Verify `expiration_type = 'auto_expire'`
- Check function logs for processing errors

### Performance
- Function processes hazards sequentially
- For 100+ expired hazards, may take 1-2 minutes
- Consider batching if needed in future

## Testing Locally

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve expire-hazards

# Test in another terminal
curl -X POST http://localhost:54321/functions/v1/expire-hazards \
  -H "Authorization: Bearer [local-anon-key]"
```

## Notes
- Uses service role key for admin access (bypasses RLS)
- Logs all actions to audit trail
- Gracefully handles individual hazard failures
- Returns detailed summary for monitoring
