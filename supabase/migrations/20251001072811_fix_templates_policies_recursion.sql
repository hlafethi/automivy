/*
  # Fix infinite recursion in templates table policies

  ## Changes
  1. Drop existing policies on templates that use users table
  2. Create new policies that use user_profiles table instead
  
  ## Security
  - Anyone authenticated can view templates
  - Only admins can insert/update/delete templates
*/

-- Drop existing recursive policies on templates table
DROP POLICY IF EXISTS "Only admins can insert templates" ON templates;
DROP POLICY IF EXISTS "Only admins can update templates" ON templates;
DROP POLICY IF EXISTS "Only admins can delete templates" ON templates;

-- Create new policies using user_profiles to avoid recursion
CREATE POLICY "Only admins can insert templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update templates"
  ON templates FOR UPDATE
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

CREATE POLICY "Only admins can delete templates"
  ON templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
