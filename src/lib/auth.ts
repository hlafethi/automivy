import { apiClient } from './api';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
  token: string;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export const authService = {
  async signup(email: string, password: string, role: 'user' | 'admin' = 'user'): Promise<AuthResponse> {
    return apiClient.register(email, password, role);
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return apiClient.login(email, password);
  },

  async logout(): Promise<void> {
    apiClient.clearToken();
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      return await apiClient.verifyToken();
    } catch (error) {
      return null;
    }
  },

  async verifyToken(): Promise<User | null> {
    try {
      return await apiClient.verifyToken();
    } catch (error) {
      return null;
    }
  },

  // Méthode pour définir le contexte utilisateur dans PostgreSQL
  async setUserContext(userId: string): Promise<void> {
    // Cette méthode sera utilisée pour définir le contexte utilisateur
    // dans PostgreSQL pour les politiques RLS
    // Note: Cette fonctionnalité sera gérée côté backend
  }
};