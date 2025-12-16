/**
 * Script de planification simple
 * Utilise un cron job système pour déclencher les webhooks n8n
 */

const cron = require('node-cron');
const fetch = require('node-fetch');
const config = require('../config');
const logger = require('../utils/logger');

class SimpleScheduler {
  constructor() {
    this.scheduledJobs = new Map(); // `${userId}:${n8nWorkflowId}` -> { cronJob, webhookUrl, schedule }
    logger.info('Scheduler simple initialisé');
  }

  /**
   * Génère une clé unique pour identifier un workflow planifié
   */
  getJobKey(userId, n8nWorkflowId) {
    return `${userId}:${n8nWorkflowId}`;
  }

  /**
   * Planifier un workflow à une heure précise (une seule fois par jour)
   */
  scheduleWorkflow(userId, n8nWorkflowId, schedule, webhookUrl) {
    try {
      logger.info('Planification workflow', { n8nWorkflowId, schedule, userId });
      
      const jobKey = this.getJobKey(userId, n8nWorkflowId);
      
      // Arrêter le job existant pour ce workflow spécifique
      this.unscheduleWorkflow(userId, n8nWorkflowId);
      
      // Convertir l'heure en cron
      const [hours, minutes] = schedule.split(':').map(Number);
      const cronExpression = `${minutes} ${hours} * * *`;
      
      logger.debug('Expression cron générée', { cronExpression, schedule });
      
      let executed = false; // Flag pour éviter les exécutions multiples
      
      // Créer le job
      const job = cron.schedule(cronExpression, async () => {
        if (executed) {
          logger.warn('Job déjà exécuté, ignoré', { n8nWorkflowId, schedule });
          return;
        }
        
        executed = true;
        logger.info('Déclenchement workflow planifié', { n8nWorkflowId, schedule, webhookUrl, jobKey });
        
        try {
          await this.triggerWebhook(webhookUrl);
          logger.info('Webhook déclenché avec succès', { webhookUrl, jobKey });
        } catch (error) {
          // Ne pas faire planter le job si le webhook échoue
          // (peut être dû à un délai de propagation n8n ou workflow inactif)
          logger.error('Échec du déclenchement du webhook (non bloquant)', { 
            webhookUrl, 
            jobKey, 
            error: error.message,
            suggestion: 'Vérifiez que le workflow est actif dans n8n et que le webhook est bien enregistré'
          });
        }
        
        // Arrêter le job après exécution (même en cas d'erreur)
        job.destroy();
        this.scheduledJobs.delete(jobKey);
        logger.info('Job arrêté après exécution unique', { n8nWorkflowId, jobKey });
        
      }, {
        scheduled: true,
        timezone: 'Europe/Paris'
      });
      
      this.scheduledJobs.set(jobKey, { cronJob: job, webhookUrl, schedule, n8nWorkflowId });
      logger.info('Workflow planifié avec succès', { n8nWorkflowId, schedule, userId, jobKey });
      
    } catch (error) {
      logger.error('Erreur lors de la planification', { error: error.message, n8nWorkflowId, schedule });
      throw error;
    }
  }

  /**
   * Annuler la planification d'un workflow spécifique
   * Si n8nWorkflowId n'est pas fourni, annule tous les workflows de l'utilisateur
   */
  unscheduleWorkflow(userId, n8nWorkflowId = null) {
    if (n8nWorkflowId) {
      // Annuler un workflow spécifique
      const jobKey = this.getJobKey(userId, n8nWorkflowId);
      const jobData = this.scheduledJobs.get(jobKey);
      if (jobData) {
        jobData.cronJob.destroy();
        this.scheduledJobs.delete(jobKey);
        logger.info('Planification annulée', { userId, n8nWorkflowId, jobKey });
      }
    } else {
      // Annuler tous les workflows de l'utilisateur
      const keysToDelete = [];
      for (const [key, jobData] of this.scheduledJobs.entries()) {
        if (key.startsWith(`${userId}:`)) {
          jobData.cronJob.destroy();
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.scheduledJobs.delete(key));
      if (keysToDelete.length > 0) {
        logger.info('Tous les workflows de l\'utilisateur annulés', { userId, count: keysToDelete.length });
      }
    }
  }

  /**
   * Déclencher le webhook
   * Essaie d'abord l'URL de production, puis l'URL de test si disponible
   */
  async triggerWebhook(webhookUrl) {
    try {
      logger.debug('Déclenchement webhook', { webhookUrl });
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggeredBy: 'scheduler',
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `Webhook failed: ${response.status}`;
        
        // Messages d'erreur plus détaillés selon le code HTTP
        if (response.status === 404) {
          // Essayer l'URL de test si l'URL de production échoue
          const testWebhookUrl = webhookUrl.replace('/webhook/', '/webhook-test/');
          logger.warn('Webhook production retourne 404, tentative avec URL de test', { 
            productionUrl: webhookUrl,
            testUrl: testWebhookUrl
          });
          
          try {
            const testResponse = await fetch(testWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                triggeredBy: 'scheduler',
                timestamp: new Date().toISOString()
              })
            });
            
            if (testResponse.ok) {
              logger.warn('Webhook de test fonctionne mais pas le webhook de production - utilisation de l\'URL de test', {
                productionUrl: webhookUrl,
                testUrl: testWebhookUrl,
                message: 'Le workflow est actif mais le webhook de production n\'est pas encore enregistré. L\'URL de test fonctionne et sera utilisée.'
              });
              // Considérer comme un succès si l'URL de test fonctionne
              logger.info('Webhook déclenché avec succès (via URL de test)', { testUrl: testWebhookUrl });
              return;
            } else {
              const testErrorText = await testResponse.text().catch(() => '');
              logger.error('Webhook de test retourne aussi une erreur', {
                testUrl: testWebhookUrl,
                status: testResponse.status,
                errorText: testErrorText.substring(0, 200)
              });
            }
          } catch (testError) {
            logger.error('Erreur lors de la tentative avec URL de test', {
              testUrl: testWebhookUrl,
              error: testError.message
            });
          }
          
          errorMessage = `Webhook non trouvé (404) - Le webhook n'est pas enregistré dans n8n.

🔧 SOLUTIONS À APPLIQUER DANS N8N :
1. Désactivez le workflow dans n8n (bouton ON → OFF)
2. Sauvegardez le workflow
3. Réactivez le workflow (bouton OFF → ON)
4. Attendez 60 secondes après activation

📝 VÉRIFICATIONS :
- Vérifiez que le nœud Webhook a la méthode HTTP définie sur POST
- Vérifiez la variable d'environnement WEBHOOK_URL dans n8n (doit être: https://n8n.globalsaas.eu/)
- Vérifiez la configuration de votre proxy inverse (Nginx/Traefik)

URL testée: ${webhookUrl}`;
        } else if (response.status === 401) {
          errorMessage = `Authentification échouée (401). Vérifiez la clé API n8n`;
        } else if (response.status === 500) {
          errorMessage = `Erreur serveur n8n (500). Le workflow a peut-être une erreur de configuration`;
        }
        
        logger.error('Échec du déclenchement du webhook', { 
          webhookUrl, 
          status: response.status, 
          errorMessage,
          errorText: errorText.substring(0, 200) 
        });
        
        throw new Error(errorMessage);
      }
      
      logger.info('Webhook déclenché avec succès', { webhookUrl });
      
    } catch (error) {
      logger.error('Erreur lors du déclenchement du webhook', { webhookUrl, error: error.message });
      throw error;
    }
  }

  /**
   * Récupérer l'URL webhook d'un workflow n8n
   * Vérifie d'abord le path réel dans n8n pour s'assurer qu'il correspond
   */
  async getWebhookUrl(n8nWorkflowId, userWorkflowId = null) {
    try {
      const db = require('../database');
      
      // ⚠️ PRIORITÉ: Récupérer le path réel depuis n8n pour garantir qu'il est correct
      logger.debug('Récupération du webhook path réel depuis n8n', { n8nWorkflowId });
      const response = await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}`, {
        headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // Le workflow n'existe plus dans n8n - nettoyer l'entrée en BDD
          logger.warn('Workflow n\'existe plus dans n8n (404), nettoyage de la BDD', { n8nWorkflowId, userWorkflowId });
          
          if (userWorkflowId) {
            await db.query('DELETE FROM user_workflows WHERE id = $1', [userWorkflowId]);
            logger.info('Entrée workflow supprimée de la BDD', { userWorkflowId });
          } else {
            await db.query('DELETE FROM user_workflows WHERE n8n_workflow_id = $1', [n8nWorkflowId]);
            logger.info('Entrée workflow supprimée de la BDD', { n8nWorkflowId });
          }
          
          throw new Error(`Workflow ${n8nWorkflowId} n'existe plus dans n8n. L'entrée a été nettoyée de la base de données.`);
        }
        throw new Error(`Failed to get workflow from n8n: ${response.status}`);
      }
      
      const workflow = await response.json();
      
      // Vérifier que le workflow est actif
      if (!workflow.active) {
        throw new Error(`Workflow ${n8nWorkflowId} n'est pas actif dans n8n. Veuillez l'activer (bouton ON) avant de planifier.`);
      }
      
      // Vérifier les problèmes potentiels dans le workflow
      const workflowIssues = [];
      
      // Vérifier les nœuds sans credentials
      if (workflow.nodes) {
        for (const node of workflow.nodes) {
          if (node.credentials) {
            for (const [credType, credData] of Object.entries(node.credentials)) {
              if (!credData || !credData.id) {
                workflowIssues.push(`Nœud "${node.name}" (${node.type}): credential "${credType}" manquant`);
              }
            }
          }
          
          // Vérifier les paramètres critiques manquants
          if (node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.webhookTrigger') {
            if (!node.parameters?.path) {
              workflowIssues.push(`Nœud webhook "${node.name}": path manquant`);
            }
          }
        }
      }
      
      // Vérifier les connexions
      if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
        workflowIssues.push('Aucune connexion entre les nœuds détectée');
      }
      
      if (workflowIssues.length > 0) {
        logger.warn('Problèmes détectés dans le workflow qui peuvent empêcher son exécution', {
          n8nWorkflowId,
          issues: workflowIssues
        });
        // Ne pas bloquer la planification, mais logger un avertissement
        // L'utilisateur pourra corriger les problèmes dans n8n
      }
      
      const webhookNode = workflow.nodes?.find(node => 
        node.type === 'n8n-nodes-base.webhook' || 
        node.type === 'n8n-nodes-base.webhookTrigger' ||
        node.typeVersion === 1 && node.type === 'n8n-nodes-base.webhook'
      );
      
      if (!webhookNode) {
        throw new Error(`Aucun nœud webhook trouvé dans le workflow ${n8nWorkflowId}. Le workflow doit contenir un nœud Webhook pour être planifié.`);
      }
      
      // Utiliser le path du webhook depuis le nœud (source de vérité)
      const webhookPath = webhookNode.parameters?.path || webhookNode.parameters?.path?.value;
      
      if (!webhookPath) {
        throw new Error(`Le nœud webhook n'a pas de path configuré dans le workflow ${n8nWorkflowId}. Veuillez configurer le path dans le nœud Webhook.`);
      }
      
      const webhookUrl = `${config.n8n.url}/webhook/${webhookPath}`;
      logger.info('URL webhook récupérée depuis n8n', { webhookUrl, webhookPath, n8nWorkflowId });
      
      // Vérifier que l'URL webhook est accessible (test avec retry)
      // n8n peut prendre quelques secondes après activation pour enregistrer le webhook
      let webhookAccessible = false;
      const maxRetries = 3;
      const retryDelay = 2000; // 2 secondes
      let lastErrorDetails = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const testResponse = await fetch(webhookUrl, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true, attempt })
          });
          
          if (testResponse.status === 404) {
            let errorText = '';
            let errorJson = null;
            
            try {
              errorText = await testResponse.text();
              if (errorText) {
                errorJson = JSON.parse(errorText);
              }
            } catch (parseError) {
              // Ignorer les erreurs de parsing
            }
            
            // Vérifier si le message d'erreur indique que le workflow n'est pas actif
            const errorMessage = errorJson?.message || errorText || '';
            const errorHint = errorJson?.hint || '';
            
            // Stocker les détails de l'erreur pour le message final
            lastErrorDetails = {
              message: errorMessage,
              hint: errorHint,
              code: errorJson?.code || 404
            };
            
            if (errorMessage.includes('not registered') || errorHint.includes('must be active') || errorHint.includes('activate')) {
              // Si c'est le dernier essai, lancer l'erreur avec message détaillé
              if (attempt === maxRetries) {
                const detailedMessage = `Le webhook n'est pas enregistré dans n8n pour le workflow ${n8nWorkflowId}.

🔧 SOLUTIONS À APPLIQUER DANS N8N :
1. Désactivez le workflow dans n8n (bouton ON → OFF)
2. Sauvegardez le workflow
3. Réactivez le workflow (bouton OFF → ON)
4. Attendez 60 secondes après activation

📝 VÉRIFICATIONS :
- Vérifiez que le nœud Webhook a la méthode HTTP définie sur POST
- Vérifiez que le path correspond exactement à: ${webhookPath}
- Vérifiez la variable d'environnement WEBHOOK_URL dans n8n (doit être: https://n8n.globalsaas.eu/)

URL testée: ${webhookUrl}
Message n8n: ${errorMessage}`;
                throw new Error(detailedMessage);
              }
              // Sinon, attendre et réessayer
              logger.debug(`Tentative ${attempt}/${maxRetries}: Webhook non accessible, attente avant retry`, { webhookUrl, attempt });
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
            
            // Autre type d'erreur 404
            if (attempt === maxRetries) {
              const detailedMessage = `L'URL webhook retourne 404 après ${maxRetries} tentatives.

🔧 SOLUTIONS À APPLIQUER DANS N8N :
1. Vérifiez que le workflow est ACTIF dans n8n (bouton ON)
2. Désactivez puis réactivez le workflow pour forcer l'enregistrement du webhook
3. Vérifiez que le path du webhook dans n8n correspond à: ${webhookPath}
4. Vérifiez la configuration WEBHOOK_URL dans n8n

URL testée: ${webhookUrl}`;
              throw new Error(detailedMessage);
            }
            logger.debug(`Tentative ${attempt}/${maxRetries}: Webhook 404, attente avant retry`, { webhookUrl, attempt });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          
          if (testResponse.ok || testResponse.status === 200) {
            webhookAccessible = true;
            logger.debug('Test de l\'URL webhook réussi', { webhookUrl, attempt });
            break;
          } else {
            logger.warn(`Tentative ${attempt}/${maxRetries}: L'URL webhook retourne un code non-OK`, { 
              webhookUrl, 
              status: testResponse.status,
              attempt
            });
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        } catch (testError) {
          // Si c'est une erreur que nous avons lancée, la propager
          if (testError.message.includes('n\'est pas enregistré') || testError.message.includes('n\'est pas accessible') || testError.message.includes('retourne 404')) {
            throw testError;
          }
          // Erreur réseau ou autre
          if (attempt === maxRetries) {
            logger.warn('Impossible de tester l\'URL webhook après tous les essais', { webhookUrl, error: testError.message });
          } else {
            logger.debug(`Tentative ${attempt}/${maxRetries}: Erreur réseau, retry`, { webhookUrl, error: testError.message });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      if (!webhookAccessible) {
        logger.warn('Webhook non accessible après tous les essais, mais planification quand même', { webhookUrl });
      }
      
      // Vérifier si le path en BDD correspond et le mettre à jour si nécessaire
      if (userWorkflowId) {
        const userWorkflow = await db.query(
          'SELECT webhook_path FROM user_workflows WHERE id = $1',
          [userWorkflowId]
        );
        
        if (userWorkflow.rows.length > 0) {
          const dbWebhookPath = userWorkflow.rows[0].webhook_path;
          if (dbWebhookPath !== webhookPath) {
            logger.warn('Webhook path en BDD ne correspond pas au path réel, mise à jour', { 
              dbWebhookPath, 
              webhookPath, 
              userWorkflowId 
            });
            await db.query(
              'UPDATE user_workflows SET webhook_path = $1 WHERE id = $2',
              [webhookPath, userWorkflowId]
            );
            logger.info('Webhook path mis à jour en BDD', { userWorkflowId, webhookPath });
          }
        }
      } else {
        // Mettre à jour par n8nWorkflowId
        const userWorkflowByN8n = await db.query(
          'SELECT id, webhook_path FROM user_workflows WHERE n8n_workflow_id = $1 ORDER BY created_at DESC LIMIT 1',
          [n8nWorkflowId]
        );
        
        if (userWorkflowByN8n.rows.length > 0) {
          const dbWebhookPath = userWorkflowByN8n.rows[0].webhook_path;
          if (dbWebhookPath !== webhookPath) {
            logger.warn('Webhook path en BDD ne correspond pas au path réel, mise à jour', { 
              dbWebhookPath, 
              webhookPath, 
              n8nWorkflowId 
            });
            await db.query(
              'UPDATE user_workflows SET webhook_path = $1 WHERE id = $2',
              [webhookPath, userWorkflowByN8n.rows[0].id]
            );
            logger.info('Webhook path mis à jour en BDD', { n8nWorkflowId, webhookPath });
          }
        }
      }
      
      return webhookUrl;
      
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'URL webhook', { 
        error: error.message, 
        n8nWorkflowId, 
        userWorkflowId 
      });
      throw error;
    }
  }
}

// Export pour utilisation
const scheduler = new SimpleScheduler();

// Fonctions d'API simples
async function scheduleUserWorkflow(userId, n8nWorkflowId, schedule, userWorkflowId = null) {
  try {
    // Récupérer l'URL webhook avec validation (vérifie que le workflow est actif)
    const webhookUrl = await scheduler.getWebhookUrl(n8nWorkflowId, userWorkflowId);
    
    // Planifier le workflow
    scheduler.scheduleWorkflow(userId, n8nWorkflowId, schedule, webhookUrl);
    
    logger.info('Planification workflow terminée avec succès', { userId, n8nWorkflowId, schedule });
  } catch (error) {
    logger.error('Erreur lors de la planification du workflow', { 
      userId, 
      n8nWorkflowId, 
      schedule, 
      error: error.message 
    });
    throw error;
  }
}

async function unscheduleUserWorkflow(userId) {
  scheduler.unscheduleWorkflow(userId);
}

/**
 * Planifie directement un webhook sans passer par n8n
 * Valide que le webhook est accessible avant de planifier (validation non-bloquante)
 * Si la validation échoue, un avertissement est loggé mais la planification continue
 */
async function scheduleDirectWebhook(userId, webhookUrl, schedule, skipValidation = false, n8nWorkflowId = null) {
  try {
    logger.info('Planification directe webhook', { webhookUrl, schedule, userId, skipValidation, n8nWorkflowId });
    
    // Si n8nWorkflowId est fourni, récupérer le path réel depuis n8n pour garantir qu'il est correct
    if (n8nWorkflowId && n8nWorkflowId !== webhookUrl) {
      try {
        logger.debug('Récupération du webhook path réel depuis n8n', { n8nWorkflowId });
        const actualWebhookUrl = await scheduler.getWebhookUrl(n8nWorkflowId, null);
        if (actualWebhookUrl && actualWebhookUrl !== webhookUrl) {
          logger.warn('URL webhook fournie ne correspond pas au path réel dans n8n, utilisation du path réel', {
            providedUrl: webhookUrl,
            actualUrl: actualWebhookUrl,
            n8nWorkflowId
          });
          webhookUrl = actualWebhookUrl;
        } else {
          logger.debug('URL webhook fournie correspond au path réel dans n8n', { webhookUrl, n8nWorkflowId });
        }
      } catch (error) {
        // Si la récupération échoue, utiliser l'URL fournie mais logger un avertissement
        logger.warn('Impossible de récupérer le webhook path réel depuis n8n, utilisation de l\'URL fournie', {
          error: error.message,
          webhookUrl,
          n8nWorkflowId
        });
      }
    } else {
      // Extraire le n8nWorkflowId de l'URL webhook si non fourni
      if (!n8nWorkflowId) {
        // Tenter d'extraire l'ID depuis l'URL (format: /webhook/workflow-xxx-yyy)
        const match = webhookUrl.match(/\/webhook\/(?:workflow-)?([a-zA-Z0-9-]+)/);
        if (match) {
          const extractedPath = match[1];
          // Essayer de trouver le n8nWorkflowId en cherchant dans la BDD par webhook_path
          const db = require('../database');
          try {
            const dbResult = await db.query(
              'SELECT n8n_workflow_id FROM user_workflows WHERE webhook_path = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
              [extractedPath, userId]
            );
            if (dbResult.rows.length > 0) {
              n8nWorkflowId = dbResult.rows[0].n8n_workflow_id;
              logger.debug('n8nWorkflowId trouvé en BDD par webhook_path', { n8nWorkflowId, extractedPath });
              
              // Récupérer le path réel depuis n8n
              try {
                const actualWebhookUrl = await scheduler.getWebhookUrl(n8nWorkflowId, null);
                if (actualWebhookUrl && actualWebhookUrl !== webhookUrl) {
                  logger.warn('URL webhook fournie ne correspond pas au path réel dans n8n, utilisation du path réel', {
                    providedUrl: webhookUrl,
                    actualUrl: actualWebhookUrl,
                    n8nWorkflowId
                  });
                  webhookUrl = actualWebhookUrl;
                }
              } catch (n8nError) {
                logger.warn('Impossible de récupérer le webhook path réel depuis n8n', {
                  error: n8nError.message,
                  n8nWorkflowId
                });
              }
            } else {
              n8nWorkflowId = extractedPath;
              logger.debug('n8nWorkflowId extrait de l\'URL webhook (pas trouvé en BDD)', { n8nWorkflowId, webhookUrl });
            }
          } catch (dbError) {
            n8nWorkflowId = extractedPath;
            logger.debug('n8nWorkflowId extrait de l\'URL webhook (erreur BDD)', { n8nWorkflowId, webhookUrl, error: dbError.message });
          }
        } else {
          // Utiliser l'URL complète comme identifiant unique
          n8nWorkflowId = webhookUrl;
          logger.debug('Utilisation de l\'URL complète comme identifiant', { webhookUrl });
        }
      }
    }
    
    const jobKey = scheduler.getJobKey(userId, n8nWorkflowId);
    
    // Valider l'URL webhook avant de planifier (avec retry pour gérer le délai de propagation n8n)
    // Si skipValidation est true, on skip complètement la validation
    let webhookAccessible = false;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 secondes
    
    if (skipValidation) {
      logger.info('Validation webhook ignorée (skipValidation=true)', { webhookUrl });
      webhookAccessible = true; // On considère que c'est OK pour continuer
    } else {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const testResponse = await fetch(webhookUrl, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, attempt })
        });
        
        if (testResponse.status === 404) {
          let errorText = '';
          let errorJson = null;
          
          try {
            errorText = await testResponse.text();
            if (errorText) {
              errorJson = JSON.parse(errorText);
            }
          } catch (parseError) {
            // Ignorer les erreurs de parsing
          }
          
          // Vérifier si le message d'erreur indique que le workflow n'est pas actif
          const errorMessage = errorJson?.message || errorText || '';
          const errorHint = errorJson?.hint || '';
          
          if (errorMessage.includes('not registered') || errorHint.includes('must be active') || errorHint.includes('activate')) {
            // Si c'est le dernier essai, logger un avertissement mais continuer (non-bloquant)
            if (attempt === maxRetries) {
              logger.warn(`Webhook non accessible après ${maxRetries} tentatives. Le workflow est peut-être actif mais n8n n'a pas encore propagé le webhook en production. La planification continuera mais le webhook peut échouer lors de l'exécution.`, { 
                webhookUrl,
                suggestion: 'Attendez 30-60 secondes après activation ou désactivez/réactivez le workflow dans n8n'
              });
              // Ne pas lancer d'erreur, continuer la planification
              break;
            }
            // Sinon, attendre et réessayer
            logger.debug(`Tentative ${attempt}/${maxRetries}: Webhook non accessible, attente avant retry`, { webhookUrl, attempt });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          
          // Autre type d'erreur 404
          if (attempt === maxRetries) {
            logger.warn(`L'URL webhook retourne 404 après ${maxRetries} tentatives. Le path est peut-être incorrect ou n8n n'a pas encore propagé le webhook. La planification continuera.`, { webhookUrl });
            // Ne pas lancer d'erreur, continuer la planification
            break;
          }
          logger.debug(`Tentative ${attempt}/${maxRetries}: Webhook 404, attente avant retry`, { webhookUrl, attempt });
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        if (testResponse.ok || testResponse.status === 200) {
          webhookAccessible = true;
          logger.debug('Test de l\'URL webhook réussi', { webhookUrl, attempt });
          break;
        } else {
          logger.warn(`Tentative ${attempt}/${maxRetries}: L'URL webhook retourne un code non-OK`, { 
            webhookUrl, 
            status: testResponse.status,
            attempt
          });
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      } catch (testError) {
        // Erreur réseau ou autre - ne pas bloquer, juste logger
        if (attempt === maxRetries) {
          logger.warn('Impossible de tester l\'URL webhook après tous les essais, planification quand même', { 
            webhookUrl, 
            error: testError.message,
            message: 'Le webhook peut ne pas être immédiatement accessible. La planification continuera.'
          });
        } else {
          logger.debug(`Tentative ${attempt}/${maxRetries}: Erreur réseau, retry`, { webhookUrl, error: testError.message });
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // Toujours continuer la planification même si le webhook n'est pas accessible
    // (n8n peut avoir besoin de plus de temps pour propager le webhook)
    if (!webhookAccessible) {
      logger.warn('Webhook non accessible après validation, mais planification continuera', { 
        webhookUrl,
        message: 'Le webhook peut ne pas être immédiatement accessible après activation. La planification continuera mais le webhook peut échouer lors de l\'exécution si n8n n\'a pas encore propagé l\'endpoint. Attendez 30-60 secondes après activation ou désactivez/réactivez le workflow dans n8n.'
      });
    }
    } // Fermeture du bloc else
    
    // Arrêter le job existant pour ce workflow spécifique
    scheduler.unscheduleWorkflow(userId, n8nWorkflowId);
    
    // Convertir l'heure en cron
    const [hours, minutes] = schedule.split(':').map(Number);
    const cronExpression = `${minutes} ${hours} * * *`;
    
    logger.debug('Expression cron générée pour webhook direct', { cronExpression, schedule, jobKey });
    
    let executed = false; // Flag pour éviter les exécutions multiples
    
    // Créer le job
    const job = cron.schedule(cronExpression, async () => {
      if (executed) {
        logger.warn('Job déjà exécuté, ignoré', { webhookUrl, schedule, jobKey });
        return;
      }
      
      executed = true;
      logger.info('Déclenchement webhook direct', { webhookUrl, schedule, jobKey, n8nWorkflowId });
      
      try {
        await scheduler.triggerWebhook(webhookUrl);
        logger.info('Webhook déclenché avec succès', { webhookUrl, jobKey });
      } catch (error) {
        // Ne pas faire planter le job si le webhook échoue
        // (peut être dû à un délai de propagation n8n ou workflow inactif)
        logger.error('Échec du déclenchement du webhook (non bloquant)', { 
          webhookUrl, 
          jobKey, 
          error: error.message,
          suggestion: 'Vérifiez que le workflow est actif dans n8n et que le webhook est bien enregistré'
        });
      }
      
      // Arrêter le job après exécution (même en cas d'erreur)
      job.destroy();
      scheduler.scheduledJobs.delete(jobKey);
      logger.info('Job arrêté après exécution unique', { webhookUrl, jobKey });
      
    }, {
      scheduled: true,
      timezone: 'Europe/Paris'
    });
    
    scheduler.scheduledJobs.set(jobKey, { cronJob: job, webhookUrl, schedule, n8nWorkflowId });
    logger.info('Webhook direct planifié avec succès', { webhookUrl, schedule, userId, n8nWorkflowId, jobKey });
    
  } catch (error) {
    logger.error('Erreur lors de la planification directe', { error: error.message, webhookUrl, schedule });
    throw error;
  }
}

module.exports = {
  scheduleUserWorkflow,
  unscheduleUserWorkflow,
  scheduleDirectWebhook,
  scheduler
};
