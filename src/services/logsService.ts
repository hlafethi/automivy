import { apiClient } from '../lib/api';

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  category: string;
  message: string;
  details?: any;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  duration_ms?: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'FATAL';
  error_type: string;
  message: string;
  stack_trace?: string;
  context?: any;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export interface PerformanceLog {
  id: string;
  timestamp: string;
  operation: string;
  duration_ms: number;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
  endpoint?: string;
  method?: string;
  status_code?: number;
  user_id?: string;
  request_id?: string;
  created_at: string;
}

export interface LogsStats {
  system_logs: {
    total: number;
    by_level: Record<string, number>;
    by_category: Record<string, number>;
  };
  audit_logs: {
    total: number;
    by_action: Record<string, number>;
    success_rate: number;
  };
  error_logs: {
    total: number;
    unresolved: number;
    by_type: Record<string, number>;
  };
  performance: {
    avg_duration_ms: number;
    max_duration_ms: number;
    slow_operations: number;
  };
}

export interface LogsFilters {
  page?: number;
  limit?: number;
  level?: string;
  category?: string;
  action?: string;
  resourceType?: string;
  userId?: string;
  errorType?: string;
  operation?: string;
  resolved?: boolean;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  minDuration?: number;
  maxDuration?: number;
}

export interface LogsResponse<T> {
  logs: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class LogsService {
  private baseUrl = 'http://localhost:3004/api/logs';

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
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la requête');
    }

    return response.json();
  }

  // Récupérer les logs système
  async getSystemLogs(filters: LogsFilters = {}): Promise<LogsResponse<SystemLog>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<LogsResponse<SystemLog>>(`/system?${params.toString()}`);
  }

  // Récupérer les logs d'audit
  async getAuditLogs(filters: LogsFilters = {}): Promise<LogsResponse<AuditLog>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<LogsResponse<AuditLog>>(`/audit?${params.toString()}`);
  }

  // Récupérer les logs d'erreurs
  async getErrorLogs(filters: LogsFilters = {}): Promise<LogsResponse<ErrorLog>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<LogsResponse<ErrorLog>>(`/errors?${params.toString()}`);
  }

  // Récupérer les logs de performance
  async getPerformanceLogs(filters: LogsFilters = {}): Promise<LogsResponse<PerformanceLog>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<LogsResponse<PerformanceLog>>(`/performance?${params.toString()}`);
  }

  // Récupérer les statistiques des logs
  async getLogsStats(startDate?: string, endDate?: string): Promise<LogsStats> {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return this.makeRequest<LogsStats>(`/stats?${params.toString()}`);
  }

  // Marquer une erreur comme résolue
  async resolveError(errorId: string, resolvedBy?: string): Promise<{ success: boolean; log: ErrorLog }> {
    return this.makeRequest<{ success: boolean; log: ErrorLog }>(`/errors/${errorId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ resolved: true, resolvedBy }),
    });
  }

  // Nettoyer les anciens logs
  async cleanupLogs(): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>('/cleanup', {
      method: 'DELETE',
    });
  }

  // Exporter les logs
  async exportLogs(
    type: 'system' | 'audit' | 'errors' | 'performance' = 'system',
    format: 'json' | 'csv' = 'json',
    startDate?: string,
    endDate?: string
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('format', format);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`${this.baseUrl}/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de l\'export');
    }

    return response.blob();
  }

  // Utilitaires pour formater les logs
  static formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  static getLevelColor(level: string): string {
    switch (level) {
      case 'DEBUG': return 'text-gray-500';
      case 'INFO': return 'text-blue-600';
      case 'WARN': return 'text-yellow-600';
      case 'ERROR': return 'text-red-600';
      case 'FATAL': return 'text-red-800';
      default: return 'text-gray-600';
    }
  }

  static getLevelBgColor(level: string): string {
    switch (level) {
      case 'DEBUG': return 'bg-gray-100 text-gray-800';
      case 'INFO': return 'bg-blue-100 text-blue-800';
      case 'WARN': return 'bg-yellow-100 text-yellow-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'FATAL': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  static getCategoryColor(category: string): string {
    switch (category) {
      case 'AUTH': return 'text-purple-600';
      case 'API': return 'text-blue-600';
      case 'WORKFLOW': return 'text-green-600';
      case 'DATABASE': return 'text-orange-600';
      case 'SECURITY': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  static formatDuration(duration: number): string {
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}min`;
  }

  static truncateText(text: string | undefined | null, maxLength: number = 100): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

export const logsService = new LogsService();
export { LogsService };
