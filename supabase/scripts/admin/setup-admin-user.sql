-- Quick setup script to fix user permissions
-- Run this in your Supabase SQL Editor

-- First, let's see what users exist
SELECT id, email, role FROM public.users;

-- Update the user to admin role (replace EMAIL with your actual email)
-- Change 'chrisantreasian+5@gmail.com' to your actual email address
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'chrisantreasian@gmail.com';

-- Verify the update
SELECT id, email, role FROM public.users WHERE email = 'chrisantreasian@gmail.com';

-- If the user doesn't exist in the users table, you might need to create it
-- Get your auth user ID first by logging in, then insert into users table:
-- INSERT INTO public.users (id, email, role, trust_score) 
-- VALUES ('your-auth-user-id', 'your-email@gmail.com', 'admin', 100)
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
