/*
  # Create Admin API Keys Table

  1. New Tables
    - `admin_api_keys`
      - `id` (uuid, primary key)
      - `service_name` (text) - Name of the AI service (e.g., 'openai', 'anthropic', 'google')
      - `api_key` (text) - Encrypted API key
      - `description` (text) - Optional description of the key
      - `is_active` (boolean) - Whether the key is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid) - Admin user who created the key

  2. Security
    - Enable RLS on `admin_api_keys` table
    - Only admin users can read/write API keys
    - Regular users cannot access this table

  3. Important Notes
    - API keys should be encrypted at rest
    - Only admins (role in user_profiles) can manage these keys
    - These keys will be injected into user workflows automatically
*/

CREATE TABLE IF NOT EXISTS admin_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  api_key text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(service_name)
);

ALTER TABLE admin_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can view API keys
CREATE POLICY "Admins can view API keys"
  ON admin_api_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Only admins can insert API keys
CREATE POLICY "Admins can insert API keys"
  ON admin_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Only admins can update API keys
CREATE POLICY "Admins can update API keys"
  ON admin_api_keys
  FOR UPDATE
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

-- Only admins can delete API keys
CREATE POLICY "Admins can delete API keys"
  ON admin_api_keys
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_service ON admin_api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_active ON admin_api_keys(is_active);
