// Service de monitoring de base de données - utilise fetch directement comme logsService

export interface DatabaseMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  category: string;
  subcategory?: string;
  database_name?: string;
  table_name?: string;
  index_name?: string;
  query_type?: string;
  connection_id?: number;
  session_id?: string;
  user_id?: string;
  ip_address?: string;
  metadata?: any;
  created_at: string;
}

export interface SlowQuery {
  id: string;
  query_text: string;
  query_hash: string;
  execution_time_ms: number;
  rows_examined?: number;
  rows_sent?: number;
  database_name?: string;
  table_name?: string;
  index_used?: string;
  user_id?: string;
  ip_address?: string;
  session_id?: string;
  created_at: string;
}

export interface ActiveConnection {
  id: string;
  connection_id: number;
  user_name?: string;
  database_name?: string;
  client_ip?: string;
  client_port?: number;
  state: string;
  command?: string;
  time_seconds?: number;
  info?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseError {
  id: string;
  error_code?: string;
  error_message: string;
  error_severity: string;
  database_name?: string;
  table_name?: string;
  operation?: string;
  user_id?: string;
  ip_address?: string;
  session_id?: string;
  stack_trace?: string;
  metadata?: any;
  created_at: string;
}

export interface TableStatistics {
  id: string;
  database_name: string;
  table_name: string;
  table_rows?: number;
  table_size_bytes?: number;
  index_size_bytes?: number;
  total_size_bytes?: number;
  avg_row_length?: number;
  data_free?: number;
  auto_increment_value?: number;
  table_collation?: string;
  table_engine?: string;
  created_at: string;
}

export interface DatabaseBackup {
  id: string;
  backup_name: string;
  backup_type: string;
  database_name: string;
  file_path?: string;
  file_size_bytes?: number;
  backup_status: string;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  compression_ratio?: number;
  created_by?: string;
  metadata?: any;
  created_at: string;
}

export interface DatabaseStats {
  total_connections: number;
  slow_queries_count: number;
  database_errors_count: number;
  avg_query_time: number;
  total_tables: number;
  total_size_gb: number;
  backups_count: number;
  errors_by_severity: { [key: string]: number };
  top_slow_queries: Array<{
    query: string;
    time: number;
    count: number;
  }>;
}

export interface DatabaseFilters {
  page?: number;
  limit?: number;
  category?: string;
  metric_name?: string;
  severity?: string;
  database_name?: string;
  backup_type?: string;
  backup_status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface DatabaseResponse<T> {
  [key: string]: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class DatabaseService {
  private baseUrl = 'http://localhost:3004/api/database';

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Récupérer les statistiques générales
  async getDatabaseStats(startDate?: string, endDate?: string): Promise<DatabaseStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return this.makeRequest<DatabaseStats>(`/stats?${params.toString()}`);
  }

  // Récupérer les métriques
  async getMetrics(filters: DatabaseFilters = {}): Promise<DatabaseResponse<DatabaseMetric>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<DatabaseResponse<DatabaseMetric>>(`/metrics?${params.toString()}`);
  }

  // Récupérer les requêtes lentes
  async getSlowQueries(filters: DatabaseFilters = {}): Promise<DatabaseResponse<SlowQuery>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<DatabaseResponse<SlowQuery>>(`/slow-queries?${params.toString()}`);
  }

  // Récupérer les connexions actives
  async getConnections(filters: DatabaseFilters = {}): Promise<DatabaseResponse<ActiveConnection>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<DatabaseResponse<ActiveConnection>>(`/connections?${params.toString()}`);
  }

  // Récupérer les erreurs
  async getErrors(filters: DatabaseFilters = {}): Promise<DatabaseResponse<DatabaseError>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<DatabaseResponse<DatabaseError>>(`/errors?${params.toString()}`);
  }

  // Récupérer les statistiques des tables
  async getTables(filters: DatabaseFilters = {}): Promise<DatabaseResponse<TableStatistics>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<DatabaseResponse<TableStatistics>>(`/tables?${params.toString()}`);
  }

  // Récupérer les sauvegardes
  async getBackups(filters: DatabaseFilters = {}): Promise<DatabaseResponse<DatabaseBackup>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<DatabaseResponse<DatabaseBackup>>(`/backups?${params.toString()}`);
  }

  // Nettoyer les anciennes données
  async cleanupOldData(): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>('/cleanup', {
      method: 'POST',
    });
  }

  // Utilitaires
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    } else {
      return `${Math.round(seconds / 3600)}h`;
    }
  }

  static formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getSeverityColor(severity: string): string {
    switch (severity) {
      case 'FATAL': return 'text-red-600 bg-red-100';
      case 'ERROR': return 'text-red-600 bg-red-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-100';
      case 'INFO': return 'text-blue-600 bg-blue-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  }
}

// Export de l'instance du service
export const databaseService = new DatabaseService();
export { DatabaseService };
