// Service pour injecter intelligemment les credentials dans les workflows

const { analyzeWorkflowCredentials, validateFormData } = require('./workflowAnalyzer');
const { getAdminCredentials } = require('./n8nService');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Injecte les credentials utilisateur dans un workflow
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template (pour générer un webhook unique)
 * @returns {Object} Workflow avec credentials injectés et webhook unique
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null) {
  logger.debug('Injection des credentials utilisateur', { userId, templateId, credentialsCount: Object.keys(userCredentials).length });
  
  // Générer un webhook unique pour ce workflow utilisateur
  // Format: workflow-{templateId}-{userId} (sans tirets dans les IDs)
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    const templateIdShort = templateId.replace(/-/g, '').substring(0, 8);
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);
    uniqueWebhookPath = `workflow-${templateIdShort}-${userIdShort}`;
    logger.debug('Webhook unique généré', { webhookPath: uniqueWebhookPath });
  }
  
  // Détecter si c'est un workflow de rapport (Gmail/AI) qui utilise SMTP admin
  const hasGmailNode = workflow.nodes?.some(node => 
    node.type === 'n8n-nodes-base.gmail' || 
    (node.type && node.type.includes('gmail')) ||
    (node.name && node.name.toLowerCase().includes('gmail'))
  );
  const hasAINode = workflow.nodes?.some(node =>
    node.type === '@n8n/n8n-nodes-langchain.agent' ||
    (node.type && node.type.includes('langchain')) ||
    (node.name && node.name.toLowerCase().includes('ai agent'))
  );
  const isReportWorkflow = hasGmailNode || hasAINode;
  
  if (isReportWorkflow) {
    logger.info('Workflow de rapport détecté - SMTP admin sera utilisé automatiquement');
  }
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow);
  logger.debug('Credentials requis analysés', { count: requiredCredentials.length });
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Injecter l'heure dans le Schedule Trigger si fournie
  if (userCredentials.scheduleTime) {
    const scheduleTime = userCredentials.scheduleTime;
    logger.debug('Injection de l\'heure dans Schedule Trigger', { scheduleTime });
    
    // Trouver le nœud Schedule Trigger
    const scheduleNode = workflow.nodes?.find(node => 
      node.type === 'n8n-nodes-base.schedule' || 
      node.type === 'n8n-nodes-base.scheduleTrigger' ||
      (node.type && node.type.includes('schedule'))
    );
    
    if (scheduleNode) {
      // Convertir l'heure HH:MM en format cron (minutes heures * * *)
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const cronExpression = `${minutes} ${hours} * * *`;
      
      logger.debug('Expression cron générée', { cronExpression });
      
      // Mettre à jour les paramètres du Schedule Trigger
      if (!scheduleNode.parameters) {
        scheduleNode.parameters = {};
      }
      
      // Format n8n pour Schedule Trigger avec cronExpression
      scheduleNode.parameters.rule = {
        interval: [{
          field: 'cronExpression',
          cronExpression: cronExpression
        }]
      };
      
      logger.info('Schedule Trigger mis à jour', { scheduleTime });
    } else {
      logger.warn('Aucun Schedule Trigger trouvé malgré scheduleTime fourni', { scheduleTime });
    }
  }
  
  // Convertir le workflow en string pour remplacer les placeholders (comme dans injectParams)
  let workflowString = JSON.stringify(workflow);
  const createdCredentials = {};
  
  // Récupérer les credentials admin une seule fois au début
  const adminCreds = await getAdminCredentials();
  logger.debug('Credentials admin récupérés', { 
    hasOpenRouter: !!adminCreds.OPENROUTER_ID,
    hasSMTP: !!adminCreds.SMTP_ID 
  });
  
  // Pour les workflows de rapport, créer/récupérer le credential SMTP admin
  if (isReportWorkflow && !adminCreds.SMTP_ID) {
    logger.info('Création du credential SMTP admin pour les rapports');
    const config = require('../config');
    const n8nService = require('./n8nService');
    
    try {
      const smtpCredentialData = {
        name: 'SMTP Admin - admin@heleam.com',
        type: 'smtp',
        data: {
          host: config.email.smtpHost,
          port: config.email.smtpPort,
          user: config.email.smtpUser,
          password: config.email.smtpPassword,
          secure: config.email.smtpPort === 465,
          disableStartTls: config.email.smtpPort === 465
        }
      };
      
      const smtpCred = await n8nService.createCredential(smtpCredentialData);
      adminCreds.SMTP_ID = smtpCred.id;
      adminCreds.SMTP_NAME = smtpCred.name || 'SMTP Admin - admin@heleam.com';
      logger.success('Credential SMTP admin créé', { smtpId: adminCreds.SMTP_ID });
    } catch (error) {
      logger.error('Erreur création credential SMTP admin', { error: error.message });
      throw error;
    }
  }
  
  if (isReportWorkflow && adminCreds.SMTP_ID) {
    createdCredentials.smtp = {
      id: adminCreds.SMTP_ID,
      name: adminCreds.SMTP_NAME || 'SMTP Admin - admin@heleam.com'
    };
    logger.debug('Credential SMTP admin utilisé pour workflow de rapport', { smtpId: createdCredentials.smtp.id });
  }
  
  // Créer les credentials utilisateur
  for (const credConfig of requiredCredentials) {
    // Gérer les credentials conditionnels pour les workflows avec options de stockage multiples
    if (credConfig.type === 'storageType' && credConfig.conditionalCredentials) {
      const storageType = userCredentials.storageType || 'google_sheets';
      logger.debug('Type de stockage choisi', { storageType });
      
      // Trouver le credential conditionnel correspondant au choix de l'utilisateur
      const selectedCredential = credConfig.conditionalCredentials.find(cond => {
        return cond.storageValue === storageType;
      });
      
      if (selectedCredential && selectedCredential.credentialConfig) {
        const credType = selectedCredential.credentialType;
        logger.debug('Credential conditionnel détecté', { credType, storageType });
        
        // Créer le credential correspondant
        if (credType === 'googleSheetsOAuth2') {
          const db = require('../database');
          const oauthCreds = await db.getOAuthCredentials(userId, 'google_sheets');
          if (oauthCreds && oauthCreds.length > 0 && oauthCreds[0].n8n_credential_id) {
            createdCredentials.googleSheetsOAuth2 = {
              id: oauthCreds[0].n8n_credential_id,
              name: oauthCreds[0].email || 'Google Sheets OAuth2'
            };
            logger.info('Credential Google Sheets OAuth2 créé/récupéré (conditionnel)', { 
              id: createdCredentials.googleSheetsOAuth2.id 
            });
          } else if (userCredentials.googleSheetsOAuth2 === 'connected') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryOauthCreds = await db.getOAuthCredentials(userId, 'google_sheets');
            if (retryOauthCreds && retryOauthCreds.length > 0 && retryOauthCreds[0].n8n_credential_id) {
              createdCredentials.googleSheetsOAuth2 = {
                id: retryOauthCreds[0].n8n_credential_id,
                name: retryOauthCreds[0].email || 'Google Sheets OAuth2'
              };
              logger.info('Credential Google Sheets OAuth2 récupéré après connexion', { 
                id: createdCredentials.googleSheetsOAuth2.id 
              });
            }
          }
        } else if (credType === 'airtableApi') {
          const airtableCred = await createAirtableCredential(userCredentials, userId);
          createdCredentials.airtableApi = airtableCred;
          logger.info('Credential Airtable créé', { id: airtableCred.id });
        } else if (credType === 'notionApi') {
          const notionCred = await createNotionCredential(userCredentials, userId);
          createdCredentials.notionApi = notionCred;
          logger.info('Credential Notion créé', { id: notionCred.id });
        } else if (credType === 'postgres') {
          const postgresCred = await createPostgresCredential(userCredentials, userId);
          createdCredentials.postgres = postgresCred;
          logger.info('Credential PostgreSQL créé', { id: postgresCred.id });
        }
      } else {
        logger.warn('Aucun credential conditionnel trouvé', { storageType });
      }
      continue; // Passer au credential suivant
    }
    
    if (credConfig.type === 'gmailOAuth2') {
      // Pour Gmail OAuth2, on vérifie si l'utilisateur a déjà un credential OAuth stocké
      const db = require('../database');
      logger.debug('Recherche du credential Gmail OAuth2', { userId });
      
      // Toujours vérifier si l'utilisateur a un credential OAuth dans la base de données
      // Même si le champ gmailOAuth2 n'est pas 'connected', on peut utiliser un credential existant
      const oauthCreds = await db.getOAuthCredentials(userId, 'gmail');
      logger.debug('Credentials OAuth trouvés dans la BDD', { count: oauthCreds?.length || 0 });
      
      if (oauthCreds && oauthCreds.length > 0) {
        // Prendre le credential le plus récent (premier de la liste car trié par created_at DESC)
        const latestCred = oauthCreds[0];
        
        if (latestCred.n8n_credential_id) {
          // Utiliser le credential OAuth existant
          createdCredentials.gmailOAuth2 = {
            id: latestCred.n8n_credential_id,
            name: latestCred.email || 'Gmail OAuth2'
          };
          logger.info('Credential Gmail OAuth2 existant trouvé et utilisé', { 
            id: createdCredentials.gmailOAuth2.id,
            name: createdCredentials.gmailOAuth2.name 
          });
        } else {
          logger.error('Credential OAuth trouvé mais n8n_credential_id manquant', { credId: latestCred.id });
        }
      } else if (userCredentials.gmailOAuth2 === 'connected') {
        // Si l'utilisateur vient de se connecter (gmailOAuth2 === 'connected')
        // Attendre un peu et réessayer de récupérer le credential (il vient d'être créé)
        logger.debug('Utilisateur vient de se connecter, attente de la création du credential');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
        
        // Réessayer de récupérer le credential
        const retryOauthCreds = await db.getOAuthCredentials(userId, 'gmail');
        logger.debug('Nouvelle tentative - Credentials OAuth trouvés', { count: retryOauthCreds?.length || 0 });
        
        if (retryOauthCreds && retryOauthCreds.length > 0 && retryOauthCreds[0].n8n_credential_id) {
          const latestCred = retryOauthCreds[0];
          createdCredentials.gmailOAuth2 = {
            id: latestCred.n8n_credential_id,
            name: latestCred.email || 'Gmail OAuth2'
          };
          logger.info('Credential Gmail OAuth2 récupéré après connexion', { 
            id: createdCredentials.gmailOAuth2.id,
            name: createdCredentials.gmailOAuth2.name 
          });
        } else {
          logger.error('Aucun credential OAuth trouvé après connexion', { userId });
        }
      } else if (userCredentials.gmailOAuth2CredentialId) {
        // Si l'utilisateur a fourni un credential ID directement (depuis le formulaire)
        createdCredentials.gmailOAuth2 = {
          id: userCredentials.gmailOAuth2CredentialId,
          name: userCredentials.gmailOAuth2CredentialName || 'Gmail OAuth2'
        };
        logger.info('Credential Gmail OAuth2 fourni directement par l\'utilisateur', { 
          id: createdCredentials.gmailOAuth2.id 
        });
      } else {
        // Si aucun credential OAuth n'est disponible, NE PAS conserver celui du template
        // Le credential du template n'appartient pas à l'utilisateur et ne fonctionnera pas
        logger.error('CRITIQUE: Aucun credential Gmail OAuth2 trouvé pour l\'utilisateur', { userId });
        // Ne pas créer createdCredentials.gmailOAuth2 - cela forcera la suppression du credential template
      }
    }
    
    if (credConfig.type === 'imap') {
      const imapCred = await createImapCredential(userCredentials, userId);
      createdCredentials.imap = imapCred;
      logger.info('Credential IMAP créé', { id: imapCred.id });
    }
    
    if (credConfig.type === 'smtp') {
      // Créer le credential SMTP natif dans n8n avec SSL/TLS
      const smtpCred = await createSmtpCredential(userCredentials, userId);
      createdCredentials.smtp = smtpCred;
      logger.info('Credential SMTP natif créé', { id: smtpCred.id });
    }
    
    if (credConfig.type === 'googleSheetsOAuth2') {
      // Pour Google Sheets OAuth2, on vérifie si l'utilisateur a déjà un credential OAuth stocké
      const db = require('../database');
      logger.debug('Recherche credential Google Sheets OAuth2', { userId });
      
      // Toujours vérifier si l'utilisateur a un credential OAuth dans la base de données
      const oauthCreds = await db.getOAuthCredentials(userId, 'google_sheets');
      logger.debug('Credentials OAuth Google Sheets trouvés dans la BDD', { count: oauthCreds?.length || 0 });
      
      if (oauthCreds && oauthCreds.length > 0) {
        // Prendre le credential le plus récent
        const latestCred = oauthCreds[0];
        
        if (latestCred.n8n_credential_id) {
          // Utiliser le credential OAuth existant
          createdCredentials.googleSheetsOAuth2 = {
            id: latestCred.n8n_credential_id,
            name: latestCred.email || 'Google Sheets OAuth2'
          };
          logger.info('Credential Google Sheets OAuth2 existant trouvé et utilisé', { 
            id: createdCredentials.googleSheetsOAuth2.id,
            name: createdCredentials.googleSheetsOAuth2.name 
          });
        } else {
          logger.error('Credential OAuth Google Sheets trouvé mais n8n_credential_id manquant', { credId: latestCred.id });
        }
      } else if (userCredentials.googleSheetsOAuth2 === 'connected') {
        // Si l'utilisateur vient de se connecter, attendre un peu et réessayer
        logger.debug('Utilisateur vient de se connecter Google Sheets, attente');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Augmenter à 2 secondes
        
        const retryOauthCreds = await db.getOAuthCredentials(userId, 'google_sheets');
        logger.debug('Nouvelle tentative - Credentials OAuth Google Sheets trouvés', { count: retryOauthCreds?.length || 0 });
        if (retryOauthCreds && retryOauthCreds.length > 0 && retryOauthCreds[0].n8n_credential_id) {
          const latestCred = retryOauthCreds[0];
          createdCredentials.googleSheetsOAuth2 = {
            id: latestCred.n8n_credential_id,
            name: latestCred.email || 'Google Sheets OAuth2'
          };
          logger.info('Credential Google Sheets OAuth2 récupéré après connexion', { 
            id: createdCredentials.googleSheetsOAuth2.id 
          });
        } else {
          logger.error('Aucun credential Google Sheets trouvé après connexion');
        }
      } else if (userCredentials.googleSheetsOAuth2CredentialId) {
        // Si l'utilisateur a fourni un credential ID directement
        createdCredentials.googleSheetsOAuth2 = {
          id: userCredentials.googleSheetsOAuth2CredentialId,
          name: userCredentials.googleSheetsOAuth2CredentialName || 'Google Sheets OAuth2'
        };
        logger.info('Credential Google Sheets OAuth2 fourni directement', { 
          id: createdCredentials.googleSheetsOAuth2.id 
        });
      } else {
        logger.error('CRITIQUE: Aucun credential Google Sheets OAuth2 trouvé pour l\'utilisateur', { userId });
      }
    }
    
    if (credConfig.type === 'airtableApi') {
      // Créer le credential Airtable
      const airtableCred = await createAirtableCredential(userCredentials, userId);
      createdCredentials.airtableApi = airtableCred;
      logger.info('Credential Airtable créé', { id: airtableCred.id });
    }
    
    if (credConfig.type === 'notionApi') {
      // Créer le credential Notion
      const notionCred = await createNotionCredential(userCredentials, userId);
      createdCredentials.notionApi = notionCred;
      logger.info('Credential Notion créé', { id: notionCred.id });
    }
    
    if (credConfig.type === 'postgres') {
      // Créer le credential PostgreSQL
      const postgresCred = await createPostgresCredential(userCredentials, userId);
      createdCredentials.postgres = postgresCred;
      logger.info('Credential PostgreSQL créé', { id: postgresCred.id });
    }
    
    if (credConfig.type === 'googleDriveOAuth2') {
      // Pour Google Drive OAuth2, on vérifie si l'utilisateur a déjà un credential OAuth stocké
      const db = require('../database');
      logger.debug('Recherche credential Google Drive OAuth2', { userId });
      
      // Vérifier si l'utilisateur a un credential OAuth dans la base de données
      const oauthCreds = await db.getOAuthCredentials(userId, 'google_drive');
      logger.debug('Credentials OAuth Google Drive trouvés dans la BDD', { count: oauthCreds?.length || 0 });
      
      if (oauthCreds && oauthCreds.length > 0) {
        // Prendre le credential le plus récent
        const latestCred = oauthCreds[0];
        
        if (latestCred.n8n_credential_id) {
          // Utiliser le credential OAuth existant
          createdCredentials.googleDriveOAuth2 = {
            id: latestCred.n8n_credential_id,
            name: latestCred.email || 'Google Drive OAuth2'
          };
          logger.info('Credential Google Drive OAuth2 existant trouvé et utilisé', { 
            id: createdCredentials.googleDriveOAuth2.id,
            name: createdCredentials.googleDriveOAuth2.name 
          });
        } else {
          logger.error('Credential OAuth Google Drive trouvé mais n8n_credential_id manquant', { credId: latestCred.id });
        }
      } else if (userCredentials.googleDriveOAuth2 === 'connected') {
        // Si l'utilisateur vient de se connecter, attendre un peu et réessayer
        logger.debug('Utilisateur vient de se connecter Google Drive, attente');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const retryOauthCreds = await db.getOAuthCredentials(userId, 'google_drive');
        logger.debug('Nouvelle tentative - Credentials OAuth Google Drive trouvés', { count: retryOauthCreds?.length || 0 });
        if (retryOauthCreds && retryOauthCreds.length > 0 && retryOauthCreds[0].n8n_credential_id) {
          const latestCred = retryOauthCreds[0];
          createdCredentials.googleDriveOAuth2 = {
            id: latestCred.n8n_credential_id,
            name: latestCred.email || 'Google Drive OAuth2'
          };
          logger.info('Credential Google Drive OAuth2 récupéré après connexion', { 
            id: createdCredentials.googleDriveOAuth2.id 
          });
        } else {
          logger.error('Aucun credential Google Drive trouvé après connexion');
        }
      } else if (userCredentials.googleDriveOAuth2CredentialId) {
        // Si l'utilisateur a fourni un credential ID directement
        createdCredentials.googleDriveOAuth2 = {
          id: userCredentials.googleDriveOAuth2CredentialId,
          name: userCredentials.googleDriveOAuth2CredentialName || 'Google Drive OAuth2'
        };
        logger.info('Credential Google Drive OAuth2 fourni directement', { 
          id: createdCredentials.googleDriveOAuth2.id 
        });
      } else {
        logger.error('CRITIQUE: Aucun credential Google Drive OAuth2 trouvé pour l\'utilisateur', { userId });
      }
    }
  }
  
  // Remplacer les placeholders dans la string AVANT de parser (comme dans injectParams)
  // 1. Placeholders OpenRouter
  // ⚠️ CRITIQUE: Remplacer TOUS les placeholders OpenRouter dans la string AVANT le parsing
  if (adminCreds.OPENROUTER_ID) {
    // Remplacer ADMIN_OPENROUTER_PLACEHOLDER si présent
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_PLACEHOLDER"/g,
      JSON.stringify({ id: adminCreds.OPENROUTER_ID, name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin' })
    );
    
    // ⚠️ CRITIQUE: Remplacer aussi ADMIN_OPENROUTER_CREDENTIAL_ID et ADMIN_OPENROUTER_CREDENTIAL_NAME dans la string
    // pour que les nœuds httpRequest avec httpHeaderAuth aient les bons credentials
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_ID"/g,
      `"${adminCreds.OPENROUTER_ID}"`
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_NAME"/g,
      `"${adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'}"`
    );
    
    logger.debug('Placeholders OpenRouter remplacés', { 
      openRouterId: adminCreds.OPENROUTER_ID,
      openRouterName: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
    });
  }
  
  // 1.5. Placeholders SMTP Admin
  // ⚠️ CRITIQUE: Remplacer les placeholders SMTP admin dans la string AVANT le parsing
  if (adminCreds.SMTP_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_CREDENTIAL_ID"/g,
      `"${adminCreds.SMTP_ID}"`
    );
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_CREDENTIAL_NAME"/g,
      `"${adminCreds.SMTP_NAME || 'SMTP Admin - admin@heleam.com'}"`
    );
    logger.debug('Placeholders SMTP admin remplacés', { 
      smtpId: adminCreds.SMTP_ID,
      smtpName: adminCreds.SMTP_NAME || 'SMTP Admin - admin@heleam.com'
    });
  }
  
  // 2. Remplacer les placeholders utilisateur (USER_*_CREDENTIAL_ID) après création des credentials
  // ⚠️ IMPORTANT: Garder les guillemets lors du remplacement pour préserver le format JSON valide
  if (createdCredentials.notionApi) {
    workflowString = workflowString.replace(
      /"USER_NOTION_CREDENTIAL_ID"/g,
      `"${createdCredentials.notionApi.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_NOTION_CREDENTIAL_NAME"/g,
      `"${createdCredentials.notionApi.name || 'Notion API'}"`
    );
    logger.debug('Placeholders Notion remplacés');
  }
  
  if (createdCredentials.postgres) {
    workflowString = workflowString.replace(
      /"USER_POSTGRES_CREDENTIAL_ID"/g,
      `"${createdCredentials.postgres.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_POSTGRES_CREDENTIAL_NAME"/g,
      `"${createdCredentials.postgres.name || 'PostgreSQL'}"`
    );
    logger.debug('Placeholders PostgreSQL remplacés');
  }
  
  if (createdCredentials.airtableApi) {
    workflowString = workflowString.replace(
      /"USER_AIRTABLE_CREDENTIAL_ID"/g,
      `"${createdCredentials.airtableApi.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_AIRTABLE_CREDENTIAL_NAME"/g,
      `"${createdCredentials.airtableApi.name || 'Airtable API'}"`
    );
    logger.debug('Placeholders Airtable remplacés');
  }
  
  if (createdCredentials.googleSheetsOAuth2) {
    // Remplacer les deux variantes possibles du placeholder Google Sheets
    workflowString = workflowString.replace(
      /"USER_GOOGLE_SHEETS_CREDENTIAL_ID"/g,
      `"${createdCredentials.googleSheetsOAuth2.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_GOOGLE_SHEETS_CREDENTIAL_NAME"/g,
      `"${createdCredentials.googleSheetsOAuth2.name || 'Google Sheets OAuth2'}"`
    );
    // ⚠️ IMPORTANT: Remplacer aussi USER_GOOGLE_CREDENTIAL_ID (sans "SHEETS") utilisé dans certains templates
    workflowString = workflowString.replace(
      /"USER_GOOGLE_CREDENTIAL_ID"/g,
      `"${createdCredentials.googleSheetsOAuth2.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_GOOGLE_CREDENTIAL_NAME"/g,
      `"${createdCredentials.googleSheetsOAuth2.name || 'Google Sheets OAuth2'}"`
    );
    logger.debug('Placeholders Google Sheets remplacés', { 
      googleSheetsId: createdCredentials.googleSheetsOAuth2.id 
    });
  
  if (createdCredentials.googleDriveOAuth2) {
    // Remplacer les placeholders Google Drive
    workflowString = workflowString.replace(
      /"USER_GOOGLE_DRIVE_CREDENTIAL_ID"/g,
      `"${createdCredentials.googleDriveOAuth2.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_GOOGLE_DRIVE_CREDENTIAL_NAME"/g,
      `"${createdCredentials.googleDriveOAuth2.name || 'Google Drive OAuth2'}"`
    );
    logger.debug('Placeholders Google Drive remplacés', { 
      googleDriveId: createdCredentials.googleDriveOAuth2.id 
    });
    
    // Remplacer le placeholder du dossier Google Drive si fourni
    if (userCredentials.googleDriveFolderId) {
      workflowString = workflowString.replace(
        /"USER_GOOGLE_DRIVE_FOLDER_ID"/g,
        `"${userCredentials.googleDriveFolderId}"`
      );
      logger.debug('Folder ID Google Drive remplacé', { folderId: userCredentials.googleDriveFolderId });
    }
  }
    
    // ⚠️ DEBUG: Vérifier que les placeholders sont bien remplacés
    const hasGooglePlaceholder = workflowString.includes('USER_GOOGLE_SHEETS_CREDENTIAL_ID') || 
                                 workflowString.includes('USER_GOOGLE_CREDENTIAL_ID');
    if (hasGooglePlaceholder) {
      logger.error('ERREUR: Placeholders Google Sheets toujours présents après remplacement', { 
        workflowStringExtract: workflowString.substring(0, 1000) 
      });
    }
    
    // Remplacer le placeholder du document ID Google Sheets
    if (userCredentials.googleSheetsDocumentId) {
      workflowString = workflowString.replace(
        /"USER_GOOGLE_SHEETS_DOCUMENT_ID"/g,
        `"${userCredentials.googleSheetsDocumentId}"`
      );
      logger.debug('Document ID Google Sheets remplacé', { documentId: userCredentials.googleSheetsDocumentId });
    } else {
      logger.warn('googleSheetsDocumentId non fourni dans userCredentials', { 
        availableKeys: Object.keys(userCredentials) 
      });
    }
  }
  
  // Parser le workflow après remplacement des placeholders
  // ⚠️ DEBUG: Vérifier si les placeholders sont toujours présents dans la string avant parsing
  const hasPlaceholderBeforeParse = workflowString.includes('ADMIN_OPENROUTER_CREDENTIAL_ID') || 
                                     workflowString.includes('ADMIN_OPENROUTER_CREDENTIAL_NAME');
  if (hasPlaceholderBeforeParse && adminCreds.OPENROUTER_ID) {
    logger.error('ERREUR: Placeholders OpenRouter toujours présents après remplacement', { 
      openRouterId: adminCreds.OPENROUTER_ID,
      workflowStringExtract: workflowString.substring(0, 500) 
    });
  }
  
  const injectedWorkflow = JSON.parse(workflowString);
  
  // ⚠️ DEBUG: Vérifier les credentials dans les nœuds après parsing
  const openRouterNodesAfterParse = injectedWorkflow.nodes?.filter(n => 
    n.type === 'n8n-nodes-base.httpRequest' && 
    (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
  );
  if (openRouterNodesAfterParse && openRouterNodesAfterParse.length > 0) {
    logger.debug('Nœuds OpenRouter trouvés après parsing', { count: openRouterNodesAfterParse.length });
    openRouterNodesAfterParse.forEach(node => {
      const credId = node.credentials?.httpHeaderAuth?.id || node.credentials?.openRouterApi?.id || 'aucun';
      const hasPlaceholder = credId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || credId?.includes('ADMIN_OPENROUTER');
      if (hasPlaceholder) {
        logger.error('Placeholder toujours présent après parsing', { nodeName: node.name, credId });
      } else if (credId === adminCreds.OPENROUTER_ID) {
        logger.debug('Credential OpenRouter correct', { nodeName: node.name, credId });
      } else {
        logger.warn('Credential OpenRouter différent', { nodeName: node.name, credId });
      }
    });
  }
  
  // Injecter les credentials et paramètres dans les nœuds (comme dans injectParams)
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      // Préserver TOUTES les propriétés du nœud original
      const cleanedNode = {
        ...node, // Copier toutes les propriétés d'abord
        parameters: node.parameters || {},
        id: node.id,
        name: node.name,
        type: node.type,
        typeVersion: node.typeVersion || 1,
        position: node.position || [0, 0],
      };
      
      // ⚠️ IMPORTANT: Pour les nœuds Gmail, on doit TOUJOURS remplacer le credential du template
      // Vérifier d'abord si c'est un nœud Gmail avant de traiter les autres credentials
      const isGmailNode = node.type === 'n8n-nodes-base.gmail';
      if (isGmailNode && node.credentials?.gmailOAuth2) {
        const templateCredId = node.credentials.gmailOAuth2.id;
        logger.debug('Nœud Gmail détecté', { nodeName: node.name, templateCredId });
        
        // ⚠️ CRITIQUE: Remplacer IMMÉDIATEMENT le credential template par le credential utilisateur
        // Même si c'est un nœud de lecture qui nécessite IMAP, on doit d'abord remplacer le credential Gmail
        // car le nœud reste de type n8n-nodes-base.gmail dans le workflow
        if (createdCredentials.gmailOAuth2) {
          cleanedNode.credentials = {
            gmailOAuth2: {
              id: createdCredentials.gmailOAuth2.id,
              name: createdCredentials.gmailOAuth2.name
            }
          };
          logger.info('Credential Gmail OAuth2 remplacé', { 
            nodeName: node.name,
            oldCredId: templateCredId,
            newCredId: createdCredentials.gmailOAuth2.id 
          });
        } else {
          logger.error('Pas de credential utilisateur disponible pour nœud Gmail', { nodeName: node.name });
          // Supprimer le credential template
          if (cleanedNode.credentials) {
            delete cleanedNode.credentials.gmailOAuth2;
            logger.warn('Credential template supprimé', { nodeName: node.name });
          }
        }
      }
      
      // ⚠️ IMPORTANT: Pour les nœuds HTTP Request qui utilisent OpenRouter (httpHeaderAuth)
      // Assigner automatiquement le credential OpenRouter admin à TOUS les nœuds qui ciblent openrouter.ai
      const isOpenRouterHttpNode = node.type === 'n8n-nodes-base.httpRequest' && 
                                    (node.parameters?.url?.includes('openrouter.ai') || 
                                     node.name?.toLowerCase().includes('openrouter'));
      
      if (isOpenRouterHttpNode) {
        const templateCredId = node.credentials?.httpHeaderAuth?.id || node.credentials?.openRouterApi?.id || 'aucun';
        const templateCredName = node.credentials?.httpHeaderAuth?.name || node.credentials?.openRouterApi?.name || 'aucun';
        const hasPlaceholder = templateCredId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || 
                               templateCredName === 'ADMIN_OPENROUTER_CREDENTIAL_NAME' ||
                               templateCredId?.includes('ADMIN_OPENROUTER') ||
                               templateCredName?.includes('ADMIN_OPENROUTER');
        
        logger.debug('Nœud OpenRouter HTTP détecté', { 
          nodeName: node.name,
          httpHeaderAuthId: node.credentials?.httpHeaderAuth?.id || 'aucun',
          openRouterApiId: node.credentials?.openRouterApi?.id || 'aucun',
          hasPlaceholder 
        });
        
        // Assigner automatiquement le credential OpenRouter admin (même si le nœud n'a pas de credential ou a un placeholder)
        // ⚠️ CRITIQUE: Pour les nœuds httpRequest, utiliser httpHeaderAuth, pas openRouterApi
        // SAUF si le nœud utilise nodeCredentialType: "openRouterApi" (méthode alternative de n8n)
        const usesOpenRouterApiCredentialType = cleanedNode.parameters?.nodeCredentialType === 'openRouterApi' ||
                                                cleanedNode.parameters?.authentication === 'predefinedCredentialType' &&
                                                cleanedNode.parameters?.nodeCredentialType === 'openRouterApi';
        
        if (adminCreds.OPENROUTER_ID && !usesOpenRouterApiCredentialType) {
          // Supprimer openRouterApi s'il existe (mauvais type pour httpRequest sans nodeCredentialType)
          const cleanedCreds = { ...cleanedNode.credentials };
          if (cleanedCreds.openRouterApi) {
            delete cleanedCreds.openRouterApi;
            logger.debug('openRouterApi supprimé (remplacé par httpHeaderAuth)', { nodeName: node.name });
          }
          
          cleanedNode.credentials = {
            ...cleanedCreds,
            httpHeaderAuth: {
              id: adminCreds.OPENROUTER_ID,
              name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
            }
          };
          logger.info('Credential OpenRouter (httpHeaderAuth) assigné', { 
            nodeName: node.name,
            oldCredId: templateCredId,
            newCredId: adminCreds.OPENROUTER_ID 
          });
        } else if (usesOpenRouterApiCredentialType && adminCreds.OPENROUTER_ID) {
          // Si le nœud utilise nodeCredentialType: "openRouterApi", garder openRouterApi et remplacer le placeholder
          if (!cleanedNode.credentials) {
            cleanedNode.credentials = {};
          }
          cleanedNode.credentials.openRouterApi = {
            id: adminCreds.OPENROUTER_ID,
            name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
          };
          logger.info('Credential OpenRouter (openRouterApi avec nodeCredentialType) assigné', { 
            nodeName: node.name,
            credId: adminCreds.OPENROUTER_ID 
          });
        } else {
          logger.error('Pas de credential OpenRouter admin disponible', { 
            nodeName: node.name,
            openRouterId: adminCreds.OPENROUTER_ID 
          });
        }
      }
      
      // S'assurer que webhookId est préservé si présent
      if (node.webhookId) {
        cleanedNode.webhookId = node.webhookId;
      }
      
      // S'assurer que alwaysOutputData est préservé si présent
      if (node.alwaysOutputData !== undefined) {
        cleanedNode.alwaysOutputData = node.alwaysOutputData;
      }
      
      // S'assurer que continueOnFail est préservé si présent
      if (node.continueOnFail !== undefined) {
        cleanedNode.continueOnFail = node.continueOnFail;
      }
      
      // Si c'est un nœud webhook, générer un webhook unique pour ce workflow utilisateur
      if (node.type === 'n8n-nodes-base.webhook' && uniqueWebhookPath) {
        // Le webhookId dans n8n est utilisé pour identifier le webhook
        // On peut aussi modifier le path dans les paramètres
        if (!cleanedNode.parameters.path) {
          cleanedNode.parameters.path = uniqueWebhookPath;
          logger.debug('Webhook unique assigné', { nodeName: node.name, webhookPath: uniqueWebhookPath });
        } else {
          // Remplacer le path existant par le webhook unique
          cleanedNode.parameters.path = uniqueWebhookPath;
        }
        // Le webhookId est généré automatiquement par n8n, mais on peut le définir si nécessaire
        if (node.webhookId) {
          cleanedNode.webhookId = node.webhookId;
        }
        // Webhook déjà loggé plus haut
      }
      
      // Configuration automatique des credentials selon le type de nœud (comme dans injectParams)
      // ⚠️ IMPORTANT: Exclure les nœuds httpRequest qui ont déjà été traités plus haut avec httpHeaderAuth
      const isHttpRequestNode = node.type === 'n8n-nodes-base.httpRequest';
      const isOpenRouterHttpNodeAlreadyProcessed = isHttpRequestNode && 
                                                   (node.parameters?.url?.includes('openrouter.ai') || 
                                                    node.name?.toLowerCase().includes('openrouter'));
      
      // ⚠️ CRITIQUE: Ne pas écraser httpHeaderAuth si déjà assigné pour les nœuds httpRequest OpenRouter
      const hasHttpHeaderAuthForOpenRouter = isOpenRouterHttpNodeAlreadyProcessed && 
                                             cleanedNode.credentials?.httpHeaderAuth;
      
      // ⚠️ IMPORTANT: Exclure les nœuds Airtable, Notion, PostgreSQL, Google Sheets, etc. qui ne doivent PAS recevoir OpenRouter
      const isStorageNode = node.type === 'n8n-nodes-base.airtable' ||
                            node.type === 'n8n-nodes-base.notion' ||
                            node.type === 'n8n-nodes-base.postgres' ||
                            node.type === 'n8n-nodes-base.googleSheets' ||
                            node.name?.toLowerCase().includes('airtable') ||
                            node.name?.toLowerCase().includes('notion') ||
                            node.name?.toLowerCase().includes('postgres') ||
                            node.name?.toLowerCase().includes('google sheets');
      
      if (!isOpenRouterHttpNodeAlreadyProcessed && 
          !hasHttpHeaderAuthForOpenRouter &&
          !isStorageNode &&
          (node.type === 'n8n-nodes-base.openAi' || 
           node.type === 'n8n-nodes-base.openAiChatModel' ||
           node.type === 'n8n-nodes-base.openAiEmbedding' ||
           node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
           (node.name?.toLowerCase().includes('openrouter') && !isHttpRequestNode) ||
           (node.name?.toLowerCase().includes('llm') && !isHttpRequestNode) ||
           (node.name?.toLowerCase().includes('ai') && !isHttpRequestNode && !node.name?.toLowerCase().includes('airtable')))) {
        // Nœud LLM/AI - utiliser le credential OpenRouter (openRouterApi, pas httpHeaderAuth)
        // ⚠️ IMPORTANT: Préserver l'ID DJ4JtAswl4vKWvdI s'il est déjà présent (credential admin par défaut)
        const existingCredId = cleanedNode.credentials?.openRouterApi?.id;
        const isDefaultAdminCred = existingCredId === 'DJ4JtAswl4vKWvdI';
        const hasPlaceholder = existingCredId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || 
                               existingCredId?.includes('ADMIN_OPENROUTER') ||
                               !existingCredId;
        
        // Si le credential par défaut (DJ4JtAswl4vKWvdI) est déjà présent, le garder
        if (isDefaultAdminCred) {
          logger.debug('Credential OpenRouter par défaut déjà présent, conservation', { nodeName: node.name });
        } else if (hasPlaceholder && adminCreds.OPENROUTER_ID) {
          // Si placeholder ou pas de credential, utiliser adminCreds ou DJ4JtAswl4vKWvdI par défaut
          const credIdToUse = adminCreds.OPENROUTER_ID || 'DJ4JtAswl4vKWvdI';
          const credNameToUse = adminCreds.OPENROUTER_NAME || 'OpenRouter account';
          
          cleanedNode.credentials = {
            ...cleanedNode.credentials, // Préserver les autres credentials
            openRouterApi: {
              id: credIdToUse,
              name: credNameToUse
            }
          };
          logger.info('Credential OpenRouter (openRouterApi) assigné automatiquement', { nodeName: node.name, credId: credIdToUse });
        } else if (!existingCredId && adminCreds.OPENROUTER_ID) {
          // Si pas de credential du tout, utiliser adminCreds ou DJ4JtAswl4vKWvdI par défaut
          const credIdToUse = adminCreds.OPENROUTER_ID || 'DJ4JtAswl4vKWvdI';
          const credNameToUse = adminCreds.OPENROUTER_NAME || 'OpenRouter account';
          
          cleanedNode.credentials = {
            ...cleanedNode.credentials, // Préserver les autres credentials
            openRouterApi: {
              id: credIdToUse,
              name: credNameToUse
            }
          };
          logger.info('Credential OpenRouter (openRouterApi) assigné automatiquement', { nodeName: node.name, credId: credIdToUse });
        }
      } else if (hasHttpHeaderAuthForOpenRouter) {
        // Le nœud httpRequest OpenRouter a déjà httpHeaderAuth, ne pas l'écraser avec openRouterApi
        logger.debug('Nœud a déjà httpHeaderAuth assigné, passage de l\'assignation openRouterApi', { nodeName: node.name });
      } else if (node.type === 'n8n-nodes-base.emailSend' || 
                 node.type === 'n8n-nodes-base.smtp' ||
                 node.name?.toLowerCase().includes('smtp') ||
                 node.name?.toLowerCase().includes('email')) {
        // Nœud SMTP - TOUJOURS utiliser le credential SMTP admin (tous les emails partent de admin@heleam.com)
        if (adminCreds.SMTP_ID) {
          cleanedNode.credentials = {
            smtp: {
              id: adminCreds.SMTP_ID,
              name: adminCreds.SMTP_NAME || 'SMTP Admin - admin@heleam.com'
            }
          };
          logger.info('Credential SMTP admin assigné automatiquement', { nodeName: node.name, smtpId: adminCreds.SMTP_ID });
        } else if (createdCredentials.smtp) {
          // Fallback: utiliser createdCredentials.smtp si adminCreds.SMTP_ID n'est pas disponible
          cleanedNode.credentials = {
            smtp: {
              id: createdCredentials.smtp.id,
              name: createdCredentials.smtp.name
            }
          };
          logger.info('Credential SMTP assigné', { nodeName: node.name, smtpId: createdCredentials.smtp.id });
        } else {
          logger.error('Aucun credential SMTP disponible', { nodeName: node.name });
        }
      } else if (node.type === 'n8n-nodes-base.gmail') {
        // Nœud Gmail - TOUJOURS remplacer le credential du template par celui de l'utilisateur
        // ⚠️ IMPORTANT: Si le credential a déjà été remplacé plus tôt (ligne 278), ne pas le réécraser
        if (!cleanedNode.credentials?.gmailOAuth2 || 
            cleanedNode.credentials.gmailOAuth2.id === node.credentials?.gmailOAuth2?.id) {
          // Le credential n'a pas encore été remplacé, le remplacer maintenant
          if (createdCredentials.gmailOAuth2) {
            // Utiliser le credential utilisateur (TOUJOURS remplacer celui du template)
            cleanedNode.credentials = {
              gmailOAuth2: {
                id: createdCredentials.gmailOAuth2.id,
                name: createdCredentials.gmailOAuth2.name
              }
            };
            const oldCredId = node.credentials?.gmailOAuth2?.id || 'aucun';
            logger.info('Credential Gmail OAuth2 utilisateur assigné', { 
              nodeName: node.name,
              userId: createdCredentials.gmailOAuth2.id,
              oldCredId 
            });
          } else {
            // Si aucun credential utilisateur n'est disponible, supprimer celui du template
            // Le credential du template n'appartient pas à l'utilisateur et ne fonctionnera pas
            const templateCredId = node.credentials?.gmailOAuth2?.id || 'aucun';
            logger.error('CRITIQUE: Aucun credential Gmail OAuth2 utilisateur disponible', { 
              nodeName: node.name,
              templateCredId 
            });
            // Supprimer le credential du template pour éviter l'erreur "credential does not exist"
            if (node.credentials) {
              cleanedNode.credentials = { ...node.credentials };
              delete cleanedNode.credentials.gmailOAuth2; // Supprimer le credential template invalide
              logger.warn('Credential template supprimé - l\'utilisateur devra le configurer dans n8n', { nodeName: node.name });
            }
          }
        } else {
          // Le credential a déjà été remplacé plus tôt, ne rien faire
          logger.debug('Credential Gmail OAuth2 déjà remplacé (ignoré)', { nodeName: node.name });
        }
      } else if (node.type === 'n8n-nodes-imap.imap' ||
                 node.type === 'n8n-nodes-base.emailReadImap') {
        // Nœud IMAP ou emailReadImap - utiliser le credential IMAP utilisateur
        if (createdCredentials.imap) {
          cleanedNode.credentials = {
            imap: {
              id: createdCredentials.imap.id,
              name: createdCredentials.imap.name
            }
          };
          logger.info('Credential IMAP assigné', { nodeName: node.name, nodeType: node.type, imapId: createdCredentials.imap.id });
        } else {
          logger.error('Nœud IMAP sans credential IMAP', { nodeName: node.name, nodeType: node.type });
        }
      } else if (node.type === 'n8n-nodes-base.googleDrive') {
        // Nœud Google Drive - assigner automatiquement le credential Google Drive OAuth2 utilisateur
        const templateCredId = node.credentials?.googleDriveOAuth2?.id || 'aucun';
        const templateCredName = node.credentials?.googleDriveOAuth2?.name || 'aucun';
        const hasPlaceholder = templateCredId === 'USER_GOOGLE_DRIVE_CREDENTIAL_ID' || 
                               templateCredId?.includes('USER_GOOGLE_DRIVE');
        
        logger.debug('Nœud Google Drive détecté', { 
          nodeName: node.name,
          templateCredId,
          templateCredName,
          hasPlaceholder,
          hasGoogleDriveCred: !!createdCredentials.googleDriveOAuth2
        });
        
        if (createdCredentials.googleDriveOAuth2) {
          cleanedNode.credentials = {
            ...cleanedNode.credentials,
            googleDriveOAuth2: {
              id: createdCredentials.googleDriveOAuth2.id,
              name: createdCredentials.googleDriveOAuth2.name
            }
          };
          logger.info('Credential Google Drive OAuth2 assigné automatiquement', { 
            nodeName: node.name,
            nodeType: node.type,
            oldCredId: templateCredId,
            newCredId: createdCredentials.googleDriveOAuth2.id,
            newCredName: createdCredentials.googleDriveOAuth2.name
          });
        } else {
          logger.error('Nœud Google Drive sans credential Google Drive OAuth2', { 
            nodeName: node.name,
            nodeType: node.type 
          });
        }
      } else if (node.type === 'n8n-nodes-base.googleSheets') {
        // Nœud Google Sheets - assigner automatiquement le credential Google Sheets OAuth2 utilisateur
        // ⚠️ IMPORTANT: n8n utilise googleSheetsOAuth2Api (avec "Api"), pas googleSheetsOAuth2
        const templateCredId = node.credentials?.googleSheetsOAuth2Api?.id || node.credentials?.googleSheetsOAuth2?.id || 'aucun';
        const templateCredName = node.credentials?.googleSheetsOAuth2Api?.name || node.credentials?.googleSheetsOAuth2?.name || 'aucun';
        // ⚠️ IMPORTANT: Vérifier les deux variantes du placeholder (avec et sans "SHEETS")
        const hasPlaceholder = templateCredId === 'USER_GOOGLE_SHEETS_CREDENTIAL_ID' || 
                               templateCredId === 'USER_GOOGLE_CREDENTIAL_ID' ||
                               templateCredName === 'USER_GOOGLE_SHEETS_CREDENTIAL_NAME' ||
                               templateCredName === 'USER_GOOGLE_CREDENTIAL_NAME' ||
                               templateCredId?.includes('USER_GOOGLE_SHEETS') ||
                               templateCredId?.includes('USER_GOOGLE_CREDENTIAL') ||
                               templateCredName?.includes('USER_GOOGLE_SHEETS') ||
                               templateCredName?.includes('USER_GOOGLE_CREDENTIAL');
        
        logger.debug('Nœud Google Sheets détecté', { 
          nodeName: node.name,
          templateCredId,
          templateCredName,
          hasPlaceholder,
          hasGoogleSheetsCred: !!createdCredentials.googleSheetsOAuth2
        });
        
        if (createdCredentials.googleSheetsOAuth2) {
          cleanedNode.credentials = {
            ...cleanedNode.credentials, // Préserver les autres credentials si présents
            googleSheetsOAuth2Api: {
              id: createdCredentials.googleSheetsOAuth2.id,
              name: createdCredentials.googleSheetsOAuth2.name
            }
          };
          logger.info('Credential Google Sheets OAuth2 assigné automatiquement', { 
            nodeName: node.name,
            nodeType: node.type,
            oldCredId: templateCredId,
            newCredId: createdCredentials.googleSheetsOAuth2.id,
            newCredName: createdCredentials.googleSheetsOAuth2.name
          });
        } else {
          logger.error('Nœud Google Sheets sans credential Google Sheets OAuth2', { 
            nodeName: node.name,
            nodeType: node.type 
          });
        }
      } else if (node.credentials && Object.keys(node.credentials).length > 0) {
        // Pour les autres nœuds, remplacer TOUJOURS les credentials du template par ceux de l'utilisateur
        // ⚠️ IMPORTANT: Ne pas écraser les credentials déjà assignés automatiquement (OpenRouter, Google Sheets, etc.)
        // ⚠️ IMPORTANT: Vérifier aussi si c'est un nœud Gmail qui a passé par cette branche
        const isGmailNodeInElse = node.type === 'n8n-nodes-base.gmail';
        
        // Si c'est un nœud OpenRouter HTTP qui a déjà reçu son credential httpHeaderAuth, ne pas l'écraser
        const isOpenRouterHttpNodeAlreadyProcessed = node.type === 'n8n-nodes-base.httpRequest' && 
                                                      cleanedNode.credentials?.httpHeaderAuth &&
                                                      (node.parameters?.url?.includes('openrouter.ai') || 
                                                       node.name?.toLowerCase().includes('openrouter'));
        
        // Si c'est un nœud Google Sheets qui a déjà reçu son credential, ne pas l'écraser
        // ⚠️ IMPORTANT: n8n utilise googleSheetsOAuth2Api (avec "Api"), pas googleSheetsOAuth2
        const isGoogleSheetsNodeAlreadyProcessed = node.type === 'n8n-nodes-base.googleSheets' &&
                                                    (cleanedNode.credentials?.googleSheetsOAuth2Api || cleanedNode.credentials?.googleSheetsOAuth2);
        
        if (isOpenRouterHttpNodeAlreadyProcessed || isGoogleSheetsNodeAlreadyProcessed) {
          // Les credentials ont déjà été assignés automatiquement, ne pas les écraser
          logger.debug('Nœud a déjà ses credentials assignés automatiquement, passage', { 
            nodeName: node.name,
            hasHttpHeaderAuth: isOpenRouterHttpNodeAlreadyProcessed,
            hasGoogleSheets: isGoogleSheetsNodeAlreadyProcessed
          });
          // Continuer avec les autres propriétés du nœud
        } else {
          if (isGmailNodeInElse && node.credentials.gmailOAuth2) {
            // Si c'est un nœud Gmail qui a des credentials, les remplacer par celui de l'utilisateur
            if (createdCredentials.gmailOAuth2) {
              cleanedNode.credentials = {
                gmailOAuth2: {
                  id: createdCredentials.gmailOAuth2.id,
                  name: createdCredentials.gmailOAuth2.name
                }
              };
              logger.info('Credential Gmail OAuth2 remplacé (branche else)', { 
                nodeName: node.name,
                oldCredId: node.credentials.gmailOAuth2.id,
                newCredId: createdCredentials.gmailOAuth2.id
              });
            } else {
              // Supprimer le credential du template
              cleanedNode.credentials = { ...node.credentials };
              delete cleanedNode.credentials.gmailOAuth2;
              logger.error('Credential Gmail OAuth2 du template supprimé - aucun credential utilisateur disponible', { 
                nodeName: node.name,
                templateCredId: node.credentials.gmailOAuth2.id
              });
            }
          } else {
            // Pour les autres nœuds (non-Gmail), remplacer les credentials existants
            const updatedCredentials = {};
            Object.entries(node.credentials).forEach(([credType, credValue]) => {
              if (credType === 'gmailOAuth2') {
                // TOUJOURS remplacer le credential Gmail OAuth2 du template par celui de l'utilisateur
                if (createdCredentials.gmailOAuth2) {
                  updatedCredentials[credType] = {
                    id: createdCredentials.gmailOAuth2.id,
                    name: createdCredentials.gmailOAuth2.name
                  };
                  logger.info('Credential Gmail OAuth2 remplacé', { 
                    nodeName: node.name,
                    oldCredId: credValue?.id,
                    newCredId: createdCredentials.gmailOAuth2.id
                  });
                } else {
                  // Si pas de credential utilisateur, supprimer celui du template (il ne fonctionnera pas)
                  logger.error('Credential Gmail OAuth2 du template ignoré - aucun credential utilisateur disponible', { 
                    nodeName: node.name,
                    templateCredId: credValue?.id
                  });
                  // Ne pas ajouter ce credential - il sera invalide
                }
              } else if (credType === 'imap' && createdCredentials.imap) {
                updatedCredentials[credType] = {
                  id: createdCredentials.imap.id,
                  name: createdCredentials.imap.name
                };
              } else if (credType === 'smtp') {
                if (createdCredentials.smtp) {
                  updatedCredentials[credType] = {
                    id: createdCredentials.smtp.id,
                    name: createdCredentials.smtp.name
                  };
                } else if (isReportWorkflow && adminCreds.SMTP_ID) {
                  // Pour les workflows de rapport, utiliser SMTP admin
                  updatedCredentials[credType] = {
                    id: adminCreds.SMTP_ID,
                    name: adminCreds.SMTP_NAME || 'SMTP Admin - admin@heleam.com'
                  };
                }
              } else if (credType === 'notionApi') {
                // Remplacer le placeholder USER_NOTION_CREDENTIAL_ID par le vrai credential
                if (createdCredentials.notionApi) {
                  updatedCredentials[credType] = {
                    id: createdCredentials.notionApi.id,
                    name: createdCredentials.notionApi.name
                  };
                  logger.info('Credential Notion remplacé', { 
                    nodeName: node.name,
                    oldCredId: credValue?.id,
                    newCredId: createdCredentials.notionApi.id
                  });
                } else if (typeof credValue === 'object' && credValue.id && credValue.id.includes('USER_NOTION')) {
                  // Si le credential n'a pas été créé mais qu'il y a un placeholder, le supprimer
                  logger.warn('Placeholder Notion détecté mais credential non créé', { nodeName: node.name });
                } else {
                  updatedCredentials[credType] = credValue;
                }
              } else if (credType === 'postgres') {
                // Remplacer le placeholder USER_POSTGRES_CREDENTIAL_ID par le vrai credential
                if (createdCredentials.postgres) {
                  updatedCredentials[credType] = {
                    id: createdCredentials.postgres.id,
                    name: createdCredentials.postgres.name
                  };
                  logger.info('Credential PostgreSQL remplacé', { 
                    nodeName: node.name,
                    oldCredId: credValue?.id,
                    newCredId: createdCredentials.postgres.id
                  });
                } else if (typeof credValue === 'object' && credValue.id && credValue.id.includes('USER_POSTGRES')) {
                  // Si le credential n'a pas été créé mais qu'il y a un placeholder, le supprimer
                  logger.warn('Placeholder PostgreSQL détecté mais credential non créé', { nodeName: node.name });
                } else {
                  updatedCredentials[credType] = credValue;
                }
              } else if (credType === 'airtableApi') {
                // Remplacer le placeholder USER_AIRTABLE_CREDENTIAL_ID par le vrai credential
                if (createdCredentials.airtableApi) {
                  updatedCredentials[credType] = {
                    id: createdCredentials.airtableApi.id,
                    name: createdCredentials.airtableApi.name
                  };
                  logger.info('Credential Airtable remplacé', { 
                    nodeName: node.name,
                    oldCredId: credValue?.id,
                    newCredId: createdCredentials.airtableApi.id
                  });
                } else if (typeof credValue === 'object' && credValue.id && credValue.id.includes('USER_AIRTABLE')) {
                  // Si le credential n'a pas été créé mais qu'il y a un placeholder, le supprimer
                  logger.warn('Placeholder Airtable détecté mais credential non créé', { nodeName: node.name });
                } else {
                  updatedCredentials[credType] = credValue;
                }
              } else if (credType === 'googleSheetsOAuth2' || credType === 'googleSheetsOAuth2Api') {
                // Remplacer le placeholder USER_GOOGLE_SHEETS_CREDENTIAL_ID par le vrai credential
                // ⚠️ IMPORTANT: n8n utilise googleSheetsOAuth2Api (avec "Api"), pas googleSheetsOAuth2
                if (createdCredentials.googleSheetsOAuth2) {
                  updatedCredentials['googleSheetsOAuth2Api'] = {
                    id: createdCredentials.googleSheetsOAuth2.id,
                    name: createdCredentials.googleSheetsOAuth2.name
                  };
                  logger.info('Credential Google Sheets remplacé', { 
                    nodeName: node.name,
                    oldCredId: credValue?.id,
                    newCredId: createdCredentials.googleSheetsOAuth2.id
                  });
                } else if (typeof credValue === 'object' && credValue.id && credValue.id.includes('USER_GOOGLE_SHEETS')) {
                  // Si le credential n'a pas été créé mais qu'il y a un placeholder, le supprimer
                  logger.warn('Placeholder Google Sheets détecté mais credential non créé', { nodeName: node.name });
                } else {
                  updatedCredentials[credType] = credValue;
                }
              } else if (credType === 'openRouterApi' && adminCreds.OPENROUTER_ID) {
                // ⚠️ CRITIQUE: Pour les nœuds httpRequest qui utilisent OpenRouter, ne pas ajouter openRouterApi
                // car ils utilisent httpHeaderAuth (déjà assigné plus haut)
                const isOpenRouterHttpNode = node.type === 'n8n-nodes-base.httpRequest' && 
                                             (node.parameters?.url?.includes('openrouter.ai') || 
                                              node.name?.toLowerCase().includes('openrouter'));
                
                if (isOpenRouterHttpNode && cleanedNode.credentials?.httpHeaderAuth) {
                  // Le nœud httpRequest OpenRouter utilise httpHeaderAuth, ne pas ajouter openRouterApi
                  logger.debug('openRouterApi ignoré (utilise httpHeaderAuth)', { nodeName: node.name });
                  // Ne pas ajouter openRouterApi à updatedCredentials
                } else {
                  // Pour les autres types de nœuds (non-httpRequest), utiliser openRouterApi
                  if (typeof credValue === 'object' && credValue.id && credValue.id !== 'ADMIN_OPENROUTER_CREDENTIAL_ID') {
                    updatedCredentials[credType] = credValue;
                  } else {
                    updatedCredentials[credType] = {
                      id: adminCreds.OPENROUTER_ID,
                      name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
                    };
                  }
                }
              } else if (credType === 'httpHeaderAuth' && adminCreds.OPENROUTER_ID) {
                // Pour les nœuds HTTP Request qui utilisent OpenRouter via httpHeaderAuth
                // Vérifier si c'est un nœud OpenRouter (URL ou nom contient openrouter)
                const isOpenRouterNode = node.parameters?.url?.includes('openrouter.ai') || 
                                        node.name?.toLowerCase().includes('openrouter');
                
                // ⚠️ CRITIQUE: Si le nœud a déjà httpHeaderAuth assigné automatiquement plus haut, le préserver
                if (isOpenRouterNode && cleanedNode.credentials?.httpHeaderAuth && 
                    cleanedNode.credentials.httpHeaderAuth.id === adminCreds.OPENROUTER_ID) {
                  // Le credential a déjà été assigné automatiquement, le préserver
                  updatedCredentials[credType] = cleanedNode.credentials.httpHeaderAuth;
                  logger.debug('httpHeaderAuth déjà assigné automatiquement, préservation', { nodeName: node.name });
                } else if (isOpenRouterNode) {
                  // Si le placeholder a été remplacé dans la string, utiliser la valeur existante
                  // Sinon, assigner le credential admin
                  if (typeof credValue === 'object' && credValue.id && 
                      credValue.id !== 'ADMIN_OPENROUTER_CREDENTIAL_ID' &&
                      credValue.id !== 'ADMIN_OPENROUTER_PLACEHOLDER') {
                    updatedCredentials[credType] = credValue;
                  } else {
                    updatedCredentials[credType] = {
                      id: adminCreds.OPENROUTER_ID,
                      name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
                    };
                    logger.info('Credential OpenRouter (httpHeaderAuth) assigné', { nodeName: node.name, credId: adminCreds.OPENROUTER_ID });
                  }
                } else {
                  // Pour les autres nœuds httpHeaderAuth, garder la valeur originale
                  updatedCredentials[credType] = credValue;
                }
              } else {
                updatedCredentials[credType] = credValue;
              }
            });
            cleanedNode.credentials = updatedCredentials;
          }
        }
      } else {
        // Si le nœud n'a PAS de credentials, assigner automatiquement les credentials nécessaires
        // selon le type de nœud
        
        // Nœuds OpenRouter (httpRequest qui ciblent openrouter.ai)
        if (node.type === 'n8n-nodes-base.httpRequest' && 
            (node.parameters?.url?.includes('openrouter.ai') || 
             node.name?.toLowerCase().includes('openrouter'))) {
          if (adminCreds.OPENROUTER_ID) {
            cleanedNode.credentials = {
              httpHeaderAuth: {
                id: adminCreds.OPENROUTER_ID,
                name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
              }
            };
            logger.info('Credential OpenRouter (httpHeaderAuth) assigné automatiquement (nœud sans credential)', { nodeName: node.name });
          }
        }
        
        // Nœuds Google Sheets
        if (node.type === 'n8n-nodes-base.googleSheets' && createdCredentials.googleSheetsOAuth2) {
          cleanedNode.credentials = {
            googleSheetsOAuth2Api: {
              id: createdCredentials.googleSheetsOAuth2.id,
              name: createdCredentials.googleSheetsOAuth2.name
            }
          };
          logger.info('Credential Google Sheets OAuth2 assigné automatiquement (nœud sans credential)', { nodeName: node.name });
        }
        
        // Nœuds Google Drive
        if (node.type === 'n8n-nodes-base.googleDrive' && createdCredentials.googleDriveOAuth2) {
          cleanedNode.credentials = {
            googleDriveOAuth2: {
              id: createdCredentials.googleDriveOAuth2.id,
              name: createdCredentials.googleDriveOAuth2.name
            }
          };
          logger.info('Credential Google Drive OAuth2 assigné automatiquement (nœud sans credential)', { nodeName: node.name });
        }
        
        // Nœuds Notion
        if (node.type === 'n8n-nodes-base.notion' && createdCredentials.notionApi) {
          cleanedNode.credentials = {
            notionApi: {
              id: createdCredentials.notionApi.id,
              name: createdCredentials.notionApi.name
            }
          };
          logger.info('Credential Notion assigné automatiquement (nœud sans credential)', { nodeName: node.name });
        }
        
        // Nœuds PostgreSQL
        if (node.type === 'n8n-nodes-base.postgres' && createdCredentials.postgres) {
          cleanedNode.credentials = {
            postgres: {
              id: createdCredentials.postgres.id,
              name: createdCredentials.postgres.name
            }
          };
          logger.info('Credential PostgreSQL assigné automatiquement (nœud sans credential)', { nodeName: node.name });
        }
        
        // Nœuds Airtable
        if (node.type === 'n8n-nodes-base.airtable' && createdCredentials.airtableApi) {
          cleanedNode.credentials = {
            airtableApi: {
              id: createdCredentials.airtableApi.id,
              name: createdCredentials.airtableApi.name
            }
          };
          logger.info('Credential Airtable assigné automatiquement (nœud sans credential)', { nodeName: node.name });
        }
      }
      
      // Conserver les autres propriétés du nœud
      if (node.disabled !== undefined) {
        cleanedNode.disabled = node.disabled;
      }
      if (node.notes) {
        cleanedNode.notes = node.notes;
      }
      if (node.notesInFlow !== undefined) {
        cleanedNode.notesInFlow = node.notesInFlow;
      }
      
      // ⚠️ PROTECTION FINALE: Pour les nœuds httpRequest OpenRouter, s'assurer que httpHeaderAuth est présent
      // et que openRouterApi n'est pas présent (car c'est le mauvais type pour httpRequest)
      const isOpenRouterHttpNodeFinal = cleanedNode.type === 'n8n-nodes-base.httpRequest' && 
                                        (cleanedNode.parameters?.url?.includes('openrouter.ai') || 
                                         cleanedNode.name?.toLowerCase().includes('openrouter'));
      
      if (isOpenRouterHttpNodeFinal) {
        // Utiliser le credential utilisateur accessible par défaut si adminCreds.OPENROUTER_ID n'est pas disponible
        // Nouveau ID: hgQk9lN7epSIRRcg (ancien: o7MztG7VAoDGoDSp)
        const credentialIdToUse = adminCreds.OPENROUTER_ID || 'hgQk9lN7epSIRRcg';
        const credentialNameToUse = adminCreds.OPENROUTER_NAME || 'Header Auth account 2';
        
        // FORCER l'assignation du credential, même si un autre credential est déjà présent
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        
        // Supprimer openRouterApi s'il existe (mauvais type pour httpRequest)
        if (cleanedNode.credentials.openRouterApi) {
          delete cleanedNode.credentials.openRouterApi;
          logger.warn('PROTECTION FINALE: openRouterApi supprimé', { nodeName: cleanedNode.name });
        }
        
        // Vérifier si le credential actuel est différent de celui souhaité
        const currentCredId = cleanedNode.credentials?.httpHeaderAuth?.id;
        if (currentCredId !== credentialIdToUse) {
          logger.debug('PROTECTION FINALE: Credential remplacé', { 
            nodeName: cleanedNode.name,
            oldCredId: currentCredId,
            newCredId: credentialIdToUse
          });
        }
        
        // FORCER l'assignation du credential httpHeaderAuth (écrase tout credential existant)
        cleanedNode.credentials.httpHeaderAuth = {
          id: credentialIdToUse,
          name: credentialNameToUse
        };
        
        logger.info('PROTECTION FINALE: Credential OpenRouter FORCÉ', { 
          nodeName: cleanedNode.name,
          credId: credentialIdToUse,
          credName: credentialNameToUse
        });
      }
      
      // ⚠️ PROTECTION FINALE: Pour les nœuds Google Sheets, s'assurer que googleSheetsOAuth2Api est présent
      if (cleanedNode.type === 'n8n-nodes-base.googleSheets' && createdCredentials.googleSheetsOAuth2) {
        if (!cleanedNode.credentials?.googleSheetsOAuth2Api) {
          // Si le nœud n'a pas de credential Google Sheets, l'assigner
          cleanedNode.credentials = {
            ...cleanedNode.credentials,
            googleSheetsOAuth2Api: {
              id: createdCredentials.googleSheetsOAuth2.id,
              name: createdCredentials.googleSheetsOAuth2.name
            }
          };
          logger.info('CORRECTION FINALE: googleSheetsOAuth2Api assigné (nœud sans credential)', { nodeName: cleanedNode.name });
        } else if (cleanedNode.credentials.googleSheetsOAuth2Api.id?.includes('USER_GOOGLE_SHEETS') || 
                   cleanedNode.credentials.googleSheetsOAuth2Api.id === 'USER_GOOGLE_SHEETS_CREDENTIAL_ID') {
          // Si le nœud a un placeholder, le remplacer
          cleanedNode.credentials.googleSheetsOAuth2Api = {
            id: createdCredentials.googleSheetsOAuth2.id,
            name: createdCredentials.googleSheetsOAuth2.name
          };
          logger.info('CORRECTION FINALE: Placeholder Google Sheets remplacé', { nodeName: cleanedNode.name });
        }
      }
      
      return cleanedNode;
    });
  }
  
  // Fonction pour nettoyer l'objet settings - n8n n'accepte qu'un objet vide {} lors de la création
  // Les propriétés settings peuvent être ajoutées après la création via PUT
  function cleanSettings(settings) {
    // Pour la création de workflow, n8n n'accepte qu'un objet vide {}
    // Les propriétés settings peuvent être ajoutées après via PUT si nécessaire
    return {};
  }
  
  // Nettoyer le workflow - ne garder que les propriétés essentielles pour l'API n8n
  // L'API n8n exige que 'settings' soit toujours présent (même vide)
  const cleanedWorkflow = {
    name: injectedWorkflow.name,
    nodes: injectedWorkflow.nodes,
    connections: injectedWorkflow.connections,
    settings: cleanSettings(injectedWorkflow.settings), // Nettoyer settings pour ne garder que les propriétés autorisées
    pinData: injectedWorkflow.pinData || {}, // Préserver pinData
    tags: injectedWorkflow.tags || [] // Préserver les tags
  };
  
  logger.success('Injection terminée avec succès', { 
    nodesCount: cleanedWorkflow.nodes?.length,
    connectionsCount: Object.keys(cleanedWorkflow.connections || {}).length
  });
  
  // Vérifier que tous les nœuds ont des IDs
  const nodesWithoutId = cleanedWorkflow.nodes?.filter(n => !n.id);
  if (nodesWithoutId && nodesWithoutId.length > 0) {
    logger.warn('Certains nœuds n\'ont pas d\'ID', { 
      nodesWithoutId: nodesWithoutId.map(n => n.name) 
    });
  }
  
  // Vérifier les credentials assignés aux nœuds Gmail
  const gmailNodes = cleanedWorkflow.nodes?.filter(n => n.type === 'n8n-nodes-base.gmail');
  if (gmailNodes && gmailNodes.length > 0) {
    logger.debug('Vérification critique des credentials Gmail', { 
      gmailNodesCount: gmailNodes.length,
      hasGmailCred: !!createdCredentials.gmailOAuth2
    });
    gmailNodes.forEach(node => {
      if (node.credentials && node.credentials.gmailOAuth2) {
        const credId = node.credentials.gmailOAuth2.id;
        const isUserCred = createdCredentials.gmailOAuth2 && credId === createdCredentials.gmailOAuth2.id;
        if (!isUserCred) {
          logger.error('Credential Gmail OAuth2 template conservé - DEVRAIT ÊTRE REMPLACÉ', { 
            nodeName: node.name,
            templateCredId: credId,
            expectedCredId: createdCredentials.gmailOAuth2?.id || 'AUCUN'
          });
        }
      } else {
        logger.error('Aucun credential Gmail OAuth2 assigné', { 
          nodeName: node.name,
          hasGmailCred: !!createdCredentials.gmailOAuth2
        });
      }
    });
  }
  
  // Vérifier les credentials assignés aux nœuds OpenRouter HTTP
  const openRouterNodes = cleanedWorkflow.nodes?.filter(n => 
    n.type === 'n8n-nodes-base.httpRequest' && 
    (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
  );
  if (openRouterNodes && openRouterNodes.length > 0) {
    logger.debug('Vérification critique des credentials OpenRouter', { 
      openRouterNodesCount: openRouterNodes.length,
      openRouterId: adminCreds.OPENROUTER_ID
    });
    openRouterNodes.forEach(node => {
      if (node.credentials && node.credentials.httpHeaderAuth) {
        const credId = node.credentials.httpHeaderAuth.id;
        const isAdminCred = adminCreds.OPENROUTER_ID && credId === adminCreds.OPENROUTER_ID;
        const hasPlaceholder = credId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || credId?.includes('ADMIN_OPENROUTER');
        if (!isAdminCred && hasPlaceholder) {
          logger.error('Placeholder OpenRouter toujours présent - DEVRAIT ÊTRE REMPLACÉ', { 
            nodeName: node.name,
            placeholderId: credId,
            expectedCredId: adminCreds.OPENROUTER_ID || 'AUCUN'
          });
        } else if (!isAdminCred) {
          logger.warn('Credential OpenRouter différent', { nodeName: node.name, credId });
        }
      } else {
        logger.error('Aucun credential OpenRouter (httpHeaderAuth) assigné', { 
          nodeName: node.name,
          hasOpenRouterId: !!adminCreds.OPENROUTER_ID
        });
      }
    });
  }
  
  // Vérifier les credentials assignés aux nœuds Google Sheets
  const googleSheetsNodes = cleanedWorkflow.nodes?.filter(n => n.type === 'n8n-nodes-base.googleSheets');
  if (googleSheetsNodes && googleSheetsNodes.length > 0) {
    logger.debug('Vérification critique des credentials Google Sheets', { 
      googleSheetsNodesCount: googleSheetsNodes.length,
      hasGoogleSheetsCred: !!createdCredentials.googleSheetsOAuth2
    });
    googleSheetsNodes.forEach(node => {
      if (node.credentials && node.credentials.googleSheetsOAuth2) {
        const credId = node.credentials.googleSheetsOAuth2.id;
        const isUserCred = createdCredentials.googleSheetsOAuth2 && credId === createdCredentials.googleSheetsOAuth2.id;
        const hasPlaceholder = credId === 'USER_GOOGLE_SHEETS_CREDENTIAL_ID' || credId?.includes('USER_GOOGLE_SHEETS');
        if (!isUserCred && hasPlaceholder) {
          logger.error('Placeholder Google Sheets toujours présent - DEVRAIT ÊTRE REMPLACÉ', { 
            nodeName: node.name,
            placeholderId: credId,
            expectedCredId: createdCredentials.googleSheetsOAuth2?.id || 'AUCUN'
          });
        } else if (!isUserCred) {
          logger.warn('Credential Google Sheets différent', { nodeName: node.name, credId });
        }
      } else {
        logger.error('Aucun credential Google Sheets OAuth2 assigné', { 
          nodeName: node.name,
          hasGoogleSheetsCred: !!createdCredentials.googleSheetsOAuth2
        });
      }
    });
  }
  
  // Log final de tous les credentials créés/réutilisés
  logger.debug('Résumé des credentials', { 
    credentialsCount: Object.keys(createdCredentials).length,
    credentials: Object.entries(createdCredentials)
      .filter(([_, cred]) => cred && cred.id)
      .map(([credType, cred]) => ({ type: credType, id: cred.id, name: cred.name }))
  });
  
  // Retourner le workflow, le webhook path et les credentials créés pour stockage en base de données
  // ⚠️ VÉRIFICATION FINALE ABSOLUE: S'assurer que tous les credentials sont présents et valides
  logger.debug('Vérification finale absolue des credentials');
  
  // Vérifier tous les nœuds OpenRouter
  const finalOpenRouterNodes = cleanedWorkflow.nodes?.filter(n => 
    n.type === 'n8n-nodes-base.httpRequest' && 
    (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
  );
  if (finalOpenRouterNodes && finalOpenRouterNodes.length > 0) {
    finalOpenRouterNodes.forEach(node => {
      const credId = node.credentials?.httpHeaderAuth?.id;
      const hasPlaceholder = !credId || credId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || credId.includes('ADMIN_OPENROUTER') || credId.includes('_CREDENTIAL_ID');
      
      if (hasPlaceholder) {
        logger.error('VÉRIFICATION FINALE: Placeholder ou pas de credential détecté', { 
          nodeName: node.name,
          credId 
        });
        // FORCER l'assignation si placeholder détecté
        if (adminCreds.OPENROUTER_ID) {
          node.credentials = {
            ...node.credentials,
            httpHeaderAuth: {
              id: adminCreds.OPENROUTER_ID,
              name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
            }
          };
          // Supprimer openRouterApi si présent
          if (node.credentials.openRouterApi) {
            delete node.credentials.openRouterApi;
          }
          logger.info('VÉRIFICATION FINALE: Credential OpenRouter FORCÉ', { 
            nodeName: node.name,
            credId: adminCreds.OPENROUTER_ID
          });
        }
      }
    });
  }
  
  // Vérifier tous les nœuds Google Sheets
  const finalGoogleSheetsNodes = cleanedWorkflow.nodes?.filter(n => 
    n.type === 'n8n-nodes-base.googleSheets'
  );
  if (finalGoogleSheetsNodes && finalGoogleSheetsNodes.length > 0 && createdCredentials.googleSheetsOAuth2) {
    finalGoogleSheetsNodes.forEach(node => {
      // ⚠️ IMPORTANT: n8n utilise googleSheetsOAuth2Api (avec "Api"), pas googleSheetsOAuth2
      const credId = node.credentials?.googleSheetsOAuth2Api?.id || node.credentials?.googleSheetsOAuth2?.id;
      // ⚠️ IMPORTANT: Vérifier les deux variantes du placeholder (avec et sans "SHEETS")
      const hasPlaceholder = !credId || 
                            credId === 'USER_GOOGLE_SHEETS_CREDENTIAL_ID' || 
                            credId === 'USER_GOOGLE_CREDENTIAL_ID' ||
                            credId.includes('USER_GOOGLE_SHEETS') || 
                            credId.includes('USER_GOOGLE_CREDENTIAL') ||
                            credId.includes('_CREDENTIAL_ID');
      
      if (hasPlaceholder) {
        logger.error('VÉRIFICATION FINALE: Placeholder ou pas de credential détecté pour Google Sheets', { 
          nodeName: node.name,
          credId 
        });
        // FORCER l'assignation si placeholder détecté
        node.credentials = {
          ...node.credentials,
          googleSheetsOAuth2Api: {
            id: createdCredentials.googleSheetsOAuth2.id,
            name: createdCredentials.googleSheetsOAuth2.name
          }
        };
        // Supprimer l'ancien format si présent
        if (node.credentials.googleSheetsOAuth2) {
          delete node.credentials.googleSheetsOAuth2;
        }
        logger.info('VÉRIFICATION FINALE: Credential Google Sheets FORCÉ', { 
          nodeName: node.name,
          credId: createdCredentials.googleSheetsOAuth2.id
        });
      }
    });
  }
  
  return {
    workflow: cleanedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: createdCredentials // Retourner les credentials créés pour les sauvegarder
  };
}

/**
 * Crée un credential IMAP pour l'utilisateur
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createImapCredential(userCredentials, userId) {
  logger.debug('Création credential IMAP', { 
    email: userCredentials.email,
    imapServer: userCredentials.imapServer,
    imapPort: userCredentials.imapPort,
    hasPassword: !!userCredentials.imapPassword
  });
  
  const credentialData = {
    name: `IMAP-${userId}-${Date.now()}`,
    type: 'imap',
    data: {
      user: userCredentials.email,
      password: userCredentials.imapPassword, // Utiliser le mot de passe IMAP
      host: userCredentials.imapServer,
      port: 993, // Port en number
      secure: true
    }
  };
  
  logger.debug('Données IMAP finales', {
    credentialName: credentialData.name,
    user: credentialData.data.user,
    host: credentialData.data.host,
    port: credentialData.data.port,
    secure: credentialData.data.secure
  });
  
  // Créer le credential IMAP via le proxy backend
  try {
    const backendUrl = config.app.backendUrl;
    const response = await fetch(`${backendUrl}/api/n8n/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentialData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur création credential IMAP: ${response.status} - ${errorText}`);
    }

    const credential = await response.json();
    logger.info('Credential IMAP créé via proxy', { credId: credential.id });
    
    return credential;
  } catch (error) {
    logger.error('Erreur création credential IMAP via proxy', { error: error.message });
    throw error;
  }
}

/**
 * Crée un credential SMTP pour l'utilisateur avec SSL/TLS natif
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createSmtpCredential(userCredentials, userId) {
  try {
    logger.debug('Création credential SMTP natif avec SSL/TLS', {
      smtpPort: userCredentials.smtpPort,
      smtpServer: userCredentials.smtpServer,
      smtpEmail: userCredentials.smtpEmail
    });
    
    // Payload exact - utiliser la même structure minimale que IMAP qui fonctionne
    const smtpPort = Number(userCredentials.smtpPort) || 465;
    
    // Configuration SSL/TLS selon le port
    // Port 465 = SSL direct (secure: true, disableStartTls: true)
    // Port 587 = STARTTLS (secure: false, disableStartTls: false)
    const isSslPort = smtpPort === 465;
    
    // Structure minimale identique à IMAP qui fonctionne, avec seulement les champs essentiels
    // Vérifier que tous les champs requis sont présents avant de créer le credential
    const smtpHost = userCredentials.smtpServer || userCredentials.IMAP_SERVER?.replace('imap', 'smtp');
    const smtpUser = userCredentials.smtpEmail || userCredentials.email;
    const smtpPassword = userCredentials.smtpPassword;
    
    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error('SMTP credentials incomplets: host, user et password sont requis');
    }
    
    // S'assurer que le port est bien un nombre
    const finalPort = Number(smtpPort);
    if (isNaN(finalPort)) {
      throw new Error(`Port SMTP invalide: ${smtpPort}`);
    }
    
    // Structure minimale identique à IMAP qui fonctionne
    // Pour SMTP, n8n peut avoir des validations strictes sur disableStartTls
    // Essayer d'abord sans disableStartTls pour le port 465 (secure: true devrait suffire)
    const smtpCredentialData = {
      name: `SMTP-${userId}`,
      type: "smtp",
      data: {
        host: smtpHost,
        user: smtpUser,
        password: smtpPassword,
        port: finalPort, // Forcer en number
        secure: isSslPort // SSL pour port 465, STARTTLS pour port 587
      }
    };
    
    // Ajouter disableStartTls SEULEMENT pour le port 587 (STARTTLS)
    // Pour le port 465 avec secure: true, n8n peut ne pas accepter disableStartTls
    if (!isSslPort) {
      smtpCredentialData.data.disableStartTls = false; // Port 587 avec STARTTLS
    }

    logger.debug('Payload SMTP natif préparé', {
      port: smtpCredentialData.data.port,
      secure: smtpCredentialData.data.secure,
      host: smtpCredentialData.data.host
    });

    const backendUrl = config.app.backendUrl;
    const response = await fetch(`${backendUrl}/api/n8n/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smtpCredentialData),
    });

    logger.debug('Réponse n8n reçue', { status: response.status, statusText: response.statusText });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Erreur création credential SMTP', { status: response.status, error: errorText });
      throw new Error(`Erreur création credential SMTP: ${response.status} - ${errorText}`);
    }

    const credential = await response.json();
    logger.info('Credential SMTP natif créé', { 
      credId: credential.id,
      credName: credential.name,
      credType: credential.type
    });
    
    return credential;
  } catch (error) {
    logger.error('Erreur création credential SMTP natif', { error: error.message });
    throw error;
  }
}

/**
 * Crée un credential dans n8n
 * @param {Object} credentialData - Données du credential
 * @returns {Object} Credential créé
 */
async function createCredentialInN8n(credentialData) {
  try {
    logger.debug('Envoi credential à n8n', {
      type: credentialData.type,
      name: credentialData.name,
      dataKeys: Object.keys(credentialData.data)
    });
    
    const backendUrl = config.app.backendUrl;
    const response = await fetch(`${backendUrl}/api/n8n/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentialData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      logger.error('Erreur API n8n', { error });
      throw new Error(`Erreur création credential: ${error}`);
    }
    
    const result = await response.json();
    logger.info('Credential créé dans n8n', { credId: result.id, credName: result.name });
    return result;
    
  } catch (error) {
    logger.error('Erreur création credential', { error: error.message });
    throw error;
  }
}

/**
 * Nettoie les credentials utilisateur (supprime les credentials temporaires)
 * @param {Object} createdCredentials - Credentials créés
 */
async function cleanupUserCredentials(createdCredentials) {
  logger.debug('Nettoyage des credentials');
  
  for (const [type, cred] of Object.entries(createdCredentials)) {
    if (cred && cred.id) {
      try {
        const backendUrl = config.app.backendUrl;
        await fetch(`${backendUrl}/api/n8n/credentials/${cred.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        logger.debug('Credential supprimé', { type, credId: cred.id });
      } catch (error) {
        logger.error('Erreur suppression credential', { type, error: error.message });
      }
    }
  }
}

/**
 * Crée un credential Airtable pour l'utilisateur
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createAirtableCredential(userCredentials, userId) {
  logger.debug('Création credential Airtable');
  
  const credentialData = {
    name: `Airtable-${userId}-${Date.now()}`,
    type: 'airtableApi',
    data: {
      apiKey: userCredentials.airtableApiKey
    }
  };
  
  const credential = await createCredentialInN8n(credentialData);
  logger.info('Credential Airtable créé', { credId: credential.id });
  return credential;
}

/**
 * Crée un credential Notion pour l'utilisateur
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createNotionCredential(userCredentials, userId) {
  logger.debug('Création credential Notion');
  
  const credentialData = {
    name: `Notion-${userId}-${Date.now()}`,
    type: 'notionApi',
    data: {
      apiKey: userCredentials.notionApiKey
    }
  };
  
  const credential = await createCredentialInN8n(credentialData);
  logger.info('Credential Notion créé', { credId: credential.id });
  return credential;
}

/**
 * Crée un credential PostgreSQL pour l'utilisateur
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createPostgresCredential(userCredentials, userId) {
  logger.debug('Création credential PostgreSQL');
  
  const credentialData = {
    name: `PostgreSQL-${userId}-${Date.now()}`,
    type: 'postgres',
    data: {
      host: userCredentials.host,
      database: userCredentials.database,
      user: userCredentials.user,
      password: userCredentials.password,
      port: Number(userCredentials.port) || 5432,
      ssl: {
        rejectUnauthorized: false
      }
    }
  };
  
  const credential = await createCredentialInN8n(credentialData);
  logger.info('Credential PostgreSQL créé', { credId: credential.id });
  return credential;
}

module.exports = {
  injectUserCredentials,
  createImapCredential,
  createSmtpCredential,
  createAirtableCredential,
  createNotionCredential,
  createPostgresCredential,
  cleanupUserCredentials
};
