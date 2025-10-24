const DatabaseMetricsCollector = require('../collectors/databaseMetricsCollector');
const cron = require('node-cron');

class DatabaseMonitoringService {
  constructor() {
    this.collector = new DatabaseMetricsCollector();
    this.isRunning = false;
    this.intervalId = null;
  }

  // Démarrer le monitoring automatique
  startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️ [DatabaseMonitoringService] Le monitoring est déjà en cours');
      return;
    }

    console.log('🚀 [DatabaseMonitoringService] Démarrage du monitoring de base de données...');

    // Collecte immédiate
    this.collectMetrics();

    // Collecte toutes les 5 minutes
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, 5 * 60 * 1000); // 5 minutes

    // Nettoyage quotidien à 2h du matin
    cron.schedule('0 2 * * *', () => {
      this.cleanupOldData();
    });

    this.isRunning = true;
    console.log('✅ [DatabaseMonitoringService] Monitoring démarré avec succès');
  }

  // Arrêter le monitoring
  stopMonitoring() {
    if (!this.isRunning) {
      console.log('⚠️ [DatabaseMonitoringService] Le monitoring n\'est pas en cours');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🛑 [DatabaseMonitoringService] Monitoring arrêté');
  }

  // Collecter les métriques
  async collectMetrics() {
    try {
      console.log('🔄 [DatabaseMonitoringService] Collecte des métriques en cours...');
      const results = await this.collector.collectAllMetrics();
      console.log('✅ [DatabaseMonitoringService] Collecte terminée:', results);
      return results;
    } catch (error) {
      console.error('❌ [DatabaseMonitoringService] Erreur lors de la collecte:', error);
      throw error;
    }
  }

  // Nettoyer les anciennes données
  async cleanupOldData() {
    try {
      console.log('🧹 [DatabaseMonitoringService] Nettoyage des anciennes données...');
      await this.collector.pool.query('SELECT cleanup_old_database_metrics()');
      console.log('✅ [DatabaseMonitoringService] Nettoyage terminé');
    } catch (error) {
      console.error('❌ [DatabaseMonitoringService] Erreur lors du nettoyage:', error);
    }
  }

  // Obtenir le statut du service
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCollection: this.lastCollection,
      nextCollection: this.nextCollection
    };
  }

  // Fermer le service
  async close() {
    this.stopMonitoring();
    await this.collector.close();
  }
}

// Instance singleton
const databaseMonitoringService = new DatabaseMonitoringService();

module.exports = databaseMonitoringService;
