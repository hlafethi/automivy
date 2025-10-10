const API_BASE_URL = 'http://localhost:3004/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as any).Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async register(email: string, password: string, role: string = 'user') {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    this.setToken(response.token);
    return response;
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // Templates endpoints
  async getTemplates() {
    return this.request('/templates');
  }

  async getTemplate(id: string) {
    console.log('🔍 [ApiClient] getTemplate appelé avec ID:', id);
    console.log('🔍 [ApiClient] Token présent:', !!this.token);
    return this.request(`/templates/${id}`);
  }

  async createTemplate(name: string, description: string, workflowData: any) {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify({ name, description, workflowData }),
    });
  }

  async updateTemplate(id: string, updates: any) {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTemplate(id: string) {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async getVisibleTemplates() {
    return this.request('/templates/visible');
  }

  async updateTemplateVisibility(id: string, visible: boolean) {
    return this.request(`/templates/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visible }),
    });
  }

  // Workflows endpoints
  async getWorkflows() {
    return this.request('/workflows');
  }

  async getUserWorkflows() {
    return this.request('/workflows/user');
  }

  async getWorkflow(id: string) {
    return this.request(`/workflows/${id}`);
  }

  async createWorkflow(name: string, description: string, workflowData: any, n8nWorkflowId?: string, templateId?: string) {
    return this.request('/workflows', {
      method: 'POST',
      body: JSON.stringify({ name, description, workflowData, n8nWorkflowId, templateId }),
    });
  }

  async updateWorkflow(id: string, updates: any) {
    return this.request(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteWorkflow(id: string) {
    console.log('🔍 [ApiClient] deleteWorkflow appelé avec ID:', id);
    try {
      const response = await this.request(`/workflows/${id}`, {
        method: 'DELETE',
      });
      console.log('✅ [ApiClient] deleteWorkflow terminé avec succès:', response);
      return response;
    } catch (error) {
      console.error('❌ [ApiClient] Erreur dans deleteWorkflow:', error);
      throw error;
    }
  }

  // API Keys endpoints
  async getApiKeys() {
    return this.request('/api-keys');
  }

  async createApiKey(name: string, key: string, service: string) {
    return this.request('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, key, service }),
    });
  }

  async deleteApiKey(id: string) {
    return this.request(`/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  // OAuth endpoints
  async getOAuthCredentials(provider?: string) {
    const endpoint = provider ? `/oauth?provider=${provider}` : '/oauth';
    return this.request(endpoint);
  }

  async createOAuthCredential(provider: string, encryptedData: any, n8nCredentialId?: string, email?: string, expiresAt?: string) {
    return this.request('/oauth', {
      method: 'POST',
      body: JSON.stringify({ provider, encryptedData, n8nCredentialId, email, expiresAt }),
    });
  }

  async deleteOAuthCredential(id: string) {
    return this.request(`/oauth/${id}`, {
      method: 'DELETE',
    });
  }

  // Email Credentials endpoints
  async getEmailCredentials() {
    return this.request('/email-credentials');
  }

  async createEmailCredential(credentialData: any) {
    return this.request('/email-credentials', {
      method: 'POST',
      body: JSON.stringify(credentialData),
    });
  }

  async deleteEmailCredential(id: string) {
    return this.request(`/email-credentials/${id}`, {
      method: 'DELETE',
    });
  }

  // Méthodes pour les workflows utilisateur
  async createUserWorkflow(data: any) {
    return this.request('/user-workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserWorkflows(userId: string) {
    return this.request(`/user-workflows/user/${userId}`);
  }

  async getUserWorkflow(id: string) {
    return this.request(`/user-workflows/${id}`);
  }

  async updateUserWorkflow(id: string, updates: any) {
    return this.request(`/user-workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async toggleUserWorkflow(id: string, active: boolean) {
    return this.request(`/user-workflows/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  }

  async deleteUserWorkflow(id: string) {
    return this.request(`/user-workflows/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
