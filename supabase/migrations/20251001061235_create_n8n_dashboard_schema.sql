/*
  # n8n Automation Dashboard Schema

  ## Overview
  Complete database schema for multi-user n8n automation dashboard with role-based access control.

  ## 1. New Tables
  
  ### `users`
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email for authentication
  - `password_hash` (text) - Hashed password using bcrypt
  - `role` (text) - User role: 'user' or 'admin'
  - `created_at` (timestamptz) - Account creation timestamp
  
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

  ## 2. Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can only read their own workflows
  - Admins can read all data
  - Only admins can create/modify templates
  - Users can create workflows for themselves
  
  ## 3. Indexes
  - Email index for fast authentication lookups
  - User ID indexes for efficient workflow filtering
  - Created_at indexes for chronological sorting
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  json jsonb NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
  n8n_workflow_id text,
  name text NOT NULL,
  params jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Templates table policies
CREATE POLICY "Anyone authenticated can view templates"
  ON templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete templates"
  ON templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Workflows table policies
CREATE POLICY "Users can view own workflows"
  ON workflows FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all workflows"
  ON workflows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own workflows"
  ON workflows FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workflows"
  ON workflows FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update all workflows"
  ON workflows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can delete own workflows"
  ON workflows FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete all workflows"
  ON workflows FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );