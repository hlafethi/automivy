import { apiClient } from '../lib/api';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  workflows_count: number;
  active_workflows: number;
  recent_workflows: number;
}

export interface UserDetails extends User {
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  position?: string;
  workflows: UserWorkflow[];
  activity: {
    total_workflows: number;
    active_workflows: number;
    workflows_this_week: number;
    workflows_this_month: number;
  };
  recentActivity: Array<{
    login_time: string;
    action: string;
  }>;
}

export interface UserWorkflow {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  n8n_workflow_id: string | null;
  schedule: string;
}

export interface UserStats {
  total: number;
  active: number;
  newThisWeek: number;
  newThisMonth: number;
  admins: number;
  activeThisWeek: number;
}

export interface UpdateUserData {
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  position?: string;
}

export class UserManagementService {
  // Récupérer tous les utilisateurs
  static async getAllUsers(): Promise<{ users: User[]; total: number }> {
    try {
      const response = await apiClient.request('/user-management');
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      throw error;
    }
  }

  // Récupérer les détails d'un utilisateur
  static async getUserDetails(userId: string): Promise<UserDetails> {
    try {
      const response = await apiClient.request(`/user-management/${userId}`);
      return response.user;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails utilisateur:', error);
      throw error;
    }
  }

  // Mettre à jour un utilisateur
  static async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    try {
      const response = await apiClient.request(`/user-management/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
      return response.user;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      throw error;
    }
  }

  // Réinitialiser le mot de passe d'un utilisateur
  static async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      await apiClient.request(`/user-management/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      });
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error);
      throw error;
    }
  }

  // Changer le statut d'un utilisateur (actif/inactif)
  static async toggleUserStatus(userId: string): Promise<{ is_active: boolean }> {
    try {
      const response = await apiClient.request(`/user-management/${userId}/toggle-status`, {
        method: 'POST'
      });
      return { is_active: response.is_active };
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      throw error;
    }
  }

  // Supprimer un utilisateur
  static async deleteUser(userId: string): Promise<void> {
    try {
      await apiClient.request(`/user-management/${userId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      throw error;
    }
  }

  // Récupérer les statistiques des utilisateurs
  static async getUserStats(): Promise<UserStats> {
    try {
      const response = await apiClient.request('/user-management/stats/overview');
      return response.stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}
