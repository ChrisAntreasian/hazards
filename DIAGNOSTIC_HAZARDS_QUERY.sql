-- ============================================
-- DIAGNOSTIC QUERY FOR TEST HAZARDS
-- Run this in Supabase SQL Editor
-- ============================================

-- Part 1: Get all recent test hazards with full details
SELECT 
  id,
  title,
  status,
  expiration_type,
  expires_at,
  resolved_at,
  created_at,
  latitude,
  longitude,
  user_id,
  -- Calculate if expired
  CASE 
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN true
    ELSE false
  END as is_expired,
  -- Calculate expiration status
  CASE
    WHEN resolved_at IS NOT NULL THEN 'RESOLVED'
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'EXPIRED (not yet resolved)'
    WHEN expiration_type = 'permanent' THEN 'PERMANENT (active)'
    WHEN expiration_type = 'user_resolvable' THEN 'USER_RESOLVABLE (active)'
    WHEN expiration_type = 'seasonal' THEN 'SEASONAL'
    WHEN expiration_type = 'auto_expire' AND expires_at > NOW() THEN 'AUTO_EXPIRE (active)'
    ELSE 'UNKNOWN'
  END as expiration_status,
  -- Will it show on map?
  CASE
    WHEN status != 'approved' THEN '❌ NO - status not approved'
    WHEN latitude IS NULL OR longitude IS NULL THEN '❌ NO - missing coordinates'
    WHEN resolved_at IS NOT NULL THEN '❌ NO - already resolved'
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN '❌ NO - expired'
    ELSE '✅ YES - should appear on map'
  END as will_show_on_map
FROM hazards
WHERE created_at > NOW() - INTERVAL '24 hours'
   OR title LIKE '%Test%'
   OR title LIKE '%test%'
ORDER BY created_at DESC;

-- Part 2: Summary statistics
SELECT 
  COUNT(*) as total_hazards,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_hazards,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_hazards,
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved_hazards,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW() AND resolved_at IS NULL) as expired_not_resolved,
  COUNT(*) FILTER (
    WHERE status = 'approved' 
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND resolved_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
  ) as should_show_on_map
FROM hazards
WHERE created_at > NOW() - INTERVAL '24 hours'
   OR title LIKE '%Test%'
   OR title LIKE '%test%';

-- Part 3: Get hazard IDs grouped by visibility status
SELECT 
  '=== SHOULD SHOW ON MAP ===' as category,
  json_agg(json_build_object('id', id, 'title', title)) as hazards
FROM hazards
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status = 'approved'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND resolved_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())

UNION ALL

SELECT 
  '=== EXPIRED (need resolution) ===' as category,
  json_agg(json_build_object('id', id, 'title', title)) as hazards
FROM hazards
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND expires_at IS NOT NULL 
  AND expires_at < NOW()
  AND resolved_at IS NULL

UNION ALL

SELECT 
  '=== NOT APPROVED ===' as category,
  json_agg(json_build_object('id', id, 'title', title)) as hazards
FROM hazards
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status != 'approved'

UNION ALL

SELECT 
  '=== RESOLVED ===' as category,
  json_agg(json_build_object('id', id, 'title', title)) as hazards
FROM hazards
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND resolved_at IS NOT NULL;
