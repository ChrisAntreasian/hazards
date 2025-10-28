-- Add admin policies for users table
-- Admins and moderators should be able to read all user data

-- Allow admins and moderators to read all users
CREATE POLICY "Admins can read all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'moderator')
        )
    );

-- Allow admins to update any user
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Test the policies by checking if admin can see all users
SELECT COUNT(*) as total_users FROM users;