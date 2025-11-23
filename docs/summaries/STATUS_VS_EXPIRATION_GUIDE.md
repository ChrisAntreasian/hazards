# Status vs Expiration: Understanding the Two Systems

## Quick Reference

There are **TWO different status systems** in the Hazards app. Don't confuse them!

### 1. Moderation Status (`status` column)
**Database Column:** `hazards.status`  
**Enum Type:** `hazard_status`  
**Valid Values:** `'pending' | 'approved' | 'flagged' | 'removed'`

**Purpose:** Controls whether a hazard has been moderated and can appear on the map.

- **`pending`** - Awaiting moderator review (default for new hazards)
- **`approved`** - Moderator approved, shows on map
- **`flagged`** - Flagged for review/concern
- **`removed`** - Hidden from public view

### 2. Expiration Status (computed)
**NOT a database column!** Calculated by `get_hazard_expiration_status()` function  
**Type:** `'active' | 'expiring_soon' | 'expired' | 'dormant' | 'pending_resolution' | 'resolved'`

**Purpose:** Shows the current lifecycle state of a hazard.

- **`active`** - Currently active and visible
- **`expiring_soon`** - Will expire in < 24 hours
- **`expired`** - Past expiration time (not yet resolved)
- **`dormant`** - Seasonal hazard outside active months
- **`pending_resolution`** - Resolution report with confirmations
- **`resolved`** - Marked as resolved (`resolved_at` is set)

---

## Common Mistakes

### ❌ WRONG - Using 'active' in status column
```sql
INSERT INTO hazards (..., status) VALUES (..., 'active');  -- ERROR!
```

### ✅ CORRECT - Use 'approved' for moderation status
```sql
INSERT INTO hazards (..., status) VALUES (..., 'approved');
```

### ❌ WRONG - Using 'resolved' in status column
```sql
UPDATE hazards SET status = 'resolved';  -- ERROR! No such value
```

### ✅ CORRECT - Set resolved_at timestamp
```sql
UPDATE hazards SET resolved_at = NOW(), resolved_by = '[USER_ID]';
```

---

## Testing Hazards

When creating test hazards via SQL, you need to:

1. **Set moderation status** to `'approved'` (so it shows on map)
2. **Set expiration fields** based on what you're testing

### Example: Active Auto-Expire Hazard
```sql
INSERT INTO hazards (
  user_id, title, category_id, 
  latitude, longitude, severity_level,
  expiration_type, expires_at, 
  status  -- MODERATION STATUS
) VALUES (
  '[USER_ID]', 
  'Test Hazard', 
  '[CATEGORY_ID]',
  42.36, -71.06, 3,
  'auto_expire', 
  NOW() + INTERVAL '1 hour',
  'approved'  -- ✅ Use 'approved', NOT 'active'
);
```

### Example: Resolved Hazard
```sql
INSERT INTO hazards (
  user_id, title, category_id, 
  latitude, longitude, severity_level,
  expiration_type, 
  status,        -- MODERATION STATUS
  resolved_at    -- RESOLUTION TIMESTAMP
) VALUES (
  '[USER_ID]', 
  'Resolved Hazard', 
  '[CATEGORY_ID]',
  42.36, -71.06, 3,
  'user_resolvable',
  'approved',    -- ✅ Moderation status
  NOW()          -- ✅ This makes it "resolved"
);
```

---

## How to Check Expiration Status

### Option 1: Use the Database Function
```sql
SELECT 
  id, 
  title,
  status,  -- Moderation status
  get_hazard_expiration_status(id) as expiration_status
FROM hazards 
WHERE id = '[HAZARD_ID]';
```

### Option 2: Check via API
```bash
GET /api/hazards/[HAZARD_ID]/expiration-status
```

Returns:
```json
{
  "status": "active",  // or "expired", "resolved", etc.
  "timeRemaining": "2 hours 15 minutes"
}
```

---

## Summary Table

| Field | Type | Where | Values | Purpose |
|-------|------|-------|---------|---------|
| `status` | Column | Database | pending, approved, flagged, removed | Moderation |
| `resolved_at` | Column | Database | timestamp or NULL | When resolved |
| Expiration Status | Computed | Function | active, expired, resolved, etc. | Lifecycle |

---

## When Fixing Test Scripts

If you see this error:
```
ERROR: 22P02: invalid input value for enum hazard_status: "active"
```

**Solution:** Change `status = 'active'` to `status = 'approved'`

If you see this error:
```
ERROR: 22P02: invalid input value for enum hazard_status: "resolved"
```

**Solution:** Remove `status = 'resolved'` and add `resolved_at = NOW()`
