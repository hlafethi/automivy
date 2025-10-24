-- Création du système d'alertes

-- Table des types d'alertes
CREATE TABLE IF NOT EXISTS alert_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des alertes
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type_id UUID NOT NULL REFERENCES alert_types(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED')) DEFAULT 'ACTIVE',
    source VARCHAR(100) NOT NULL,
    source_id VARCHAR(255),
    metadata JSONB,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolved_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des règles d'alertes
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    alert_type_id UUID NOT NULL REFERENCES alert_types(id),
    conditions JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des notifications d'alertes
CREATE TABLE IF NOT EXISTS alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('EMAIL', 'IN_APP', 'SMS', 'WEBHOOK')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'DELIVERED')) DEFAULT 'PENDING',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alerts_source ON alerts(source, source_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type_id);

CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_user_id ON alert_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(status);

-- Fonction pour créer une alerte
CREATE OR REPLACE FUNCTION create_alert(
    p_alert_type_name VARCHAR(100),
    p_title VARCHAR(255),
    p_description TEXT,
    p_severity VARCHAR(20),
    p_source VARCHAR(100),
    p_source_id VARCHAR(255) DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_alert_type_id UUID;
    v_alert_id UUID;
BEGIN
    -- Récupérer l'ID du type d'alerte
    SELECT id INTO v_alert_type_id 
    FROM alert_types 
    WHERE name = p_alert_type_name AND is_active = true;
    
    IF v_alert_type_id IS NULL THEN
        RAISE EXCEPTION 'Type d''alerte non trouvé: %', p_alert_type_name;
    END IF;
    
    -- Créer l'alerte
    INSERT INTO alerts (alert_type_id, title, description, severity, source, source_id, metadata)
    VALUES (v_alert_type_id, p_title, p_description, p_severity, p_source, p_source_id, p_metadata)
    RETURNING id INTO v_alert_id;
    
    -- Créer les notifications
    INSERT INTO alert_notifications (alert_id, user_id, notification_type, status)
    SELECT v_alert_id, u.id, 'IN_APP', 'PENDING'
    FROM users u 
    WHERE u.role = 'admin' AND u.is_active = true;
    
    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques des alertes
CREATE OR REPLACE FUNCTION get_alerts_stats(start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours', end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_alerts', (
            SELECT COUNT(*) FROM alerts 
            WHERE triggered_at BETWEEN start_date AND end_date
        ),
        'active_alerts', (
            SELECT COUNT(*) FROM alerts 
            WHERE status = 'ACTIVE' AND triggered_at BETWEEN start_date AND end_date
        ),
        'acknowledged_alerts', (
            SELECT COUNT(*) FROM alerts 
            WHERE status = 'ACKNOWLEDGED' AND triggered_at BETWEEN start_date AND end_date
        ),
        'resolved_alerts', (
            SELECT COUNT(*) FROM alerts 
            WHERE status = 'RESOLVED' AND triggered_at BETWEEN start_date AND end_date
        ),
        'by_severity', (
            SELECT json_object_agg(severity, count)
            FROM (
                SELECT severity, COUNT(*) as count
                FROM alerts
                WHERE triggered_at BETWEEN start_date AND end_date
                GROUP BY severity
            ) t
        ),
        'by_source', (
            SELECT json_object_agg(source, count)
            FROM (
                SELECT source, COUNT(*) as count
                FROM alerts
                WHERE triggered_at BETWEEN start_date AND end_date
                GROUP BY source
            ) t
        ),
        'avg_resolution_time', (
            SELECT ROUND(
                AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at)))::DECIMAL, 2
            )
            FROM alerts
            WHERE status = 'RESOLVED' 
            AND triggered_at BETWEEN start_date AND end_date
            AND resolved_at IS NOT NULL
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insérer les types d'alertes par défaut
INSERT INTO alert_types (name, description, severity, category) VALUES
('SYSTEM_ERROR', 'Erreur système critique', 'CRITICAL', 'SYSTEM'),
('HIGH_CPU_USAGE', 'Utilisation CPU élevée', 'HIGH', 'PERFORMANCE'),
('HIGH_MEMORY_USAGE', 'Utilisation mémoire élevée', 'HIGH', 'PERFORMANCE'),
('DATABASE_CONNECTION_ERROR', 'Erreur de connexion base de données', 'CRITICAL', 'DATABASE'),
('API_RATE_LIMIT', 'Limite de taux API atteinte', 'MEDIUM', 'API'),
('SECURITY_BREACH', 'Tentative de violation de sécurité', 'CRITICAL', 'SECURITY'),
('USER_LOGIN_FAILURE', 'Échec de connexion utilisateur', 'MEDIUM', 'AUTH'),
('WORKFLOW_FAILURE', 'Échec de workflow', 'HIGH', 'WORKFLOW'),
('DISK_SPACE_LOW', 'Espace disque faible', 'HIGH', 'SYSTEM'),
('SSL_CERTIFICATE_EXPIRY', 'Expiration certificat SSL', 'MEDIUM', 'SECURITY')
ON CONFLICT (name) DO NOTHING;
