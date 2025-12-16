// Injecteur spécifique pour le template "test mcp"
// Ce template nécessite :
// - OpenRouter API (géré par l'admin)
// - Google Sheets OAuth2
// - Google Docs OAuth2
// - Google Drive OAuth2
// - Gmail OAuth2

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials } = require('../n8nService');
const db = require('../../database');
const logger = require('../../utils/logger');
const config = require('../../config');

/**
 * Vérifie qu'un credential existe dans n8n
 */
async function verifyCredentialInN8n(credentialId) {
  if (!credentialId) return false;
  
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    const credCheck = await fetch(`${n8nUrl}/api/v1/credentials/${credentialId}`, {
      headers: { 'X-N8N-API-KEY': n8nApiKey },
    });
    
    return credCheck.ok;
  } catch (error) {
    logger.warn('⚠️ [McpTestInjector] Erreur vérification credential:', error.message);
    return false;
  }
}

/**
 * Injecte les credentials utilisateur pour le template test mcp
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  logger.info('🔧 [McpTestInjector] Injection spécifique pour test mcp...');
  logger.debug('🔧 [McpTestInjector] Template ID:', templateId);
  logger.debug('🔧 [McpTestInjector] Template Name:', templateName);
  logger.debug('🔧 [McpTestInjector] Credentials reçus:', Object.keys(userCredentials));
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow, templateId, templateName);
  logger.debug('🔧 [McpTestInjector] Credentials requis:', requiredCredentials.length);
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  const createdCredentials = {};
  
  // Récupérer les credentials admin (OpenRouter)
  logger.info('🔍 [McpTestInjector] Récupération des credentials admin...');
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    // Forcer l'utilisation du credential OpenRouter spécifique si défini dans l'environnement
    if (process.env.ADMIN_OPENROUTER_CREDENTIAL_ID) {
      adminCreds.OPENROUTER_ID = process.env.ADMIN_OPENROUTER_CREDENTIAL_ID;
      adminCreds.OPENROUTER_NAME = process.env.ADMIN_OPENROUTER_CREDENTIAL_NAME || 'OpenRouter Admin';
      logger.info('✅ [McpTestInjector] Credential OpenRouter forcé depuis env:', adminCreds.OPENROUTER_ID);
    }
    logger.info('✅ [McpTestInjector] Credentials admin récupérés:', {
      hasOpenRouter: !!adminCreds.OPENROUTER_ID,
      openRouterId: adminCreds.OPENROUTER_ID
    });
  } catch (error) {
    logger.error('❌ [McpTestInjector] Erreur credentials admin:', error.message);
    // Utiliser le credential depuis l'environnement en fallback
    if (process.env.ADMIN_OPENROUTER_CREDENTIAL_ID) {
      adminCreds.OPENROUTER_ID = process.env.ADMIN_OPENROUTER_CREDENTIAL_ID;
      adminCreds.OPENROUTER_NAME = process.env.ADMIN_OPENROUTER_CREDENTIAL_NAME || 'OpenRouter Admin';
      logger.info('✅ [McpTestInjector] Utilisation du credential OpenRouter depuis env en fallback');
    } else {
      throw new Error(`Impossible de récupérer les credentials admin: ${error.message}`);
    }
  }
  
  // Injecter OpenRouter (admin)
  if (adminCreds.OPENROUTER_ID) {
    createdCredentials.openRouterApi = {
      id: adminCreds.OPENROUTER_ID,
      name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
    };
    // Remplacer avec les guillemets pour correspondre au JSON stringifié (comme les autres injecteurs)
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_ID"/g,
      `"${adminCreds.OPENROUTER_ID}"`
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_NAME"/g,
      `"${adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'}"`
    );
    logger.debug('✅ [McpTestInjector] Placeholders OpenRouter remplacés');
  }
  
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RÉCUPÉRATION DES CREDENTIALS GOOGLE (comme videoProductionInjector)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Récupérer DIRECTEMENT tous les credentials Google depuis la base de données
  // (sans vérifier userCredentials.googleUnified)
  logger.info('🔍 [McpTestInjector] Récupération des credentials Google depuis la base de données...');
  
  // Fonction helper pour récupérer, vérifier et créer si nécessaire un credential Google
  async function getAndVerifyGoogleCredential(provider, key, displayName, n8nType) {
    const creds = await db.getOAuthCredentials(userId, provider);
    if (creds && creds.length > 0) {
      let credentialId = creds[0].n8n_credential_id;
      let existsInN8n = false;
      
      // Si un credential ID existe, vérifier qu'il existe dans n8n
      if (credentialId) {
        existsInN8n = await verifyCredentialInN8n(credentialId);
      }
      
      // Si le credential n'existe pas dans n8n, le créer
      if (!existsInN8n) {
        logger.info(`🔄 [McpTestInjector] Création du credential ${displayName} dans n8n...`);
        
        try {
          // Récupérer les tokens depuis la base de données
          let tokens;
          if (typeof creds[0].encrypted_data === 'string') {
            tokens = JSON.parse(creds[0].encrypted_data);
          } else if (typeof creds[0].encrypted_data === 'object') {
            tokens = creds[0].encrypted_data;
          } else {
            logger.warn(`⚠️ [McpTestInjector] Tokens non disponibles pour ${displayName}`);
            return false;
          }
          
          // Créer le credential dans n8n
          const n8nUrl = config.n8n.url;
          const n8nApiKey = config.n8n.apiKey;
          const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
          const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
          
          if (!clientId || !clientSecret) {
            logger.error(`❌ [McpTestInjector] GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET requis pour créer ${displayName}`);
            return false;
          }
          
          const credentialData = {
            name: `${displayName} - ${creds[0].email || 'user'} - ${userId.substring(0, 8)}`,
            type: n8nType,
            data: {
              clientId: clientId,
              clientSecret: clientSecret,
              serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
              sendAdditionalBodyProperties: false,
              additionalBodyProperties: '',
              allowedDomains: '',
              oauthTokenData: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_type: tokens.token_type || 'Bearer',
                expires_in: tokens.expires_in,
                scope: tokens.scope,
                expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
              }
            }
          };
          
          const createResponse = await fetch(`${n8nUrl}/api/v1/credentials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey,
            },
            body: JSON.stringify(credentialData),
          });
          
          if (createResponse.ok) {
            const n8nCred = await createResponse.json();
            credentialId = n8nCred.id;
            logger.info(`✅ [McpTestInjector] Credential ${displayName} créé dans n8n:`, credentialId);
            
            // Mettre à jour le n8n_credential_id dans la base de données
            await db.query(
              'UPDATE oauth_credentials SET n8n_credential_id = $1, updated_at = NOW() WHERE id = $2',
              [credentialId, creds[0].id]
            );
            logger.info(`✅ [McpTestInjector] Credential ${displayName} mis à jour en base de données`);
          } else {
            const errorText = await createResponse.text();
            logger.error(`❌ [McpTestInjector] Erreur création ${displayName} dans n8n:`, errorText);
            return false;
          }
        } catch (error) {
          logger.error(`❌ [McpTestInjector] Erreur lors de la création de ${displayName}:`, error.message);
          return false;
        }
      }
      
      // Utiliser le credential (existant ou nouvellement créé)
      createdCredentials[key] = {
        id: credentialId,
        name: `${displayName} - ${creds[0].email || 'user'}`
      };
      logger.info(`✅ [McpTestInjector] Credential ${displayName} disponible:`, createdCredentials[key].id);
      return true;
    }
    return false;
  }
  
  // Récupérer, vérifier et créer si nécessaire tous les credentials Google
  await getAndVerifyGoogleCredential('google_sheets', 'googleSheetsOAuth2', 'Google Sheets', 'googleSheetsOAuth2Api');
  await getAndVerifyGoogleCredential('google_docs', 'googleDocsOAuth2', 'Google Docs', 'googleDocsOAuth2Api');
  await getAndVerifyGoogleCredential('google_drive', 'googleDriveOAuth2', 'Google Drive', 'googleDriveOAuth2Api');
  await getAndVerifyGoogleCredential('gmail', 'gmailOAuth2', 'Gmail', 'gmailOAuth2');
  await getAndVerifyGoogleCredential('google_calendar', 'googleCalendarOAuth2', 'Google Calendar', 'googleCalendarOAuth2Api');
  await getAndVerifyGoogleCredential('google_ads', 'googleAdsOAuth2', 'Google Ads', 'googleAdsOAuth2Api');
  await getAndVerifyGoogleCredential('google_tasks', 'googleTasksOAuth2', 'Google Tasks', 'googleTasksOAuth2Api');
  await getAndVerifyGoogleCredential('google_slides', 'googleSlidesOAuth2', 'Google Slides', 'googleSlidesOAuth2Api');
  
  // Pour les credentials manquants, utiliser le credential Drive comme fallback (même token OAuth)
  const fallbackCred = createdCredentials.googleDriveOAuth2 || 
                       createdCredentials.googleSheetsOAuth2 || 
                       createdCredentials.googleDocsOAuth2;
  
  if (fallbackCred) {
    if (!createdCredentials.googleCalendarOAuth2) {
      createdCredentials.googleCalendarOAuth2 = { ...fallbackCred };
      logger.info('✅ [McpTestInjector] Credential Google Calendar utilise fallback:', fallbackCred.id);
    }
    if (!createdCredentials.googleAdsOAuth2) {
      createdCredentials.googleAdsOAuth2 = { ...fallbackCred };
      logger.info('✅ [McpTestInjector] Credential Google Ads utilise fallback:', fallbackCred.id);
    }
    if (!createdCredentials.googleTasksOAuth2) {
      createdCredentials.googleTasksOAuth2 = { ...fallbackCred };
      logger.info('✅ [McpTestInjector] Credential Google Tasks utilise fallback:', fallbackCred.id);
    }
    if (!createdCredentials.googleSlidesOAuth2) {
      createdCredentials.googleSlidesOAuth2 = { ...fallbackCred };
      logger.info('✅ [McpTestInjector] Credential Google Slides utilise fallback:', fallbackCred.id);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REMPLACEMENT DES PLACEHOLDERS DANS LE WORKFLOW STRING
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Remplacer les placeholders Google Sheets
  if (createdCredentials.googleSheetsOAuth2) {
    workflowString = workflowString.replace(
      /"USER_GOOGLESHEETSOAUTH2_CREDENTIAL_ID"/g,
      `"${createdCredentials.googleSheetsOAuth2.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_GOOGLESHEETSOAUTH2_CREDENTIAL_NAME"/g,
      `"${createdCredentials.googleSheetsOAuth2.name}"`
    );
    logger.debug('✅ [McpTestInjector] Placeholders Google Sheets remplacés');
  }
  
  // Remplacer les placeholders Google Docs
  if (createdCredentials.googleDocsOAuth2) {
    workflowString = workflowString.replace(
      /"USER_GOOGLEDOCSOAUTH2_CREDENTIAL_ID"/g,
      `"${createdCredentials.googleDocsOAuth2.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_GOOGLEDOCSOAUTH2_CREDENTIAL_NAME"/g,
      `"${createdCredentials.googleDocsOAuth2.name}"`
    );
    logger.debug('✅ [McpTestInjector] Placeholders Google Docs remplacés');
  }
  
  // Remplacer les placeholders Google Drive
  if (createdCredentials.googleDriveOAuth2) {
    workflowString = workflowString.replace(
      /"USER_GOOGLEDRIVEOAUTH2_CREDENTIAL_ID"/g,
      `"${createdCredentials.googleDriveOAuth2.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_GOOGLEDRIVEOAUTH2_CREDENTIAL_NAME"/g,
      `"${createdCredentials.googleDriveOAuth2.name}"`
    );
    logger.debug('✅ [McpTestInjector] Placeholders Google Drive remplacés');
  }
  
  // Remplacer les placeholders Gmail
  if (createdCredentials.gmailOAuth2) {
    workflowString = workflowString.replace(
      /"USER_GMAILOAUTH2_CREDENTIAL_ID"/g,
      `"${createdCredentials.gmailOAuth2.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_GMAILOAUTH2_CREDENTIAL_NAME"/g,
      `"${createdCredentials.gmailOAuth2.name}"`
    );
    logger.debug('✅ [McpTestInjector] Placeholders Gmail remplacés');
  }
  
  // Parser le workflow modifié
  const injectedWorkflow = JSON.parse(workflowString);
  
  // Log des credentials créés pour débogage
  logger.info('🔍 [McpTestInjector] Credentials créés avant assignation aux nœuds:', {
    openRouter: !!createdCredentials.openRouterApi,
    googleSheets: !!createdCredentials.googleSheetsOAuth2,
    googleDocs: !!createdCredentials.googleDocsOAuth2,
    googleDrive: !!createdCredentials.googleDriveOAuth2,
    gmail: !!createdCredentials.gmailOAuth2,
    googleCalendar: !!createdCredentials.googleCalendarOAuth2,
    googleAds: !!createdCredentials.googleAdsOAuth2,
    googleTasks: !!createdCredentials.googleTasksOAuth2,
    googleSlides: !!createdCredentials.googleSlidesOAuth2,
    allKeys: Object.keys(createdCredentials)
  });
  
  // Générer un webhookPath unique pour ce workflow
  const webhookPath = `mcp-chat-${userId.substring(0, 8)}-${Date.now().toString(36)}`;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GESTION DES WEBHOOKS : Garder seulement le premier webhook
  // ═══════════════════════════════════════════════════════════════════════════
  const webhookNodes = injectedWorkflow.nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
  
  if (webhookNodes.length > 1) {
    logger.warn(`⚠️ [McpTestInjector] ${webhookNodes.length} webhooks trouvés, conservation du premier uniquement`);
    // Garder seulement le premier webhook
    const firstWebhook = webhookNodes[0];
    const webhookNamesToRemove = webhookNodes.slice(1).map(n => n.name);
    
    // Supprimer les webhooks en double
    injectedWorkflow.nodes = injectedWorkflow.nodes.filter(n => 
      n.type !== 'n8n-nodes-base.webhook' || n.name === firstWebhook.name
    );
    
    // Supprimer les connexions des webhooks supprimés
    if (injectedWorkflow.connections) {
      webhookNamesToRemove.forEach(name => {
        delete injectedWorkflow.connections[name];
      });
    }
    
    logger.info(`✅ [McpTestInjector] ${webhookNamesToRemove.length} webhook(s) supprimé(s), seul "${firstWebhook.name}" est conservé`);
  }
  
  // Configurer le webhook restant
  const remainingWebhook = injectedWorkflow.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  if (remainingWebhook) {
    if (remainingWebhook.parameters) {
      remainingWebhook.parameters.path = webhookPath;
      remainingWebhook.parameters.responseMode = 'responseNode'; // Pour permettre une réponse dans le workflow
      remainingWebhook.parameters.httpMethod = 'POST';
      logger.info(`✅ [McpTestInjector] Webhook "${remainingWebhook.name}" configuré avec path: ${webhookPath}`);
    }
    
    // Vérifier si le webhook est connecté
    const webhookConnections = injectedWorkflow.connections?.[remainingWebhook.name];
    if (!webhookConnections || !webhookConnections.main || webhookConnections.main.length === 0) {
      logger.warn(`⚠️ [McpTestInjector] Webhook "${remainingWebhook.name}" n'est pas connecté à un nœud suivant`);
      // Essayer de connecter le webhook à l'AI Agent si présent
      const aiAgentNode = injectedWorkflow.nodes.find(n => 
        n.type === '@n8n/n8n-nodes-langchain.agent' || 
        (n.name && n.name.toLowerCase().includes('ai agent'))
      );
      if (aiAgentNode && injectedWorkflow.connections) {
        if (!injectedWorkflow.connections[remainingWebhook.name]) {
          injectedWorkflow.connections[remainingWebhook.name] = {};
        }
        injectedWorkflow.connections[remainingWebhook.name].main = [[{
          node: aiAgentNode.name,
          type: 'main',
          index: 0
        }]];
        logger.info(`✅ [McpTestInjector] Webhook "${remainingWebhook.name}" connecté à "${aiAgentNode.name}"`);
      }
    } else {
      logger.debug(`✅ [McpTestInjector] Webhook "${remainingWebhook.name}" est connecté`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VÉRIFIER ET AJOUTER LE NŒUD "Respond to Webhook" si nécessaire
    // ═══════════════════════════════════════════════════════════════════════════
    // Avec responseMode: 'responseNode', n8n nécessite un nœud "Respond to Webhook"
    const respondToWebhookNode = injectedWorkflow.nodes.find(n => 
      n.type === 'n8n-nodes-base.respondToWebhook' ||
      (n.name && n.name.toLowerCase().includes('respond') && n.name.toLowerCase().includes('webhook'))
    );
    
    if (!respondToWebhookNode) {
      logger.warn(`⚠️ [McpTestInjector] Nœud "Respond to Webhook" introuvable, création en cours...`);
      
      // Trouver l'AI Agent pour positionner le nœud de réponse après
      const aiAgentNode = injectedWorkflow.nodes.find(n => 
        n.type === '@n8n/n8n-nodes-langchain.agent' || 
        (n.name && n.name.toLowerCase().includes('ai agent'))
      );
      
      const position = aiAgentNode 
        ? [aiAgentNode.position[0] + 300, aiAgentNode.position[1]]
        : [800, 500];
      
      const respondNode = {
        id: `respond-webhook-${Date.now()}`,
        name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: position,
        parameters: {
          respondWith: 'json',
          responseBody: '={{ { "response": $json.output || $json.text || $json.message || "Message traité" } }}'
        }
      };
      
      injectedWorkflow.nodes.push(respondNode);
      
      // Connecter l'AI Agent au nœud Respond to Webhook
      if (aiAgentNode && injectedWorkflow.connections) {
        if (!injectedWorkflow.connections[aiAgentNode.name]) {
          injectedWorkflow.connections[aiAgentNode.name] = {};
        }
        if (!injectedWorkflow.connections[aiAgentNode.name].main) {
          injectedWorkflow.connections[aiAgentNode.name].main = [];
        }
        // Vérifier si l'AI Agent n'est pas déjà connecté à un autre nœud
        const existingConnections = injectedWorkflow.connections[aiAgentNode.name].main;
        if (existingConnections.length === 0 || 
            !existingConnections[0].some(conn => conn.node === respondNode.name)) {
          injectedWorkflow.connections[aiAgentNode.name].main.push([{
            node: respondNode.name,
            type: 'main',
            index: 0
          }]);
          logger.info(`✅ [McpTestInjector] AI Agent "${aiAgentNode.name}" connecté à "Respond to Webhook"`);
        }
      }
      
      logger.info(`✅ [McpTestInjector] Nœud "Respond to Webhook" créé et connecté`);
    } else {
      logger.debug(`✅ [McpTestInjector] Nœud "Respond to Webhook" déjà présent: ${respondToWebhookNode.name}`);
    }
  } else {
    logger.warn(`⚠️ [McpTestInjector] Aucun webhook trouvé dans le workflow`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VÉRIFICATION ET RESTAURATION DU NŒUD OPENROUTER CHAT MODEL
  // ═══════════════════════════════════════════════════════════════════════════
  let openRouterNode = injectedWorkflow.nodes.find(n => 
    n.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
    (n.name && n.name.toLowerCase().includes('openrouter') && n.name.toLowerCase().includes('chat model'))
  );
  
  // Si le nœud OpenRouter n'existe pas, le créer
  if (!openRouterNode) {
    logger.warn(`⚠️ [McpTestInjector] Nœud OpenRouter Chat Model introuvable, création en cours...`);
    
    // Trouver l'AI Agent pour positionner le nœud OpenRouter à côté
    const aiAgentNode = injectedWorkflow.nodes.find(n => 
      n.type === '@n8n/n8n-nodes-langchain.agent' || 
      (n.name && n.name.toLowerCase().includes('ai agent'))
    );
    
    const position = aiAgentNode 
      ? [aiAgentNode.position[0], aiAgentNode.position[1] + 200]
      : [500, 500];
    
    openRouterNode = {
      id: `openrouter-${Date.now()}`,
      name: 'OpenRouter Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      typeVersion: 1,
      position: position,
      parameters: {
        model: 'openai/gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 4000
      },
      credentials: {}
    };
    
    injectedWorkflow.nodes.push(openRouterNode);
    logger.info(`✅ [McpTestInjector] Nœud OpenRouter Chat Model créé`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION OPENROUTER : S'assurer que le modèle et les credentials sont corrects
  // ═══════════════════════════════════════════════════════════════════════════
  if (openRouterNode) {
    if (!openRouterNode.parameters) {
      openRouterNode.parameters = {};
    }
    
    // Si le modèle n'est pas défini ou est un placeholder, utiliser le modèle par défaut
    const defaultModel = 'openai/gpt-4o-mini'; // Modèle recommandé : bon rapport qualité/prix
    if (!openRouterNode.parameters.model || openRouterNode.parameters.model.includes('PLACEHOLDER') || openRouterNode.parameters.model.includes('ADMIN')) {
      const oldModel = openRouterNode.parameters.model || 'non défini';
      openRouterNode.parameters.model = defaultModel;
      logger.info(`✅ [McpTestInjector] Modèle OpenRouter configuré dans ${openRouterNode.name}:`);
      logger.info(`  - Ancien: ${oldModel}`);
      logger.info(`  - Nouveau: ${defaultModel}`);
    } else {
      logger.debug(`✅ [McpTestInjector] Modèle OpenRouter déjà configuré dans ${openRouterNode.name}: ${openRouterNode.parameters.model}`);
    }
    
    // S'assurer que les credentials OpenRouter admin sont assignés
    if (!openRouterNode.credentials) {
      openRouterNode.credentials = {};
    }
    if (createdCredentials.openRouterApi) {
      openRouterNode.credentials.openRouterApi = {
        id: createdCredentials.openRouterApi.id,
        name: createdCredentials.openRouterApi.name
      };
      logger.info(`✅ [McpTestInjector] Credential OpenRouter admin assigné à ${openRouterNode.name}`);
    } else {
      logger.warn(`⚠️ [McpTestInjector] Credential OpenRouter admin non disponible pour ${openRouterNode.name}`);
    }
    
    // Vérifier que le nœud OpenRouter est connecté à l'AI Agent
    const aiAgentNode = injectedWorkflow.nodes.find(n => 
      n.type === '@n8n/n8n-nodes-langchain.agent' || 
      (n.name && n.name.toLowerCase().includes('ai agent'))
    );
    
    if (aiAgentNode && injectedWorkflow.connections) {
      const openRouterConnections = injectedWorkflow.connections[openRouterNode.name];
      const isConnected = openRouterConnections && 
                         openRouterConnections.ai_languageModel && 
                         openRouterConnections.ai_languageModel.length > 0 &&
                         openRouterConnections.ai_languageModel[0].some(conn => conn.node === aiAgentNode.name);
      
      if (!isConnected) {
        if (!injectedWorkflow.connections[openRouterNode.name]) {
          injectedWorkflow.connections[openRouterNode.name] = {};
        }
        injectedWorkflow.connections[openRouterNode.name].ai_languageModel = [[{
          node: aiAgentNode.name,
          type: 'ai_languageModel',
          index: 0
        }]];
        logger.info(`✅ [McpTestInjector] Nœud OpenRouter connecté à "${aiAgentNode.name}" via ai_languageModel`);
      } else {
        logger.debug(`✅ [McpTestInjector] Nœud OpenRouter déjà connecté à "${aiAgentNode.name}"`);
      }
    }
  }
  
  // Vérifier tous les credentials OpenRouter et Google en parallèle avant assignation
  const openRouterId = adminCreds.OPENROUTER_ID || process.env.ADMIN_OPENROUTER_CREDENTIAL_ID || 'DJ4JtAswl4vKWvdI';
  const openRouterExists = openRouterId ? await verifyCredentialInN8n(openRouterId) : false;
  if (openRouterId && !openRouterExists) {
    logger.warn(`⚠️ [McpTestInjector] Credential OpenRouter non trouvé dans n8n, ID: ${openRouterId}`);
  }
  
  // Vérifier les credentials Google en parallèle
  const googleCredsToVerify = [
    { key: 'googleSheetsOAuth2', id: createdCredentials.googleSheetsOAuth2?.id },
    { key: 'googleDocsOAuth2', id: createdCredentials.googleDocsOAuth2?.id },
    { key: 'googleDriveOAuth2', id: createdCredentials.googleDriveOAuth2?.id },
    { key: 'gmailOAuth2', id: createdCredentials.gmailOAuth2?.id },
    { key: 'googleCalendarOAuth2', id: createdCredentials.googleCalendarOAuth2?.id },
    { key: 'googleTasksOAuth2', id: createdCredentials.googleTasksOAuth2?.id },
    { key: 'googleSlidesOAuth2', id: createdCredentials.googleSlidesOAuth2?.id }
  ];
  
  const verificationResults = await Promise.all(
    googleCredsToVerify.map(async cred => ({
      key: cred.key,
      id: cred.id,
      exists: cred.id ? await verifyCredentialInN8n(cred.id) : false
    }))
  );
  
  verificationResults.forEach(result => {
    if (result.id && !result.exists) {
      logger.warn(`⚠️ [McpTestInjector] Credential ${result.key} non trouvé dans n8n, ID: ${result.id}`);
    }
  });
  
  // Assigner les credentials aux nœuds appropriés (utiliser .map() comme les autres injecteurs)
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      // Initialiser les credentials si nécessaire
      if (!node.credentials) {
        node.credentials = {};
      }
      
      // OpenRouter - Assigner automatiquement les credentials admin à tous les nœuds OpenRouter
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
          node.type === '@n8n/n8n-nodes-langchain.agent' ||
          node.name?.toLowerCase().includes('openrouter') ||
          node.name?.toLowerCase().includes('llm') ||
          node.name?.toLowerCase().includes('ai agent') ||
          node.name?.toLowerCase().includes('chat model')) {
        // Utiliser le credential depuis adminCreds ou depuis l'environnement directement
        const openRouterId = adminCreds.OPENROUTER_ID || process.env.ADMIN_OPENROUTER_CREDENTIAL_ID || 'DJ4JtAswl4vKWvdI';
        const openRouterName = adminCreds.OPENROUTER_NAME || process.env.ADMIN_OPENROUTER_CREDENTIAL_NAME || 'OpenRouter Admin';
        
        if (openRouterId) {
          // Initialiser credentials si nécessaire
          if (!node.credentials) {
            node.credentials = {};
          }
          // Assigner le credential OpenRouter (écraser les anciens credentials si nécessaire)
          node.credentials.openRouterApi = {
            id: openRouterId,
            name: openRouterName
          };
          // S'assurer que le modèle est défini
          if (!node.parameters) {
            node.parameters = {};
          }
          if (!node.parameters.model || node.parameters.model.includes('PLACEHOLDER') || node.parameters.model.includes('ADMIN')) {
            node.parameters.model = 'openai/gpt-4o-mini';
          }
          logger.info(`✅ [McpTestInjector] Credential OpenRouter assigné à ${node.name} (${node.type}) - ID: ${openRouterId}, Model: ${node.parameters.model}`);
        } else {
          logger.warn(`⚠️ [McpTestInjector] Aucun credential OpenRouter disponible pour ${node.name}`);
        }
      }
    
    // Google Sheets - Assigner systématiquement le credential à tous les nœuds Google Sheets
    if (node.type === 'n8n-nodes-base.googleSheetsTool' || 
        node.type === 'n8n-nodes-base.googleSheets' ||
        (node.type && node.type.includes('googleSheets'))) {
      const sheetsCred = createdCredentials.googleSheetsOAuth2;
      if (sheetsCred) {
        // Initialiser credentials si nécessaire
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials = {
          ...node.credentials,
          googleSheetsOAuth2Api: {
            id: sheetsCred.id,
            name: sheetsCred.name
          }
        };
        logger.info(`✅ [McpTestInjector] Credential Google Sheets assigné à ${node.name} (${node.type}) - ID: ${sheetsCred.id}`);
      } else {
        logger.warn(`⚠️ [McpTestInjector] Pas de credential Google Sheets disponible pour ${node.name}`);
      }
    }
    
    // Google Docs - Assigner systématiquement le credential à tous les nœuds Google Docs
    if (node.type === 'n8n-nodes-base.googleDocsTool' || 
        node.type === 'n8n-nodes-base.googleDocs' ||
        (node.type && node.type.includes('googleDocs'))) {
      const docsCred = createdCredentials.googleDocsOAuth2;
      if (docsCred) {
        // Initialiser credentials si nécessaire
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials = {
          ...node.credentials,
          googleDocsOAuth2Api: {
            id: docsCred.id,
            name: docsCred.name
          }
        };
        logger.info(`✅ [McpTestInjector] Credential Google Docs assigné à ${node.name} (${node.type}) - ID: ${docsCred.id}`);
      } else {
        logger.warn(`⚠️ [McpTestInjector] Pas de credential Google Docs disponible pour ${node.name}`);
      }
    }
    
    // Google Drive - Assigner systématiquement le credential à tous les nœuds Google Drive
    if (node.type === 'n8n-nodes-base.googleDriveTool' || 
        node.type === 'n8n-nodes-base.googleDrive' ||
        (node.type && node.type.includes('googleDrive'))) {
      const driveCred = createdCredentials.googleDriveOAuth2;
      if (driveCred) {
        // Initialiser credentials si nécessaire
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials = {
          ...node.credentials,
          googleDriveOAuth2Api: {
            id: driveCred.id,
            name: driveCred.name
          }
        };
        logger.info(`✅ [McpTestInjector] Credential Google Drive assigné à ${node.name} (${node.type}) - ID: ${driveCred.id}`);
      } else {
        logger.warn(`⚠️ [McpTestInjector] Pas de credential Google Drive disponible pour ${node.name}`);
      }
    }
    
    // Gmail - Assigner systématiquement le credential à tous les nœuds Gmail
    if (node.type === 'n8n-nodes-base.gmail' ||
        node.type === 'n8n-nodes-base.gmailTool' ||
        (node.type && node.type.includes('gmail'))) {
      const gmailCred = createdCredentials.gmailOAuth2;
      if (gmailCred) {
        // Initialiser credentials si nécessaire
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials = {
          ...node.credentials,
          gmailOAuth2: {
            id: gmailCred.id,
            name: gmailCred.name
          }
        };
        logger.info(`✅ [McpTestInjector] Credential Gmail assigné à ${node.name} (${node.type}) - ID: ${gmailCred.id}`);
      } else {
        logger.warn(`⚠️ [McpTestInjector] Pas de credential Gmail disponible pour ${node.name}`);
      }
    }
    
    // Google Calendar - Assigner systématiquement le credential à tous les nœuds Google Calendar
    if (node.type === 'n8n-nodes-base.googleCalendar' ||
        node.type === 'n8n-nodes-base.googleCalendarTool' ||
        node.name?.toLowerCase().includes('calendar') ||
        (node.type && (node.type.includes('googleCalendar') || node.type.includes('calendar')))) {
      // Priorité : credential spécifique Calendar, sinon Drive/Sheets/Docs
      const calendarCred = createdCredentials.googleCalendarOAuth2 || 
                          createdCredentials.googleDriveOAuth2 ||
                          createdCredentials.googleSheetsOAuth2 ||
                          createdCredentials.googleDocsOAuth2;
      if (calendarCred) {
        // Initialiser credentials si nécessaire
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials = {
          ...node.credentials,
          googleCalendarOAuth2Api: {
            id: calendarCred.id,
            name: calendarCred.name
          }
        };
        logger.info(`✅ [McpTestInjector] Credential Google Calendar assigné à ${node.name} (${node.type}) - ID: ${calendarCred.id}`);
      } else {
        logger.warn(`⚠️ [McpTestInjector] Aucun credential Google disponible pour Google Calendar dans ${node.name}`);
      }
    }
    
    // Google Ads - Assigner systématiquement le credential à tous les nœuds Google Ads
    if (node.type === 'n8n-nodes-base.googleAds' ||
        node.type === 'n8n-nodes-base.googleAdsTool' ||
        (node.type && (node.type.includes('googleAds') || node.type.includes('ads')))) {
      const adsCred = createdCredentials.googleAdsOAuth2 || 
                     createdCredentials.googleDriveOAuth2 ||
                     createdCredentials.googleSheetsOAuth2 ||
                     createdCredentials.googleDocsOAuth2;
      if (adsCred) {
        node.credentials = {
          ...node.credentials,
          googleAdsOAuth2Api: {
            id: adsCred.id,
            name: adsCred.name
          }
        };
        logger.info(`✅ [McpTestInjector] Credential Google Ads assigné à ${node.name} (utilise ${adsCred.name})`);
      } else {
        logger.warn(`⚠️ [McpTestInjector] Aucun credential Google disponible pour Google Ads dans ${node.name}`);
      }
    }
    
    // Google Tasks - Assigner systématiquement le credential à tous les nœuds Google Tasks
    if (node.type === 'n8n-nodes-base.googleTasks' ||
        node.type === 'n8n-nodes-base.googleTasksTool' ||
        (node.type && (node.type.includes('googleTasks') || node.type.includes('tasks')))) {
      const tasksCred = createdCredentials.googleTasksOAuth2 || 
                       createdCredentials.googleDriveOAuth2 ||
                       createdCredentials.googleSheetsOAuth2 ||
                       createdCredentials.googleDocsOAuth2;
      if (tasksCred) {
        node.credentials = {
          ...node.credentials,
          googleTasksOAuth2Api: {
            id: tasksCred.id,
            name: tasksCred.name
          }
        };
        logger.info(`✅ [McpTestInjector] Credential Google Tasks assigné à ${node.name} (utilise ${tasksCred.name})`);
      } else {
        logger.warn(`⚠️ [McpTestInjector] Aucun credential Google disponible pour Google Tasks dans ${node.name}`);
      }
    }
    
    // Google Slides - Assigner systématiquement le credential à tous les nœuds Google Slides
    if (node.type === 'n8n-nodes-base.googleSlides' ||
        node.type === 'n8n-nodes-base.googleSlidesTool' ||
        node.name?.toLowerCase().includes('slides') ||
        node.name?.toLowerCase().includes('presentation') ||
        (node.type && (node.type.includes('googleSlides') || node.type.includes('slides') || node.type.includes('presentation')))) {
      // Priorité : credential spécifique Slides, sinon Drive/Sheets/Docs
      const slidesCred = createdCredentials.googleSlidesOAuth2 || 
                        createdCredentials.googleDriveOAuth2 ||
                        createdCredentials.googleSheetsOAuth2 ||
                        createdCredentials.googleDocsOAuth2;
      if (slidesCred) {
        // Initialiser credentials si nécessaire
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials = {
          ...node.credentials,
          googleSlidesOAuth2Api: {
            id: slidesCred.id,
            name: slidesCred.name
          }
        };
        logger.info(`✅ [McpTestInjector] Credential Google Slides assigné à ${node.name} (${node.type}) - ID: ${slidesCred.id}`);
      } else {
        logger.warn(`⚠️ [McpTestInjector] Aucun credential Google disponible pour Google Slides dans ${node.name}`);
      }
    }
    
    // Retourner le nœud modifié (comme les autres injecteurs)
    return node;
  });
}
  
  // Vérifier que tous les credentials sont bien assignés aux nœuds
  const nodesWithCredentials = injectedWorkflow.nodes.filter(n => 
    n.credentials && Object.keys(n.credentials).length > 0
  );
  
  logger.info('✅ [McpTestInjector] Injection terminée avec succès', {
    credentialsCreated: Object.keys(createdCredentials).length,
    totalNodes: injectedWorkflow.nodes.length,
    nodesWithCredentials: nodesWithCredentials.length,
    credentialsDetails: nodesWithCredentials.map(n => ({
      nodeName: n.name,
      nodeType: n.type,
      credentials: Object.keys(n.credentials || {}).map(credType => ({
        type: credType,
        id: n.credentials[credType]?.id,
        name: n.credentials[credType]?.name
      }))
    }))
  });
  
  return {
    workflow: injectedWorkflow,
    webhookPath: webhookPath,
    credentialsCreated: createdCredentials
  };
}

module.exports = { injectUserCredentials };

