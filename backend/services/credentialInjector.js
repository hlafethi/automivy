// Service pour injecter intelligemment les credentials dans les workflows

const { analyzeWorkflowCredentials, validateFormData } = require('./workflowAnalyzer');
const { getAdminCredentials } = require('./n8nService');

/**
 * Injecte les credentials utilisateur dans un workflow
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template (pour générer un webhook unique)
 * @returns {Object} Workflow avec credentials injectés et webhook unique
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null) {
  console.log('🔧 [CredentialInjector] Injection des credentials utilisateur...');
  console.log('🔧 [CredentialInjector] User ID:', userId);
  console.log('🔧 [CredentialInjector] Template ID:', templateId);
  console.log('🔧 [CredentialInjector] Credentials reçus:', Object.keys(userCredentials));
  
  // Générer un webhook unique pour ce workflow utilisateur
  // Format: workflow-{templateId}-{userId} (sans tirets dans les IDs)
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    const templateIdShort = templateId.replace(/-/g, '').substring(0, 8);
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);
    uniqueWebhookPath = `workflow-${templateIdShort}-${userIdShort}`;
    console.log('🔧 [CredentialInjector] Webhook unique généré:', uniqueWebhookPath);
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
    console.log('📧 [CredentialInjector] Workflow de rapport détecté - SMTP admin sera utilisé automatiquement');
  }
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow);
  console.log('🔧 [CredentialInjector] Credentials requis:', requiredCredentials.length);
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Injecter l'heure dans le Schedule Trigger si fournie
  if (userCredentials.scheduleTime) {
    const scheduleTime = userCredentials.scheduleTime;
    console.log('🕐 [CredentialInjector] Injection de l\'heure dans Schedule Trigger:', scheduleTime);
    
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
      
      console.log('🕐 [CredentialInjector] Expression cron générée:', cronExpression);
      
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
      
      console.log('✅ [CredentialInjector] Schedule Trigger mis à jour avec l\'heure:', scheduleTime);
    } else {
      console.log('⚠️ [CredentialInjector] Aucun Schedule Trigger trouvé malgré scheduleTime fourni');
    }
  }
  
  // Convertir le workflow en string pour remplacer les placeholders (comme dans injectParams)
  let workflowString = JSON.stringify(workflow);
  const createdCredentials = {};
  
  // Récupérer les credentials admin une seule fois au début
  const adminCreds = await getAdminCredentials();
  console.log('🔧 [CredentialInjector] Credentials admin récupérés:', adminCreds);
  console.log('🔧 [CredentialInjector] OpenRouter ID:', adminCreds.OPENROUTER_ID);
  console.log('🔧 [CredentialInjector] OpenRouter Name:', adminCreds.OPENROUTER_NAME);
  
  // Pour les workflows de rapport, créer/récupérer le credential SMTP admin
  if (isReportWorkflow && !adminCreds.SMTP_ID) {
    console.log('📧 [CredentialInjector] Création du credential SMTP admin pour les rapports...');
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
      console.log('✅ [CredentialInjector] Credential SMTP admin créé:', adminCreds.SMTP_ID);
    } catch (error) {
      console.error('❌ [CredentialInjector] Erreur création credential SMTP admin:', error);
    }
  }
  
  if (isReportWorkflow && adminCreds.SMTP_ID) {
    createdCredentials.smtp = {
      id: adminCreds.SMTP_ID,
      name: adminCreds.SMTP_NAME || 'SMTP Admin - admin@heleam.com'
    };
    console.log('✅ [CredentialInjector] Credential SMTP admin utilisé pour workflow de rapport:', createdCredentials.smtp.id);
  }
  
  // Créer les credentials utilisateur
  for (const credConfig of requiredCredentials) {
    if (credConfig.type === 'gmailOAuth2') {
      // Pour Gmail OAuth2, on vérifie si l'utilisateur a déjà un credential OAuth stocké
      const db = require('../database');
      console.log('🔍 [CredentialInjector] Recherche du credential Gmail OAuth2 pour user:', userId);
      
      // Toujours vérifier si l'utilisateur a un credential OAuth dans la base de données
      // Même si le champ gmailOAuth2 n'est pas 'connected', on peut utiliser un credential existant
      const oauthCreds = await db.getOAuthCredentials(userId, 'gmail');
      console.log('🔍 [CredentialInjector] Credentials OAuth trouvés:', oauthCreds?.length || 0);
      
      if (oauthCreds && oauthCreds.length > 0) {
        // Prendre le credential le plus récent (premier de la liste car trié par created_at DESC)
        const latestCred = oauthCreds[0];
        console.log('🔍 [CredentialInjector] Credential OAuth trouvé:', {
          id: latestCred.id,
          email: latestCred.email,
          n8n_credential_id: latestCred.n8n_credential_id,
          created_at: latestCred.created_at
        });
        
        if (latestCred.n8n_credential_id) {
          // Utiliser le credential OAuth existant
          createdCredentials.gmailOAuth2 = {
            id: latestCred.n8n_credential_id,
            name: latestCred.email || 'Gmail OAuth2'
          };
          console.log('✅ [CredentialInjector] Credential Gmail OAuth2 existant trouvé et utilisé:', createdCredentials.gmailOAuth2.id);
        } else {
          console.error('❌ [CredentialInjector] Credential OAuth trouvé mais n8n_credential_id manquant!');
          console.error('❌ [CredentialInjector] Credential OAuth:', JSON.stringify(latestCred, null, 2));
        }
      } else if (userCredentials.gmailOAuth2 === 'connected') {
        // Si l'utilisateur a indiqué qu'il s'est connecté mais aucun credential n'est trouvé
        console.error('❌ [CredentialInjector] Aucun credential OAuth trouvé dans la base de données pour user:', userId);
        console.error('❌ [CredentialInjector] L\'utilisateur a indiqué qu\'il s\'est connecté mais aucun credential n\'est stocké.');
        console.error('❌ [CredentialInjector] Vérifiez que le callback OAuth a bien créé le credential dans la base de données.');
      } else if (userCredentials.gmailOAuth2CredentialId) {
        // Si l'utilisateur a fourni un credential ID directement (depuis le formulaire)
        createdCredentials.gmailOAuth2 = {
          id: userCredentials.gmailOAuth2CredentialId,
          name: userCredentials.gmailOAuth2CredentialName || 'Gmail OAuth2'
        };
        console.log('✅ [CredentialInjector] Credential Gmail OAuth2 fourni directement par l\'utilisateur:', createdCredentials.gmailOAuth2.id);
      } else {
        // Si aucun credential OAuth n'est disponible, on garde celui du template (si présent)
        // L'utilisateur devra se connecter manuellement via OAuth dans n8n
        console.log('⚠️ [CredentialInjector] Aucun credential Gmail OAuth2 trouvé. Le credential du template sera conservé.');
        console.log('⚠️ [CredentialInjector] userCredentials.gmailOAuth2:', userCredentials.gmailOAuth2);
        console.log('⚠️ [CredentialInjector] L\'utilisateur devra se connecter via OAuth dans n8n après le déploiement.');
      }
    }
    
    if (credConfig.type === 'imap') {
      const imapCred = await createImapCredential(userCredentials, userId);
      createdCredentials.imap = imapCred;
      console.log('✅ [CredentialInjector] Credential IMAP créé:', imapCred.id);
    }
    
    if (credConfig.type === 'smtp') {
      // Créer le credential SMTP natif dans n8n avec SSL/TLS
      const smtpCred = await createSmtpCredential(userCredentials, userId);
      createdCredentials.smtp = smtpCred;
      console.log('✅ [CredentialInjector] Credential SMTP natif créé:', smtpCred.id);
    }
  }
  
  // Remplacer les placeholders OpenRouter dans la string AVANT de parser (comme dans injectParams)
  if (adminCreds.OPENROUTER_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_PLACEHOLDER"/g,
      JSON.stringify({ id: adminCreds.OPENROUTER_ID, name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin' })
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_ID"/g,
      adminCreds.OPENROUTER_ID
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_NAME"/g,
      adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
    );
    console.log('✅ [CredentialInjector] Placeholders OpenRouter remplacés dans workflowString');
  }
  
  // Parser le workflow après remplacement des placeholders
  const injectedWorkflow = JSON.parse(workflowString);
  
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
        } else {
          // Remplacer le path existant par le webhook unique
          cleanedNode.parameters.path = uniqueWebhookPath;
        }
        // Le webhookId est généré automatiquement par n8n, mais on peut le définir si nécessaire
        if (node.webhookId) {
          cleanedNode.webhookId = node.webhookId;
        }
        console.log(`✅ [CredentialInjector] Webhook unique assigné à ${node.name}: ${uniqueWebhookPath}`);
      }
      
      // Configuration automatique des credentials selon le type de nœud (comme dans injectParams)
      if (node.type === 'n8n-nodes-base.openAi' || 
          node.type === 'n8n-nodes-base.openAiChatModel' ||
          node.type === 'n8n-nodes-base.openAiEmbedding' ||
          node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
          node.name?.toLowerCase().includes('openrouter') ||
          node.name?.toLowerCase().includes('llm') ||
          node.name?.toLowerCase().includes('ai')) {
        // Nœud LLM/AI - utiliser le credential OpenRouter
        if (adminCreds.OPENROUTER_ID) {
          cleanedNode.credentials = {
            openRouterApi: {
              id: adminCreds.OPENROUTER_ID,
              name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
            }
          };
          console.log(`✅ [CredentialInjector] Credential OpenRouter assigné automatiquement à ${node.name}: ${adminCreds.OPENROUTER_ID}`);
        }
      } else if (node.type === 'n8n-nodes-base.emailSend' || 
                 node.type === 'n8n-nodes-base.smtp' ||
                 node.name?.toLowerCase().includes('smtp') ||
                 node.name?.toLowerCase().includes('email')) {
        // Nœud SMTP - utiliser le credential SMTP (admin pour rapports, utilisateur sinon)
        if (createdCredentials.smtp) {
          cleanedNode.credentials = {
            smtp: {
              id: createdCredentials.smtp.id,
              name: createdCredentials.smtp.name
            }
          };
          console.log(`✅ [CredentialInjector] Credential SMTP assigné à ${node.name}: ${createdCredentials.smtp.id}`);
        } else if (isReportWorkflow && adminCreds.SMTP_ID) {
          // Pour les workflows de rapport, utiliser SMTP admin même si pas dans createdCredentials
          cleanedNode.credentials = {
            smtp: {
              id: adminCreds.SMTP_ID,
              name: adminCreds.SMTP_NAME || 'SMTP Admin - admin@heleam.com'
            }
          };
          console.log(`✅ [CredentialInjector] Credential SMTP admin assigné automatiquement à ${node.name}: ${adminCreds.SMTP_ID}`);
        }
      } else if (node.type === 'n8n-nodes-base.gmail') {
        // Nœud Gmail - utiliser Gmail OAuth2 si disponible, sinon conserver celui du template
        if (createdCredentials.gmailOAuth2) {
          cleanedNode.credentials = {
            gmailOAuth2: {
              id: createdCredentials.gmailOAuth2.id,
              name: createdCredentials.gmailOAuth2.name
            }
          };
          console.log(`✅ [CredentialInjector] Credential Gmail OAuth2 assigné à ${node.name}: ${createdCredentials.gmailOAuth2.id}`);
        } else {
          // Conserver le credential du template si présent
          if (node.credentials && node.credentials.gmailOAuth2) {
            console.log(`⚠️ [CredentialInjector] Credential Gmail OAuth2 du template conservé pour ${node.name}`);
            cleanedNode.credentials = {
              gmailOAuth2: node.credentials.gmailOAuth2
            };
          } else {
            console.error(`❌ [CredentialInjector] Aucun credential disponible pour ${node.name} (type: ${node.type})`);
          }
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
          console.log(`✅ [CredentialInjector] Credential IMAP assigné à ${node.name} (type: ${node.type}): ${createdCredentials.imap.id}`);
        } else {
          console.error(`❌ [CredentialInjector] Nœud IMAP ${node.name} (type: ${node.type}) sans credential IMAP`);
          console.error(`❌ [CredentialInjector] createdCredentials.imap:`, createdCredentials.imap);
        }
      } else if (node.credentials && Object.keys(node.credentials).length > 0) {
        // Pour les autres nœuds, remplacer les placeholders dans les credentials existants
        const updatedCredentials = {};
        Object.entries(node.credentials).forEach(([credType, credValue]) => {
          if (credType === 'gmailOAuth2' && createdCredentials.gmailOAuth2) {
            updatedCredentials[credType] = {
              id: createdCredentials.gmailOAuth2.id,
              name: createdCredentials.gmailOAuth2.name
            };
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
          } else if (credType === 'openRouterApi' && adminCreds.OPENROUTER_ID) {
            // Si le placeholder a été remplacé dans la string, utiliser la valeur existante
            // Sinon, assigner le credential admin
            if (typeof credValue === 'object' && credValue.id && credValue.id !== 'ADMIN_OPENROUTER_CREDENTIAL_ID') {
              updatedCredentials[credType] = credValue;
            } else {
              updatedCredentials[credType] = {
                id: adminCreds.OPENROUTER_ID,
                name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
              };
            }
          } else {
            updatedCredentials[credType] = credValue;
          }
        });
        cleanedNode.credentials = updatedCredentials;
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
  
  console.log('✅ [CredentialInjector] Injection terminée avec succès');
  console.log('✅ [CredentialInjector] Nombre de nœuds:', cleanedWorkflow.nodes?.length);
  console.log('✅ [CredentialInjector] Nombre de connexions:', Object.keys(cleanedWorkflow.connections || {}).length);
  console.log('✅ [CredentialInjector] Noms des nœuds:', cleanedWorkflow.nodes?.map(n => n.name).join(', '));
  
  // Vérifier que tous les nœuds ont des IDs
  const nodesWithoutId = cleanedWorkflow.nodes?.filter(n => !n.id);
  if (nodesWithoutId && nodesWithoutId.length > 0) {
    console.warn('⚠️ [CredentialInjector] Certains nœuds n\'ont pas d\'ID:', nodesWithoutId.map(n => n.name));
  }
  
  // Retourner le workflow et le webhook path pour stockage en base de données
  return {
    workflow: cleanedWorkflow,
    webhookPath: uniqueWebhookPath
  };
}

/**
 * Crée un credential IMAP pour l'utilisateur
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createImapCredential(userCredentials, userId) {
  console.log('🔍 [CredentialInjector] DEBUG - Credentials reçus pour IMAP:');
  console.log('  - userCredentials.email:', userCredentials.email);
  console.log('  - userCredentials.imapPassword:', userCredentials.imapPassword);
  console.log('  - userCredentials.imapPassword type:', typeof userCredentials.imapPassword);
  console.log('  - userCredentials.imapPassword length:', userCredentials.imapPassword?.length);
  console.log('  - userCredentials.imapServer:', userCredentials.imapServer);
  console.log('  - userCredentials.imapPort:', userCredentials.imapPort);
  console.log('  - userCredentials.imapPassword COMPLET:', JSON.stringify(userCredentials.imapPassword));
  
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
  
  console.log('🔧 [CredentialInjector] Création credential IMAP:', credentialData.name);
  console.log('🔧 [CredentialInjector] Données IMAP finales:', {
    user: credentialData.data.user,
    host: credentialData.data.host,
    port: credentialData.data.port,
    secure: credentialData.data.secure,
    passwordLength: credentialData.data.password?.length,
    passwordPreview: credentialData.data.password ? credentialData.data.password.substring(0, 2) + '***' : 'UNDEFINED'
  });
  
  // Créer le credential IMAP via le proxy backend
  try {
    console.log('🔧 [CredentialInjector] Création credential IMAP via proxy...');
    
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
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
    console.log('✅ [CredentialInjector] Credential IMAP créé via proxy:', credential.id);
    
    return credential;
  } catch (error) {
    console.error('❌ [CredentialInjector] Erreur création credential IMAP via proxy:', error);
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
    console.log('🚨🚨🚨 [CredentialInjector] ========================================== 🚨🚨🚨');
    console.log('🚨🚨🚨 [CredentialInjector] CRÉATION CREDENTIAL SMTP DÉMARRÉE 🚨🚨🚨');
    console.log('🚨🚨🚨 [CredentialInjector] ========================================== 🚨🚨🚨');
    console.log('🔧 [CredentialInjector] Création credential SMTP natif avec SSL/TLS...');
    console.log('🔧 [CredentialInjector] User credentials reçus:', {
      smtpPort: userCredentials.smtpPort,
      smtpPortType: typeof userCredentials.smtpPort,
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

    console.log('📤 [CredentialInjector] Payload SMTP natif:', JSON.stringify(smtpCredentialData, null, 2));
    console.log('🔍 [CredentialInjector] DEBUG - Port type:', typeof smtpCredentialData.data.port);
    console.log('🔍 [CredentialInjector] DEBUG - Port value:', smtpCredentialData.data.port);
    console.log('🔍 [CredentialInjector] DEBUG - User credentials smtpPort:', userCredentials.smtpPort);
    console.log('🔍 [CredentialInjector] DEBUG - User credentials smtpPort type:', typeof userCredentials.smtpPort);
    console.log('🔍 [CredentialInjector] DEBUG - Number conversion result:', Number(userCredentials.smtpPort));
    console.log('🔍 [CredentialInjector] DEBUG - Number conversion type:', typeof Number(userCredentials.smtpPort));
    console.log('🔍 [CredentialInjector] DEBUG - isNaN check:', isNaN(Number(userCredentials.smtpPort)));
    console.log('🔍 [CredentialInjector] DEBUG - Final port value:', Number(userCredentials.smtpPort) || 465);

    console.log('🔧 [CredentialInjector] Envoi de la requête à n8n...');
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smtpCredentialData),
    });

    console.log('📋 [CredentialInjector] Réponse n8n:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ [CredentialInjector] Erreur détaillée:', errorText);
      throw new Error(`Erreur création credential SMTP: ${response.status} - ${errorText}`);
    }

    const credential = await response.json();
    console.log('✅ [CredentialInjector] Credential SMTP natif créé:', credential.id);
    console.log('📋 [CredentialInjector] Détails credential créé:', {
      id: credential.id,
      name: credential.name,
      type: credential.type
    });
    
    return credential;
  } catch (error) {
    console.error('❌ [CredentialInjector] Erreur création credential SMTP natif:', error);
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
    console.log('🔍 [CredentialInjector] DEBUG - Envoi à n8n:');
    console.log('  - Type:', credentialData.type);
    console.log('  - Name:', credentialData.name);
    console.log('  - Data keys:', Object.keys(credentialData.data));
    console.log('  - Password length:', credentialData.data.password?.length);
    console.log('  - Password preview:', credentialData.data.password ? credentialData.data.password.substring(0, 2) + '***' : 'UNDEFINED');
    console.log('  - Password COMPLET:', JSON.stringify(credentialData.data.password));
    
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentialData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ [CredentialInjector] Erreur API n8n:', error);
      throw new Error(`Erreur création credential: ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ [CredentialInjector] Credential créé dans n8n:', result.id);
    console.log('✅ [CredentialInjector] Credential name:', result.name);
    return result;
    
  } catch (error) {
    console.error('❌ [CredentialInjector] Erreur création credential:', error);
    throw error;
  }
}

/**
 * Nettoie les credentials utilisateur (supprime les credentials temporaires)
 * @param {Object} createdCredentials - Credentials créés
 */
async function cleanupUserCredentials(createdCredentials) {
  console.log('🧹 [CredentialInjector] Nettoyage des credentials...');
  
  for (const [type, cred] of Object.entries(createdCredentials)) {
    try {
      await fetch(`http://localhost:3004/api/n8n/credentials/${cred.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log(`✅ [CredentialInjector] Credential ${type} supprimé`);
    } catch (error) {
      console.error(`❌ [CredentialInjector] Erreur suppression credential ${type}:`, error);
    }
  }
}

module.exports = {
  injectUserCredentials,
  createImapCredential,
  createSmtpCredential,
  cleanupUserCredentials
};
