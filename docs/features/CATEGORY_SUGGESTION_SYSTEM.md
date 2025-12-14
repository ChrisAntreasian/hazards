# Category Suggestion System

## Overview

The Category Suggestion System allows users to propose new hazard categories when existing ones don't fit their reported hazard. This enables the community to help expand the hazard taxonomy while maintaining quality control through moderator review.

## Features

### For Users

#### Suggesting a New Category
When creating a hazard report, if none of the existing categories fit:

1. Open the category dropdown on the hazard creation form
2. Select **"➕ Suggest a New Category..."** at the bottom of the list
3. Fill out the suggestion form:
   - **Icon**: Choose an emoji icon for the category
   - **Category Name**: A clear, descriptive name (e.g., "Venomous Snakes")
   - **Parent Category**: Choose where it belongs in the hierarchy (or leave as root level)
   - **Description**: Explain what this category includes and why it's needed

#### Trust Score Benefits
Users with a **trust score of 500 or higher** can create **provisional categories**:
- The category is immediately available for use
- Still requires moderator approval to become permanent
- Allows trusted community members to fill gaps quickly

Users with lower trust scores:
- Submit suggestions for review
- Their hazard is filed under "Other" until the category is approved
- Building trust unlocks provisional category creation

### For Moderators/Admins

#### Accessing the Review Panel
1. Go to `/moderation` and click **"📂 Category Suggestions"**
2. Or go directly to `/admin/categories` and select the **"📝 Review Suggestions"** tab

#### Review Actions
For each pending suggestion, moderators can:

| Action | Effect |
|--------|--------|
| **Approve** | Creates the category (or activates provisional), suggestion marked as approved |
| **Reject** | Suggestion marked as rejected with optional notes explaining why |

#### Suggestion Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting moderator review |
| `provisional` | Created by trusted user, awaiting confirmation |
| `active` | Approved and available for use |
| `rejected` | Not approved |
| `archived` | No longer relevant |

## Database Schema

### category_suggestions table
```sql
CREATE TABLE category_suggestions (
  id UUID PRIMARY KEY,
  suggested_name VARCHAR(100) NOT NULL,
  suggested_path VARCHAR(500),
  suggested_parent_id UUID REFERENCES hazard_categories(id),
  suggested_icon VARCHAR(50),
  description TEXT,
  suggested_by UUID NOT NULL REFERENCES auth.users(id),
  user_trust_score INTEGER DEFAULT 0,
  status category_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  approved_category_id UUID REFERENCES hazard_categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### hazard_categories additions
```sql
ALTER TABLE hazard_categories ADD COLUMN
  status category_status DEFAULT 'active',
  description TEXT,
  suggested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE;
```

### "Other" Catch-all Category
An "Other" category with "Uncategorized" subcategory is automatically created:
- Used as fallback for hazards with pending category suggestions
- Path: `other` and `other/uncategorized`

## API Endpoints

### POST /api/categories/suggest
Submit a new category suggestion.

**Request:**
```json
{
  "name": "Venomous Snakes",
  "path": "animals/venomous-snakes",
  "parent_id": "uuid-of-animals-category",
  "icon": "🐍",
  "description": "Hazards involving venomous snake species"
}
```

**Response (regular user):**
```json
{
  "success": true,
  "type": "suggestion",
  "message": "Category suggestion submitted!",
  "suggestion": { ... }
}
```

**Response (trusted user with 500+ trust score):**
```json
{
  "success": true,
  "type": "provisional",
  "message": "Category created successfully!",
  "category": { ... }
}
```

### GET /api/categories/suggest
Get pending suggestions (admin/moderator only).

**Query Parameters:**
- `status` - Comma-separated statuses (default: `pending,provisional`)
- `limit` - Max results (default: 50)
- `offset` - Pagination offset (default: 0)

### PATCH /api/categories/review/[id]
Review a suggestion.

**Request:**
```json
{
  "action": "approve",  // or "reject"
  "notes": "Optional review notes"
}
```

## Components

### CategorySelector.svelte
Enhanced category dropdown with suggestion support:
- Hierarchical category display
- "Suggest a New Category" option
- Inline suggestion form
- Trust score aware (shows provisional creation for trusted users)

**Props:**
```typescript
interface Props {
  categories: HazardCategory[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onCategorySuggested?: (suggestion: CategorySuggestion) => void;
  userTrustScore?: number;
  disabled?: boolean;
}
```

### CategorySuggestionReview.svelte
Admin panel for reviewing suggestions:
- List of pending/provisional suggestions
- Filter by status
- Detail view with approve/reject actions
- Review notes support

## Files

| File | Purpose |
|------|---------|
| `src/lib/components/CategorySelector.svelte` | User-facing category selection with suggestion support |
| `src/lib/components/admin/CategorySuggestionReview.svelte` | Admin review interface |
| `src/routes/api/categories/suggest/+server.ts` | Suggestion submission & listing API |
| `src/routes/api/categories/review/[id]/+server.ts` | Review action API |
| `src/routes/admin/categories/+page.svelte` | Admin categories page with tabs |
| `supabase/migrations/20251213000001_add_category_management.sql` | Database migration |

## Flow Diagram

```
User Reports Hazard
        │
        ▼
┌─────────────────────┐
│ Category Dropdown   │
└─────────────────────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
Existing  "Suggest New"
Category     │
   │         ▼
   │    ┌─────────────┐
   │    │ Fill Form   │
   │    └─────────────┘
   │         │
   │    ┌────┴────────────┐
   │    │                 │
   │    ▼                 ▼
   │  Trust < 500     Trust >= 500
   │    │                 │
   │    ▼                 ▼
   │  "Pending"      "Provisional"
   │  Suggestion      Category
   │    │                 │
   │    └────────┬────────┘
   │             │
   │             ▼
   │    ┌─────────────────┐
   │    │ Moderator Review│
   │    └─────────────────┘
   │         │
   │    ┌────┴────┐
   │    │         │
   │    ▼         ▼
   │  Approve   Reject
   │    │         │
   │    ▼         │
   │  Active      │
   │  Category    │
   │    │         │
   └────┴─────────┘
        │
        ▼
  Hazard Created
```

## Configuration

### Trust Score Threshold
The threshold for provisional category creation is **500 trust points**.

To modify this, update:
1. `src/routes/api/categories/suggest/+server.ts` - Line with `canCreateProvisional`
2. `src/lib/components/CategorySelector.svelte` - Line with `canCreateProvisional`
3. `supabase/migrations/...` - The `create_provisional_category` function

## Related Features

- **Trust Score System** - Determines who can create provisional categories
- **Educational Links** - Categories link to educational content about hazards
- **Hazard Templates** - Categories can have associated templates
