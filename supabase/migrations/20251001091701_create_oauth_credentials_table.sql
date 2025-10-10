/*
  # Create OAuth Credentials Storage

  1. New Tables
    - `oauth_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `provider` (text) - e.g., 'gmail', 'google_sheets', 'slack'
      - `encrypted_data` (jsonb) - stores access_token, refresh_token, etc.
      - `n8n_credential_id` (text, nullable) - ID of credential in n8n
      - `email` (text, nullable) - user's email for this provider
      - `expires_at` (timestamptz, nullable) - when access token expires
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `oauth_credentials` table
    - Add policies for users to manage their own credentials
    - Data is encrypted at rest by Supabase

  3. Important Notes
    - Tokens are stored in JSONB for flexibility
    - Each user can have multiple credentials per provider
    - Credentials are linked to n8n for easy reuse
*/

CREATE TABLE IF NOT EXISTS oauth_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  encrypted_data jsonb NOT NULL,
  n8n_credential_id text,
  email text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_oauth_credentials_user_provider 
  ON oauth_credentials(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_oauth_credentials_n8n_id 
  ON oauth_credentials(n8n_credential_id);

-- Enable RLS
ALTER TABLE oauth_credentials ENABLE ROW LEVEL SECURITY;

-- Users can view their own credentials
CREATE POLICY "Users can view own credentials"
  ON oauth_credentials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own credentials
CREATE POLICY "Users can insert own credentials"
  ON oauth_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials
CREATE POLICY "Users can update own credentials"
  ON oauth_credentials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete own credentials"
  ON oauth_credentials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_oauth_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS oauth_credentials_updated_at ON oauth_credentials;
CREATE TRIGGER oauth_credentials_updated_at
  BEFORE UPDATE ON oauth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_credentials_updated_at();
