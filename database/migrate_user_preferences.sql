-- Migration pour corriger les noms des colonnes dans user_preferences
-- =====================================================

-- 1. Renommer les colonnes existantes
ALTER TABLE user_preferences 
RENAME COLUMN notifications_email TO email_notifications;

ALTER TABLE user_preferences 
RENAME COLUMN notifications_browser TO app_notifications;

ALTER TABLE user_preferences 
RENAME COLUMN notifications_community TO community_notifications;

ALTER TABLE user_preferences 
RENAME COLUMN notifications_workflows TO workflow_notifications;

-- 2. Mettre à jour les contraintes CHECK
ALTER TABLE user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_theme_check;

ALTER TABLE user_preferences 
ADD CONSTRAINT user_preferences_theme_check 
CHECK (theme IN ('light', 'dark', 'system'));

-- 3. Garder la colonne dashboard_layout (peut être utilisée plus tard)
-- ALTER TABLE user_preferences 
-- DROP COLUMN IF EXISTS dashboard_layout;

-- 4. Mettre à jour les valeurs par défaut
ALTER TABLE user_preferences 
ALTER COLUMN theme SET DEFAULT 'system';

-- 5. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- 6. Mettre à jour les données existantes pour s'assurer de la cohérence
UPDATE user_preferences 
SET theme = 'system' 
WHERE theme = 'auto';

-- 7. Vérifier que toutes les colonnes existent
DO $$
BEGIN
    -- Vérifier que les colonnes existent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'email_notifications'
    ) THEN
        RAISE EXCEPTION 'La colonne email_notifications n''existe pas';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'app_notifications'
    ) THEN
        RAISE EXCEPTION 'La colonne app_notifications n''existe pas';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'community_notifications'
    ) THEN
        RAISE EXCEPTION 'La colonne community_notifications n''existe pas';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'workflow_notifications'
    ) THEN
        RAISE EXCEPTION 'La colonne workflow_notifications n''existe pas';
    END IF;
    
    RAISE NOTICE 'Migration des préférences utilisateur terminée avec succès';
END $$;
