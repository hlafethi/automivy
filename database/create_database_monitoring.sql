-- Création du système de monitoring de base de données

-- Table des métriques de base de données
CREATE TABLE IF NOT EXISTS database_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(15, 4) NOT NULL,
    metric_unit VARCHAR(20),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    database_name VARCHAR(100),
    table_name VARCHAR(100),
    index_name VARCHAR(100),
    query_type VARCHAR(50),
    connection_id INTEGER,
    session_id VARCHAR(255),
    user_id UUID,
    ip_address INET,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des requêtes lentes
CREATE TABLE IF NOT EXISTS slow_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64),
    execution_time_ms INTEGER NOT NULL,
    rows_examined BIGINT,
    rows_sent BIGINT,
    database_name VARCHAR(100),
    table_name VARCHAR(100),
    index_used VARCHAR(100),
    user_id UUID,
    ip_address INET,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des connexions actives
CREATE TABLE IF NOT EXISTS active_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id INTEGER NOT NULL,
    user_name VARCHAR(100),
    database_name VARCHAR(100),
    client_ip INET,
    client_port INTEGER,
    state VARCHAR(50),
    command VARCHAR(50),
    time_seconds INTEGER,
    info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des erreurs de base de données
CREATE TABLE IF NOT EXISTS database_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_code VARCHAR(20),
    error_message TEXT NOT NULL,
    error_severity VARCHAR(20) NOT NULL,
    database_name VARCHAR(100),
    table_name VARCHAR(100),
    operation VARCHAR(50),
    user_id UUID,
    ip_address INET,
    session_id VARCHAR(255),
    stack_trace TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des statistiques de tables
CREATE TABLE IF NOT EXISTS table_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    database_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    table_rows BIGINT,
    table_size_bytes BIGINT,
    index_size_bytes BIGINT,
    total_size_bytes BIGINT,
    avg_row_length NUMERIC(10, 2),
    data_free BIGINT,
    auto_increment_value BIGINT,
    table_collation VARCHAR(50),
    table_engine VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des index
CREATE TABLE IF NOT EXISTS index_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    database_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    index_name VARCHAR(100) NOT NULL,
    index_type VARCHAR(50),
    cardinality BIGINT,
    size_bytes BIGINT,
    is_unique BOOLEAN,
    is_primary BOOLEAN,
    column_names TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des sauvegardes
CREATE TABLE IF NOT EXISTS database_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(50) NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    file_path TEXT,
    file_size_bytes BIGINT,
    backup_status VARCHAR(20) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    compression_ratio NUMERIC(5, 2),
    created_by UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_database_metrics_created_at ON database_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_database_metrics_metric_name ON database_metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_database_metrics_category ON database_metrics (category);

CREATE INDEX IF NOT EXISTS idx_slow_queries_created_at ON slow_queries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slow_queries_execution_time ON slow_queries (execution_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_slow_queries_query_hash ON slow_queries (query_hash);

CREATE INDEX IF NOT EXISTS idx_active_connections_connection_id ON active_connections (connection_id);
CREATE INDEX IF NOT EXISTS idx_active_connections_created_at ON active_connections (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_database_errors_created_at ON database_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_database_errors_severity ON database_errors (error_severity);

CREATE INDEX IF NOT EXISTS idx_table_statistics_database_table ON table_statistics (database_name, table_name);
CREATE INDEX IF NOT EXISTS idx_table_statistics_created_at ON table_statistics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_index_statistics_database_table ON index_statistics (database_name, table_name);
CREATE INDEX IF NOT EXISTS idx_index_statistics_created_at ON index_statistics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON database_backups (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups (backup_status);

-- Fonction pour obtenir les statistiques de base de données
CREATE OR REPLACE FUNCTION get_database_stats(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_connections', (
            SELECT COUNT(*) FROM active_connections 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'slow_queries_count', (
            SELECT COUNT(*) FROM slow_queries 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'database_errors_count', (
            SELECT COUNT(*) FROM database_errors 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'avg_query_time', (
            SELECT ROUND(AVG(execution_time_ms)::DECIMAL, 2)
            FROM slow_queries 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'total_tables', (
            SELECT COUNT(DISTINCT CONCAT(database_name, '.', table_name))
            FROM table_statistics
        ),
        'total_size_gb', (
            SELECT ROUND(SUM(total_size_bytes) / 1024 / 1024 / 1024::DECIMAL, 2)
            FROM table_statistics
        ),
        'backups_count', (
            SELECT COUNT(*) FROM database_backups 
            WHERE created_at BETWEEN start_date AND end_date
        ),
        'errors_by_severity', (
            SELECT json_object_agg(error_severity, count)
            FROM (
                SELECT error_severity, COUNT(*) as count
                FROM database_errors
                WHERE created_at BETWEEN start_date AND end_date
                GROUP BY error_severity
            ) t
        ),
        'top_slow_queries', (
            SELECT json_agg(json_build_object('query', query_text, 'time', execution_time_ms, 'count', count))
            FROM (
                SELECT query_text, execution_time_ms, COUNT(*) as count
                FROM slow_queries
                WHERE created_at BETWEEN start_date AND end_date
                GROUP BY query_text, execution_time_ms
                ORDER BY execution_time_ms DESC
                LIMIT 5
            ) t
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les anciennes métriques
CREATE OR REPLACE FUNCTION cleanup_old_database_metrics()
RETURNS VOID AS $$
BEGIN
    DELETE FROM database_metrics WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM slow_queries WHERE created_at < NOW() - INTERVAL '7 days';
    DELETE FROM active_connections WHERE created_at < NOW() - INTERVAL '1 day';
    DELETE FROM database_errors WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM table_statistics WHERE created_at < NOW() - INTERVAL '7 days';
    DELETE FROM index_statistics WHERE created_at < NOW() - INTERVAL '7 days';
    DELETE FROM database_backups WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
