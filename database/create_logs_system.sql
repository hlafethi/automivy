-- Système de logs professionnel pour Automivy
-- Création des tables et politiques RLS

-- Table principale des logs système
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
    category VARCHAR(50) NOT NULL, -- 'AUTH', 'API', 'WORKFLOW', 'DATABASE', 'SECURITY', etc.
    message TEXT NOT NULL,
    details JSONB, -- Informations supplémentaires structurées
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255), -- Pour tracer les requêtes
    duration_ms INTEGER, -- Durée d'exécution si applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs d'audit (actions utilisateurs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'LOGIN', 'LOGOUT', 'CREATE_WORKFLOW', 'DELETE_WORKFLOW', etc.
    resource_type VARCHAR(50), -- 'USER', 'WORKFLOW', 'TEMPLATE', etc.
    resource_id UUID, -- ID de la ressource concernée
    old_values JSONB, -- Valeurs avant modification
    new_values JSONB, -- Valeurs après modification
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs de performance
CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    operation VARCHAR(100) NOT NULL, -- 'API_REQUEST', 'DATABASE_QUERY', 'WORKFLOW_EXECUTION', etc.
    duration_ms INTEGER NOT NULL,
    memory_usage_mb DECIMAL(10,2),
    cpu_usage_percent DECIMAL(5,2),
    endpoint VARCHAR(255), -- Pour les requêtes API
    method VARCHAR(10), -- GET, POST, PUT, DELETE
    status_code INTEGER,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs d'erreurs détaillés
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('ERROR', 'FATAL')),
    error_type VARCHAR(100) NOT NULL, -- 'VALIDATION_ERROR', 'DATABASE_ERROR', 'API_ERROR', etc.
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB, -- Contexte de l'erreur
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp ON performance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_logs_operation ON performance_logs(operation);
CREATE INDEX IF NOT EXISTS idx_performance_logs_duration ON performance_logs(duration_ms);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Politiques RLS (Row Level Security)
-- Seuls les admins peuvent voir tous les logs
-- Les utilisateurs peuvent voir leurs propres logs d'audit

-- Politique pour system_logs (admins seulement)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all system logs" ON system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Politique pour audit_logs (admins + utilisateurs voient leurs propres logs)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Politique pour performance_logs (admins seulement)
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all performance logs" ON performance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Politique pour error_logs (admins seulement)
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all error logs" ON error_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Politique pour permettre l'insertion des logs (système)
CREATE POLICY "System can insert logs" ON system_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert performance logs" ON performance_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert error logs" ON error_logs
    FOR INSERT WITH CHECK (true);

-- Fonction pour nettoyer les anciens logs (rétention de 30 jours)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Supprimer les logs système plus anciens que 30 jours
    DELETE FROM system_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Supprimer les logs d'audit plus anciens que 90 jours
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Supprimer les logs de performance plus anciens que 7 jours
    DELETE FROM performance_logs 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Supprimer les logs d'erreurs résolus plus anciens que 30 jours
    DELETE FROM error_logs 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND resolved = true;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques des logs
CREATE OR REPLACE FUNCTION get_logs_stats(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'system_logs', (
            SELECT json_build_object(
                'total', COUNT(*),
                'by_level', json_object_agg(level, level_count),
                'by_category', json_object_agg(category, category_count)
            )
            FROM (
                SELECT 
                    level,
                    COUNT(*) as level_count
                FROM system_logs 
                WHERE timestamp BETWEEN start_date AND end_date
                GROUP BY level
            ) level_stats,
            (
                SELECT 
                    category,
                    COUNT(*) as category_count
                FROM system_logs 
                WHERE timestamp BETWEEN start_date AND end_date
                GROUP BY category
            ) category_stats
        ),
        'audit_logs', (
            SELECT json_build_object(
                'total', COUNT(*),
                'by_action', json_object_agg(action, action_count),
                'success_rate', ROUND(
                    (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)) * 100, 2
                )
            )
            FROM (
                SELECT 
                    action,
                    COUNT(*) as action_count
                FROM audit_logs 
                WHERE timestamp BETWEEN start_date AND end_date
                GROUP BY action
            ) action_stats
        ),
        'error_logs', (
            SELECT json_build_object(
                'total', COUNT(*),
                'unresolved', COUNT(*) FILTER (WHERE resolved = false),
                'by_type', json_object_agg(error_type, type_count)
            )
            FROM (
                SELECT 
                    error_type,
                    COUNT(*) as type_count
                FROM error_logs 
                WHERE timestamp BETWEEN start_date AND end_date
                GROUP BY error_type
            ) type_stats
        ),
        'performance', (
            SELECT json_build_object(
                'avg_duration_ms', ROUND(AVG(duration_ms), 2),
                'max_duration_ms', MAX(duration_ms),
                'slow_operations', COUNT(*) FILTER (WHERE duration_ms > 5000)
            )
            FROM performance_logs 
            WHERE timestamp BETWEEN start_date AND end_date
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Données de test pour les logs
INSERT INTO system_logs (level, category, message, details) VALUES
('INFO', 'AUTH', 'User login successful', '{"user_id": "test-user", "ip": "127.0.0.1"}'),
('WARN', 'API', 'Rate limit approaching', '{"endpoint": "/api/workflows", "current_requests": 95}'),
('ERROR', 'DATABASE', 'Connection timeout', '{"query": "SELECT * FROM workflows", "duration_ms": 5000}'),
('INFO', 'WORKFLOW', 'Workflow execution completed', '{"workflow_id": "test-workflow", "duration_ms": 1200}');

INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values) VALUES
('test-user', 'CREATE_WORKFLOW', 'WORKFLOW', gen_random_uuid(), '{"name": "Test Workflow", "active": true}'),
('test-user', 'UPDATE_WORKFLOW', 'WORKFLOW', gen_random_uuid(), '{"status": "active"}'),
('test-user', 'DELETE_WORKFLOW', 'WORKFLOW', gen_random_uuid(), '{"deleted": true}');

INSERT INTO performance_logs (operation, duration_ms, endpoint, method, status_code) VALUES
('API_REQUEST', 150, '/api/workflows', 'GET', 200),
('API_REQUEST', 300, '/api/workflows', 'POST', 201),
('DATABASE_QUERY', 50, 'SELECT workflows', 'SELECT', 200),
('WORKFLOW_EXECUTION', 1200, '/workflow/execute', 'POST', 200);

INSERT INTO error_logs (level, error_type, message, stack_trace, context) VALUES
('ERROR', 'VALIDATION_ERROR', 'Invalid email format', 'Error: Invalid email\n    at validateEmail', '{"field": "email", "value": "invalid-email"}'),
('FATAL', 'DATABASE_ERROR', 'Connection lost', 'Error: Connection lost\n    at Database.connect', '{"host": "localhost", "port": 5432}');
