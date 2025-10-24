// Service d'alertes - utilise fetch directement comme logsService

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';
  source: string;
  source_id?: string;
  metadata?: any;
  triggered_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolved_reason?: string;
  created_at: string;
  updated_at: string;
  alert_type_name: string;
  alert_category: string;
}

export interface AlertType {
  id: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
  avg_resolution_time: number;
}

export interface AlertFilters {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AlertResponse {
  alerts: Alert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class AlertsService {
  private baseUrl = 'http://localhost:3004/api/alerts';

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

  // Récupérer les alertes
  async getAlerts(filters: AlertFilters = {}): Promise<AlertResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<AlertResponse>(`?${params.toString()}`);
  }

  // Récupérer les statistiques des alertes
  async getAlertsStats(startDate?: string, endDate?: string): Promise<AlertStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return this.makeRequest<AlertStats>(`/stats?${params.toString()}`);
  }

  // Récupérer les types d'alertes
  async getAlertTypes(): Promise<AlertType[]> {
    return this.makeRequest<AlertType[]>('/types');
  }

  // Reconnaître une alerte
  async acknowledgeAlert(alertId: string, reason?: string): Promise<{ success: boolean; alert: Alert }> {
    return this.makeRequest<{ success: boolean; alert: Alert }>(`/${alertId}/acknowledge`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Résoudre une alerte
  async resolveAlert(alertId: string, reason: string): Promise<{ success: boolean; alert: Alert }> {
    return this.makeRequest<{ success: boolean; alert: Alert }>(`/${alertId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Supprimer une alerte
  async suppressAlert(alertId: string, reason: string): Promise<{ success: boolean; alert: Alert }> {
    return this.makeRequest<{ success: boolean; alert: Alert }>(`/${alertId}/suppress`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Créer une alerte
  async createAlert(alertData: {
    alert_type_name: string;
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    source: string;
    source_id?: string;
    metadata?: any;
  }): Promise<{ success: boolean; alert: Alert }> {
    return this.makeRequest<{ success: boolean; alert: Alert }>('', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  // Supprimer une alerte
  async deleteAlert(alertId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/${alertId}`, {
      method: 'DELETE',
    });
  }

  // Utilitaires
  static getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'text-red-600 bg-red-100';
      case 'ACKNOWLEDGED': return 'text-yellow-600 bg-yellow-100';
      case 'RESOLVED': return 'text-green-600 bg-green-100';
      case 'SUPPRESSED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
}

// Export de l'instance du service
export const alertsService = new AlertsService();
export { AlertsService };
