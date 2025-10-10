/*
  # Fix infinite recursion in users table policies

  ## Changes
  1. Drop existing policies on users table that cause recursion
  2. Create new policies that use user_profiles table instead
  
  ## Security
  - Users can read their own profile
  - Admins can read all users (checking admin role from user_profiles)
  - Users can update their own profile
*/

-- Drop existing recursive policies on users table
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new policies using user_profiles to avoid recursion
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
