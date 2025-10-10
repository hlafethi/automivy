/*
  # Fix infinite recursion in workflows table policies

  ## Changes
  1. Drop existing policies on workflows that use users table
  2. Create new policies that use user_profiles table instead
  
  ## Security
  - Users can view/insert/update/delete their own workflows
  - Admins can view/update/delete all workflows
*/

-- Drop existing recursive policies on workflows table
DROP POLICY IF EXISTS "Admins can view all workflows" ON workflows;
DROP POLICY IF EXISTS "Admins can update all workflows" ON workflows;
DROP POLICY IF EXISTS "Admins can delete all workflows" ON workflows;

-- Create new policies using user_profiles to avoid recursion
CREATE POLICY "Admins can view all workflows"
  ON workflows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all workflows"
  ON workflows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all workflows"
  ON workflows FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
