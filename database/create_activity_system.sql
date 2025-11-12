-- Création du système d'activité

-- Table des types d'activité
CREATE TABLE IF NOT EXISTS activity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des activités
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type_id UUID NOT NULL REFERENCES activity_types(id),
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING', 'CANCELLED')) DEFAULT 'SUCCESS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des sessions d'activité
CREATE TABLE IF NOT EXISTS activity_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des statistiques d'activité
CREATE TABLE IF NOT EXISTS activity_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    date DATE NOT NULL,
    total_activities INTEGER DEFAULT 0,
    successful_activities INTEGER DEFAULT 0,
    failed_activities INTEGER DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    most_active_hour INTEGER,
    most_used_category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_resource_type ON activities(resource_type);

CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_id ON activity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_start_time ON activity_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_is_active ON activity_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_activity_stats_user_id ON activity_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_stats_date ON activity_stats(date DESC);

-- Fonction pour créer une activité
CREATE OR REPLACE FUNCTION create_activity(
    p_activity_type_name VARCHAR(100),
    p_user_id UUID,
    p_title VARCHAR(255),
    p_description TEXT,
    p_category VARCHAR(50),
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT 'SUCCESS'
) RETURNS UUID AS $$
DECLARE
    v_activity_type_id UUID;
    v_activity_id UUID;
BEGIN
    -- Récupérer l'ID du type d'activité
    SELECT id INTO v_activity_type_id 
    FROM activity_types 
    WHERE name = p_activity_type_name AND is_active = true;
    
    IF v_activity_type_id IS NULL THEN
        RAISE EXCEPTION 'Type d''activité non trouvé: %', p_activity_type_name;
    END IF;
    
    -- Créer l'activité
    INSERT INTO activities (
        activity_type_id, user_id, title, description, category, action,
        resource_type, resource_id, old_values, new_values, metadata,
        ip_address, user_agent, session_id, duration_ms, status
    )
    VALUES (
        v_activity_type_id, p_user_id, p_title, p_description, p_category, p_action,
        p_resource_type, p_resource_id, p_old_values, p_new_values, p_metadata,
        p_ip_address, p_user_agent, p_session_id, p_duration_ms, p_status
    )
    RETURNING id INTO v_activity_id;
    
    -- Mettre à jour les statistiques
    INSERT INTO activity_stats (user_id, date, total_activities, successful_activities, failed_activities, total_duration_ms)
    VALUES (p_user_id, CURRENT_DATE, 1, 
            CASE WHEN p_status = 'SUCCESS' THEN 1 ELSE 0 END,
            CASE WHEN p_status = 'FAILED' THEN 1 ELSE 0 END,
            COALESCE(p_duration_ms, 0))
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
        total_activities = activity_stats.total_activities + 1,
        successful_activities = activity_stats.successful_activities + 
            CASE WHEN p_status = 'SUCCESS' THEN 1 ELSE 0 END,
        failed_activities = activity_stats.failed_activities + 
            CASE WHEN p_status = 'FAILED' THEN 1 ELSE 0 END,
        total_duration_ms = activity_stats.total_duration_ms + COALESCE(p_duration_ms, 0),
        updated_at = NOW();
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques d'activité
CREATE OR REPLACE FUNCTION get_activity_stats(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filter_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_activities', (
            SELECT COUNT(*) FROM activities 
            WHERE created_at BETWEEN start_date AND end_date
            AND (filter_user_id IS NULL OR activities.user_id = filter_user_id)
        ),
        'successful_activities', (
            SELECT COUNT(*) FROM activities 
            WHERE created_at BETWEEN start_date AND end_date
            AND status = 'SUCCESS'
            AND (filter_user_id IS NULL OR activities.user_id = filter_user_id)
        ),
        'failed_activities', (
            SELECT COUNT(*) FROM activities 
            WHERE created_at BETWEEN start_date AND end_date
            AND status = 'FAILED'
            AND (filter_user_id IS NULL OR activities.user_id = filter_user_id)
        ),
        'by_category', (
            SELECT json_object_agg(category, count)
            FROM (
                SELECT category, COUNT(*) as count
                FROM activities
                WHERE created_at BETWEEN start_date AND end_date
                AND (filter_user_id IS NULL OR activities.user_id = filter_user_id)
                GROUP BY category
            ) t
        ),
        'by_action', (
            SELECT json_object_agg(action, count)
            FROM (
                SELECT action, COUNT(*) as count
                FROM activities
                WHERE created_at BETWEEN start_date AND end_date
                AND (filter_user_id IS NULL OR activities.user_id = filter_user_id)
                GROUP BY action
            ) t
        ),
        'by_hour', (
            SELECT json_object_agg(hour, count)
            FROM (
                SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
                FROM activities
                WHERE created_at BETWEEN start_date AND end_date
                AND (filter_user_id IS NULL OR activities.user_id = filter_user_id)
                GROUP BY EXTRACT(HOUR FROM created_at)
                ORDER BY hour
            ) t
        ),
        'avg_duration_ms', (
            SELECT ROUND(AVG(duration_ms)::DECIMAL, 2)
            FROM activities
            WHERE created_at BETWEEN start_date AND end_date
            AND duration_ms IS NOT NULL
            AND (filter_user_id IS NULL OR activities.user_id = filter_user_id)
        ),
        'most_active_users', (
            SELECT json_agg(json_build_object('user_id', user_id, 'count', count))
            FROM (
                SELECT user_id, COUNT(*) as count
                FROM activities
                WHERE created_at BETWEEN start_date AND end_date
                AND user_id IS NOT NULL
                GROUP BY user_id
                ORDER BY count DESC
                LIMIT 10
            ) t
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insérer les types d'activité par défaut
INSERT INTO activity_types (name, description, category, icon, color) VALUES
('USER_LOGIN', 'Connexion utilisateur', 'AUTH', 'log-in', 'green'),
('USER_LOGOUT', 'Déconnexion utilisateur', 'AUTH', 'log-out', 'blue'),
('USER_REGISTER', 'Inscription utilisateur', 'AUTH', 'user-plus', 'green'),
('PASSWORD_CHANGE', 'Changement de mot de passe', 'AUTH', 'key', 'yellow'),
('PROFILE_UPDATE', 'Mise à jour du profil', 'USER', 'user-edit', 'blue'),
('TEMPLATE_CREATE', 'Création de template', 'TEMPLATE', 'file-plus', 'green'),
('TEMPLATE_UPDATE', 'Modification de template', 'TEMPLATE', 'file-edit', 'blue'),
('TEMPLATE_DELETE', 'Suppression de template', 'TEMPLATE', 'file-minus', 'red'),
('WORKFLOW_CREATE', 'Création de workflow', 'WORKFLOW', 'workflow', 'green'),
('WORKFLOW_EXECUTE', 'Exécution de workflow', 'WORKFLOW', 'play', 'blue'),
('WORKFLOW_DELETE', 'Suppression de workflow', 'WORKFLOW', 'trash', 'red'),
('FILE_UPLOAD', 'Upload de fichier', 'FILE', 'upload', 'blue'),
('FILE_DOWNLOAD', 'Téléchargement de fichier', 'FILE', 'download', 'green'),
('FILE_DELETE', 'Suppression de fichier', 'FILE', 'file-minus', 'red'),
('ADMIN_ACTION', 'Action administrative', 'ADMIN', 'settings', 'purple'),
('API_CALL', 'Appel API', 'API', 'api', 'blue'),
('ERROR_OCCURRED', 'Erreur survenue', 'ERROR', 'alert-circle', 'red'),
('SYSTEM_EVENT', 'Événement système', 'SYSTEM', 'monitor', 'gray')
ON CONFLICT (name) DO NOTHING;
