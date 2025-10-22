import { TicketNotification } from './ticketsService';

export interface NotificationListener {
  onNewNotification: (notification: TicketNotification) => void;
  onNotificationRead: (notificationId: string) => void;
}

class NotificationService {
  private listeners: NotificationListener[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: Date = new Date();
  private isPolling = false;
  private isChecking = false; // Éviter les appels multiples simultanés
  private pollingEnabled = true; // Option pour désactiver le polling
  
  // Contrôles de robustesse
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;
  private baseInterval = 60000; // 1 minute de base (plus fréquent pour les tests)
  private currentInterval = 60000; // Intervalle actuel (dynamique)
  private maxInterval = 300000; // 5 minutes maximum
  private lastSuccessfulCheck: Date | null = null;
  private isHealthy = true;

  // Ajouter un listener pour les notifications
  addListener(listener: NotificationListener) {
    this.listeners.push(listener);
    
    // Démarrer le polling seulement si c'est le premier listener et que le système est sain
    if (this.listeners.length === 1 && this.pollingEnabled && this.isHealthy) {
      this.startPolling();
    }
  }

  // Retirer un listener
  removeListener(listener: NotificationListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
    
    // Arrêter le polling si plus de listeners
    if (this.listeners.length === 0) {
      this.stopPolling();
    }
  }

  // Démarrer le polling des notifications avec système adaptatif
  private startPolling() {
    if (this.isPolling || !this.pollingEnabled || !this.isHealthy) return;
    
    console.log(`🔔 [NotificationService] Démarrage du polling avec intervalle: ${this.currentInterval}ms`);
    this.isPolling = true;
    
    const poll = async () => {
      if (!this.isPolling) return;
      
      try {
        await this.checkForNewNotifications();
        this.onPollingSuccess();
      } catch (error) {
        this.onPollingError(error);
      }
      
      // Programmer le prochain polling avec l'intervalle actuel
      if (this.isPolling && this.isHealthy) {
        this.pollInterval = setTimeout(poll, this.currentInterval);
      }
    };
    
    // Démarrer le premier polling
    this.pollInterval = setTimeout(poll, this.currentInterval);
  }

  // Désactiver le polling (pour résoudre les problèmes de boucle)
  disablePolling() {
    this.pollingEnabled = false;
    this.stopPolling();
  }

  // Réactiver le polling
  enablePolling() {
    this.pollingEnabled = true;
    if (this.listeners.length > 0) {
      this.startPolling();
    }
  }

  // Gestion du succès du polling
  private onPollingSuccess() {
    this.consecutiveErrors = 0;
    this.lastSuccessfulCheck = new Date();
    this.isHealthy = true;
    
    // Réduire progressivement l'intervalle si tout va bien
    if (this.currentInterval > this.baseInterval) {
      this.currentInterval = Math.max(this.baseInterval, this.currentInterval * 0.8);
      console.log(`🔔 [NotificationService] Intervalle réduit à: ${this.currentInterval}ms`);
    }
  }

  // Gestion des erreurs du polling
  private onPollingError(error: any) {
    this.consecutiveErrors++;
    console.error(`🔔 [NotificationService] Erreur ${this.consecutiveErrors}/${this.maxConsecutiveErrors}:`, error);
    
    // Augmenter l'intervalle en cas d'erreur (backoff exponentiel)
    this.currentInterval = Math.min(this.maxInterval, this.currentInterval * 1.5);
    console.log(`🔔 [NotificationService] Intervalle augmenté à: ${this.currentInterval}ms`);
    
    // Arrêter le polling si trop d'erreurs consécutives
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      console.error('🔔 [NotificationService] Trop d\'erreurs consécutives, arrêt du polling');
      this.isHealthy = false;
      this.stopPolling();
    }
  }

  // Arrêter le polling
  private stopPolling() {
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    console.log('🔔 [NotificationService] Polling arrêté');
  }

  // Vérifier les nouvelles notifications avec contrôles robustes
  private async checkForNewNotifications() {
    // Éviter les appels multiples simultanés
    if (this.isChecking) {
      console.log('🔔 [NotificationService] Vérification déjà en cours, ignorée');
      return;
    }

    // Vérifier la santé du système
    if (!this.isHealthy) {
      console.log('🔔 [NotificationService] Système non sain, vérification ignorée');
      return;
    }

    this.isChecking = true;
    
    try {
      console.log('🔔 [NotificationService] Vérification des nouvelles notifications...');
      
      // Importer dynamiquement pour éviter les dépendances circulaires
      const { TicketsService } = await import('./ticketsService');
      const notifications = await TicketsService.getUnreadNotifications();
      
      // Filtrer les notifications récentes (depuis la dernière vérification)
      // Pour le test, on prend toutes les notifications non lues
      const newNotifications = notifications.filter(notification => {
        const notificationTime = new Date(notification.created_at);
        const isRecent = notificationTime > this.lastCheckTime;
        const isUnread = !notification.is_read;
        // Log détaillé pour debug (peut être supprimé en production)
        return isRecent || isUnread; // Prendre les notifications récentes OU non lues
      });

      console.log(`🔔 [NotificationService] ${newNotifications.length} nouvelles notifications trouvées`);

      // Notifier les listeners des nouvelles notifications
      if (newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          this.listeners.forEach(listener => {
            try {
              listener.onNewNotification(notification);
            } catch (listenerError) {
              console.error('🔔 [NotificationService] Erreur dans un listener:', listenerError);
            }
          });
        });
      }

      // Mettre à jour le temps de dernière vérification
      this.lastCheckTime = new Date();
      
    } catch (error) {
      console.error('🔔 [NotificationService] Erreur lors de la récupération des notifications:', error);
      throw error; // Re-throw pour que onPollingError soit appelé
    } finally {
      this.isChecking = false;
    }
  }

  // Notifier qu'une notification a été lue
  notifyNotificationRead(notificationId: string) {
    this.listeners.forEach(listener => {
      listener.onNotificationRead(notificationId);
    });
  }

  // Méthodes de diagnostic et de récupération
  getSystemHealth() {
    return {
      isHealthy: this.isHealthy,
      isPolling: this.isPolling,
      consecutiveErrors: this.consecutiveErrors,
      currentInterval: this.currentInterval,
      lastSuccessfulCheck: this.lastSuccessfulCheck,
      listenersCount: this.listeners.length
    };
  }

  // Forcer la récupération du système
  recover() {
    console.log('🔔 [NotificationService] Tentative de récupération du système...');
    this.consecutiveErrors = 0;
    this.isHealthy = true;
    this.currentInterval = this.baseInterval;
    
    if (this.listeners.length > 0 && this.pollingEnabled) {
      this.startPolling();
    }
  }

  // Nettoyer les ressources
  cleanup() {
    this.stopPolling();
    this.listeners = [];
    this.consecutiveErrors = 0;
    this.isHealthy = true;
    this.currentInterval = this.baseInterval;
  }
}

// Instance singleton
export const notificationService = new NotificationService();
