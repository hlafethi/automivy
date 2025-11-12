/**
 * Script de planification simple
 * Utilise un cron job système pour déclencher les webhooks n8n
 */

const cron = require('node-cron');
const fetch = require('node-fetch');
const config = require('../config');

class SimpleScheduler {
  constructor() {
    this.scheduledJobs = new Map(); // userId -> { cronJob, webhookUrl, schedule }
    console.log('🕐 [SimpleScheduler] Scheduler simple initialisé');
  }

  /**
   * Planifier un workflow à une heure précise (une seule fois par jour)
   */
  scheduleWorkflow(userId, n8nWorkflowId, schedule, webhookUrl) {
    try {
      console.log(`🕐 [SimpleScheduler] Planification ${n8nWorkflowId} à ${schedule}`);
      
      // Arrêter le job existant
      this.unscheduleWorkflow(userId);
      
      // Convertir l'heure en cron
      const [hours, minutes] = schedule.split(':').map(Number);
      const cronExpression = `${minutes} ${hours} * * *`;
      
      console.log(`🕐 [SimpleScheduler] Cron: ${cronExpression}`);
      
      let executed = false; // Flag pour éviter les exécutions multiples
      
      // Créer le job
      const job = cron.schedule(cronExpression, async () => {
        if (executed) {
          console.log(`⚠️ [SimpleScheduler] Job déjà exécuté, ignoré`);
          return;
        }
        
        executed = true;
        console.log(`🚀 [SimpleScheduler] Déclenchement ${n8nWorkflowId} à ${schedule}`);
        await this.triggerWebhook(webhookUrl);
        
        // Arrêter le job après exécution
        job.destroy();
        this.scheduledJobs.delete(userId);
        console.log(`🕐 [SimpleScheduler] Job arrêté après exécution unique`);
        
      }, {
        scheduled: true,
        timezone: 'Europe/Paris'
      });
      
      this.scheduledJobs.set(userId, { cronJob: job, webhookUrl, schedule });
      console.log(`✅ [SimpleScheduler] Workflow planifié (exécution unique)`);
      
    } catch (error) {
      console.error('❌ [SimpleScheduler] Erreur:', error);
      throw error;
    }
  }

  /**
   * Annuler la planification
   */
  unscheduleWorkflow(userId) {
    const jobData = this.scheduledJobs.get(userId);
    if (jobData) {
      jobData.cronJob.destroy();
      this.scheduledJobs.delete(userId);
      console.log(`🕐 [SimpleScheduler] Planification annulée pour ${userId}`);
    }
  }

  /**
   * Déclencher le webhook
   */
  async triggerWebhook(webhookUrl) {
    try {
      console.log(`🚀 [SimpleScheduler] Déclenchement webhook: ${webhookUrl}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggeredBy: 'scheduler',
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
      
      console.log('✅ [SimpleScheduler] Webhook déclenché');
      
    } catch (error) {
      console.error('❌ [SimpleScheduler] Erreur webhook:', error);
    }
  }

  /**
   * Récupérer l'URL webhook d'un workflow n8n
   */
  async getWebhookUrl(n8nWorkflowId, userWorkflowId = null) {
    try {
      const db = require('../database');
      
      // Si on a un userWorkflowId, récupérer le webhook path depuis la base de données
      if (userWorkflowId) {
        const userWorkflow = await db.query(
          'SELECT webhook_path FROM user_workflows WHERE id = $1',
          [userWorkflowId]
        );
        
        if (userWorkflow.rows.length > 0 && userWorkflow.rows[0].webhook_path) {
          const webhookPath = userWorkflow.rows[0].webhook_path;
          const webhookUrl = `${config.n8n.url}/webhook/${webhookPath}`;
          console.log(`🔗 [SimpleScheduler] URL webhook unique depuis BDD (userWorkflowId): ${webhookUrl}`);
          return webhookUrl;
        }
      }
      
      // Sinon, chercher par n8nWorkflowId dans la base de données
      const userWorkflowByN8n = await db.query(
        'SELECT webhook_path FROM user_workflows WHERE n8n_workflow_id = $1 ORDER BY created_at DESC LIMIT 1',
        [n8nWorkflowId]
      );
      
      if (userWorkflowByN8n.rows.length > 0 && userWorkflowByN8n.rows[0].webhook_path) {
        const webhookPath = userWorkflowByN8n.rows[0].webhook_path;
        const webhookUrl = `${config.n8n.url}/webhook/${webhookPath}`;
        console.log(`🔗 [SimpleScheduler] URL webhook unique depuis BDD (n8nWorkflowId): ${webhookUrl}`);
        return webhookUrl;
      }
      
      // Fallback: récupérer depuis n8n (ancienne méthode - ne devrait plus être utilisée)
      console.warn('⚠️ [SimpleScheduler] Webhook path non trouvé en BDD, récupération depuis n8n (fallback)');
      const response = await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}`, {
        headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get workflow: ${response.status}`);
      }
      
      const workflow = await response.json();
      const webhookNode = workflow.nodes?.find(node => 
        node.type === 'n8n-nodes-base.webhook'
      );
      
      if (!webhookNode) {
        throw new Error('Webhook node not found');
      }
      
      // Utiliser le path du webhook depuis le nœud si disponible
      const webhookPath = webhookNode.parameters?.path || 'email-summary-trigger';
      const webhookUrl = `${config.n8n.url}/webhook/${webhookPath}`;
      console.log(`🔗 [SimpleScheduler] URL webhook depuis n8n (fallback): ${webhookUrl}`);
      
      return webhookUrl;
      
    } catch (error) {
      console.error('❌ [SimpleScheduler] Erreur webhook URL:', error);
      throw error;
    }
  }
}

// Export pour utilisation
const scheduler = new SimpleScheduler();

// Fonctions d'API simples
async function scheduleUserWorkflow(userId, n8nWorkflowId, schedule, userWorkflowId = null) {
  const webhookUrl = await scheduler.getWebhookUrl(n8nWorkflowId, userWorkflowId);
  scheduler.scheduleWorkflow(userId, n8nWorkflowId, schedule, webhookUrl);
}

async function unscheduleUserWorkflow(userId) {
  scheduler.unscheduleWorkflow(userId);
}

/**
 * Planifie directement un webhook sans passer par n8n
 */
function scheduleDirectWebhook(userId, webhookUrl, schedule) {
  try {
    console.log(`🕐 [SimpleScheduler] Planification directe ${webhookUrl} à ${schedule}`);
    
    // Arrêter le job existant
    scheduler.unscheduleWorkflow(userId);
    
    // Convertir l'heure en cron
    const [hours, minutes] = schedule.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;
    
    console.log(`🕐 [SimpleScheduler] Cron: ${cronExpression}`);
    
    let executed = false; // Flag pour éviter les exécutions multiples
    
    // Créer le job
    const job = cron.schedule(cronExpression, async () => {
      if (executed) {
        console.log(`⚠️ [SimpleScheduler] Job déjà exécuté, ignoré`);
        return;
      }
      
      executed = true;
      console.log(`🚀 [SimpleScheduler] Déclenchement direct ${webhookUrl} à ${schedule}`);
      await scheduler.triggerWebhook(webhookUrl);
      
      // Arrêter le job après exécution
      job.destroy();
      scheduler.scheduledJobs.delete(userId);
      console.log(`🕐 [SimpleScheduler] Job arrêté après exécution unique`);
      
    }, {
      scheduled: true,
      timezone: 'Europe/Paris'
    });
    
    scheduler.scheduledJobs.set(userId, { cronJob: job, webhookUrl, schedule });
    console.log(`✅ [SimpleScheduler] Webhook direct planifié (exécution unique)`);
    
  } catch (error) {
    console.error('❌ [SimpleScheduler] Erreur planification directe:', error);
    throw error;
  }
}

module.exports = {
  scheduleUserWorkflow,
  unscheduleUserWorkflow,
  scheduleDirectWebhook,
  scheduler
};
