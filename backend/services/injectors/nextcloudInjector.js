// Injecteur spécifique pour les templates Nextcloud
// Ce template nécessite :
// - Nextcloud API pour la gestion des fichiers
// - OpenRouter (admin) pour l'IA (si utilisé)

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials, createCredential } = require('../n8nService');
const db = require('../../database');
const logger = require('../../utils/logger');

/**
 * Crée un credential Nextcloud dans n8n
 * @param {Object} credentials - Données du credential (url, username, password)
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé avec id et name
 */
async function createNextcloudCredential(credentials, userId) {
  const credentialName = `Nextcloud - ${credentials.nextcloudUsername || 'user'}`;
  
  // Nettoyer l'URL de base
  let baseUrl = credentials.nextcloudUrl.replace(/\/$/, '');
  // Enlever le chemin WebDAV si présent dans l'URL fournie
  baseUrl = baseUrl.replace(/\/remote\.php\/.*$/, '');
  
  // Construire l'URL WebDAV - utiliser /remote.php/webdav pour compatibilité avec SwissDrive et autres
  const webDavUrl = `${baseUrl}/remote.php/webdav`;
  
  logger.debug('☁️ [NextcloudInjector] Création credential Nextcloud...', {
    originalUrl: credentials.nextcloudUrl,
    webDavUrl: webDavUrl,
    username: credentials.nextcloudUsername
  });
  
  const credentialData = {
    name: credentialName,
    type: 'nextCloudApi',
    data: {
      // Utiliser /remote.php/webdav pour compatibilité avec SwissDrive et serveurs similaires
      webDavUrl: webDavUrl,
      user: credentials.nextcloudUsername,
      password: credentials.nextcloudPassword
    }
  };
  
  try {
    const createdCredential = await createCredential(credentialData);
    logger.info('✅ [NextcloudInjector] Credential Nextcloud créé:', createdCredential.id);
    return {
      id: createdCredential.id,
      name: credentialName
    };
  } catch (error) {
    logger.error('❌ [NextcloudInjector] Erreur création credential Nextcloud:', error.message);
    throw error;
  }
}

/**
 * Injecte les credentials utilisateur pour les templates Nextcloud
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  logger.info('☁️ [NextcloudInjector] Injection spécifique pour template Nextcloud...');
  logger.debug('☁️ [NextcloudInjector] Template ID:', templateId);
  logger.debug('☁️ [NextcloudInjector] Template Name:', templateName);
  logger.debug('☁️ [NextcloudInjector] Credentials reçus:', Object.keys(userCredentials));
  
  // Générer un webhook unique - format simple sans tirets pour éviter les problèmes n8n
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    // Format: nctri + timestamp court (6 derniers chiffres) = unique et simple
    const timestamp = Date.now().toString().slice(-6);
    uniqueWebhookPath = `nctri${timestamp}`;
    logger.debug('🔧 [NextcloudInjector] Webhook unique généré:', uniqueWebhookPath);
  }
  
  const createdCredentials = {};
  
  // Créer le credential Nextcloud
  if (userCredentials.nextcloudUrl && userCredentials.nextcloudUsername && userCredentials.nextcloudPassword) {
    try {
      createdCredentials.nextCloudApi = await createNextcloudCredential(userCredentials, userId);
    } catch (error) {
      logger.error('❌ [NextcloudInjector] Erreur création credential Nextcloud:', error.message);
      throw new Error(`Impossible de créer le credential Nextcloud: ${error.message}`);
    }
  } else {
    logger.error('❌ [NextcloudInjector] Credentials Nextcloud incomplets');
    throw new Error('Les credentials Nextcloud sont incomplets (url, username ou password manquant)');
  }
  
  // Récupérer les credentials admin (OpenRouter, SMTP)
  logger.info('🔍 [NextcloudInjector] Récupération des credentials admin...');
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    logger.info('✅ [NextcloudInjector] Credentials admin récupérés:', {
      hasOpenRouter: !!adminCreds.OPENROUTER_ID,
      hasSmtp: !!adminCreds.SMTP_ID
    });
  } catch (error) {
    logger.error('❌ [NextcloudInjector] Erreur credentials admin:', error.message);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  
  // Remplacer les placeholders Nextcloud
  if (createdCredentials.nextCloudApi) {
    workflowString = workflowString.replace(
      /"USER_NEXTCLOUD_CREDENTIAL_ID"/g,
      `"${createdCredentials.nextCloudApi.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_NEXTCLOUD_CREDENTIAL_NAME"/g,
      `"${createdCredentials.nextCloudApi.name}"`
    );
    logger.debug('✅ [NextcloudInjector] Placeholders Nextcloud remplacés');
  }
  
  // Remplacer les dossiers source et destination
  const sourceFolder = userCredentials.nextcloudSourceFolder || '/';
  const destinationFolder = userCredentials.nextcloudDestinationFolder || '/Triés';
  
  workflowString = workflowString.replace(
    /"USER_NEXTCLOUD_SOURCE_FOLDER"/g,
    `"${sourceFolder}"`
  );
  workflowString = workflowString.replace(
    /"USER_NEXTCLOUD_DESTINATION_FOLDER"/g,
    `"${destinationFolder}"`
  );
  logger.debug('✅ [NextcloudInjector] Dossiers configurés:', { sourceFolder, destinationFolder });
  
  // Remplacer les placeholders OpenRouter
  if (adminCreds.OPENROUTER_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_ID"/g,
      `"${adminCreds.OPENROUTER_ID}"`
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_NAME"/g,
      `"${adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'}"`
    );
    logger.debug('✅ [NextcloudInjector] Placeholders OpenRouter remplacés');
  }
  
  // Remplacer les placeholders SMTP (admin)
  if (adminCreds.SMTP_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_CREDENTIAL_ID"/g,
      `"${adminCreds.SMTP_ID}"`
    );
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_CREDENTIAL_NAME"/g,
      `"${adminCreds.SMTP_NAME || 'SMTP Admin'}"`
    );
    logger.debug('✅ [NextcloudInjector] Placeholders SMTP remplacés');
  }
  
  // Parser le workflow
  const injectedWorkflow = JSON.parse(workflowString);
  
  // Injecter les credentials dans les nœuds
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      // Nœuds Nextcloud - assigner le credential utilisateur et configurer les dossiers
      if (node.type === 'n8n-nodes-base.nextCloud' || 
          node.type?.toLowerCase().includes('nextcloud') ||
          node.name?.toLowerCase().includes('nextcloud')) {
        if (createdCredentials.nextCloudApi) {
          node.credentials = {
            ...node.credentials,
            nextCloudApi: {
              id: createdCredentials.nextCloudApi.id,
              name: createdCredentials.nextCloudApi.name
            }
          };
          logger.info(`✅ [NextcloudInjector] Credential Nextcloud assigné à ${node.name}`);
        }
        
        // Configurer le dossier source pour les nœuds de listing/lecture
        const nodeNameLower = node.name?.toLowerCase() || '';
        if (nodeNameLower.includes('list') || nodeNameLower.includes('lister') || 
            nodeNameLower.includes('source') || nodeNameLower.includes('récupérer') ||
            node.parameters?.operation === 'list' || node.parameters?.operation === 'getAll') {
          node.parameters = {
            ...node.parameters,
            path: sourceFolder
          };
          logger.info(`✅ [NextcloudInjector] Dossier source configuré pour ${node.name}: ${sourceFolder}`);
        }
        
        // Configurer le dossier destination pour les nœuds de déplacement/création
        if (nodeNameLower.includes('move') || nodeNameLower.includes('déplacer') || 
            nodeNameLower.includes('destination') || nodeNameLower.includes('créer') ||
            node.parameters?.operation === 'move' || node.parameters?.operation === 'copy') {
          // Le dossier de destination sera utilisé comme base
          if (node.parameters?.toPath) {
            node.parameters.toPath = node.parameters.toPath.replace(/^\/Triés/, destinationFolder);
          }
          logger.info(`✅ [NextcloudInjector] Dossier destination configuré pour ${node.name}: ${destinationFolder}`);
        }
      }
      
      // Nœuds WebDAV - assigner le même credential (compatible)
      if (node.type === 'n8n-nodes-base.webdav' || 
          node.name?.toLowerCase().includes('webdav')) {
        if (createdCredentials.nextCloudApi) {
          node.credentials = {
            ...node.credentials,
            webDavApi: {
              id: createdCredentials.nextCloudApi.id,
              name: createdCredentials.nextCloudApi.name
            }
          };
          logger.info(`✅ [NextcloudInjector] Credential WebDAV assigné à ${node.name}`);
        }
      }
      
      // Nœuds AI/LLM - assigner le credential OpenRouter admin
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
          node.type === '@n8n/n8n-nodes-langchain.agent' ||
          node.name?.toLowerCase().includes('openrouter') ||
          node.name?.toLowerCase().includes('llm') ||
          node.name?.toLowerCase().includes('ai agent')) {
        if (adminCreds.OPENROUTER_ID) {
          node.credentials = {
            ...node.credentials,
            openRouterApi: {
              id: adminCreds.OPENROUTER_ID,
              name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
            }
          };
          logger.info(`✅ [NextcloudInjector] Credential OpenRouter assigné à ${node.name}`);
        }
      }
      
      // Nœuds Email Send - assigner le credential SMTP admin
      if (node.type === 'n8n-nodes-base.emailSend' || 
          node.type === 'n8n-nodes-base.smtp' ||
          node.name?.toLowerCase().includes('email') ||
          node.name?.toLowerCase().includes('notification')) {
        if (adminCreds.SMTP_ID) {
          node.credentials = {
            ...node.credentials,
            smtp: {
              id: adminCreds.SMTP_ID,
              name: adminCreds.SMTP_NAME || 'SMTP Admin'
            }
          };
          logger.info(`✅ [NextcloudInjector] Credential SMTP Admin assigné à ${node.name}`);
        }
      }
      
      // Configurer l'heure du Schedule si fournie
      if ((node.type === 'n8n-nodes-base.schedule' || 
           node.type === 'n8n-nodes-base.scheduleTrigger') && 
          userCredentials.scheduleTime) {
        const [hour, minute] = userCredentials.scheduleTime.split(':').map(Number);
        node.parameters = {
          ...node.parameters,
          rule: {
            interval: [{
              field: 'cronExpression',
              cronExpression: `${minute} ${hour} * * *`
            }]
          }
        };
        logger.info(`✅ [NextcloudInjector] Schedule configuré à ${userCredentials.scheduleTime}`);
      }
      
      return node;
    });
  }
  
  // Gérer les webhooks - Configuration complète pour éviter les erreurs 404
  if (uniqueWebhookPath) {
    const webhookNodes = injectedWorkflow.nodes?.filter(n => 
      n.type === 'n8n-nodes-base.webhook' || n.type === 'n8n-nodes-base.webhookTrigger'
    );
    if (webhookNodes && webhookNodes.length > 0) {
      webhookNodes.forEach(node => {
        // Configurer tous les paramètres du webhook pour garantir l'enregistrement
        node.parameters = {
          ...node.parameters,
          path: uniqueWebhookPath,
          httpMethod: 'POST',
          responseMode: 'onReceived',  // Important: pas 'responseNode' qui pose problème
          responseCode: 200
        };
        // Générer un webhookId unique - CRUCIAL pour l'enregistrement du webhook
        node.webhookId = 'wh' + Date.now();
        // S'assurer que typeVersion est correct
        node.typeVersion = node.typeVersion || 2;
        
        logger.debug(`✅ [NextcloudInjector] Webhook configuré pour ${node.name}:`, {
          path: uniqueWebhookPath,
          webhookId: node.webhookId,
          responseMode: node.parameters.responseMode
        });
      });
    }
  }
  
  // Log récapitulatif
  const credentialsSummary = {
    nodesTotal: injectedWorkflow.nodes?.length || 0,
    nodesWithCredentials: injectedWorkflow.nodes?.filter(n => n.credentials && Object.keys(n.credentials).length > 0).length || 0,
    nextcloud: createdCredentials.nextCloudApi ? createdCredentials.nextCloudApi.id : 'NON ASSIGNÉ',
    openRouter: adminCreds.OPENROUTER_ID || 'NON ASSIGNÉ',
    smtp: adminCreds.SMTP_ID || 'NON ASSIGNÉ',
    webhookPath: uniqueWebhookPath
  };
  
  logger.info('✅ [NextcloudInjector] Injection terminée avec succès', credentialsSummary);
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: createdCredentials
  };
}

module.exports = {
  injectUserCredentials,
  createNextcloudCredential
};

