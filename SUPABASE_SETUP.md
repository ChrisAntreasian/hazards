# Supabase Setup Instructions

## Option 1: Cloud Supabase (Recommended for now)

1. **Create a Supabase account:**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up for a free account
   - Create a new project named "hazards-app"

2. **Get your project credentials:**
   - Go to Settings > API
   - Copy the Project URL
   - Copy the anon/public key

3. **Update your .env.local file:**
   ```bash
   PUBLIC_SUPABASE_URL=your_project_url_here
   PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Run the database migration:**
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/migrations/20250821033446_initial_schema.sql`
   - Click "Run" to execute the schema

## Option 2: Local Development with Docker

If you have Docker Desktop installed:

```bash
npx supabase start
npx supabase db reset
```

## After Setup

Once you have either option working:

1. Update the environment variables in `.env.local`
2. Restart the development server: `npm run dev`
3. The authentication system will be activated

## Next Steps

After Supabase is configured:
- [ ] Enable authentication hooks
- [ ] Test user registration/login
- [ ] Set up role-based permissions
- [ ] Implement trust score calculation
