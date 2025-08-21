# Hazards App

A community-driven outdoor hazard reporting and education platform built with SvelteKit.

## Overview

This application helps outdoor enthusiasts stay safe by providing:
- **Interactive Map**: View and report hazards with precise location data
- **Educational Content**: Learn to identify and handle various outdoor hazards  
- **Community Verification**: Trust in crowd-sourced information verified by fellow users

Currently focused on the Greater Boston Area with plans to expand to more regions.

## Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Maps**: LibreMaps with Leaflet
- **CMS**: Supawald (Supabase CMS)
- **Image Processing**: Sharp + WebP optimization
- **Styling**: Custom CSS with mobile-first responsive design

## Development Timeline

### ✅ Week 1: Foundation (COMPLETED)
- [x] SvelteKit project setup
- [x] Core dependencies installation
- [x] Project structure and configuration
- [x] Basic routing and layout
- [x] Type definitions and database schema design
- [x] Development server setup

### 🔄 Week 2: Authentication & User Management (NEXT)
- [ ] Supabase project setup and configuration
- [ ] User authentication flow (login/register)
- [ ] Role-based permissions system
- [ ] Trust score calculation foundation
- [ ] User profile management

### 📅 Upcoming Weeks 3-12
- Week 3: Moderation System
- Week 4: Image Processing Pipeline  
- Week 5: Map Integration (Boston focus)
- Week 6: Hierarchical Hazard Creation
- Week 7: Community Features
- Week 8: CMS Content Integration
- Week 9: Performance Optimization
- Week 10: Offline Capabilities
- Week 11: Boston Area Testing
- Week 12: Production Deployment

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open browser**
   Navigate to [http://localhost:5173](http://localhost:5173)

## Project Structure

```
src/
├── lib/
│   ├── types/          # TypeScript type definitions
│   ├── stores/         # Svelte stores for state management
│   ├── utils/          # Utility functions
│   ├── config.ts       # App configuration constants
│   └── supabase.ts     # Supabase client setup
├── routes/
│   ├── auth/           # Authentication pages
│   ├── map/            # Interactive map (placeholder)
│   ├── education/      # Educational content (placeholder)
│   ├── +layout.svelte  # Main app layout
│   └── +page.svelte    # Homepage
└── app.html            # HTML template
```

## Environment Variables

Create a `.env.local` file with:

```bash
# Supabase Configuration (to be set up in Week 2)
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Development settings
VITE_APP_ENV=development
VITE_DEBUG_MODE=true

# Boston region focus for MVP
VITE_DEFAULT_LAT=42.3601
VITE_DEFAULT_LNG=-71.0589
VITE_DEFAULT_ZOOM=13
```

## Boston Area Focus

The MVP is initially focused on the Greater Boston Area to provide:
- Targeted local hazard testing
- Community of local users for validation
- Manageable scope for initial development
- Easy expansion to other regions later

## Contributing

This is currently a private development project. The application is designed to be scalable and region-agnostic for future expansion.

## Next Steps

Ready to proceed with **Week 2: Authentication & User Management**:
1. Set up Supabase project
2. Configure environment variables
3. Implement user authentication
4. Set up role-based permissions
5. Create user management system

---

*Built with ❤️ for outdoor safety*
