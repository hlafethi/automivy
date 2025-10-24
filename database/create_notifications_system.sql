-- Système de notifications pour Automivy
-- =====================================================

-- 1. TABLE DES NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'push', 'webhook')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    data JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT
);

-- 2. TABLE DES PARAMÈTRES ADMIN
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE DES PRÉFÉRENCES DE NOTIFICATION (étendue)
-- =====================================================
-- Ajouter des colonnes à user_preferences si elles n'existent pas
DO $$
BEGIN
    -- Ajouter webhook_url si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'webhook_url'
    ) THEN
        ALTER TABLE user_preferences 
        ADD COLUMN webhook_url TEXT;
    END IF;
    
    -- Ajouter push_token si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'push_token'
    ) THEN
        ALTER TABLE user_preferences 
        ADD COLUMN push_token TEXT;
    END IF;
    
    -- Ajouter notification_sound si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'notification_sound'
    ) THEN
        ALTER TABLE user_preferences 
        ADD COLUMN notification_sound BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 4. INDEX POUR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- 5. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour nettoyer les anciennes notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Supprimer les notifications lues de plus de 30 jours
    DELETE FROM notifications 
    WHERE status = 'read' 
    AND read_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Supprimer les notifications échouées de plus de 7 jours
    DELETE FROM notifications 
    WHERE status = 'failed' 
    AND failed_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques des notifications
CREATE OR REPLACE FUNCTION get_notification_stats(user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    total_notifications BIGINT,
    unread_notifications BIGINT,
    email_notifications BIGINT,
    push_notifications BIGINT,
    webhook_notifications BIGINT,
    failed_notifications BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE status = 'pending') as unread_notifications,
        COUNT(*) FILTER (WHERE type = 'email') as email_notifications,
        COUNT(*) FILTER (WHERE type = 'push') as push_notifications,
        COUNT(*) FILTER (WHERE type = 'webhook') as webhook_notifications,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_notifications
    FROM notifications 
    WHERE (user_id_param IS NULL OR user_id = user_id_param);
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =====================================================

-- Trigger pour mettre à jour updated_at sur admin_settings
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_settings_updated_at();

-- 7. DONNÉES PAR DÉFAUT
-- =====================================================

-- Configuration SMTP par défaut (sera remplacée par l'admin)
INSERT INTO admin_settings (key, value, description) VALUES (
    'smtp_config',
    '{"host":"","port":587,"secure":false,"user":"","password":"","from":""}',
    'Configuration SMTP pour l''envoi d''emails'
) ON CONFLICT (key) DO NOTHING;

-- Configuration des notifications par défaut
INSERT INTO admin_settings (key, value, description) VALUES (
    'notification_config',
    '{"email_enabled":true,"push_enabled":true,"webhook_enabled":false,"retry_attempts":3,"retry_delay":5000}',
    'Configuration globale des notifications'
) ON CONFLICT (key) DO NOTHING;

-- 8. POLITIQUES RLS (Row Level Security) - DÉSACTIVÉES POUR L'INSTANT
-- =====================================================
-- Les politiques RLS seront ajoutées plus tard si nécessaire

-- 9. TÂCHE DE NETTOYAGE AUTOMATIQUE
-- =====================================================

-- Créer une tâche de nettoyage (nécessite pg_cron ou équivalent)
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications();');

-- 10. VUES UTILES
-- =====================================================

-- Vue des notifications récentes
CREATE OR REPLACE VIEW recent_notifications AS
SELECT 
    n.*,
    u.email as user_email,
    s.email as sender_email
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
LEFT JOIN users s ON n.sender_id = s.id
WHERE n.created_at > NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC;

-- Vue des statistiques de notifications
CREATE OR REPLACE VIEW notification_statistics AS
SELECT 
    DATE(created_at) as date,
    type,
    status,
    COUNT(*) as count
FROM notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), type, status
ORDER BY date DESC, type, status;

-- 11. COMMENTAIRES
-- =====================================================
COMMENT ON TABLE notifications IS 'Table des notifications utilisateur (email, push, webhook)';
COMMENT ON TABLE admin_settings IS 'Paramètres de configuration administrateur';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Nettoie les anciennes notifications';
COMMENT ON FUNCTION get_notification_stats(UUID) IS 'Retourne les statistiques des notifications';
