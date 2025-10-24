-- Création des tables pour le système de logs

-- Table des logs système
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    user_id UUID,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs d'erreurs
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('ERROR', 'FATAL')),
    error_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    user_id UUID,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs de performance
CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    operation VARCHAR(100) NOT NULL,
    duration_ms INTEGER NOT NULL,
    memory_usage_mb DECIMAL(10,2),
    cpu_usage_percent DECIMAL(5,2),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    user_id UUID,
    request_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp ON performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_logs_operation ON performance_logs(operation);

-- Fonction pour nettoyer les anciens logs (garde les logs des 30 derniers jours)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days' AND resolved = true;
    DELETE FROM performance_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques des logs
CREATE OR REPLACE FUNCTION get_logs_stats(start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours', end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'system_logs', json_build_object(
            'total', (SELECT COUNT(*) FROM system_logs WHERE timestamp BETWEEN start_date AND end_date),
            'by_level', (
                SELECT json_object_agg(level, count)
                FROM (
                    SELECT level, COUNT(*) as count
                    FROM system_logs
                    WHERE timestamp BETWEEN start_date AND end_date
                    GROUP BY level
                ) t
            ),
            'by_category', (
                SELECT json_object_agg(category, count)
                FROM (
                    SELECT category, COUNT(*) as count
                    FROM system_logs
                    WHERE timestamp BETWEEN start_date AND end_date
                    GROUP BY category
                ) t
            )
        ),
        'audit_logs', json_build_object(
            'total', (SELECT COUNT(*) FROM audit_logs WHERE timestamp BETWEEN start_date AND end_date),
            'by_action', (
                SELECT json_object_agg(action, count)
                FROM (
                    SELECT action, COUNT(*) as count
                    FROM audit_logs
                    WHERE timestamp BETWEEN start_date AND end_date
                    GROUP BY action
                ) t
            ),
            'success_rate', (
                SELECT ROUND(
                    (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2
                )
                FROM audit_logs
                WHERE timestamp BETWEEN start_date AND end_date
            )
        ),
        'error_logs', json_build_object(
            'total', (SELECT COUNT(*) FROM error_logs WHERE timestamp BETWEEN start_date AND end_date),
            'unresolved', (SELECT COUNT(*) FROM error_logs WHERE timestamp BETWEEN start_date AND end_date AND resolved = false),
            'by_type', (
                SELECT json_object_agg(error_type, count)
                FROM (
                    SELECT error_type, COUNT(*) as count
                    FROM error_logs
                    WHERE timestamp BETWEEN start_date AND end_date
                    GROUP BY error_type
                ) t
            )
        ),
        'performance', json_build_object(
            'avg_duration_ms', (
                SELECT ROUND(AVG(duration_ms)::DECIMAL, 2)
                FROM performance_logs
                WHERE timestamp BETWEEN start_date AND end_date
            ),
            'max_duration_ms', (
                SELECT MAX(duration_ms)
                FROM performance_logs
                WHERE timestamp BETWEEN start_date AND end_date
            ),
            'slow_operations', (
                SELECT COUNT(*)
                FROM performance_logs
                WHERE timestamp BETWEEN start_date AND end_date AND duration_ms > 1000
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
