# 🗺️ Hazards App - Site Map & Architecture
*Last Updated: November 16, 2025*

## 📋 Table of Contents
- [Application Overview](#application-overview)
- [User Flow Diagram](#user-flow-diagram)
- [Route Structure](#route-structure)
- [Component Architecture](#component-architecture)
- [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)

---

## 🎯 Application Overview

**Hazards App** is a community-driven outdoor hazard reporting and education platform focused on the Boston region. Users can report hazards with precise geolocation, upload images, and view an interactive map of reported hazards. The application features role-based access control with moderation and administrative capabilities.

### Core Features
1. **Interactive Map** - Leaflet-based map with hazard markers and layer switching
2. **Hazard Reporting** - Location picker with drawing tools, image uploads, severity ratings
3. **Moderation System** - Queue-based workflow for reviewing community submissions
4. **Admin Panel** - User management, analytics, category management, system configuration
5. **User Profiles** - Trust scores, activity tracking, personal hazard reports
6. **Authentication** - Email/password with OAuth support, role-based permissions

---

## 🔄 User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      PUBLIC ACCESS                          │
│  / (Home) → /map (View Hazards) → /about → /education      │
└─────────────────────────────────────────────────────────────┘
                          ↓ Register/Login
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATED USER                         │
│  /dashboard → /hazards/create → /my-reports → /profile      │
│      ↓            ↓                  ↓             ↓         │
│   Quick Stats   Location Picker   View/Edit    Update Info  │
│                 Image Upload      Reports      Trust Score   │
└─────────────────────────────────────────────────────────────┘
                          ↓ If Moderator/Admin
┌─────────────────────────────────────────────────────────────┐
│                  MODERATOR ACCESS                            │
│  /moderation → Review Queue → Approve/Reject/Flag           │
└─────────────────────────────────────────────────────────────┘
                          ↓ If Admin
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN ACCESS                              │
│  /admin/users → /admin/categories → /admin/analytics        │
│      ↓                ↓                    ↓                 │
│  Manage Roles    Edit Categories    View Statistics         │
│  Trust Scores    Icons & Tree       System Health           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Route Structure

### Public Routes (No Authentication Required)

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/` | Home/Landing | Feature overview, CTA buttons, region info |
| `/map` | Interactive Map | View all approved hazards, location search, layer switcher |
| `/about` | About Page | Project information, mission statement |
| `/education` | Safety Education | Educational content about hazards (future) |

### Authentication Routes

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/auth/log-in` | User Login | Email/password authentication |
| `/auth/register` | User Registration | Email signup with confirmation |
| `/auth/callback` | OAuth Callback | Handle authentication redirects |
| `/auth/forgot-password` | Password Recovery | Email-based password reset |
| `/auth/reset-password` | Password Reset | New password entry |
| `/auth/change-password` | Change Password | Authenticated users change password |
| `/auth/resend-confirmation` | Resend Email | Resend confirmation emails |

### Authenticated User Routes

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/dashboard` | User Dashboard | Quick stats, recent activity, shortcuts |
| `/hazards/create` | Report Hazard | Location picker, map drawing, image upload, categories |
| `/hazards/[id]` | View Hazard | Detailed hazard information (dynamic route) |
| `/hazards/edit/[id]` | Edit Hazard | Modify own hazard reports |
| `/my-reports` | User's Reports | List of all user-submitted hazards with status |
| `/profile` | User Profile | View/edit profile, trust score, activity history |

### Moderator Routes

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/moderation` | Moderation Queue | Review pending hazards, approve/reject/flag |

### Admin Routes

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `/admin` | Admin Dashboard | Redirects to `/admin/users` |
| `/admin/users` | User Management | View users, change roles, manage trust scores |
| `/admin/categories` | Category Management | Edit hazard categories, icons, hierarchy |
| `/admin/analytics` | Analytics Dashboard | System statistics, usage metrics |
| `/admin/config` | System Configuration | Application settings (future) |

### API Routes

| Route | Purpose | Authentication |
|-------|---------|----------------|
| `/api/images/*` | Image operations | Required |
| `/api/admin/*` | Admin operations | Admin only |
| `/api/moderation/*` | Moderation operations | Moderator+ |
| `/api/validation/*` | Data validation | Required |
| `/api/test/*` | Testing endpoints | Development only |

### Development Routes (Dev Only)

| Route | Purpose |
|-------|---------|
| `/dev` | Development tools |
| `/dev/basemap-test` | Test base map components |
| `/dev/layer-switcher-test` | Test layer switching |
| `/dev/map-drawing-test` | Test drawing tools |
| `/dev/map-location-marker-test` | Test location markers |
| `/dev/map-picker` | Test location picker |
| `/dev/mapmarkers-test` | Test hazard markers |
| `/dev/simple-map` | Basic map test |
| `/dev/status` | System status |
| `/dev/test` | General testing |

---

## 🧩 Component Architecture

### Core Layout Components
```
src/routes/
├── +layout.svelte           # Root layout with navigation
├── +layout.server.ts        # Server-side authentication
└── Header.svelte            # Navigation header
```

### Reusable UI Components

#### 🗺️ Map Components (`src/lib/components/map/`)
- **BaseMap.svelte** - Foundation Leaflet map with unified configuration
- **MapLocationPicker.svelte** - Location selection with marker + drawing
- **MapLocationSearch.svelte** - Geocoding and coordinate search
- **MapLocationMarker.svelte** - Single draggable marker
- **MapMarkers.svelte** - Multiple hazard markers with clustering
- **MapDrawing.svelte** - Polygon/area drawing tools
- **MapUserLocation.svelte** - User location tracking
- **MapLayerSwitcher.svelte** - Switch between map tile layers
- **context.ts** - Svelte 5 context for map state
- **types.ts** - TypeScript definitions
- **utils.ts** - Map utilities
- **layers.ts** - Map layer definitions

#### 🖼️ Image Components
- **ImageUpload.svelte** - Multi-file upload with drag-drop
- **ImageGallery.svelte** - Image display with voting
- **OptimizedImage.svelte** - Lazy-loaded responsive images
- **ImageDeleteModal.svelte** - Confirmation dialog for deletion
- **ProfileImageUpload.svelte** - Avatar upload

#### 🔐 Authentication Components (`src/lib/components/auth/`)
- **AuthFormWrapper.svelte** - Standard form layout
- **AuthGuard.svelte** - Route protection wrapper
- **AuthLinks.svelte** - Login/register links
- **FormButton.svelte** - Styled form button
- **FormField.svelte** - Standard input field
- **MessageDisplay.svelte** - Success/error messages
- **ResendConfirmation.svelte** - Email resend UI

#### 👮 Admin Components (`src/lib/components/admin/`)
- **UserManagement.svelte** - User list and role management
- **CategoryManagement.svelte** - Category tree editor
- **AnalyticsDashboard.svelte** - Statistics and charts
- **SystemConfiguration.svelte** - Settings panel

#### ⚖️ Moderation Components
- **ModerationQueue.svelte** - Queue interface with actions

#### 🛠️ Utility Components
- **LazyLoad.svelte** - Lazy load heavy components
- **FieldValidator.svelte** - Form validation UI
- **ValidationFeedback.svelte** - Validation messages

---

## 🗄️ Database Schema

### Core Tables

#### **users**
- User accounts with authentication
- Trust scores, roles, display names
- Created/updated timestamps

#### **hazards**
- Hazard reports with location (PostGIS geography)
- Category, severity, seasonal flags
- Status: pending, approved, rejected, removed
- Area polygon (optional) and zoom level
- User attribution

#### **hazard_categories**
- Hierarchical category tree (using `ltree` path)
- Icons, names, descriptions
- Activity status

#### **hazard_images**
- Image metadata and storage references
- Vote counts (upvotes/downvotes)
- Geolocation and EXIF data
- Processed image sizes

#### **hazard_ratings**
- User ratings on hazards
- Comments and trust verification

#### **image_votes**
- Individual image votes by users
- Prevents duplicate voting

#### **moderation_queue**
- Pending content reviews
- Moderator actions and notes
- Status tracking

#### **regions**
- Geographic regions (Boston-focused)
- Boundary definitions

#### **hazard_templates**
- Pre-defined hazard information
- Guidance for common hazards

### Recent Schema Updates
- ✅ `hazards.area` - Polygon support (October 26, 2025)
- ✅ `hazards.zoom` - Zoom level tracking (November 2, 2025)

---

## 👥 User Roles & Permissions

### Role Hierarchy

| Role | Level | Permissions |
|------|-------|-------------|
| **new_user** | 1 | View hazards, limited submissions |
| **contributor** | 2 | Create hazards, upload images |
| **trusted_user** | 3 | Vote on images, rate hazards |
| **content_editor** | 4 | Edit community content |
| **moderator** | 5 | Review submissions, approve/reject |
| **admin** | 10 | Full system access, user management |
| **banned** | 0 | No access |

### Trust Score System
- New users start at 0 trust score
- Trust increases with verified contributions
- Trust affects content visibility and permissions
- Displayed on profiles and dashboard

### Permission Examples
```typescript
// Moderation access
role in ['moderator', 'admin']

// Content creation
role in ['contributor', 'trusted_user', 'content_editor', 'moderator', 'admin']

// Admin panel access
role = 'admin'
```

---

## 🔌 Integration Points

### Supabase Services
1. **Authentication** - User sign up, login, session management
2. **Database** - PostgreSQL with PostGIS extension
3. **Storage** - Image bucket with RLS policies
4. **Real-time** - Future implementation for live updates

### External Services
1. **Leaflet** - Interactive mapping library
2. **OpenStreetMap** - Default base map tiles
3. **Nominatim** - Geocoding for location search
4. **Sharp** - Server-side image processing (via API routes)

### File Storage Structure
```
hazard-images/
├── originals/
│   └── {hazard_id}/{image_id}.{ext}
├── thumbnails/
│   └── {hazard_id}/{image_id}_thumb.webp
└── optimized/
    └── {hazard_id}/{image_id}_optimized.webp
```

---

## 📊 Application State Management

### Stores (`src/lib/stores/`)
- **auth.ts** - Authentication state management

### Utilities (`src/lib/utils/`)
- **hazard-location.ts** - Location/coordinate utilities
- **helpers.ts** - General helper functions
- **logger.ts** - Application logging
- **map-simplification.ts** - Polygon simplification
- **moderation.ts** - Moderation helpers
- **routeProtection.ts** - Route guard utilities
- **sessionUtils.ts** - Session management

### Type Definitions (`src/lib/types/`)
- **admin.ts** - Admin-specific types
- **auth.ts** - Authentication types
- **database.ts** - Database schema types
- **images.ts** - Image processing types
- **moderation.ts** - Moderation types

---

## 🎨 Styling & Theming

### CSS Variables
Application uses CSS custom properties defined in `src/app.css` for consistent theming:
- Primary colors
- Text colors (primary, secondary, muted)
- Background colors
- Border colors
- Status colors (success, error, warning)
- Severity colors (low, medium, high)

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## 🚀 Key Features Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Interactive Map | ✅ Complete | Full Leaflet integration with layers |
| Location Picker | ✅ Complete | Map selection + drawing tools |
| Hazard Creation | ✅ Complete | Form with validation and image upload |
| Image Upload | ✅ Complete | Multi-file with drag-drop |
| User Authentication | ✅ Complete | Email + OAuth ready |
| User Dashboard | ✅ Complete | Stats and quick actions |
| My Reports | ✅ Complete | List view with status |
| Moderation Queue | ✅ Complete | Review workflow |
| Admin Panel | ✅ Complete | Users, categories, analytics |
| Category System | ✅ Complete | Hierarchical tree structure |
| Trust Scores | ⚠️ Partial | Display only, algorithm pending |
| Image Voting | ⚠️ Partial | UI incomplete |
| Education Content | ❌ Pending | Route exists, content needed |
| PWA Features | ❌ Pending | Offline support planned |

---

## 📝 Development Notes

### Recent Improvements
1. **Map Unification** - Unified all map components to use BaseMap foundation
2. **Zoom Level Tracking** - Hazards now store their optimal zoom level
3. **Area Drawing** - Polygon support for hazard regions
4. **Component Refactoring** - Moved to Svelte 5 runes syntax

### Known Issues & Improvements Needed
1. **Image Gallery Voting** - UI needs completion
2. **Trust Score Algorithm** - Backend calculation pending
3. **Search & Filtering** - Global hazard search needed
4. **Mobile UX** - Map interactions need polish
5. **Education Content** - CMS integration pending
6. **Performance** - Map clustering optimization needed
7. **Testing** - E2E tests for critical paths

### Future Enhancements
- Real-time hazard updates via Supabase subscriptions
- Mobile PWA with offline support
- Advanced search and filtering
- Hazard notifications based on user location
- Community badges and achievements
- Export hazard data (CSV, GeoJSON)
- API for third-party integrations

---

*This site map reflects the current state of the application as of November 16, 2025. For project status and timeline, see `PROJECT_STATUS_NOVEMBER_2025.md`.*
