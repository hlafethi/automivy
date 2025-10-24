// Service d'activité - utilise fetch directement comme logsService

export interface Activity {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  category: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  duration_ms?: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  created_at: string;
  activity_type_name: string;
  activity_icon?: string;
  activity_color?: string;
}

export interface ActivityType {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
}

export interface ActivitySession {
  id: string;
  user_id: string;
  session_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
}

export interface ActivityStats {
  total_activities: number;
  successful_activities: number;
  failed_activities: number;
  by_category: Record<string, number>;
  by_action: Record<string, number>;
  by_hour: Record<string, number>;
  avg_duration_ms: number;
  most_active_users: Array<{ user_id: string; count: number }>;
}

export interface ActivityFilters {
  page?: number;
  limit?: number;
  category?: string;
  action?: string;
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ActivityResponse {
  activities: Activity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SessionResponse {
  sessions: ActivitySession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class ActivityService {
  private baseUrl = 'http://localhost:3004/api/activity';

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

  // Récupérer les activités
  async getActivities(filters: ActivityFilters = {}): Promise<ActivityResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<ActivityResponse>(`?${params.toString()}`);
  }

  // Récupérer les statistiques d'activité
  async getActivityStats(startDate?: string, endDate?: string, userId?: string): Promise<ActivityStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (userId) params.append('userId', userId);

    return this.makeRequest<ActivityStats>(`/stats?${params.toString()}`);
  }

  // Récupérer les types d'activité
  async getActivityTypes(): Promise<ActivityType[]> {
    return this.makeRequest<ActivityType[]>('/types');
  }

  // Récupérer les sessions d'activité
  async getActivitySessions(filters: {
    page?: number;
    limit?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  } = {}): Promise<SessionResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<SessionResponse>(`/sessions?${params.toString()}`);
  }

  // Créer une activité
  async createActivity(activityData: {
    activity_type_name: string;
    title: string;
    description?: string;
    category: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    old_values?: any;
    new_values?: any;
    metadata?: any;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    duration_ms?: number;
    status?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  }): Promise<{ success: boolean; activity: Activity }> {
    return this.makeRequest<{ success: boolean; activity: Activity }>('', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }

  // Exporter les activités
  async exportActivities(filters: {
    format?: 'json' | 'csv';
    category?: string;
    action?: string;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  // Utilitaires
  static getCategoryColor(category: string): string {
    switch (category) {
      case 'AUTH': return 'text-green-600 bg-green-100';
      case 'USER': return 'text-blue-600 bg-blue-100';
      case 'TEMPLATE': return 'text-purple-600 bg-purple-100';
      case 'WORKFLOW': return 'text-orange-600 bg-orange-100';
      case 'FILE': return 'text-indigo-600 bg-indigo-100';
      case 'ADMIN': return 'text-red-600 bg-red-100';
      case 'API': return 'text-cyan-600 bg-cyan-100';
      case 'ERROR': return 'text-red-600 bg-red-100';
      case 'SYSTEM': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'text-green-600 bg-green-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELLED': return 'text-gray-600 bg-gray-100';
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

  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${Math.round(ms / 1000)}s`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)}m`;
    } else {
      return `${Math.round(ms / 3600000)}h`;
    }
  }

  static getActivityIcon(category: string): string {
    switch (category) {
      case 'AUTH': return 'log-in';
      case 'USER': return 'user';
      case 'TEMPLATE': return 'file-text';
      case 'WORKFLOW': return 'workflow';
      case 'FILE': return 'file';
      case 'ADMIN': return 'settings';
      case 'API': return 'api';
      case 'ERROR': return 'alert-circle';
      case 'SYSTEM': return 'monitor';
      default: return 'activity';
    }
  }
}

// Export de l'instance du service
export const activityService = new ActivityService();
export { ActivityService };
