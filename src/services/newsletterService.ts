// Service API pour les workflows Newsletter

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004';

class NewsletterService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Crée un workflow newsletter pour l'utilisateur
   */
  async createNewsletterWorkflow(config: {
    webhookPath?: string;
    workflowName?: string;
    model?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/newsletter/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      throw new Error(error.message || `Erreur ${response.status}`);
    }

    return response.json();
  }

  /**
   * Récupère le solde de crédits de l'utilisateur
   */
  async getCreditsBalance() {
    const response = await fetch(`${API_BASE_URL}/api/newsletter/credits`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    return response.json();
  }

  /**
   * Récupère l'historique des transactions de crédits
   */
  async getCreditHistory(limit: number = 50) {
    const response = await fetch(`${API_BASE_URL}/api/newsletter/history?limit=${limit}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    return response.json();
  }

  /**
   * Change le plan d'abonnement de l'utilisateur
   */
  async changeSubscriptionPlan(planName: string) {
    const response = await fetch(`${API_BASE_URL}/api/newsletter/change-plan`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ planName })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      throw new Error(error.message || `Erreur ${response.status}`);
    }

    return response.json();
  }

  /**
   * Génère une newsletter via le webhook
   */
  async generateNewsletter(webhookUrl: string, data: {
    email: string;
    theme: string;
    language?: string;
    includeStats?: boolean;
    context?: string;
    preferences?: Record<string, any>;
  }) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      throw new Error(error.message || `Erreur ${response.status}`);
    }

    return response.json();
  }
}

export const newsletterService = new NewsletterService();

