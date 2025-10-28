# 🚨 Hazards - Community Outdoor Safety Platform# Hazards App



> **A crowd-sourced hazard reporting and verification system empowering outdoor enthusiasts to share, discover, and stay informed about environmental dangers in their area.**A community-driven outdoor hazard reporting and education platform built with SvelteKit.



[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)](https://kit.svelte.dev/)## Overview

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)This application helps outdoor enthusiasts stay safe by providing:

- **Interactive Map**: View and report hazards with precise location data

---- **Educational Content**: Learn to identify and handle various outdoor hazards  

- **Community Verification**: Trust in crowd-sourced information verified by fellow users

## 🎯 What is Hazards?

Currently focused on the Greater Boston Area with plans to expand to more regions.

**Hazards** is a community-driven platform designed to help hikers, bikers, runners, and outdoor enthusiasts **report**, **verify**, and **discover** environmental hazards in real-time. Think of it as a "Waze for the outdoors" - where the community collaborates to keep everyone safe.

## Tech Stack

### Core Problems We Solve

- **Frontend**: SvelteKit with TypeScript

1. **💀 Hidden Dangers**: Broken glass, sharp objects, poisonous plants, and unstable terrain often go unreported- **Backend**: Supabase (PostgreSQL + Auth + Storage)

2. **📍 Location Precision**: Generic warnings aren't helpful - you need exact coordinates and area boundaries- **Maps**: LibreMaps with Leaflet

3. **⏰ Time-Sensitive Info**: Yesterday's hazard may be cleared today, or new ones may emerge- **CMS**: Supawald (Supabase CMS)

4. **🤝 Trust & Verification**: Not all reports are accurate - we need community validation- **Image Processing**: Sharp + WebP optimization

5. **📱 Accessibility**: Information should be available offline and on mobile devices- **Styling**: Custom CSS with mobile-first responsive design



### Key Features## Development Timeline



#### ✅ **Implemented**### ✅ Week 1: Foundation (COMPLETED)

- 🗺️ **Interactive Map with Area Drawing**: Report hazards with precise point locations or draw polygons around affected areas- [x] SvelteKit project setup

- 📸 **Multi-Image Upload**: Upload up to 8 photos with automatic thumbnail generation and WebP optimization- [x] Core dependencies installation

- 🔐 **Authentication & Authorization**: Secure user accounts with role-based permissions (Admin, Moderator, User)- [x] Project structure and configuration

- 🛡️ **Content Moderation System**: Admin queue for reviewing user-submitted hazard reports and images- [x] Basic routing and layout

- 📊 **Trust Score System**: User reputation based on accurate reports and community feedback- [x] Type definitions and database schema design

- 🏷️ **Hierarchical Categories**: Organized hazard classification (Wildlife → Insects → Ticks, etc.)- [x] Development server setup

- 📱 **Responsive Design**: Mobile-first UI that works on all devices

- 🎨 **Image Gallery**: Lightbox viewer with keyboard navigation and lazy loading### 🔄 Week 2: Authentication & User Management (NEXT)

- 🔍 **Content Validation**: Real-time form validation and content pre-screening- [ ] Supabase project setup and configuration

- 👤 **User Profiles**: Track your reports, view statistics, and manage account settings- [ ] User authentication flow (login/register)

- 📈 **Admin Dashboard**: System analytics, user management, and moderation tools- [ ] Role-based permissions system

- [ ] Trust score calculation foundation

#### 🚧 **In Development**- [ ] User profile management

- 🗺️ Educational content integration

- 📍 Advanced map filtering and clustering### 📅 Upcoming Weeks 3-12

- 🔔 Proximity alerts and notifications- Week 3: Moderation System

- 📴 Offline mode with service workers- Week 4: Image Processing Pipeline  

- 🌐 Multi-region support- Week 5: Map Integration (Boston focus)

- Week 6: Hierarchical Hazard Creation

---- Week 7: Community Features

- Week 8: CMS Content Integration

## 🏗️ Architecture & Tech Stack- Week 9: Performance Optimization

- Week 10: Offline Capabilities

### Frontend- Week 11: Boston Area Testing

- **Framework**: SvelteKit 2.x with Svelte 5 (runes API)- Week 12: Production Deployment

- **Language**: TypeScript (strict mode)

- **Styling**: Custom CSS with CSS variables for theming## Getting Started

- **Maps**: Leaflet with LibreMaps tiles

- **State Management**: Svelte stores + reactive bindings1. **Install dependencies**

- **Forms**: Enhanced progressive forms with server actions   ```bash

- **Testing**: Vitest + Testing Library   npm install

   ```

### Backend

- **Database**: PostgreSQL (via Supabase)2. **Start development server**

- **Authentication**: Supabase Auth (magic links, OAuth)   ```bash

- **Storage**: Supabase Storage (image hosting)   npm run dev

- **API**: SvelteKit server endpoints + Supabase RLS   ```

- **Image Processing**: Sharp for optimization, WebP conversion

- **Security**: Row Level Security (RLS), content pre-screening3. **Open browser**

   Navigate to [http://localhost:5173](http://localhost:5173)

### Infrastructure

- **Hosting**: Vercel (frontend), Supabase (backend)## Project Structure

- **CI/CD**: GitHub Actions

- **Monitoring**: Supabase logs + custom logging utility```

- **Version Control**: Git with conventional commitssrc/

├── lib/

---│   ├── types/          # TypeScript type definitions

│   ├── stores/         # Svelte stores for state management

## 🚀 Getting Started│   ├── utils/          # Utility functions

│   ├── config.ts       # App configuration constants

### Prerequisites│   └── supabase.ts     # Supabase client setup

├── routes/

- **Node.js** 20+ and npm│   ├── auth/           # Authentication pages

- **Supabase Account** (free tier works)│   ├── map/            # Interactive map (placeholder)

- **Git** for version control│   ├── education/      # Educational content (placeholder)

│   ├── +layout.svelte  # Main app layout

### Installation│   └── +page.svelte    # Homepage

└── app.html            # HTML template

1. **Clone the repository**```

   ```bash

   git clone https://github.com/ChrisAntreasian/hazards.git## Environment Variables

   cd hazards

   ```Create a `.env.local` file with:



2. **Install dependencies**```bash

   ```bash# Supabase Configuration (to be set up in Week 2)

   npm installPUBLIC_SUPABASE_URL=your_supabase_project_url

   ```PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key



3. **Set up environment variables**# Development settings

   VITE_APP_ENV=development

   Create a `.env.local` file in the root directory:VITE_DEBUG_MODE=true

   ```bash

   # Supabase Configuration# Boston region focus for MVP

   PUBLIC_SUPABASE_URL=https://your-project.supabase.coVITE_DEFAULT_LAT=42.3601

   PUBLIC_SUPABASE_ANON_KEY=your-anon-key-hereVITE_DEFAULT_LNG=-71.0589

   VITE_DEFAULT_ZOOM=13

   # App Configuration```

   PUBLIC_APP_NAME=Hazards

   PUBLIC_APP_URL=http://localhost:5173## Boston Area Focus

   

   # Map Configuration (Boston area default)The MVP is initially focused on the Greater Boston Area to provide:

   PUBLIC_DEFAULT_LAT=42.3601- Targeted local hazard testing

   PUBLIC_DEFAULT_LNG=-71.0589- Community of local users for validation

   PUBLIC_DEFAULT_ZOOM=13- Manageable scope for initial development

   - Easy expansion to other regions later

   # Feature Flags

   PUBLIC_ENABLE_ANALYTICS=false## Contributing

   PUBLIC_ENABLE_OFFLINE=false

   ```This is currently a private development project. The application is designed to be scalable and region-agnostic for future expansion.



4. **Set up Supabase database**## Next Steps

   

   Apply the migrations:Ready to proceed with **Week 2: Authentication & User Management**:

   ```bash1. Set up Supabase project

   cd supabase2. Configure environment variables

   supabase db push3. Implement user authentication

   ```4. Set up role-based permissions

   5. Create user management system

   Or manually run the SQL scripts in order from `supabase/migrations/`

---

5. **Run development server**

   ```bash*Built with ❤️ for outdoor safety*

   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:5173](http://localhost:5173)

### First-Time Setup

After starting the app:

1. **Create an account** using the Sign Up link
2. **Verify your email** (check spam folder if needed)
3. **Create your first hazard report** from the map page
4. Upload a photo to test the image pipeline

---

## 📁 Project Structure

```
hazards/
├── src/                          # Application source code
│   ├── lib/
│   │   ├── components/          # Reusable Svelte components
│   │   │   ├── admin/          # Admin-only components
│   │   │   └── auth/           # Authentication UI
│   │   ├── hooks/              # Custom hooks (useAuth, etc.)
│   │   ├── images/             # Image processing utilities
│   │   ├── stores/             # Svelte stores for global state
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Helper functions
│   │   ├── validation/         # Form validation logic
│   │   ├── config.ts           # App configuration
│   │   └── supabase.ts         # Supabase client setup
│   ├── routes/                 # SvelteKit file-based routing
│   │   ├── admin/              # Admin panel pages
│   │   ├── api/                # API endpoints
│   │   ├── auth/               # Auth pages (login, register)
│   │   ├── dashboard/          # User dashboard
│   │   ├── hazards/            # Hazard CRUD pages
│   │   ├── map/                # Interactive map view
│   │   ├── profile/            # User profile
│   │   └── +layout.svelte      # Root layout
│   └── app.html                # HTML template
│
├── supabase/                    # Supabase configuration
│   ├── migrations/             # Database schema migrations
│   └── scripts/                # Utility SQL scripts
│       ├── admin/              # Admin setup scripts
│       ├── storage/            # Storage bucket config
│       ├── seed/               # Test data seeding
│       └── utility/            # Helper queries
│
├── docs/                        # Documentation
│   ├── planning/               # Design documents
│   ├── summaries/              # Progress reports
│   ├── setup/                  # Setup guides
│   └── archive/                # Old planning docs
│
├── static/                      # Static assets
│   ├── favicon.svg
│   └── robots.txt
│
├── package.json                 # Dependencies
├── svelte.config.js            # SvelteKit configuration
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite bundler config
└── vitest.config.ts            # Test configuration
```

---

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Run svelte-check for type errors
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm test             # Run unit tests
npm run test:ui      # Run tests with UI
```

### Database Management

```bash
# Apply migrations
supabase db push

# Create new migration
supabase migration new migration_name

# Reset database (destructive!)
supabase db reset

# Generate TypeScript types from schema
npm run generate-types
```

### Code Quality

- **TypeScript**: Strict mode enabled, no implicit `any`
- **Linting**: ESLint with SvelteKit rules
- **Formatting**: Prettier with Svelte plugin
- **Testing**: Component tests with Vitest
- **Validation**: Form validation on client and server

---

## 🗺️ Feature Roadmap

### Phase 1: Core Platform ✅ (Current)
- [x] User authentication
- [x] Hazard CRUD operations
- [x] Interactive map with area drawing
- [x] Image upload and optimization
- [x] Content moderation queue
- [x] Admin dashboard
- [x] User profiles

### Phase 2: Community Features 🚧 (Next)
- [ ] Voting and verification system
- [ ] Comments and discussions
- [ ] Hazard status updates (resolved, persistent)
- [ ] User notifications
- [ ] Following other users

### Phase 3: Enhanced Experience
- [ ] Educational content (plant/animal identification)
- [ ] Proximity alerts
- [ ] Mobile app (React Native or PWA)
- [ ] Offline mode
- [ ] Export routes with hazard overlays

### Phase 4: Scale & Expand
- [ ] Multi-region support
- [ ] Integration with trail apps
- [ ] Public API for developers
- [ ] Premium features (analytics, custom alerts)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commits
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Build/config changes
```

---

## 📄 License

This project is currently **private** and proprietary. All rights reserved.

---

## 🙏 Acknowledgments

- **SvelteKit** for the amazing framework
- **Supabase** for backend-as-a-service
- **Leaflet** for map rendering
- **Sharp** for image processing
- The outdoor community for inspiration

---

## 📞 Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues (coming soon)
- **Discussions**: GitHub Discussions (coming soon)

---

**Built with ❤️ for outdoor safety by [@ChrisAntreasian](https://github.com/ChrisAntreasian)**
