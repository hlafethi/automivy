-- Migration pour ajouter les colonnes manquantes pour la gestion des utilisateurs
-- Ajout des colonnes last_login et is_active à la table users

-- Ajouter la colonne last_login
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Ajouter la colonne is_active
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Ajouter la colonne password (au lieu de password_hash pour la compatibilité)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;

-- Mettre à jour la colonne password si elle existe déjà
UPDATE users SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL;

-- Ajouter les colonnes manquantes à user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS position text;

-- Créer la table user_workflows si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  n8n_workflow_id text,
  schedule text DEFAULT 'daily',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer les index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_workflows_user_id ON user_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workflows_active ON user_workflows(is_active);

-- Activer RLS sur user_workflows
ALTER TABLE user_workflows ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour user_workflows
CREATE POLICY "Users can view own workflows"
  ON user_workflows FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Admins can view all user workflows"
  ON user_workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = current_setting('app.current_user_id', true)::uuid
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own workflows"
  ON user_workflows FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update own workflows"
  ON user_workflows FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can delete own workflows"
  ON user_workflows FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Créer les politiques RLS pour les admins sur users
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = current_setting('app.current_user_id', true)::uuid
      AND admin_user.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = current_setting('app.current_user_id', true)::uuid
      AND admin_user.role = 'admin'
    )
  );

-- Créer les politiques RLS pour les admins sur user_profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = current_setting('app.current_user_id', true)::uuid
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = current_setting('app.current_user_id', true)::uuid
      AND users.role = 'admin'
    )
  );

-- Créer les politiques RLS pour les admins sur user_workflows
CREATE POLICY "Admins can update all user workflows"
  ON user_workflows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = current_setting('app.current_user_id', true)::uuid
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all user workflows"
  ON user_workflows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = current_setting('app.current_user_id', true)::uuid
      AND users.role = 'admin'
    )
  );

-- Créer un trigger pour mettre à jour last_login lors de la connexion
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_login = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour user_workflows updated_at
DROP TRIGGER IF EXISTS user_workflows_updated_at ON user_workflows;
CREATE TRIGGER user_workflows_updated_at
  BEFORE UPDATE ON user_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Mettre à jour les utilisateurs existants pour qu'ils soient actifs par défaut
UPDATE users SET is_active = true WHERE is_active IS NULL;
