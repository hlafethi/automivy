import { apiClient } from '../lib/api';

export interface AnalyticsData {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  workflows: {
    total: number;
    executed: number;
    successRate: number;
    avgExecutionTime: number;
  };
  performance: {
    responseTime: number;
    uptime: number;
    errorRate: number;
  };
  activity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export class AnalyticsService {
  static async getAnalytics(): Promise<AnalyticsData> {
    try {
      const response = await apiClient.request('/analytics');
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des analytics:', error);
      // Retourner des données par défaut en cas d'erreur
      return {
        users: {
          total: 0,
          active: 0,
          newThisMonth: 0,
          growth: 0
        },
        workflows: {
          total: 0,
          executed: 0,
          successRate: 0,
          avgExecutionTime: 0
        },
        performance: {
          responseTime: 0,
          uptime: 0,
          errorRate: 0
        },
        activity: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0
        }
      };
    }
  }

  static async getUsersStats() {
    try {
      const response = await apiClient.request('/analytics/users');
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des stats utilisateurs:', error);
      return null;
    }
  }

  static async getWorkflowsStats() {
    try {
      const response = await apiClient.request('/analytics/workflows');
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des stats workflows:', error);
      return null;
    }
  }

  static async getPerformanceStats() {
    try {
      const response = await apiClient.request('/analytics/performance');
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des stats performance:', error);
      return null;
    }
  }
}
