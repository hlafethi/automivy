// Service de gestion des notifications
export interface Notification {
  id: string;
  type: 'email' | 'push' | 'webhook';
  title: string;
  message: string;
  user_id: string;
  data?: any;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  webhook_enabled: boolean;
  webhook_url?: string;
}

class NotificationService {
  private apiClient: any;

  constructor() {
    // Initialiser l'API client
    this.apiClient = null; // Sera injecté
  }

  // Envoyer une notification
  async sendNotification(notification: Omit<Notification, 'id' | 'sent_at' | 'status'>): Promise<Notification> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de la notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur notification:', error);
      throw error;
    }
  }

  // Envoyer notification par email
  async sendEmailNotification(userId: string, subject: string, message: string, data?: any): Promise<void> {
    await this.sendNotification({
      type: 'email',
      title: subject,
      message,
      user_id: userId,
      data
    });
  }

  // Envoyer notification push
  async sendPushNotification(userId: string, title: string, message: string, data?: any): Promise<void> {
    await this.sendNotification({
      type: 'push',
      title,
      message,
      user_id: userId,
      data
    });
  }

  // Envoyer webhook
  async sendWebhookNotification(userId: string, title: string, message: string, data?: any): Promise<void> {
    await this.sendNotification({
      type: 'webhook',
      title,
      message,
      user_id: userId,
      data
    });
  }

  // Demander permission pour les notifications push
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Afficher notification push du navigateur
  async showBrowserNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/automivy-favicon.svg',
        badge: '/automivy-favicon.svg',
        ...options
      });
    }
  }

  // Récupérer les préférences de notification d'un utilisateur
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const response = await fetch(`/api/notifications/preferences/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des préférences');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur préférences:', error);
      throw error;
    }
  }

  // Mettre à jour les préférences
  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const response = await fetch(`/api/notifications/preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des préférences');
      }
    } catch (error) {
      console.error('Erreur mise à jour préférences:', error);
      throw error;
    }
  }

  // Écouter les notifications en temps réel (WebSocket)
  connectToNotifications(callback: (notification: Notification) => void): () => void {
    // TODO: Implémenter WebSocket ou Server-Sent Events
    console.log('Connexion aux notifications en temps réel...');
    
    // Pour l'instant, simulation avec polling
    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3004/api/notifications/user', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            data.data.forEach((notification: any) => {
              callback(notification);
            });
          }
        }
      } catch (error) {
        console.error('Erreur polling notifications:', error);
      }
    }, 5000);

    // Retourner fonction de déconnexion
    return () => clearInterval(interval);
  }

  // Admin: Get notification settings
  async getAdminSettings(): Promise<any> {
    try {
      const response = await fetch('http://localhost:3004/api/notifications/admin/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des paramètres admin');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erreur getAdminSettings:', error);
      throw error;
    }
  }

  // Admin: Update notification settings
  async updateAdminSettings(settings: any): Promise<any> {
    try {
      const response = await fetch('http://localhost:3004/api/notifications/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des paramètres admin');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erreur updateAdminSettings:', error);
      throw error;
    }
  }

  // Admin: Test SMTP connection
  async testSmtpConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('http://localhost:3004/api/notifications/admin/test-smtp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du test SMTP');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erreur testSmtpConnection:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();