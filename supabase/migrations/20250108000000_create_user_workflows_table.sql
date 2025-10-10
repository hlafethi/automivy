/*
  # Create user_workflows table for SaaS multi-user workflows

  ## Purpose
  Store user-specific workflow configurations and mappings to n8n workflows/credentials
  
  ## Security
  - RLS enabled for user isolation
  - Users can only access their own workflows
  - Admins can view all workflows for management
*/

-- Create user_workflows table
CREATE TABLE IF NOT EXISTS user_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  n8n_workflow_id TEXT NOT NULL,
  n8n_credential_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  schedule TEXT NOT NULL, -- Cron expression or time format
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_workflows_user_id ON user_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workflows_template_id ON user_workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_user_workflows_n8n_workflow_id ON user_workflows(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_user_workflows_is_active ON user_workflows(is_active);

-- Enable RLS
ALTER TABLE user_workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own workflows
CREATE POLICY "Users can view their own workflows"
  ON user_workflows FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflows"
  ON user_workflows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON user_workflows FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON user_workflows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all workflows
CREATE POLICY "Admins can view all workflows"
  ON user_workflows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_workflows_updated_at
  BEFORE UPDATE ON user_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_user_workflows_updated_at();
