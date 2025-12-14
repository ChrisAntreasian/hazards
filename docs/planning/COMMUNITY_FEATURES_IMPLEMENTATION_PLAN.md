# Community Features Implementation Plan
**Created:** November 17, 2025  
**Status:** Planning Phase  
**Target Completion:** Week 7 (Current Sprint)

## 🎯 Overview

This document outlines the design and implementation plan for core community features:
1. **Hazard Voting System** - Upvote/downvote hazards (replacing image voting)
2. **Hazard Expiration System** - Time-based and user-driven hazard resolution
3. **Trust Score Calculation** - Algorithmic reputation system
4. **Activity Feed** - Real-time community action feed for visible hazards
5. **Admin Integration** - Moderation and oversight tools

---

## 🗳️ 1. Hazard Voting System

### Design Philosophy
Users should be able to validate hazard reports through upvotes/downvotes, creating a community-driven verification system. This replaces the planned image voting feature with a more impactful community interaction.

### User Stories
- ✅ As a user, I can upvote a hazard if I confirm its existence/severity
- ✅ As a user, I can downvote a hazard if it seems inaccurate or resolved
- ✅ As a user, I cannot vote on my own hazards
- ✅ As a user, I can see the vote count for each hazard
- ✅ As a user, I can change my vote or remove it
- ✅ As a moderator, I can see voting patterns to identify manipulation

### Database Schema

```sql
-- New table for hazard votes
CREATE TABLE public.hazard_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_id UUID NOT NULL REFERENCES hazards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(hazard_id, user_id) -- One vote per user per hazard
);

-- Add vote counts to hazards table
ALTER TABLE public.hazards 
ADD COLUMN votes_up INTEGER DEFAULT 0,
ADD COLUMN votes_down INTEGER DEFAULT 0,
ADD COLUMN vote_score INTEGER GENERATED ALWAYS AS (votes_up - votes_down) STORED;

-- Indexes for performance
CREATE INDEX idx_hazard_votes_hazard_id ON hazard_votes(hazard_id);
CREATE INDEX idx_hazard_votes_user_id ON hazard_votes(user_id);
CREATE INDEX idx_hazards_vote_score ON hazards(vote_score DESC);
```

### Business Rules

1. **Vote Validation**
   - Users cannot vote on their own hazards
   - Must be authenticated to vote
   - Can only vote once per hazard (can change vote)
   - Changing vote updates both counters atomically

2. **Vote Weight** (Future Enhancement)
   - Consider implementing vote weight based on user trust score
   - Trusted users (trust_score > 500) could have 1.5x vote weight
   - New users (trust_score < 50) could have 0.5x weight

3. **Vote Display**
   - Show net score (upvotes - downvotes) prominently
   - Display breakdown in tooltip/detail view
   - Color coding: green (positive), red (negative), gray (neutral)

4. **Anti-Manipulation**
   - Rate limiting: Max 50 votes per hour per user
   - Track IP addresses for vote patterns (future)
   - Flag suspicious patterns for admin review
   - Auto-flag hazards with vote ratio < -5

### API Endpoints

```typescript
// POST /api/hazards/:id/vote
interface VoteRequest {
  vote_type: 'up' | 'down';
}

// DELETE /api/hazards/:id/vote - Remove vote

// GET /api/hazards/:id/vote - Get user's current vote status
interface VoteStatus {
  has_voted: boolean;
  vote_type?: 'up' | 'down';
  can_vote: boolean; // false if user owns hazard
}
```

### UI Components

**HazardVoting.svelte**
```typescript
interface Props {
  hazardId: string;
  votesUp: number;
  votesDown: number;
  currentUserVote?: 'up' | 'down' | null;
  isOwnHazard: boolean;
  disabled?: boolean;
}
```

**Features:**
- Thumb up/down buttons with counts
- Highlight current user's vote
- Optimistic UI updates
- Error handling with rollback
- Disabled state for own hazards
- Loading states during API calls
- Accessibility (keyboard navigation, ARIA labels)

**Placement:**
- Hazard detail page (prominent)
- Map popup (compact version)
- Hazard list items (summary)

---

## ⏰ 2. Hazard Expiration System

### Design Philosophy
Different hazard types have different lifecycles. The system should support:
- **Temporary hazards** - Weather events, temporary obstacles
- **User-resolved hazards** - Community reports when issue is fixed
- **Permanent hazards** - Geographic features that don't expire
- **Admin-managed** - Override any status

### Expiration Types

| Type | Use Case | Example | Duration |
|------|----------|---------|----------|
| `auto_expire` | Weather/time-limited events | Thunderstorm, ice, flood | Hours to days |
| `user_resolvable` | Fixable issues | Fallen tree, accident | Until reported resolved |
| `permanent` | Geographic hazards | Cliff edge, poison ivy patch | Never expires |
| `seasonal` | Recurring hazards | Bee nest (summer), icy trail (winter) | Seasonal pattern |

### Database Schema

```sql
-- Add expiration fields to hazards table
ALTER TABLE public.hazards
ADD COLUMN expiration_type TEXT CHECK (expiration_type IN ('auto_expire', 'user_resolvable', 'permanent', 'seasonal')) DEFAULT 'user_resolvable',
ADD COLUMN expires_at TIMESTAMPTZ,
ADD COLUMN resolved_at TIMESTAMPTZ,
ADD COLUMN resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN resolution_note TEXT,
ADD COLUMN is_expired BOOLEAN GENERATED ALWAYS AS (
  CASE 
    WHEN expiration_type = 'permanent' THEN false
    WHEN expiration_type = 'auto_expire' AND expires_at IS NOT NULL AND expires_at < NOW() THEN true
    WHEN resolved_at IS NOT NULL THEN true
    ELSE false
  END
) STORED;

-- Index for querying active hazards
CREATE INDEX idx_hazards_active ON hazards(is_expired, status) WHERE status = 'approved';
CREATE INDEX idx_hazards_expires_at ON hazards(expires_at) WHERE expires_at IS NOT NULL;
```

### Business Rules

1. **Auto-Expiration**
   - Set during hazard creation or by category default
   - System cron job checks every 15 minutes
   - Sends notification to creator before expiration
   - Archived hazards remain in database with `is_expired = true`

2. **User Resolution**
   - Any authenticated user can report hazard as resolved
   - Requires resolution note explaining current status
   - Original creator gets notification
   - Multiple resolution reports (threshold: 3) auto-resolves
   - High trust users can instant-resolve

3. **Admin Override**
   - Can force expire or restore any hazard
   - Can change expiration type
   - Can extend expiration time
   - Actions logged to audit trail

4. **Seasonal Hazards**
   - Return to active status based on date patterns
   - Example: Bee nest active May-September each year
   - Store seasonal pattern in JSON field
   - Background job activates/deactivates seasonally

### Expiration Durations by Category

```typescript
const DEFAULT_EXPIRATION_DURATIONS = {
  // Weather events
  'weather/thunderstorm': { hours: 6 },
  'weather/flood': { hours: 48 },
  'weather/ice': { hours: 24 },
  
  // Temporary obstacles
  'infrastructure/road_closure': { hours: 72 },
  'infrastructure/downed_powerline': { hours: 12 },
  
  // Natural hazards (permanent by default)
  'plants/poison_ivy': null, // permanent
  'terrain/cliff': null, // permanent
  'wildlife/nest': { seasonal: 'summer' }, // seasonal
  
  // Default for unknown categories
  'default': { days: 7 } // 1 week default
};
```

### UI Components

**HazardExpirationBadge.svelte**
- Shows expiration status (Expires in 2 hours, Resolved, Permanent)
- Color coding: yellow (expiring soon), gray (resolved), green (active)
- Countdown timer for auto-expiring hazards

**HazardResolutionForm.svelte**
- "Report as Resolved" button
- Modal with resolution note textarea
- Confirmation flow
- Shows history of resolution attempts

**Admin Expiration Controls**
- Force expire/restore buttons
- Change expiration type dropdown
- Extend expiration time picker
- Audit log viewer

### API Endpoints

```typescript
// POST /api/hazards/:id/resolve
interface ResolveRequest {
  resolution_note: string;
  resolved_evidence?: string; // Optional image URL
}

// POST /api/hazards/:id/extend
interface ExtendRequest {
  additional_hours: number;
  reason: string;
}

// GET /api/hazards/:id/expiration-status
interface ExpirationStatus {
  expiration_type: string;
  expires_at?: string;
  time_remaining_ms?: number;
  is_expired: boolean;
  resolution_reports_count: number;
}
```

### Cron Jobs

```typescript
// Background jobs needed:
// 1. Check and expire hazards every 15 minutes
// 2. Send expiration warnings (24h, 1h before)
// 3. Activate/deactivate seasonal hazards
// 4. Archive old expired hazards (>90 days)
```

---

## 🏆 3. Trust Score Calculation Algorithm

### Design Philosophy
Trust scores should:
- Reward quality contributions over quantity
- Penalize rejected/flagged content
- Decay over time to reward active users
- Be transparent and understandable
- Influence user permissions and vote weight

### Scoring Components

```typescript
interface TrustScoreFactors {
  // Positive factors
  hazard_submitted: number;        // +10 per approved hazard
  hazard_verified: number;         // +5 per verification of others' hazards
  helpful_vote: number;            // +2 per vote matching community consensus
  image_uploaded: number;          // +3 per approved image
  accurate_report: number;         // +15 bonus for high-quality reports
  
  // Negative factors
  hazard_rejected: number;         // -20 per rejected hazard
  content_flagged: number;         // -15 per flagged content
  unhelpful_vote: number;          // -1 per vote against consensus
  spam_report: number;             // -50 per spam/abuse report
  
  // Multipliers
  consistency_multiplier: number;  // 1.0-1.5 based on approval rate
  activity_decay: number;          // 0.95-1.0 based on recent activity
  verification_bonus: number;      // 1.0-1.3 for community verification
}
```

### Calculation Formula

```typescript
function calculateTrustScore(user: User, factors: TrustScoreFactors): number {
  // Base score from contributions
  const baseScore = 
    (factors.hazard_submitted * 10) +
    (factors.hazard_verified * 5) +
    (factors.helpful_vote * 2) +
    (factors.image_uploaded * 3) +
    (factors.accurate_report * 15);
  
  // Penalties
  const penalties = 
    (factors.hazard_rejected * 20) +
    (factors.content_flagged * 15) +
    (factors.unhelpful_vote * 1) +
    (factors.spam_report * 50);
  
  // Calculate approval rate for consistency multiplier
  const totalSubmissions = factors.hazard_submitted + factors.hazard_rejected;
  const approvalRate = totalSubmissions > 0 
    ? factors.hazard_submitted / totalSubmissions 
    : 1;
  const consistencyMultiplier = 0.7 + (approvalRate * 0.8); // 0.7 to 1.5
  
  // Apply multipliers
  const adjustedScore = (baseScore - penalties) * consistencyMultiplier * factors.activity_decay;
  
  // Floor at 0, no upper limit (gamification encourages growth)
  return Math.max(0, Math.round(adjustedScore));
}
```

### Trust Score Tiers

| Tier | Score Range | Badge | Permissions | Vote Weight |
|------|-------------|-------|-------------|-------------|
| New User | 0-49 | 🌱 Seedling | View, create (with moderation) | 0.5x |
| Contributor | 50-199 | 🌿 Sprout | All base features | 1.0x |
| Trusted User | 200-499 | 🌳 Tree | Instant approval | 1.2x |
| Community Leader | 500-999 | 🏅 Bronze | Verify others' content | 1.5x |
| Expert | 1000-1999 | 🥈 Silver | Skip moderation, mentor | 2.0x |
| Guardian | 2000+ | 🥇 Gold | All features + community tools | 2.5x |

### Score Updates Triggers

**Real-time updates:**
- Hazard submission → immediate +10 (pending approval)
- Content approved → apply multiplier bonus
- Content rejected → immediate penalty + recalculation
- Votes cast → update after consensus determined (24h window)

**Batch updates (daily):**
- Recalculate all active users
- Apply activity decay (reduces score by 1% per 30 days inactive)
- Update user roles based on new scores
- Send notifications for tier changes

### Database Schema

```sql
-- Track score events for transparency
CREATE TABLE public.trust_score_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_type TEXT NOT NULL, -- 'hazard_approved', 'content_flagged', etc.
    points_change INTEGER NOT NULL,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    related_content_id UUID, -- Reference to hazard, image, etc.
    related_content_type TEXT, -- 'hazard', 'image', 'vote'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trust_score_events_user_id ON trust_score_events(user_id, created_at DESC);

-- Add trust score breakdown to users table
ALTER TABLE public.users
ADD COLUMN trust_score_breakdown JSONB DEFAULT '{
  "hazards_submitted": 0,
  "hazards_verified": 0,
  "votes_cast": 0,
  "approval_rate": 1.0,
  "last_activity": null
}'::jsonb;
```

### API Endpoints

```typescript
// GET /api/users/:id/trust-score
interface TrustScoreResponse {
  current_score: number;
  tier: string;
  breakdown: TrustScoreFactors;
  recent_events: TrustScoreEvent[];
  next_tier_requirements: {
    tier: string;
    points_needed: number;
  };
}

// POST /api/admin/trust-score/recalculate
// Trigger full recalculation for all users (admin only)

// POST /api/admin/trust-score/adjust
interface AdjustTrustScoreRequest {
  user_id: string;
  adjustment: number;
  reason: string;
}
```

### UI Components

**TrustScoreBadge.svelte**
- Display tier badge with icon
- Tooltip showing score and breakdown
- Progress bar to next tier
- Clickable to view full score details

**TrustScoreDetail.svelte**
- Full breakdown of score components
- Recent score events timeline
- Tier progression chart
- Comparison to community average

**Admin Trust Score Tools**
- Manual score adjustment form
- Score audit log viewer
- Bulk recalculation trigger
- Suspicious pattern detector

---

## 📰 4. Activity Feed System

### Design Philosophy
Show users what's happening with hazards currently visible on their map view. This creates engagement and builds community awareness.

### Activity Event Types

```typescript
type ActivityEventType = 
  | 'hazard_created'      // New hazard reported
  | 'hazard_voted'        // Hazard upvoted/downvoted
  | 'hazard_verified'     // Multiple users confirmed hazard
  | 'hazard_resolved'     // Hazard marked as resolved
  | 'hazard_expired'      // Auto-expired
  | 'hazard_updated'      // Details changed
  | 'image_added'         // New image uploaded
  | 'high_activity'       // Hazard receiving lots of attention
  | 'trust_milestone';    // User reached new trust tier
```

### Database Schema

```sql
CREATE TABLE public.activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    hazard_id UUID REFERENCES hazards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    event_data JSONB, -- Flexible storage for event-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- For efficient map-based filtering
    hazard_location GEOGRAPHY(POINT, 4326)
);

CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_hazard_id ON activity_feed(hazard_id);
CREATE INDEX idx_activity_feed_location ON activity_feed USING GIST(hazard_location);
```

### Feed Filtering

```typescript
interface ActivityFeedFilters {
  // Spatial filter - only show events for visible hazards
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  
  // Time filter
  since?: Date; // Default: last 24 hours
  
  // Event type filter
  event_types?: ActivityEventType[];
  
  // Pagination
  limit?: number; // Default: 20
  offset?: number;
}
```

### Real-time Updates

Use Supabase Realtime for live updates:

```typescript
// Subscribe to new activity events within map bounds
supabase
  .channel('activity_feed')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'activity_feed',
      filter: `hazard_location=st_contains(st_makeenvelope(...))`
    },
    (payload) => {
      // Add new event to feed
      prependActivityEvent(payload.new);
    }
  )
  .subscribe();
```

### Feed Generation Rules

**What gets added to the feed:**
- ✅ All hazard creation events
- ✅ Votes that change net score by ±5 or more
- ✅ Hazards marked as verified (threshold: 3+ positive votes)
- ✅ Hazard resolution events
- ✅ Auto-expiration events
- ✅ New images on high-traffic hazards
- ✅ User trust tier milestones (for hazards they created)

**What doesn't go in the feed:**
- ❌ Individual votes (too noisy, aggregate instead)
- ❌ Hazards in moderation queue
- ❌ Rejected/flagged content
- ❌ Admin actions (separate audit log)
- ❌ Minor edits (unless significant)

### Activity Feed UI

**ActivityFeed.svelte Component**

```typescript
interface Props {
  mapBounds: MapBounds;
  maxEvents?: number; // Default: 20
  showFilters?: boolean;
  compact?: boolean; // Compact view for sidebar
}
```

**Features:**
- Real-time updates via Supabase subscriptions
- Infinite scroll pagination
- Group similar events ("3 hazards created in the last hour")
- Click event to navigate to hazard on map
- Filter by event type
- Time grouping (Today, Yesterday, This Week)
- "New events" notification badge
- Collapse/expand detail view

**Placement Options:**
1. **Sidebar Panel** - Dedicated activity sidebar (desktop)
2. **Map Overlay** - Floating widget on map (mobile/desktop)
3. **Dashboard Widget** - On user dashboard
4. **Dedicated Page** - Full activity feed page

### Event Display Templates

```typescript
const eventTemplates = {
  hazard_created: (event) => 
    `🆕 ${event.user_name} reported a ${event.hazard_category}`,
  
  hazard_voted: (event) => 
    `👍 ${event.hazard_title} received ${event.net_votes} votes`,
  
  hazard_verified: (event) => 
    `✓ Community verified: ${event.hazard_title}`,
  
  hazard_resolved: (event) => 
    `✓ ${event.hazard_title} marked as resolved`,
  
  hazard_expired: (event) => 
    `⏰ ${event.hazard_title} has expired`,
  
  trust_milestone: (event) => 
    `🏆 ${event.user_name} reached ${event.tier} status!`
};
```

### Performance Considerations

- Index on `created_at` for chronological queries
- Spatial index on `hazard_location` for map-based filtering
- Partition table by month for large datasets
- Cache feed in Redis for high-traffic views
- Limit real-time subscriptions to visible map area
- Archive events older than 90 days

### API Endpoints

```typescript
// GET /api/activity-feed
interface ActivityFeedRequest {
  bounds?: MapBounds;
  since?: string; // ISO timestamp
  event_types?: string[];
  limit?: number;
  offset?: number;
}

interface ActivityFeedResponse {
  events: ActivityEvent[];
  total_count: number;
  has_more: boolean;
}

// WebSocket/Realtime endpoint
// ws://api/activity-feed/subscribe
```

---

## 👮 5. Admin Integration

### Overview
Admins need tools to:
- Monitor community health
- Detect and prevent abuse
- Override system decisions
- View comprehensive audit logs
- Manage trust scores manually

### Admin Dashboard Widgets

**1. Voting Patterns Monitor**
```typescript
interface VotingAnomalies {
  suspicious_users: {
    user_id: string;
    rapid_votes_count: number; // Votes in last hour
    vote_reversal_rate: number; // How often they flip votes
    downvote_ratio: number; // % of votes that are negative
  }[];
  
  suspicious_hazards: {
    hazard_id: string;
    rapid_vote_change: boolean; // Sudden spike in votes
    vote_pattern_unusual: boolean; // All votes from new users
    coordinated_activity: boolean; // Multiple votes from same IP range
  }[];
}
```

**2. Expiration Management**
- List of hazards expiring in next 24 hours
- Recently resolved hazards (for verification)
- Seasonal hazards activation schedule
- Override expiration controls

**3. Trust Score Overview**
- Distribution chart (how many users in each tier)
- Recent tier changes
- Suspicious score jumps
- Manual adjustment queue

**4. Activity Feed Moderation**
- High-volume activity alerts
- Spam detection
- Coordinated voting patterns
- Geographic anomalies (all activity from one area)

### Admin Actions

```typescript
interface AdminActions {
  // Voting
  removeVote(voteId: string, reason: string): void;
  flagVotingPattern(userId: string, reason: string): void;
  temporaryVoteBan(userId: string, duration: number): void;
  
  // Expiration
  forceExpireHazard(hazardId: string, reason: string): void;
  restoreExpiredHazard(hazardId: string, newExpiresAt?: Date): void;
  changeExpirationType(hazardId: string, newType: ExpirationType): void;
  
  // Trust Score
  adjustTrustScore(userId: string, adjustment: number, reason: string): void;
  freezeTrustScore(userId: string, reason: string): void;
  recalculateTrustScore(userId: string): void;
  
  // Activity Feed
  hideActivityEvent(eventId: string, reason: string): void;
  flagUser(userId: string, reason: string): void;
}
```

### Admin Audit Log

```sql
CREATE TABLE public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    target_content_id UUID,
    target_content_type TEXT,
    reason TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin_user ON admin_actions(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_actions_target_user ON admin_actions(target_user_id);
```

### Admin UI Components

**AdminVotingMonitor.svelte**
- Table of suspicious voting patterns
- Chart showing vote volume over time
- Action buttons for investigation
- Detailed vote history viewer

**AdminExpirationManager.svelte**
- Calendar view of expiring hazards
- Bulk expiration controls
- Seasonal pattern editor
- Expiration override form

**AdminTrustScoreTools.svelte**
- User search with trust score filter
- Score adjustment form with reason
- Bulk recalculation trigger
- Trust score audit log

**AdminActivityFeed.svelte**
- Full activity feed with admin controls
- Pattern detection highlights
- Hide/flag event actions
- Export data for analysis

### Alerts and Notifications

**Admin Alert Triggers:**
- 🚨 User votes >30 times in 1 hour
- 🚨 Hazard receives >20 votes in 1 hour
- 🚨 Trust score drops >100 points suddenly
- 🚨 Multiple users report same suspicious activity
- 🚨 Geographic clustering of votes (same IP range)
- ⚠️ User reaches negative trust score
- ⚠️ Hazard has >10 resolution reports but not resolved
- ⚠️ Seasonal hazard failed to activate on schedule

### API Endpoints

```typescript
// GET /api/admin/voting/anomalies
interface VotingAnomaliesResponse {
  suspicious_users: SuspiciousUser[];
  suspicious_hazards: SuspiciousHazard[];
  recent_alerts: Alert[];
}

// POST /api/admin/voting/remove
interface RemoveVoteRequest {
  vote_id: string;
  reason: string;
}

// GET /api/admin/expiration/upcoming
interface UpcomingExpirationsResponse {
  expiring_soon: Hazard[]; // Next 24 hours
  pending_resolution: Hazard[]; // Multiple resolution reports
  seasonal_schedule: SeasonalHazard[];
}

// POST /api/admin/trust-score/adjust
interface AdjustTrustScoreRequest {
  user_id: string;
  adjustment: number;
  reason: string;
}

// GET /api/admin/activity-feed/monitor
interface ActivityMonitorResponse {
  high_volume_hazards: Hazard[];
  rapid_voting: ActivityEvent[];
  geographic_anomalies: GeoAnomaly[];
}

// GET /api/admin/audit-log
interface AuditLogRequest {
  admin_user_id?: string;
  action_type?: string;
  since?: string;
  limit?: number;
}
```

---

## 📋 Implementation Roadmap

### Phase 1: Foundation (Days 1-3)
**Goal:** Set up database schema and core API infrastructure

1. ✅ **Database Migrations**
   - Create hazard_votes table
   - Add expiration fields to hazards
   - Create activity_feed table
   - Create trust_score_events table
   - Create admin_actions audit log
   - Add indexes for performance

2. ✅ **TypeScript Types**
   - Update database.ts with new tables
   - Create types for votes, events, scores
   - Add admin action types

3. ✅ **Basic API Routes**
   - Hazard voting endpoints
   - Expiration management endpoints
   - Activity feed query endpoint
   - Trust score calculation endpoint (stub)

### Phase 2: Core Features (Days 4-7)
**Goal:** Implement user-facing voting and expiration features

4. ✅ **Voting System**
   - HazardVoting.svelte component
   - Vote count display
   - Optimistic updates
   - RLS policies for vote security
   - Rate limiting

5. ✅ **Expiration System**
   - Auto-expiration cron job
   - User resolution interface
   - Expiration badge component
   - Admin override UI

6. ✅ **Trust Score Display**
   - TrustScoreBadge component
   - Score breakdown page
   - Recent events timeline

### Phase 3: Advanced Features (Days 8-10)
**Goal:** Activity feed and trust score calculations

7. ✅ **Activity Feed**
   - ActivityFeed.svelte component
   - Real-time subscriptions
   - Event generation triggers
   - Map-based filtering

8. ✅ **Trust Score Algorithm**
   - Implement calculation logic
   - Batch recalculation job
   - Score event tracking
   - Tier progression system

### Phase 4: Admin Tools (Days 11-12)
**Goal:** Build comprehensive admin oversight

9. ✅ **Admin Dashboard**
   - Voting patterns monitor
   - Expiration manager
   - Trust score tools
   - Activity feed moderation

10. ✅ **Admin Actions**
    - Override controls for all systems
    - Audit log viewer
    - Alert system
    - Bulk operations

### Phase 5: Testing & Polish (Days 13-14)
**Goal:** Ensure stability and user experience

11. ✅ **Testing**
    - Unit tests for voting logic
    - Integration tests for API
    - E2E tests for user flows
    - Admin tool testing

12. ✅ **Polish**
    - Performance optimization
    - Mobile responsive design
    - Accessibility improvements
    - User documentation

---

## 🎯 Success Metrics

### User Engagement
- 📊 % of hazards that receive votes
- 📊 Average votes per hazard
- 📊 % of users who vote
- 📊 Resolution report rate

### System Health
- 📊 Vote manipulation detection rate
- 📊 False positive resolution rate
- 📊 Trust score distribution
- 📊 Admin action frequency

### Community Growth
- 📊 Active users per week
- 📊 Trust score progression rate
- 📊 High-tier user retention
- 📊 Activity feed engagement

---

## 🚨 Risk Mitigation

### Technical Risks
1. **Real-time subscription performance** - Limit subscriptions to visible area
2. **Vote manipulation** - Implement rate limiting and pattern detection
3. **Trust score gaming** - Regular algorithm audits and adjustments
4. **Activity feed spam** - Threshold-based filtering and deduplication

### User Experience Risks
1. **Complex trust score** - Clear explanations and tooltips
2. **Expiration confusion** - Prominent status indicators
3. **Voting fatigue** - Don't require votes, make them easy
4. **Feed noise** - Smart filtering and event grouping

### Business Risks
1. **Low engagement** - Gamification and notifications
2. **Abuse of voting** - Strong admin tools and swift action
3. **Incorrect expirations** - Allow easy restoration
4. **Trust score disputes** - Transparent calculation and appeals process

---

## 📝 Open Questions & Decisions Needed

1. **Vote Weight Implementation**
   - Should we implement weighted voting immediately or in Phase 2?
   - Risk: Complicates testing. Benefit: Better quality control.
   - **Recommendation:** Start with simple 1-person-1-vote, add weighting later.

2. **Activity Feed Retention**
   - How long to keep activity events? 30 days? 90 days?
   - **Recommendation:** 90 days, with archival to cold storage.

3. **Trust Score Cap**
   - Should there be a maximum trust score?
   - **Recommendation:** No cap initially, allows for leaderboard gamification.

4. **Auto-Resolution Threshold**
   - How many resolution reports trigger auto-resolve?
   - **Recommendation:** Start with 3, adjust based on abuse patterns.

5. **Expiration Notifications**
   - When to notify creators of impending expiration?
   - **Recommendation:** 24 hours and 1 hour before expiration.

6. **Vote Display Format**
   - Show net score, or separate up/down counts?
   - **Recommendation:** Net score prominently, breakdown on click/hover.

---

## 🔗 Related Documents

- [Project Status](../summaries/PROJECT_STATUS_NOVEMBER_2025.md)
- [Database Schema](../../supabase/migrations/20250821033446_initial_schema.sql)
- [Type Definitions](../../src/lib/types/database.ts)
- [Site Map](../summaries/SITE_MAP.md)

---

**Next Steps:**
1. Review and approve this plan
2. Create database migrations
3. Update TypeScript types
4. Begin Phase 1 implementation

**Questions? Feedback?**
Let's discuss any concerns or adjustments before starting implementation!
