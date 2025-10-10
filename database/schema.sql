/*
  # PostgreSQL Schema for Automivy Dashboard
  
  ## Overview
  Complete database schema for multi-user n8n automation dashboard with role-based access control.
  Migrated from Supabase to standalone PostgreSQL.
  
  ## Tables Structure
  
  ### `users`
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email for authentication
  - `password_hash` (text) - Hashed password using bcrypt
  - `role` (text) - User role: 'user' or 'admin'
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### `user_profiles`
  - `id` (uuid, primary key) - References users.id
  - `email` (text, not null)
  - `role` (text, default 'user') - Either 'user' or 'admin'
  - `created_at` (timestamptz, default now())
  
  ### `templates`
  - `id` (uuid, primary key) - Unique template identifier
  - `name` (text) - Template display name
  - `description` (text) - Template description
  - `json` (jsonb) - Complete n8n workflow JSON definition
  - `created_by` (uuid, foreign key) - Reference to admin who created template
  - `created_at` (timestamptz) - Template creation timestamp
  
  ### `workflows`
  - `id` (uuid, primary key) - Unique workflow identifier
  - `user_id` (uuid, foreign key) - Reference to user who owns workflow
  - `template_id` (uuid, foreign key) - Reference to source template
  - `n8n_workflow_id` (text) - ID returned by n8n API
  - `name` (text) - Workflow name (format: templateName-userID)
  - `params` (jsonb) - User-configured parameters
  - `is_active` (boolean) - Whether workflow is active in n8n
  - `created_at` (timestamptz) - Workflow creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `admin_api_keys`
  - `id` (uuid, primary key)
  - `service_name` (text) - Name of the AI service (e.g., 'openai', 'anthropic', 'google')
  - `api_key` (text) - Encrypted API key
  - `description` (text) - Optional description of the key
  - `is_active` (boolean) - Whether the key is currently active
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `created_by` (uuid) - Admin user who created the key
  
  ### `oauth_credentials`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `provider` (text) - e.g., 'gmail', 'google_sheets', 'slack'
  - `encrypted_data` (jsonb) - stores access_token, refresh_token, etc.
  - `n8n_credential_id` (text, nullable) - ID of credential in n8n
  - `email` (text, nullable) - user's email for this provider
  - `expires_at` (timestamptz, nullable) - when access token expires
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `email_credentials`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `email_address` (text) - The email address
  - `imap_host` (text) - IMAP server host
  - `imap_port` (integer) - IMAP port (default 993)
  - `imap_user` (text) - IMAP username
  - `imap_password` (text) - Encrypted IMAP password
  - `smtp_host` (text) - SMTP server host
  - `smtp_port` (integer) - SMTP port (default 587)
  - `smtp_user` (text) - SMTP username
  - `smtp_password` (text) - Encrypted SMTP password
  - `smtp_secure` (boolean) - Use TLS/SSL (default true)
  - `n8n_imap_credential_id` (text) - n8n credential ID for IMAP
  - `n8n_smtp_credential_id` (text) - n8n credential ID for SMTP
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only read their own workflows
  - Admins can read all data
  - Only admins can create/modify templates
  - Users can create workflows for themselves
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text DEFAULT '',
  json jsonb NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
  n8n_workflow_id text,
  name text NOT NULL,
  params jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_api_keys table
CREATE TABLE IF NOT EXISTS admin_api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name text NOT NULL,
  api_key text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  UNIQUE(service_name)
);

-- Create oauth_credentials table
CREATE TABLE IF NOT EXISTS oauth_credentials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  encrypted_data jsonb NOT NULL,
  n8n_credential_id text,
  email text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_credentials table
CREATE TABLE IF NOT EXISTS email_credentials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email_address text NOT NULL,
  imap_host text NOT NULL,
  imap_port integer DEFAULT 993 NOT NULL,
  imap_user text NOT NULL,
  imap_password text NOT NULL,
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password text,
  smtp_secure boolean DEFAULT true,
  n8n_imap_credential_id text,
  n8n_smtp_credential_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_service ON admin_api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_active ON admin_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_oauth_credentials_user_provider ON oauth_credentials(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_credentials_n8n_id ON oauth_credentials(n8n_credential_id);
CREATE INDEX IF NOT EXISTS idx_email_credentials_user_id ON email_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_email_credentials_email_address ON email_credentials(email_address);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (id = current_setting('app.current_user_id', true)::uuid);

-- Create RLS policies for user_profiles table
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = current_setting('app.current_user_id', true)::uuid);

-- Create RLS policies for templates table
CREATE POLICY "Anyone authenticated can view templates"
  ON templates FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert templates"
  ON templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update templates"
  ON templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete templates"
  ON templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

-- Create RLS policies for workflows table
CREATE POLICY "Users can view own workflows"
  ON workflows FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Admins can view all workflows"
  ON workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own workflows"
  ON workflows FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update own workflows"
  ON workflows FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Admins can update all workflows"
  ON workflows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can delete own workflows"
  ON workflows FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Admins can delete all workflows"
  ON workflows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

-- Create RLS policies for admin_api_keys table
CREATE POLICY "Admins can view API keys"
  ON admin_api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert API keys"
  ON admin_api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update API keys"
  ON admin_api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete API keys"
  ON admin_api_keys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = current_setting('app.current_user_id', true)::uuid
      AND user_profiles.role = 'admin'
    )
  );

-- Create RLS policies for oauth_credentials table
CREATE POLICY "Users can view own credentials"
  ON oauth_credentials FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can insert own credentials"
  ON oauth_credentials FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update own credentials"
  ON oauth_credentials FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can delete own credentials"
  ON oauth_credentials FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Create RLS policies for email_credentials table
CREATE POLICY "Users can view own email credentials"
  ON email_credentials FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can insert own email credentials"
  ON email_credentials FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update own email credentials"
  ON email_credentials FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can delete own email credentials"
  ON email_credentials FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS workflows_updated_at ON workflows;
CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS admin_api_keys_updated_at ON admin_api_keys;
CREATE TRIGGER admin_api_keys_updated_at
  BEFORE UPDATE ON admin_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS oauth_credentials_updated_at ON oauth_credentials;
CREATE TRIGGER oauth_credentials_updated_at
  BEFORE UPDATE ON oauth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS email_credentials_updated_at ON email_credentials;
CREATE TRIGGER email_credentials_updated_at
  BEFORE UPDATE ON email_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
