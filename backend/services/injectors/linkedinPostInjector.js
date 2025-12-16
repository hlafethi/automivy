// Injecteur spécifique pour les workflows LinkedIn Post Generator
// Ce template nécessite :
// - LinkedIn OAuth2 pour la publication
// - NocoDB API Token pour stocker users et posts
// - OpenRouter (admin) pour la génération IA
// - SMTP (admin) pour les notifications email

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials, createCredential } = require('../n8nService');
const db = require('../../database');
const logger = require('../../utils/logger');
const config = require('../../config');

/**
 * Injecte les credentials utilisateur pour les workflows LinkedIn
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null, userTables = null) {
  logger.info('💼 [LinkedInPostInjector] Injection spécifique pour LinkedIn workflows...');
  logger.debug('💼 [LinkedInPostInjector] Template ID:', templateId);
  logger.debug('💼 [LinkedInPostInjector] Template Name:', templateName);
  
  // ⚠️ IMPORTANT: Définir ces variables au début pour qu'elles soient disponibles partout
  const userEmail = userCredentials.email || '';
  const cleanTemplateName = templateName ? templateName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50) : null;
  const templateNamePart = cleanTemplateName ? `-${cleanTemplateName}` : '';
  const userEmailPart = userEmail ? `-${userEmail.substring(0, 30)}` : '';
  
  // ⚠️ CRITIQUE: Déclarer userIdShort au niveau de la fonction pour qu'il soit accessible partout
  const userIdShort = userId ? userId.replace(/-/g, '').substring(0, 8) : '';
  
  // Générer un webhook unique pour chaque workflow
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    const templateIdShort = templateId.replace(/-/g, '').substring(0, 8);
    
    // Identifier le type de workflow pour le webhook
    const workflowName = templateName?.toLowerCase() || '';
    if (workflowName.includes('oauth') || workflowName.includes('handler')) {
      uniqueWebhookPath = `linkedin-oauth-${templateIdShort}-${userIdShort}`;
    } else if (workflowName.includes('monitor') || workflowName.includes('token')) {
      uniqueWebhookPath = `linkedin-monitor-${templateIdShort}-${userIdShort}`;
    } else {
      uniqueWebhookPath = `linkedin-post-${templateIdShort}-${userIdShort}`;
    }
    logger.debug('🔧 [LinkedInPostInjector] Webhook unique généré:', uniqueWebhookPath);
  }
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow, templateId, templateName);
  logger.debug('🔧 [LinkedInPostInjector] Credentials requis:', requiredCredentials.length);
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  const createdCredentials = {};
  
  // Récupérer les credentials admin (OpenRouter, SMTP) pour créer des credentials spécifiques par utilisateur
  logger.info('🔍 [LinkedInPostInjector] Récupération des credentials admin...');
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    logger.info('✅ [LinkedInPostInjector] Credentials admin récupérés:', {
      hasOpenRouterApiKey: !!adminCreds.OPENROUTER_API_KEY,
      hasOpenRouterId: !!adminCreds.OPENROUTER_ID,
      hasSmtp: !!adminCreds.SMTP_ID
    });
  } catch (error) {
    logger.error('❌ [LinkedInPostInjector] Erreur credentials admin:', error.message);
  }
  
  // 1. Gérer LinkedIn OAuth2 (tokens OAuth)
  // Les Client ID/Secret LinkedIn sont gérés par l'admin (dans admin_api_keys ou .env)
  // Pas besoin de les stocker par utilisateur
  logger.info('🔍 [LinkedInPostInjector] Gestion LinkedIn OAuth2...');
  const linkedinOAuthCreds = await db.getOAuthCredentials(userId, 'linkedin');
  
  if (linkedinOAuthCreds && linkedinOAuthCreds.length > 0 && linkedinOAuthCreds[0].n8n_credential_id) {
    createdCredentials.linkedInOAuth2Api = {
      id: linkedinOAuthCreds[0].n8n_credential_id,
      name: `LinkedIn OAuth2 - ${linkedinOAuthCreds[0].email || 'user'}`
    };
    logger.info('✅ [LinkedInPostInjector] Credential LinkedIn OAuth2 récupéré:', createdCredentials.linkedInOAuth2Api.id);
  } else if (userCredentials.linkedinOAuth2 === 'connected') {
    // Attendre un peu si l'utilisateur vient de se connecter
    await new Promise(resolve => setTimeout(resolve, 2000));
    const retryOauthCreds = await db.getOAuthCredentials(userId, 'linkedin');
    if (retryOauthCreds && retryOauthCreds.length > 0 && retryOauthCreds[0].n8n_credential_id) {
      createdCredentials.linkedInOAuth2Api = {
        id: retryOauthCreds[0].n8n_credential_id,
        name: `LinkedIn OAuth2 - ${retryOauthCreds[0].email || 'user'}`
      };
      logger.info('✅ [LinkedInPostInjector] Credential LinkedIn OAuth2 récupéré après connexion');
    }
  } else {
    logger.warn('⚠️ [LinkedInPostInjector] Aucun credential LinkedIn OAuth2 trouvé. L\'utilisateur devra se connecter via OAuth.');
  }
  
  // 2. Créer ou récupérer le credential NocoDB (spécifique par utilisateur)
  logger.info('🔍 [LinkedInPostInjector] Gestion credential NocoDB...');
  
  // Récupérer le token NocoDB depuis admin_api_keys ou .env (comme OpenRouter)
  let nocoDbApiToken = null;
  let nocoDbBaseUrl = null;
  
  try {
    // Récupérer depuis admin_api_keys (sans additional_data car la colonne peut ne pas exister)
    const nocoDbCreds = await db.query(
      'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
      ['nocodb_api_token']
    );
    
    if (nocoDbCreds.rows.length > 0) {
      nocoDbApiToken = nocoDbCreds.rows[0].api_key;
      logger.info('✅ [LinkedInPostInjector] Token NocoDB récupéré depuis admin_api_keys');
    }
  } catch (dbError) {
    logger.warn('⚠️ [LinkedInPostInjector] Erreur récupération NocoDB token depuis BDD:', dbError.message);
  }
  
  // Fallback vers .env si pas trouvé en BDD
  if (!nocoDbApiToken) {
    nocoDbApiToken = process.env.NOCODB_API_TOKEN;
    if (nocoDbApiToken) {
      logger.info('✅ [LinkedInPostInjector] Token NocoDB récupéré depuis .env');
    }
  }
  
  // Récupérer baseUrl depuis .env si pas trouvé en BDD
  if (!nocoDbBaseUrl) {
    nocoDbBaseUrl = process.env.NOCODB_BASE_URL;
    if (nocoDbBaseUrl) {
      logger.info('✅ [LinkedInPostInjector] Base URL NocoDB récupérée depuis .env');
    }
  }
  
  // Valeur par défaut si toujours pas trouvée
  if (!nocoDbBaseUrl) {
    nocoDbBaseUrl = 'https://noco.example.com'; // Valeur par défaut, à configurer par l'admin
    logger.warn('⚠️ [LinkedInPostInjector] Base URL NocoDB non configurée, utilisation de la valeur par défaut:', nocoDbBaseUrl);
  }
  
  // Récupérer baseId depuis .env (additional_data n'est pas disponible dans admin_api_keys)
  const nocoDbBaseId = process.env.NOCODB_BASE_ID;
  if (nocoDbBaseId) {
    logger.info('✅ [LinkedInPostInjector] Base ID NocoDB récupéré depuis .env');
  } else {
    logger.warn('⚠️ [LinkedInPostInjector] NOCODB_BASE_ID non configuré dans .env');
  }
  
  // Générer les noms de tables isolés par utilisateur (pour injection dans les nœuds)
  // userIdShort est déjà déclaré au début de la fonction (ligne 38)
  const userPostsTableName = `posts_user_${userIdShort}`;
  const userUsersTableName = `users_user_${userIdShort}`;
  
  // Récupérer les IDs des tables depuis userTables (passé depuis le déploiement) ou depuis NocoDB
  let userPostsTableId = null;
  let userUsersTableId = null;
  
  // Priorité 1: Utiliser les tables passées en paramètre (créées lors du déploiement)
  if (userTables) {
    logger.debug(`🔧 [LinkedInPostInjector] userTables reçu:`, {
      hasPostsTable: !!userTables.postsTable,
      hasUsersTable: !!userTables.usersTable,
      postsTableKeys: userTables.postsTable ? Object.keys(userTables.postsTable) : [],
      usersTableKeys: userTables.usersTable ? Object.keys(userTables.usersTable) : []
    });
    
    if (userTables.postsTable) {
      // Essayer plusieurs propriétés possibles pour l'ID
      userPostsTableId = userTables.postsTable.id || 
                         userTables.postsTable.fk_model_id ||
                         userTables.postsTable.table_id;
      if (userPostsTableId) {
        logger.debug(`🔧 [LinkedInPostInjector] ID table posts depuis userTables: ${userPostsTableId}`);
      } else {
        logger.warn(`⚠️ [LinkedInPostInjector] Table posts trouvée mais ID non disponible. Propriétés:`, Object.keys(userTables.postsTable));
      }
    }
    if (userTables.usersTable) {
      // Essayer plusieurs propriétés possibles pour l'ID
      userUsersTableId = userTables.usersTable.id || 
                         userTables.usersTable.fk_model_id ||
                         userTables.usersTable.table_id;
      if (userUsersTableId) {
        logger.debug(`🔧 [LinkedInPostInjector] ID table users depuis userTables: ${userUsersTableId}`);
      } else {
        logger.warn(`⚠️ [LinkedInPostInjector] Table users trouvée mais ID non disponible. Propriétés:`, Object.keys(userTables.usersTable));
      }
    }
  }
  
  // Priorité 2: Récupérer depuis NocoDB si pas encore disponible
  if ((!userPostsTableId || !userUsersTableId) && nocoDbApiToken && nocoDbBaseUrl && nocoDbBaseId) {
    try {
      const nocoDbService = require('../nocoDbService');
      logger.info('🔍 [LinkedInPostInjector] Récupération des IDs des tables depuis NocoDB...');
      
      // Essayer de récupérer les tables existantes
      if (!userPostsTableId) {
        const postsTable = await nocoDbService.getTableByName(nocoDbBaseUrl, nocoDbBaseId, nocoDbApiToken, userPostsTableName);
        if (postsTable) {
          // Essayer plusieurs propriétés possibles pour l'ID
          userPostsTableId = postsTable.id || 
                             postsTable.fk_model_id ||
                             postsTable.table_id ||
                             postsTable.model_id;
          if (userPostsTableId) {
            logger.info(`✅ [LinkedInPostInjector] ID table posts récupéré depuis NocoDB: ${userPostsTableId}`);
          } else {
            logger.warn(`⚠️ [LinkedInPostInjector] Table posts trouvée mais ID non disponible. Propriétés:`, Object.keys(postsTable));
          }
        } else {
          logger.warn(`⚠️ [LinkedInPostInjector] Table posts non trouvée: ${userPostsTableName}`);
        }
      }
      if (!userUsersTableId) {
        const usersTable = await nocoDbService.getTableByName(nocoDbBaseUrl, nocoDbBaseId, nocoDbApiToken, userUsersTableName);
        if (usersTable) {
          // Essayer plusieurs propriétés possibles pour l'ID
          userUsersTableId = usersTable.id || 
                              usersTable.fk_model_id ||
                              usersTable.table_id ||
                              usersTable.model_id;
          if (userUsersTableId) {
            logger.info(`✅ [LinkedInPostInjector] ID table users récupéré depuis NocoDB: ${userUsersTableId}`);
          } else {
            logger.warn(`⚠️ [LinkedInPostInjector] Table users trouvée mais ID non disponible. Propriétés:`, Object.keys(usersTable));
          }
        } else {
          logger.warn(`⚠️ [LinkedInPostInjector] Table users non trouvée: ${userUsersTableName}`);
        }
      }
    } catch (tableError) {
      logger.warn('⚠️ [LinkedInPostInjector] Impossible de récupérer les IDs des tables:', tableError.message);
      logger.debug('⚠️ [LinkedInPostInjector] Détails erreur:', tableError);
    }
  }
  
  // Log final des IDs récupérés
  logger.info('📊 [LinkedInPostInjector] IDs des tables récupérés:', {
    userPostsTableId: userPostsTableId || 'NON DISPONIBLE',
    userUsersTableId: userUsersTableId || 'NON DISPONIBLE',
    userPostsTableName,
    userUsersTableName
  });
  
  let nocoDbCredentialId = null;
  
  if (nocoDbApiToken) {
    // Vérifier si un credential NocoDB existe déjà pour cet utilisateur
    const existingNocoDbCreds = await db.query(
      'SELECT * FROM workflow_credentials WHERE user_workflow_id IN (SELECT id FROM user_workflows WHERE user_id = $1) AND credential_type = $2',
      [userId, 'nocoDbApiToken']
    );
    
    if (existingNocoDbCreds.rows && existingNocoDbCreds.rows.length > 0) {
      nocoDbCredentialId = existingNocoDbCreds.rows[0].credential_id;
      logger.info('✅ [LinkedInPostInjector] Credential NocoDB existant réutilisé:', nocoDbCredentialId);
    } else {
      // Créer un nouveau credential NocoDB avec le token admin et host
      const nocoDbCredentialName = `NocoDB Token${templateNamePart}${userEmailPart}`;
      try {
        // ⚠️ CRITIQUE: n8n nécessite apiToken ET host (pas baseUrl) pour nocoDbApiToken
        // Le host doit être l'URL complète avec le protocole (ex: https://nocodb.globalsaas.eu)
        const nocoDbHost = nocoDbBaseUrl || 'http://localhost:8080';
        
        const nocoDbCredentialData = {
          name: nocoDbCredentialName,
          type: 'nocoDbApiToken',
          data: {
            apiToken: nocoDbApiToken,
            host: nocoDbHost // ⚠️ CRITIQUE: n8n utilise 'host' avec l'URL complète (https://...)
          }
        };
        
        const nocoDbCred = await createCredential(nocoDbCredentialData);
        nocoDbCredentialId = nocoDbCred.id;
        createdCredentials.nocoDbApiToken = {
          id: nocoDbCredentialId,
          name: nocoDbCred.name || nocoDbCredentialName
        };
        logger.info('✅ [LinkedInPostInjector] Credential NocoDB créé automatiquement avec host:', {
          id: createdCredentials.nocoDbApiToken.id,
          host: nocoDbHost
        });
      } catch (error) {
        logger.error('❌ [LinkedInPostInjector] Erreur création credential NocoDB:', error);
        // Si l'erreur est due à host non accepté, essayer avec baseUrl (fallback)
        if (error.message && (error.message.includes('host') || error.message.includes('baseUrl'))) {
          logger.warn('⚠️ [LinkedInPostInjector] host non accepté dans credential, essai avec baseUrl...');
          try {
            const nocoDbCredentialDataWithBaseUrl = {
              name: nocoDbCredentialName,
              type: 'nocoDbApiToken',
              data: {
                apiToken: nocoDbApiToken,
                baseUrl: nocoDbBaseUrl
              }
            };
            const nocoDbCred = await createCredential(nocoDbCredentialDataWithBaseUrl);
            nocoDbCredentialId = nocoDbCred.id;
            createdCredentials.nocoDbApiToken = {
              id: nocoDbCredentialId,
              name: nocoDbCred.name || nocoDbCredentialName
            };
            logger.info('✅ [LinkedInPostInjector] Credential NocoDB créé avec baseUrl:', {
              id: createdCredentials.nocoDbApiToken.id,
              baseUrl: nocoDbBaseUrl
            });
          } catch (baseUrlError) {
            // Dernier recours : créer sans host/baseUrl
            logger.warn('⚠️ [LinkedInPostInjector] baseUrl non accepté non plus, création sans host/baseUrl...');
            try {
              const nocoDbCredentialDataMinimal = {
                name: nocoDbCredentialName,
                type: 'nocoDbApiToken',
                data: {
                  apiToken: nocoDbApiToken
                }
              };
              const nocoDbCred = await createCredential(nocoDbCredentialDataMinimal);
              nocoDbCredentialId = nocoDbCred.id;
              createdCredentials.nocoDbApiToken = {
                id: nocoDbCredentialId,
                name: nocoDbCred.name || nocoDbCredentialName
              };
              logger.warn('⚠️ [LinkedInPostInjector] Credential NocoDB créé sans host/baseUrl. Le host devra être configuré manuellement dans n8n.');
            } catch (retryError) {
              logger.error('❌ [LinkedInPostInjector] Erreur création credential NocoDB (sans host/baseUrl):', retryError);
              throw new Error('Impossible de créer le credential NocoDB. Vérifiez NOCODB_API_TOKEN et NOCODB_BASE_URL.');
            }
          }
        } else {
          throw new Error('Impossible de créer le credential NocoDB. L\'administrateur doit configurer NOCODB_API_TOKEN dans admin_api_keys ou .env.');
        }
      }
    }
  } else {
    logger.warn('⚠️ [LinkedInPostInjector] Token NocoDB non configuré. L\'administrateur doit configurer NOCODB_API_TOKEN dans admin_api_keys (service_name="nocodb_api_token") ou dans .env.');
    // Ne pas faire échouer le déploiement si NocoDB n'est pas configuré
    // Le workflow pourra fonctionner sans NocoDB si les nœuds ne sont pas utilisés
  }
  
  // 3. Remplacer les placeholders dans le workflow
  // LinkedIn OAuth2 - remplacer tous les formats possibles
  if (createdCredentials.linkedInOAuth2Api) {
    // Format 1: Placeholder YOUR_LINKEDIN_CREDENTIAL_ID
    workflowString = workflowString.replace(
      /"YOUR_LINKEDIN_CREDENTIAL_ID"/g,
      `"${createdCredentials.linkedInOAuth2Api.id}"`
    );
    // Format 2: Credential object avec placeholder
    workflowString = workflowString.replace(
      /"linkedInOAuth2Api":\s*{\s*"id":\s*"[^"]*"/g,
      `"linkedInOAuth2Api": {"id": "${createdCredentials.linkedInOAuth2Api.id}"`
    );
    // Format 3: Credential object complet avec name
    workflowString = workflowString.replace(
      /"linkedInOAuth2Api":\s*{\s*"id":\s*"[^"]*",\s*"name":\s*"[^"]*"/g,
      `"linkedInOAuth2Api": {"id": "${createdCredentials.linkedInOAuth2Api.id}", "name": "${createdCredentials.linkedInOAuth2Api.name}"`
    );
    logger.info('✅ [LinkedInPostInjector] Placeholders LinkedIn OAuth2 remplacés');
  }
  
  // NocoDB - remplacer tous les formats possibles
  if (nocoDbCredentialId) {
    // Format 1: Placeholder YOUR_NOCODB_CREDENTIAL_ID
    workflowString = workflowString.replace(
      /"YOUR_NOCODB_CREDENTIAL_ID"/g,
      `"${nocoDbCredentialId}"`
    );
    // Format 2: Credential object avec placeholder
    workflowString = workflowString.replace(
      /"nocoDbApiToken":\s*{\s*"id":\s*"[^"]*"/g,
      `"nocoDbApiToken": {"id": "${nocoDbCredentialId}"`
    );
    // Format 3: Credential object complet avec name
    workflowString = workflowString.replace(
      /"nocoDbApiToken":\s*{\s*"id":\s*"[^"]*",\s*"name":\s*"[^"]*"/g,
      `"nocoDbApiToken": {"id": "${nocoDbCredentialId}", "name": "${createdCredentials.nocoDbApiToken?.name || 'NocoDB Token account'}"`
    );
    logger.info('✅ [LinkedInPostInjector] Placeholders NocoDB remplacés');
  }
  
  // ⚠️ CRITIQUE: Remplacer les placeholders des IDs de tables NocoDB
  // Ces placeholders sont utilisés dans les paramètres des nœuds NocoDB
  if (userPostsTableId) {
    // Remplacer les placeholders pour la table posts
    workflowString = workflowString.replace(
      /"=\{\{\s*\$env\.NOCODB_POSTS_TABLE\s*\}\}"/g,
      `"${userPostsTableId}"`
    );
    workflowString = workflowString.replace(
      /'=\{\{\s*\$env\.NOCODB_POSTS_TABLE\s*\}\}'/g,
      `'${userPostsTableId}'`
    );
    workflowString = workflowString.replace(
      /=\{\{\s*\$env\.NOCODB_POSTS_TABLE\s*\}\}/g,
      userPostsTableId
    );
    logger.info(`✅ [LinkedInPostInjector] Placeholder NOCODB_POSTS_TABLE remplacé par ID: ${userPostsTableId}`);
  } else if (userPostsTableName) {
    // Si l'ID n'est pas disponible, utiliser le nom de la table
    workflowString = workflowString.replace(
      /"=\{\{\s*\$env\.NOCODB_POSTS_TABLE\s*\}\}"/g,
      `"${userPostsTableName}"`
    );
    workflowString = workflowString.replace(
      /'=\{\{\s*\$env\.NOCODB_POSTS_TABLE\s*\}\}'/g,
      `'${userPostsTableName}'`
    );
    workflowString = workflowString.replace(
      /=\{\{\s*\$env\.NOCODB_POSTS_TABLE\s*\}\}/g,
      userPostsTableName
    );
    logger.info(`✅ [LinkedInPostInjector] Placeholder NOCODB_POSTS_TABLE remplacé par nom: ${userPostsTableName}`);
  }
  
  if (userUsersTableId) {
    // Remplacer les placeholders pour la table users
    workflowString = workflowString.replace(
      /"=\{\{\s*\$env\.NOCODB_USERS_TABLE\s*\}\}"/g,
      `"${userUsersTableId}"`
    );
    workflowString = workflowString.replace(
      /'=\{\{\s*\$env\.NOCODB_USERS_TABLE\s*\}\}'/g,
      `'${userUsersTableId}'`
    );
    workflowString = workflowString.replace(
      /=\{\{\s*\$env\.NOCODB_USERS_TABLE\s*\}\}/g,
      userUsersTableId
    );
    logger.info(`✅ [LinkedInPostInjector] Placeholder NOCODB_USERS_TABLE remplacé par ID: ${userUsersTableId}`);
  } else if (userUsersTableName) {
    // Si l'ID n'est pas disponible, utiliser le nom de la table
    workflowString = workflowString.replace(
      /"=\{\{\s*\$env\.NOCODB_USERS_TABLE\s*\}\}"/g,
      `"${userUsersTableName}"`
    );
    workflowString = workflowString.replace(
      /'=\{\{\s*\$env\.NOCODB_USERS_TABLE\s*\}\}'/g,
      `'${userUsersTableName}'`
    );
    workflowString = workflowString.replace(
      /=\{\{\s*\$env\.NOCODB_USERS_TABLE\s*\}\}/g,
      userUsersTableName
    );
    logger.info(`✅ [LinkedInPostInjector] Placeholder NOCODB_USERS_TABLE remplacé par nom: ${userUsersTableName}`);
  }
  
  // ⚠️ CRITIQUE: Créer un credential OpenRouter spécifique pour chaque utilisateur
  // Cela garantit que chaque workflow a son propre credential OpenRouter
  logger.info('🔧 [LinkedInPostInjector] Création d\'un credential OpenRouter spécifique pour cet utilisateur...');
  
  if (adminCreds.OPENROUTER_API_KEY) {
    const openRouterCredentialName = `OpenRouter - LinkedIn${templateNamePart}${userEmailPart}`;
    try {
      const openRouterCredentialData = {
        name: openRouterCredentialName,
        type: 'httpHeaderAuth',
        data: {
          name: 'Authorization',
          value: `Bearer ${adminCreds.OPENROUTER_API_KEY}`,
          allowedDomains: '' // Propriété requise par n8n pour httpHeaderAuth (chaîne vide = tous les domaines)
        }
      };
      
      const openRouterCred = await createCredential(openRouterCredentialData);
      createdCredentials.openRouterApi = {
        id: openRouterCred.id,
        name: openRouterCred.name || openRouterCredentialName
      };
      logger.info('✅ [LinkedInPostInjector] Credential OpenRouter créé:', createdCredentials.openRouterApi.id);
    } catch (error) {
      logger.error('❌ [LinkedInPostInjector] Erreur création credential OpenRouter:', error);
      // Fallback vers credential admin existant si disponible
      if (adminCreds.OPENROUTER_ID) {
        createdCredentials.openRouterApi = {
          id: adminCreds.OPENROUTER_ID,
          name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
        };
        logger.warn('⚠️ [LinkedInPostInjector] Utilisation du credential OpenRouter admin existant:', createdCredentials.openRouterApi.id);
      } else {
        throw new Error('Impossible de créer ou récupérer un credential OpenRouter. Vérifiez OPENROUTER_API_KEY dans .env.');
      }
    }
  } else if (adminCreds.OPENROUTER_ID) {
    // Si pas de clé API mais un credential existant, l'utiliser
    createdCredentials.openRouterApi = {
      id: adminCreds.OPENROUTER_ID,
      name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
    };
    logger.info('✅ [LinkedInPostInjector] Utilisation du credential OpenRouter admin existant:', createdCredentials.openRouterApi.id);
  } else {
    logger.warn('⚠️ [LinkedInPostInjector] Aucun credential OpenRouter disponible. Le workflow pourra échouer si des nœuds OpenRouter sont utilisés.');
  }
  
  // ⚠️ CRITIQUE: Créer un credential SMTP spécifique pour chaque utilisateur
  logger.info('🔧 [LinkedInPostInjector] Création d\'un credential SMTP spécifique pour cet utilisateur...');
  let smtpCredentialName = `SMTP Admin - admin@heleam.com${templateNamePart}${userEmailPart}`;
  
  try {
    const smtpCredentialData = {
      name: smtpCredentialName,
      type: 'smtp',
      data: {
        host: config.email.smtpHost,
        port: config.email.smtpPort || 587,
        user: config.email.smtpUser || 'admin@heleam.com',
        password: config.email.smtpPassword,
        secure: config.email.smtpPort === 465,
        disableStartTls: config.email.smtpPort === 465
      }
    };
    
    const smtpCred = await createCredential(smtpCredentialData);
    createdCredentials.smtp = {
      id: smtpCred.id,
      name: smtpCred.name || smtpCredentialName
    };
    logger.info('✅ [LinkedInPostInjector] Credential SMTP créé:', createdCredentials.smtp.id);
  } catch (error) {
    logger.error('❌ [LinkedInPostInjector] Erreur création credential SMTP:', error);
    // Fallback vers credential admin existant si disponible
    if (adminCreds.SMTP_ID) {
      createdCredentials.smtp = {
        id: adminCreds.SMTP_ID,
        name: adminCreds.SMTP_NAME || 'SMTP Admin'
      };
      logger.warn('⚠️ [LinkedInPostInjector] Utilisation du credential SMTP admin existant:', createdCredentials.smtp.id);
    } else {
      throw new Error('Impossible de créer ou récupérer un credential SMTP. Vérifiez la configuration SMTP dans config.js.');
    }
  }
  
  // Remplacer les placeholders OpenRouter
  if (createdCredentials.openRouterApi) {
    workflowString = workflowString.replace(
      /"YOUR_OPENROUTER_CREDENTIAL_ID"/g,
      `"${createdCredentials.openRouterApi.id}"`
    );
    workflowString = workflowString.replace(
      /"openRouterApi":\s*{\s*"id":\s*"[^"]*"/g,
      `"openRouterApi": {"id": "${createdCredentials.openRouterApi.id}"`
    );
    logger.debug('✅ [LinkedInPostInjector] Placeholders OpenRouter remplacés');
  }
  
  // Remplacer les placeholders SMTP
  if (createdCredentials.smtp) {
    workflowString = workflowString.replace(
      /"YOUR_SMTP_CREDENTIAL_ID"/g,
      `"${createdCredentials.smtp.id}"`
    );
    workflowString = workflowString.replace(
      /"smtp":\s*{\s*"id":\s*"[^"]*"/g,
      `"smtp": {"id": "${createdCredentials.smtp.id}"`
    );
    logger.debug('✅ [LinkedInPostInjector] Placeholders SMTP remplacés');
  }
  
  // Variables d'environnement (remplacer dans les expressions n8n)
  // ⚠️ IMPORTANT: Chaque utilisateur a ses propres tables NocoDB pour l'isolation
  // userIdShort est déjà déclaré au début de la fonction (ligne 38)
  const userPostsTable = `posts_user_${userIdShort}`;
  const userUsersTable = `users_user_${userIdShort}`;
  
  const envVars = {
    LINKEDIN_CLIENT_ID: userCredentials.linkedinClientId || process.env.LINKEDIN_CLIENT_ID || '',
    LINKEDIN_CLIENT_SECRET: userCredentials.linkedinClientSecret || process.env.LINKEDIN_CLIENT_SECRET || '',
    LINKEDIN_REDIRECT_URI: userCredentials.linkedinRedirectUri || process.env.LINKEDIN_REDIRECT_URI || `${config.app.frontendUrl}/oauth/linkedin/callback`,
    NOCODB_USERS_TABLE: userUsersTable, // Table isolée par utilisateur
    NOCODB_POSTS_TABLE: userPostsTable, // Table isolée par utilisateur
    NOCODB_USER_ID: userId, // ID utilisateur pour l'isolation
    APP_URL: userCredentials.appUrl || process.env.APP_URL || config.app.frontendUrl,
    SMTP_FROM_EMAIL: userCredentials.smtpFromEmail || process.env.SMTP_FROM_EMAIL || config.email.smtpUser || 'admin@heleam.com'
  };
  
  logger.info('🔧 [LinkedInPostInjector] Tables NocoDB isolées par utilisateur:', {
    usersTable: userUsersTable,
    postsTable: userPostsTable,
    userId: userIdShort
  });
  
  // Remplacer les variables d'environnement dans les expressions n8n
  Object.entries(envVars).forEach(([key, value]) => {
    // Remplacer dans les expressions $env.VARIABLE
    const regex = new RegExp(`\\$env\\.${key}`, 'g');
    if (value) {
      // Pour les expressions n8n, on garde $env mais on s'assure que la valeur est disponible
      // Les variables d'environnement doivent être configurées dans n8n directement
      logger.debug(`🔧 [LinkedInPostInjector] Variable d'environnement ${key} détectée (sera configurée dans n8n)`);
    }
  });
  
  // Parser le workflow
  const injectedWorkflow = JSON.parse(workflowString);
  
  // ⚠️ CRITIQUE: Vérifier que tous les nœuds référencés dans les connections existent
  if (injectedWorkflow.connections && injectedWorkflow.nodes) {
    const nodeNames = new Set(injectedWorkflow.nodes.map(n => n.name));
    const missingNodes = [];
    
    Object.keys(injectedWorkflow.connections).forEach(sourceNodeName => {
      if (!nodeNames.has(sourceNodeName)) {
        missingNodes.push(`Source: ${sourceNodeName}`);
      }
      
      const connections = injectedWorkflow.connections[sourceNodeName];
      Object.values(connections).forEach(connectionArray => {
        if (Array.isArray(connectionArray)) {
          connectionArray.forEach(connectionGroup => {
            if (Array.isArray(connectionGroup)) {
              connectionGroup.forEach(connection => {
                if (connection.node && !nodeNames.has(connection.node)) {
                  missingNodes.push(`Target: ${connection.node} (from ${sourceNodeName})`);
                }
              });
            }
          });
        }
      });
    });
    
    if (missingNodes.length > 0) {
      logger.error('❌ [LinkedInPostInjector] Nœuds manquants dans le workflow', {
        missingNodes: [...new Set(missingNodes)],
        existingNodes: Array.from(nodeNames)
      });
      // Ne pas bloquer, mais logger l'erreur pour diagnostic
    }
  }
  
  // Injecter les credentials dans les nœuds
  if (injectedWorkflow.nodes) {
    logger.info(`🔧 [LinkedInPostInjector] Injection des credentials dans ${injectedWorkflow.nodes.length} nœuds...`);
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      const cleanedNode = { ...node };
      
      // ⚠️ CRITIQUE: S'assurer que les credentials sont bien présents dans l'objet node
      // n8n peut supprimer les credentials lors de la création, on les force ici
      if (cleanedNode.credentials && Object.keys(cleanedNode.credentials).length > 0) {
        // Les credentials sont déjà présents, on les garde
      } else if (cleanedNode.credentials === undefined) {
        // Initialiser credentials si absent
        cleanedNode.credentials = {};
      }
      
      // Log pour diagnostic
      logger.debug(`🔍 [LinkedInPostInjector] Traitement du nœud: ${node.name} (type: ${node.type})`);
      
      // Nœuds LinkedIn - assigner le credential OAuth2
      // Détection large pour couvrir tous les cas
      const isLinkedInNode = node.type === 'n8n-nodes-base.linkedIn' ||
                            node.type?.toLowerCase().includes('linkedin') ||
                            node.name?.toLowerCase().includes('linkedin') ||
                            node.name?.toLowerCase().includes('publier');
      
      if (isLinkedInNode) {
        if (createdCredentials.linkedInOAuth2Api) {
          // Initialiser credentials si absent
          if (!cleanedNode.credentials) {
            cleanedNode.credentials = {};
          }
          
          cleanedNode.credentials.linkedInOAuth2Api = {
            id: createdCredentials.linkedInOAuth2Api.id,
            name: createdCredentials.linkedInOAuth2Api.name
          };
          logger.info(`✅ [LinkedInPostInjector] Credential LinkedIn OAuth2 assigné à ${node.name}`);
          logger.debug(`🔧 [LinkedInPostInjector] Credential LinkedIn ID: ${createdCredentials.linkedInOAuth2Api.id}`);
        } else {
          logger.warn(`⚠️ [LinkedInPostInjector] Nœud LinkedIn détecté (${node.name}, type: ${node.type}) mais aucun credential OAuth2 disponible`);
        }
      }
      
      // Nœuds NocoDB - assigner le credential API Token et injecter baseUrl
      // Vérifier plusieurs variantes possibles du type de nœud NocoDB
      const isNocoDbNode = node.type === 'n8n-nodes-base.nocoDb' || 
                          node.type === '@n8n/n8n-nodes-nocodb.nocoDb' ||
                          node.type?.toLowerCase().includes('nocodb') ||
                          node.name?.toLowerCase().includes('nocodb');
      
      if (isNocoDbNode) {
        if (nocoDbCredentialId) {
          // ⚠️ CRITIQUE: Initialiser credentials si absent et FORCER leur présence
          if (!cleanedNode.credentials) {
            cleanedNode.credentials = {};
          }
          
          // ⚠️ CRITIQUE: Toujours assigner le credential, même s'il existe déjà
          // n8n peut supprimer les credentials lors de la création, on les force ici
          cleanedNode.credentials.nocoDbApiToken = {
            id: nocoDbCredentialId,
            name: createdCredentials.nocoDbApiToken?.name || 'NocoDB Token account'
          };
          
          // Log pour vérifier que le credential est bien assigné
          logger.debug(`✅ [LinkedInPostInjector] Credential NocoDB FORCÉ pour ${node.name}:`, {
            credentialId: nocoDbCredentialId,
            credentialName: cleanedNode.credentials.nocoDbApiToken.name,
            hasCredentials: !!(cleanedNode.credentials && Object.keys(cleanedNode.credentials).length > 0)
          });
          
          // ⚠️ CRITIQUE: Initialiser parameters s'il n'existe pas
          if (!cleanedNode.parameters) {
            cleanedNode.parameters = {};
          }
          
          // ⚠️ CRITIQUE: S'assurer que le paramètre 'operation' est défini
          // Les nœuds NocoDB nécessitent un paramètre 'operation' comme les autres nœuds de base de données
          if (!cleanedNode.parameters.operation) {
            const nodeNameLower = (node.name || '').toLowerCase();
            // Déterminer l'opération selon le nom du nœud
            if (nodeNameLower.includes('post') || nodeNameLower.includes('sauvegarder') || nodeNameLower.includes('create') || nodeNameLower.includes('insert')) {
              cleanedNode.parameters.operation = 'create';
            } else if (nodeNameLower.includes('user') || nodeNameLower.includes('récupérer') || nodeNameLower.includes('get') || nodeNameLower.includes('list')) {
              cleanedNode.parameters.operation = 'list';
            } else {
              // Par défaut, utiliser 'list' pour récupérer des données
              cleanedNode.parameters.operation = 'list';
            }
            logger.debug(`🔧 [LinkedInPostInjector] operation injecté dans ${node.name}: ${cleanedNode.parameters.operation}`);
          }
          
          // ⚠️ CRITIQUE: Injecter baseUrl, baseId et tableId dans les paramètres du nœud
          // n8n nécessite ces paramètres dans les nœuds pour pouvoir récupérer les bases et tables
          
          // Injecter baseUrl (toujours forcer l'ajout)
          if (nocoDbBaseUrl) {
            cleanedNode.parameters.baseUrl = nocoDbBaseUrl;
            logger.debug(`🔧 [LinkedInPostInjector] baseUrl injecté dans ${node.name}: ${nocoDbBaseUrl}`);
          }
          
          // Injecter baseId (CRITIQUE pour que n8n puisse récupérer les tables)
          // n8n utilise généralement baseNameOrId pour les versions récentes
          if (nocoDbBaseId) {
            // ⚠️ CRITIQUE: S'assurer que baseId est une chaîne de caractères, pas un objet
            const baseIdString = typeof nocoDbBaseId === 'string' ? nocoDbBaseId : String(nocoDbBaseId);
            
            // ⚠️ CRITIQUE: n8n peut utiliser différents formats selon la version
            // Essayer TOUS les formats possibles pour garantir la compatibilité
            cleanedNode.parameters.baseId = baseIdString;
            cleanedNode.parameters.baseNameOrId = baseIdString;
            cleanedNode.parameters.base = baseIdString;
            cleanedNode.parameters.baseName = baseIdString;
            
            // Certaines versions de n8n utilisent un format avec mode/value
            if (!cleanedNode.parameters.baseNameOrId || typeof cleanedNode.parameters.baseNameOrId === 'string') {
              // Si c'est déjà une string, on la garde, sinon on force le format
              cleanedNode.parameters.baseNameOrId = baseIdString;
            }
            
            logger.debug(`🔧 [LinkedInPostInjector] baseId/baseNameOrId injecté dans ${node.name}: ${baseIdString}`);
          }
          
          // Injecter tableId selon le nom du nœud (posts ou users)
          const nodeNameLower = (node.name || '').toLowerCase();
          if (nodeNameLower.includes('post') || nodeNameLower.includes('sauvegarder')) {
            // Nœud pour sauvegarder les posts
            if (userPostsTableId) {
              // ⚠️ CRITIQUE: S'assurer que tableId est une chaîne de caractères, pas un objet
              const tableIdString = typeof userPostsTableId === 'string' ? userPostsTableId : String(userPostsTableId);
              
              // ⚠️ CRITIQUE: Injecter dans TOUS les champs possibles et écraser les placeholders
              // n8n peut utiliser différents formats selon la version
              cleanedNode.parameters.tableId = tableIdString;
              cleanedNode.parameters.tableNameOrId = tableIdString;
              cleanedNode.parameters.tableName = tableIdString; // Utiliser l'ID comme nom aussi
              cleanedNode.parameters.table = tableIdString;
              
              // Certaines versions de n8n utilisent un format avec mode/value
              if (!cleanedNode.parameters.tableNameOrId || typeof cleanedNode.parameters.tableNameOrId === 'string') {
                // Si c'est déjà une string, on la garde, sinon on force le format
                cleanedNode.parameters.tableNameOrId = tableIdString;
              }
              // ⚠️ CRITIQUE: Remplacer les placeholders qui pourraient rester dans les paramètres
              Object.keys(cleanedNode.parameters).forEach(key => {
                const value = cleanedNode.parameters[key];
                if (typeof value === 'string' && value.includes('NOCODB_POSTS_TABLE')) {
                  cleanedNode.parameters[key] = userPostsTableId;
                }
              });
              logger.debug(`🔧 [LinkedInPostInjector] tableId (posts) injecté dans ${node.name}: ${userPostsTableId}`);
            } else {
              // Utiliser le nom de la table si l'ID n'est pas encore disponible
              cleanedNode.parameters.tableNameOrId = userPostsTableName;
              cleanedNode.parameters.tableName = userPostsTableName;
              if (cleanedNode.parameters.table !== undefined) {
                cleanedNode.parameters.table = userPostsTableName;
              }
              // ⚠️ CRITIQUE: Remplacer les placeholders qui pourraient rester dans les paramètres
              Object.keys(cleanedNode.parameters).forEach(key => {
                const value = cleanedNode.parameters[key];
                if (typeof value === 'string' && value.includes('NOCODB_POSTS_TABLE')) {
                  cleanedNode.parameters[key] = userPostsTableName;
                }
              });
              logger.debug(`🔧 [LinkedInPostInjector] tableName (posts) injecté dans ${node.name}: ${userPostsTableName}`);
            }
          } else if (nodeNameLower.includes('user') || nodeNameLower.includes('récupérer')) {
            // Nœud pour récupérer les users
            if (userUsersTableId) {
              // ⚠️ CRITIQUE: S'assurer que tableId est une chaîne de caractères, pas un objet
              const tableIdString = typeof userUsersTableId === 'string' ? userUsersTableId : String(userUsersTableId);
              
              // ⚠️ CRITIQUE: Injecter dans TOUS les champs possibles et écraser les placeholders
              // n8n peut utiliser différents formats selon la version
              cleanedNode.parameters.tableId = tableIdString;
              cleanedNode.parameters.tableNameOrId = tableIdString;
              cleanedNode.parameters.tableName = tableIdString; // Utiliser l'ID comme nom aussi
              cleanedNode.parameters.table = tableIdString;
              
              // Certaines versions de n8n utilisent un format avec mode/value
              if (!cleanedNode.parameters.tableNameOrId || typeof cleanedNode.parameters.tableNameOrId === 'string') {
                // Si c'est déjà une string, on la garde, sinon on force le format
                cleanedNode.parameters.tableNameOrId = tableIdString;
              }
              // ⚠️ CRITIQUE: Remplacer les placeholders qui pourraient rester dans les paramètres
              Object.keys(cleanedNode.parameters).forEach(key => {
                const value = cleanedNode.parameters[key];
                if (typeof value === 'string' && value.includes('NOCODB_USERS_TABLE')) {
                  cleanedNode.parameters[key] = userUsersTableId;
                }
              });
              logger.debug(`🔧 [LinkedInPostInjector] tableId (users) injecté dans ${node.name}: ${userUsersTableId}`);
            } else {
              // Utiliser le nom de la table si l'ID n'est pas encore disponible
              cleanedNode.parameters.tableNameOrId = userUsersTableName;
              cleanedNode.parameters.tableName = userUsersTableName;
              if (cleanedNode.parameters.table !== undefined) {
                cleanedNode.parameters.table = userUsersTableName;
              }
              // ⚠️ CRITIQUE: Remplacer les placeholders qui pourraient rester dans les paramètres
              Object.keys(cleanedNode.parameters).forEach(key => {
                const value = cleanedNode.parameters[key];
                if (typeof value === 'string' && value.includes('NOCODB_USERS_TABLE')) {
                  cleanedNode.parameters[key] = userUsersTableName;
                }
              });
              logger.debug(`🔧 [LinkedInPostInjector] tableName (users) injecté dans ${node.name}: ${userUsersTableName}`);
            }
          }
          
          // Certains nœuds NocoDB utilisent 'host' au lieu de 'baseUrl'
          if (nocoDbBaseUrl && cleanedNode.parameters.host !== undefined) {
            cleanedNode.parameters.host = nocoDbBaseUrl.replace(/^https?:\/\//, ''); // Retirer le protocole
            logger.debug(`🔧 [LinkedInPostInjector] host injecté dans ${node.name}`);
          }
          
          logger.info(`✅ [LinkedInPostInjector] Credential NocoDB assigné à ${node.name} (type: ${node.type})`);
          logger.debug(`🔧 [LinkedInPostInjector] Credential ID: ${nocoDbCredentialId}, baseUrl: ${nocoDbBaseUrl || 'non configuré'}, baseId: ${nocoDbBaseId || 'non configuré'}`);
          
          // Log détaillé des paramètres injectés
          const injectedParams = {
            operation: cleanedNode.parameters.operation,
            baseUrl: cleanedNode.parameters.baseUrl,
            baseId: cleanedNode.parameters.baseId,
            baseNameOrId: cleanedNode.parameters.baseNameOrId,
            tableId: cleanedNode.parameters.tableId,
            tableNameOrId: cleanedNode.parameters.tableNameOrId,
            tableName: cleanedNode.parameters.tableName,
            table: cleanedNode.parameters.table,
            host: cleanedNode.parameters.host
          };
          logger.info(`🔧 [LinkedInPostInjector] Paramètres injectés dans ${node.name}:`, injectedParams);
          
          // ⚠️ Vérifier que tous les paramètres requis sont présents
          const requiredParams = ['operation', 'baseNameOrId', 'tableNameOrId'];
          const missingParams = requiredParams.filter(param => !cleanedNode.parameters[param]);
          if (missingParams.length > 0) {
            logger.warn(`⚠️ [LinkedInPostInjector] Paramètres manquants dans ${node.name}: ${missingParams.join(', ')}`);
          }
        } else {
          logger.warn(`⚠️ [LinkedInPostInjector] Nœud NocoDB détecté (${node.name}, type: ${node.type}) mais aucun credential disponible`);
          logger.warn(`⚠️ [LinkedInPostInjector] L'administrateur doit configurer NOCODB_API_TOKEN dans admin_api_keys ou .env`);
        }
      }
      
      // Nœuds OpenRouter/LangChain - assigner le credential OpenRouter créé pour cet utilisateur
      if ((node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
           node.type === '@n8n/n8n-nodes-langchain.agent' ||
           node.name?.toLowerCase().includes('openrouter') ||
           node.name?.toLowerCase().includes('claude') ||
           node.name?.toLowerCase().includes('llm') ||
           node.name?.toLowerCase().includes('ai agent') ||
           node.name?.toLowerCase().includes('chat model')) &&
          createdCredentials.openRouterApi) {
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        cleanedNode.credentials.openRouterApi = {
          id: createdCredentials.openRouterApi.id,
          name: createdCredentials.openRouterApi.name
        };
        logger.info(`✅ [LinkedInPostInjector] Credential OpenRouter assigné à ${node.name} (type: ${node.type})`);
        logger.debug(`🔧 [LinkedInPostInjector] Credential ID: ${createdCredentials.openRouterApi.id}`);
      }
      
      // Nœuds HTTP Request vers OpenRouter - assigner le credential httpHeaderAuth
      if (node.type === 'n8n-nodes-base.httpRequest' && 
          (node.parameters?.url?.includes('openrouter.ai') || 
           node.name?.toLowerCase().includes('openrouter')) &&
          createdCredentials.openRouterApi) {
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        cleanedNode.credentials.httpHeaderAuth = {
          id: createdCredentials.openRouterApi.id,
          name: createdCredentials.openRouterApi.name
        };
        logger.info(`✅ [LinkedInPostInjector] Credential HTTP OpenRouter assigné à ${node.name}`);
      }
      
      // Nœuds Email Send - assigner le credential SMTP créé pour cet utilisateur
      // Détection large pour couvrir tous les cas
      const isEmailNode = node.type === 'n8n-nodes-base.emailSend' || 
                         node.type === 'n8n-nodes-base.smtp' ||
                         node.type?.toLowerCase().includes('email') ||
                         node.type?.toLowerCase().includes('smtp') ||
                         node.name?.toLowerCase().includes('email') ||
                         node.name?.toLowerCase().includes('notification') ||
                         node.name?.toLowerCase().includes('confirmation') ||
                         node.name?.toLowerCase().includes('smtp');
      
      if (isEmailNode && createdCredentials.smtp) {
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        cleanedNode.credentials.smtp = {
          id: createdCredentials.smtp.id,
          name: createdCredentials.smtp.name
        };
        logger.info(`✅ [LinkedInPostInjector] Credential SMTP assigné à ${node.name} (type: ${node.type})`);
        logger.debug(`🔧 [LinkedInPostInjector] Credential SMTP ID: ${createdCredentials.smtp.id}`);
      } else if (isEmailNode && !createdCredentials.smtp) {
        logger.warn(`⚠️ [LinkedInPostInjector] Nœud email détecté (${node.name}) mais aucun credential SMTP disponible`);
      }
      
      // Mettre à jour les webhooks avec le path unique
      if (node.type === 'n8n-nodes-base.webhook' && uniqueWebhookPath) {
        if (cleanedNode.parameters) {
          // Identifier le type de webhook selon le path original ou le nom du nœud
          const originalPath = cleanedNode.parameters.path || '';
          const nodeName = (node.name || '').toLowerCase();
          
          if (originalPath.includes('linkedin-callback') || 
              originalPath.includes('oauth') || 
              nodeName.includes('oauth') ||
              nodeName.includes('callback')) {
            // Webhook OAuth callback
            cleanedNode.parameters.path = uniqueWebhookPath.replace('linkedin-post-', 'linkedin-oauth-');
          } else if (originalPath.includes('generate-linkedin-post') || 
                     nodeName.includes('generate') ||
                     nodeName.includes('post')) {
            // Webhook pour génération de post
            cleanedNode.parameters.path = uniqueWebhookPath;
          } else {
            // Webhook par défaut
            cleanedNode.parameters.path = uniqueWebhookPath;
          }
          logger.debug(`✅ [LinkedInPostInjector] Webhook path mis à jour pour ${node.name}: ${cleanedNode.parameters.path}`);
        }
      }
      
      // Vérifier que les credentials sont bien assignés
      if (cleanedNode.credentials && Object.keys(cleanedNode.credentials).length > 0) {
        logger.debug(`✅ [LinkedInPostInjector] Nœud ${node.name} a ${Object.keys(cleanedNode.credentials).length} credential(s) assigné(s):`, Object.keys(cleanedNode.credentials));
      }
      
      return cleanedNode;
    });
    
    // Log récapitulatif après injection
    const nodesWithCreds = injectedWorkflow.nodes.filter(n => n.credentials && Object.keys(n.credentials).length > 0);
    logger.info(`✅ [LinkedInPostInjector] ${nodesWithCreds.length}/${injectedWorkflow.nodes.length} nœuds ont des credentials assignés`);
  }
  
  // ⚠️ CRITIQUE: Vérifier que tous les nœuds référencés dans les connections existent
  if (injectedWorkflow.connections && injectedWorkflow.nodes) {
    const nodeNames = new Set(injectedWorkflow.nodes.map(n => n.name));
    const missingNodes = [];
    
    Object.keys(injectedWorkflow.connections).forEach(sourceNodeName => {
      if (!nodeNames.has(sourceNodeName)) {
        missingNodes.push(`Source: ${sourceNodeName}`);
      }
      
      const connections = injectedWorkflow.connections[sourceNodeName];
      Object.values(connections).forEach(connectionArray => {
        if (Array.isArray(connectionArray)) {
          connectionArray.forEach(connectionGroup => {
            if (Array.isArray(connectionGroup)) {
              connectionGroup.forEach(connection => {
                if (connection.node && !nodeNames.has(connection.node)) {
                  missingNodes.push(`Target: ${connection.node} (from ${sourceNodeName})`);
                }
              });
            }
          });
        }
      });
    });
    
    if (missingNodes.length > 0) {
      const uniqueMissing = [...new Set(missingNodes)];
      logger.error('❌ [LinkedInPostInjector] Nœuds manquants dans le workflow', {
        missingNodes: uniqueMissing,
        existingNodes: Array.from(nodeNames).slice(0, 10), // Limiter l'affichage
        totalNodes: nodeNames.size
      });
      
      // ⚠️ CRITIQUE: Ne pas bloquer mais logger l'erreur
      // Le template original doit être corrigé pour inclure tous les nœuds nécessaires
    }
  }
  
  // ⚠️ CRITIQUE: Vérifier que les credentials NocoDB sont bien présents dans tous les nœuds NocoDB
  const nocoDbNodesFinal = injectedWorkflow.nodes?.filter(n => 
    n.type === 'n8n-nodes-base.nocoDb' || 
    n.type?.toLowerCase().includes('nocodb') ||
    n.name?.toLowerCase().includes('nocodb')
  ) || [];
  
  if (nocoDbNodesFinal.length > 0) {
    const nocoDbNodesWithoutCreds = nocoDbNodesFinal.filter(n => !n.credentials?.nocoDbApiToken);
    if (nocoDbNodesWithoutCreds.length > 0) {
      logger.error('❌ [LinkedInPostInjector] Nœuds NocoDB sans credentials après injection', {
        nodesWithoutCreds: nocoDbNodesWithoutCreds.map(n => n.name),
        nocoDbCredentialId: nocoDbCredentialId || 'NON DISPONIBLE'
      });
      
      // ⚠️ CRITIQUE: Forcer l'ajout des credentials manquants
      if (nocoDbCredentialId) {
        nocoDbNodesWithoutCreds.forEach(node => {
          if (!node.credentials) {
            node.credentials = {};
          }
          node.credentials.nocoDbApiToken = {
            id: nocoDbCredentialId,
            name: createdCredentials.nocoDbApiToken?.name || 'NocoDB Token account'
          };
          logger.warn(`⚠️ [LinkedInPostInjector] Credential NocoDB FORCÉ pour ${node.name}`);
        });
      }
    } else {
      logger.info('✅ [LinkedInPostInjector] Tous les nœuds NocoDB ont leurs credentials');
    }
  }
  
  // Log récapitulatif avec détails des nœuds
  const nodesWithCreds = injectedWorkflow.nodes?.filter(n => n.credentials && Object.keys(n.credentials).length > 0) || [];
  const credentialsSummary = {
    nodesTotal: injectedWorkflow.nodes?.length || 0,
    nodesWithCredentials: nodesWithCreds.length,
    linkedin: createdCredentials.linkedInOAuth2Api ? createdCredentials.linkedInOAuth2Api.id : 'NON ASSIGNÉ',
    nocoDb: nocoDbCredentialId || 'NON ASSIGNÉ',
    openRouter: createdCredentials.openRouterApi ? createdCredentials.openRouterApi.id : 'NON ASSIGNÉ',
    smtp: createdCredentials.smtp ? createdCredentials.smtp.id : 'NON ASSIGNÉ',
    webhookPath: uniqueWebhookPath,
    nodesDetails: nodesWithCreds.map(n => ({
      name: n.name,
      type: n.type,
      credentials: Object.keys(n.credentials || {})
    }))
  };
  
  logger.info('✅ [LinkedInPostInjector] Injection terminée avec succès', credentialsSummary);
  
  // Log détaillé pour chaque nœud avec credentials
  if (nodesWithCreds.length > 0) {
    logger.info('📋 [LinkedInPostInjector] Détails des nœuds avec credentials:');
    nodesWithCreds.forEach(n => {
      logger.info(`  - ${n.name} (${n.type}): ${Object.keys(n.credentials).join(', ')}`);
      Object.entries(n.credentials).forEach(([credType, cred]) => {
        logger.info(`    → ${credType}: ${cred.id} (${cred.name})`);
      });
    });
  } else {
    logger.warn('⚠️ [LinkedInPostInjector] AUCUN nœud n\'a de credentials assignés !');
  }
  
  // ⚠️ CRITIQUE: Vérification finale que les credentials NocoDB sont bien présents
  const finalNocoDbNodes = injectedWorkflow.nodes?.filter(n => 
    n.type === 'n8n-nodes-base.nocoDb' || 
    n.type?.toLowerCase().includes('nocodb') ||
    n.name?.toLowerCase().includes('nocodb')
  ) || [];
  
  if (finalNocoDbNodes.length > 0 && nocoDbCredentialId) {
    const finalNodesWithoutCreds = finalNocoDbNodes.filter(n => !n.credentials?.nocoDbApiToken);
    if (finalNodesWithoutCreds.length > 0) {
      logger.error('❌ [LinkedInPostInjector] ERREUR CRITIQUE: Nœuds NocoDB sans credentials dans le workflow final', {
        nodesWithoutCreds: finalNodesWithoutCreds.map(n => n.name),
        nocoDbCredentialId: nocoDbCredentialId
      });
      
      // ⚠️ DERNIÈRE TENTATIVE: Forcer l'ajout des credentials
      finalNodesWithoutCreds.forEach(node => {
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials.nocoDbApiToken = {
          id: nocoDbCredentialId,
          name: createdCredentials.nocoDbApiToken?.name || 'NocoDB Token account'
        };
        logger.warn(`⚠️ [LinkedInPostInjector] Credential NocoDB FORCÉ EN DERNIER RECOURS pour ${node.name}`);
      });
    } else {
      logger.info('✅ [LinkedInPostInjector] Vérification finale: Tous les nœuds NocoDB ont leurs credentials');
    }
  }
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: {
      ...createdCredentials,
      nocoDbApiToken: nocoDbCredentialId ? {
        id: nocoDbCredentialId,
        name: createdCredentials.nocoDbApiToken?.name || 'NocoDB Token account'
      } : null
    }
  };
}

module.exports = { injectUserCredentials };

