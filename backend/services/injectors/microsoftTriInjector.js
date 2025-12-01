// Injecteur spécifique pour le template "Microsoft Tri Automatique BAL"
// Ce template nécessite :
// - Microsoft Outlook OAuth2 pour tous les nœuds Microsoft Outlook (lecture emails, création dossiers, déplacement emails)
// - SMTP admin pour l'envoi du rapport

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials } = require('../n8nService');
const db = require('../../database');

/**
 * Injecte les credentials utilisateur pour le template Microsoft Tri Automatique
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  console.log('🎯 [MicrosoftTriInjector] Injection spécifique pour Microsoft Tri Automatique BAL...');
  console.log('🎯 [MicrosoftTriInjector] Template ID:', templateId);
  console.log('🎯 [MicrosoftTriInjector] Template Name:', templateName);
  
  // Nettoyer le nom du template pour les noms de credentials
  const cleanTemplateName = templateName 
    ? templateName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40)
    : null;
  
  // Générer un webhook unique
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    const templateIdShort = templateId.replace(/-/g, '').substring(0, 8);
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);
    uniqueWebhookPath = `workflow-${templateIdShort}-${userIdShort}`;
    console.log('🔧 [MicrosoftTriInjector] Webhook unique généré:', uniqueWebhookPath);
  }
  
  // Analyser les credentials requis
  let requiredCredentials = analyzeWorkflowCredentials(workflow);
  console.log('🔧 [MicrosoftTriInjector] Credentials requis (avant filtrage):', requiredCredentials.length);
  
  // ⚠️ IMPORTANT: Exclure SMTP des credentials requis car on utilise toujours SMTP admin
  requiredCredentials = requiredCredentials.filter(cred => cred.type !== 'smtp');
  console.log('🔧 [MicrosoftTriInjector] Credentials requis (après filtrage SMTP):', requiredCredentials.length);
  console.log('🔧 [MicrosoftTriInjector] SMTP exclu - utilisation du credential SMTP admin automatique');
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  const createdCredentials = {};
  
  // Récupérer les credentials admin
  console.log('🔍 [MicrosoftTriInjector] Appel de getAdminCredentials()...');
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    console.log('✅ [MicrosoftTriInjector] getAdminCredentials() terminé');
  } catch (error) {
    console.error('❌ [MicrosoftTriInjector] Erreur lors de l\'appel à getAdminCredentials():', error.message);
    console.error('❌ [MicrosoftTriInjector] Stack:', error.stack);
  }
  
  // ⚠️ IMPORTANT: Pour ce template, utiliser le credential SMTP ADMIN pour les nœuds emailSend
  console.log('🔍 [MicrosoftTriInjector] Vérification credential SMTP admin...');
  if (adminCreds.SMTP_ID) {
    createdCredentials.smtp = {
      id: adminCreds.SMTP_ID,
      name: adminCreds.SMTP_NAME || 'SMTP Admin'
    };
    console.log('✅ [MicrosoftTriInjector] Credential SMTP admin trouvé et utilisé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
  } else {
    // ⚠️ IMPORTANT: Si le credential SMTP admin n'est pas trouvé, le créer
    console.log('⚠️ [MicrosoftTriInjector] Credential SMTP admin non trouvé, création...');
    const config = require('../../config');
    const { createCredential } = require('../n8nService');
    
    const userEmail = userCredentials.email || '';
    const templateNamePart = cleanTemplateName ? `-${cleanTemplateName}` : '';
    const userEmailPart = userEmail ? `-${userEmail}` : '';
    const smtpCredentialName = `SMTP Admin - admin@heleam.com${templateNamePart}${userEmailPart}`;
    
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
      console.log('✅ [MicrosoftTriInjector] Credential SMTP admin créé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
    } catch (error) {
      console.error('❌ [MicrosoftTriInjector] Erreur création credential SMTP admin:', error);
      throw new Error('Impossible de créer le credential SMTP admin. Vérifiez la configuration SMTP dans config.js.');
    }
  }
  
  // Créer les credentials utilisateur selon les besoins spécifiques de ce template
  for (const credConfig of requiredCredentials) {
    if (credConfig.type === 'microsoftOutlookOAuth2') {
      // Pour Microsoft Outlook OAuth2, récupérer le credential depuis la base de données
      console.log('🔍 [MicrosoftTriInjector] Recherche du credential Microsoft Outlook OAuth2 pour user:', userId);
      const oauthCreds = await db.getOAuthCredentials(userId, 'microsoft');
      console.log('🔍 [MicrosoftTriInjector] Credentials OAuth trouvés dans la BDD:', oauthCreds?.length || 0);
      
      if (oauthCreds && oauthCreds.length > 0 && oauthCreds[0].n8n_credential_id) {
        createdCredentials.microsoftOutlookOAuth2 = {
          id: oauthCreds[0].n8n_credential_id,
          name: `Microsoft Outlook - ${oauthCreds[0].email || 'user'} - ${userId.substring(0, 8)}`
        };
        console.log('✅ [MicrosoftTriInjector] Credential Microsoft Outlook OAuth2 récupéré depuis la BDD:', createdCredentials.microsoftOutlookOAuth2.id);
      } else {
        console.error('❌ [MicrosoftTriInjector] Aucun credential Microsoft Outlook OAuth2 trouvé dans la BDD pour cet utilisateur');
        console.error('❌ [MicrosoftTriInjector] L\'utilisateur doit se connecter via OAuth AVANT de déployer ce workflow.');
        throw new Error('Aucun credential Microsoft Outlook OAuth2 trouvé. Veuillez vous connecter via OAuth avant de déployer ce workflow.');
      }
    }
    
    // ⚠️ IMPORTANT: Pour le template Microsoft Tri, on n'utilise PAS IMAP
    // Tous les nœuds utilisent Microsoft Outlook OAuth2 uniquement
    if (credConfig.type === 'imap') {
      console.log('⏭️ [MicrosoftTriInjector] IMAP ignoré - ce template utilise uniquement Microsoft Outlook OAuth2');
    }
    
    // ⚠️ NE PAS créer de credential SMTP utilisateur - utiliser SMTP admin
    if (credConfig.type === 'smtp') {
      console.log('⏭️ [MicrosoftTriInjector] SMTP ignoré - utilisation du credential SMTP admin');
    }
  }
  
  // Remplacer les placeholders OpenRouter si nécessaire
  if (adminCreds.OPENROUTER_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_PLACEHOLDER"/g,
      JSON.stringify({ id: adminCreds.OPENROUTER_ID, name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin' })
    );
  }
  
  // ⚠️ CRITIQUE: Remplacer les placeholders Microsoft Outlook OAuth dans la string JSON AVANT le parsing
  if (createdCredentials.microsoftOutlookOAuth2 && createdCredentials.microsoftOutlookOAuth2.id) {
    console.log('🔧 [MicrosoftTriInjector] Remplacement des placeholders Microsoft Outlook OAuth dans la string JSON...');
    const newCredId = createdCredentials.microsoftOutlookOAuth2.id;
    const newCredName = createdCredentials.microsoftOutlookOAuth2.name;
    
    // Remplacer le placeholder MICROSOFT_OUTLOOK_OAUTH_PLACEHOLDER
    const placeholderPattern = /"MICROSOFT_OUTLOOK_OAUTH_PLACEHOLDER"/g;
    workflowString = workflowString.replace(placeholderPattern, JSON.stringify({ id: newCredId, name: newCredName }));
    
    // Remplacer aussi les anciens credentials Microsoft Outlook si présents
    const oldCredentialIds = [
      '20Ey0YfZ1aiPx4Sa'
    ];
    
    oldCredentialIds.forEach(oldId => {
      const escapedOldId = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedNewId = newCredId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedNewName = newCredName.replace(/"/g, '\\"');
      
      const pattern = new RegExp(`("microsoftOutlookOAuth2Api"\\s*:\\s*\\{[\\s\\S]*?"id"\\s*:\\s*")${escapedOldId}([\\s\\S]*?"name"\\s*:\\s*")[^"]*(")`, 'g');
      let count = 0;
      workflowString = workflowString.replace(pattern, (match, p1, p2, p3) => {
        count++;
        return `${p1}${escapedNewId}${p2}${escapedNewName}${p3}`;
      });
      if (count > 0) {
        console.log(`  ✅ [MicrosoftTriInjector] ${count} occurrence(s) de l'ancien credential Microsoft Outlook ${oldId} remplacée(s) par ${newCredId}`);
      }
    });
  }
  
  // Remplacer le placeholder webhook (échapper correctement pour JSON)
  if (uniqueWebhookPath) {
    // Le placeholder dans le template est 'WEBHOOK_PATH_PLACEHOLDER' qui devient "WEBHOOK_PATH_PLACEHOLDER" dans le JSON
    // On doit remplacer dans le contexte: "path":"WEBHOOK_PATH_PLACEHOLDER" -> "path":"workflow-xxx"
    const escapedWebhookPath = JSON.stringify(uniqueWebhookPath);
    // Remplacer le placeholder avec guillemets (format JSON normal)
    workflowString = workflowString.replace(/"WEBHOOK_PATH_PLACEHOLDER"/g, escapedWebhookPath);
    // Remplacer aussi dans le contexte "path":"WEBHOOK_PATH_PLACEHOLDER" au cas où
    workflowString = workflowString.replace(/"path"\s*:\s*"WEBHOOK_PATH_PLACEHOLDER"/g, `"path":${escapedWebhookPath}`);
  }
  
  // Parser le workflow
  let injectedWorkflow;
  try {
    injectedWorkflow = JSON.parse(workflowString);
    
    // ⚠️ VÉRIFICATION: Vérifier que les paramètres des nœuds Microsoft Outlook sont préservés
    const outlookNodesAfterParse = injectedWorkflow.nodes?.filter(n => n.type === 'n8n-nodes-base.microsoftOutlook') || [];
    console.log(`🔍 [MicrosoftTriInjector] Vérification des paramètres après parsing JSON: ${outlookNodesAfterParse.length} nœud(s) Microsoft Outlook`);
    outlookNodesAfterParse.forEach((node, i) => {
      console.log(`  Nœud ${i + 1}: ${node.name}`);
      console.log(`    - Resource: ${node.parameters?.resource || 'MANQUANT'}`);
      console.log(`    - Operation: ${node.parameters?.operation || 'MANQUANT'}`);
      console.log(`    - FolderId: ${node.parameters?.folderId ? JSON.stringify(node.parameters.folderId) : 'MANQUANT'}`);
      console.log(`    - Folder: ${node.parameters?.folder || 'MANQUANT'}`);
      console.log(`    - ReturnAll: ${node.parameters?.returnAll !== undefined ? node.parameters.returnAll : 'MANQUANT'}`);
      console.log(`    - Limit: ${node.parameters?.limit || 'MANQUANT'}`);
    });
  } catch (parseError) {
    console.error('❌ [MicrosoftTriInjector] Erreur parsing JSON après remplacement des placeholders:');
    console.error('❌ [MicrosoftTriInjector] Erreur:', parseError.message);
    console.error('❌ [MicrosoftTriInjector] Position de l\'erreur:', parseError.message.match(/position (\d+)/)?.[1] || 'inconnue');
    // Afficher un extrait du JSON autour de l'erreur pour debug
    const errorPos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
    if (errorPos > 0) {
      const start = Math.max(0, errorPos - 100);
      const end = Math.min(workflowString.length, errorPos + 100);
      console.error('❌ [MicrosoftTriInjector] Extrait du JSON autour de l\'erreur:');
      console.error(workflowString.substring(start, end));
    }
    throw new Error(`Erreur parsing JSON du workflow après injection: ${parseError.message}`);
  }
  
  // Récupérer l'email de l'utilisateur pour le rapport
  const userEmail = userCredentials.email || '';
  
  // ⚠️ CRITIQUE: Vérifier que le credential Microsoft Outlook OAuth2 a bien été créé avant d'injecter
  if (!createdCredentials.microsoftOutlookOAuth2 || !createdCredentials.microsoftOutlookOAuth2.id) {
    console.error('❌ [MicrosoftTriInjector] ERREUR CRITIQUE: Aucun credential Microsoft Outlook OAuth2 créé!');
    throw new Error('Le credential Microsoft Outlook OAuth2 n\'a pas été créé. L\'utilisateur doit se connecter via OAuth avant de déployer ce workflow.');
  }
  
  console.log('✅ [MicrosoftTriInjector] Credential Microsoft Outlook OAuth2 créé et prêt à être injecté:', createdCredentials.microsoftOutlookOAuth2.id);
  
  // ⚠️ CRITIQUE: Modifier le code JavaScript pour gérer le cas où aucun email n'est trouvé
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map((node) => {
      if (node.name === 'Normaliser Emails2' && node.type === 'n8n-nodes-base.code') {
        const originalCode = node.parameters.jsCode || '';
        
        let modifiedCode = originalCode.replace(
          /if\s*\(!items\s*\|\|\s*items\.length\s*===\s*0\)\s*\{[\s\S]*?return\s*\[\];[\s\\S]*?\}/g,
          `if (!items || items.length === 0) {
  console.log('❌ Aucun email reçu');
  return [{ json: { skip: true, message: 'Aucun email à traiter', emails: [] } }];
}`
        );
        
        modifiedCode = modifiedCode.replace(
          /if\s*\(emails\.length\s*===\s*0\)\s*\{[\s\S]*?return\s*\[\];[\s\S]*?\}/g,
          `if (emails.length === 0) {
  console.log('⚠️ Aucun email valide à traiter');
  return [{ json: { skip: true, message: 'Aucun email valide à traiter', emails: [] } }];
}`
        );
        
        if (modifiedCode !== originalCode) {
          node.parameters.jsCode = modifiedCode;
          console.log('✅ [MicrosoftTriInjector] Code "Normaliser Emails2" modifié pour gérer le cas sans emails');
        }
      }
      
      return node;
    });
  }
  
  // Injecter les credentials dans les nœuds selon les règles spécifiques de ce template
  if (injectedWorkflow.nodes) {
    console.log(`🔍 [MicrosoftTriInjector] Traitement de ${injectedWorkflow.nodes.length} nœuds pour injection des credentials...`);
    
    const microsoftNodesBefore = injectedWorkflow.nodes.filter(n => 
      n.type === 'n8n-nodes-base.microsoftOutlook'
    );
    console.log(`🔍 [MicrosoftTriInjector] ${microsoftNodesBefore.length} nœud(s) Microsoft Outlook trouvé(s) avant traitement:`);
    microsoftNodesBefore.forEach(n => {
      const cred = n.credentials?.microsoftOutlookOAuth2Api;
      console.log(`  - ${n.name}: type=${n.type}, credential=${cred?.id || 'aucun'}`);
    });
    
    // Identifier les nœuds Microsoft Outlook selon leur fonction
    const outlookNodes = injectedWorkflow.nodes?.filter(n => n.type === 'n8n-nodes-base.microsoftOutlook') || [];
    
    // Nœud 1: "Get many folder messages" - Lit les emails lus depuis INBOX
    const firstOutlookNode = outlookNodes.find(n => 
      n.name === 'Get many folder messages' || 
      (n.parameters?.resource === 'folderMessage' && !n.name?.includes('1') && !n.name?.includes('2'))
    );
    
    // Nœud 2: "Get many folder messages1" - Vérifie aussi depuis INBOX
    const secondOutlookNode = outlookNodes.find(n => 
      n.name === 'Get many folder messages1' || 
      (n.parameters?.resource === 'folderMessage' && n.name?.includes('1'))
    );
    
    // Nœud 3: "Create a folder" - Crée des dossiers s'ils n'existent pas
    const createFolderNode = outlookNodes.find(n => 
      n.name === 'Create a folder' || 
      n.parameters?.resource === 'folder'
    );
    
    // Nœud 4: "Get many folder messages2" - Vérifie tous les dossiers
    const checkFoldersNode = outlookNodes.find(n => 
      n.name === 'Get many folder messages2' || 
      (n.parameters?.resource === 'folderMessage' && n.name?.includes('2'))
    );
    
    // Nœud 5: "Move a message" - Déplace les messages vers les bons dossiers
    const moveMessageNode = outlookNodes.find(n => 
      n.name === 'Move a message' || 
      n.parameters?.operation === 'move'
    );
    
    injectedWorkflow.nodes = injectedWorkflow.nodes.map((node, index) => {
      const cleanedNode = JSON.parse(JSON.stringify(node));
      const isFirstOutlookNode = firstOutlookNode && node.id === firstOutlookNode.id;
      const isSecondOutlookNode = secondOutlookNode && node.id === secondOutlookNode.id;
      const isCreateFolderNode = createFolderNode && node.id === createFolderNode.id;
      const isCheckFoldersNode = checkFoldersNode && node.id === checkFoldersNode.id;
      const isMoveMessageNode = moveMessageNode && node.id === moveMessageNode.id;
      
      // Tous les nœuds Microsoft Outlook utilisent le credential Microsoft Outlook OAuth2 utilisateur
      if (node.type === 'n8n-nodes-base.microsoftOutlook') {
        console.log(`🔍 [MicrosoftTriInjector] Traitement du nœud Microsoft Outlook: ${node.name} (type: ${node.type})`);
        
        const oldCredId = node.credentials?.microsoftOutlookOAuth2Api?.id || 'aucun';
        const oldCredName = node.credentials?.microsoftOutlookOAuth2Api?.name || 'aucun';
        
        // ⚠️ IMPORTANT: Préserver tous les paramètres existants (folder, resource, operation, etc.)
        // La copie profonde avec JSON.parse(JSON.stringify(node)) devrait déjà préserver les paramètres
        // Mais on s'assure que cleanedNode.parameters existe
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = node.parameters || {};
        } else {
          // S'assurer que tous les paramètres du nœud original sont préservés
          if (node.parameters) {
            Object.keys(node.parameters).forEach(key => {
              if (!(key in cleanedNode.parameters)) {
                cleanedNode.parameters[key] = node.parameters[key];
              }
            });
          }
        }
        
        // ⚠️ CRITIQUE: Configurer automatiquement chaque nœud selon sa fonction
        
        // Nœud 1: Lit les emails lus depuis INBOX
        if (isFirstOutlookNode && cleanedNode.parameters?.resource === 'folderMessage') {
          console.log(`🔧 [MicrosoftTriInjector] Configuration du nœud 1 (lecture emails lus INBOX): ${node.name}`);
          
          // Configurer pour lire depuis INBOX
          if (!cleanedNode.parameters.folderId || 
              (typeof cleanedNode.parameters.folderId === 'object' && !cleanedNode.parameters.folderId.value) ||
              (typeof cleanedNode.parameters.folderId === 'string' && cleanedNode.parameters.folderId === '')) {
            cleanedNode.parameters.folderId = {
              __rl: true,
              mode: 'list',
              value: 'inbox'
            };
            console.log(`✅ [MicrosoftTriInjector] folderId configuré pour INBOX`);
          }
          
          // Filtrer uniquement les emails lus
          if (!cleanedNode.parameters.options) {
            cleanedNode.parameters.options = {};
          }
          cleanedNode.parameters.options.filter = 'isRead eq true';
          
          if (!cleanedNode.parameters.filters) {
            cleanedNode.parameters.filters = {};
          }
          cleanedNode.parameters.filters.isRead = true;
          
          if (!cleanedNode.parameters.limit) {
            cleanedNode.parameters.limit = 100;
          }
          
          console.log(`✅ [MicrosoftTriInjector] Nœud 1 configuré: INBOX, emails lus uniquement`);
        }
        
        // Nœud 2: Vérifie aussi depuis INBOX (pour les dossiers)
        if (isSecondOutlookNode && cleanedNode.parameters?.resource === 'folderMessage') {
          console.log(`🔧 [MicrosoftTriInjector] Configuration du nœud 2 (vérification INBOX): ${node.name}`);
          
          // Configurer pour lire depuis INBOX
          if (!cleanedNode.parameters.folderId || 
              (typeof cleanedNode.parameters.folderId === 'object' && !cleanedNode.parameters.folderId.value) ||
              (typeof cleanedNode.parameters.folderId === 'string' && cleanedNode.parameters.folderId === '')) {
            cleanedNode.parameters.folderId = {
              __rl: true,
              mode: 'list',
              value: 'inbox'
            };
            console.log(`✅ [MicrosoftTriInjector] folderId configuré pour INBOX`);
          }
          
          // Filtrer uniquement les emails lus
          if (!cleanedNode.parameters.options) {
            cleanedNode.parameters.options = {};
          }
          cleanedNode.parameters.options.filter = 'isRead eq true';
          
          if (!cleanedNode.parameters.limit) {
            cleanedNode.parameters.limit = 100;
          }
          
          console.log(`✅ [MicrosoftTriInjector] Nœud 2 configuré: INBOX, emails lus uniquement`);
        }
        
        // Nœud 3: Crée des dossiers s'ils n'existent pas
        if (isCreateFolderNode && cleanedNode.parameters?.resource === 'folder') {
          console.log(`🔧 [MicrosoftTriInjector] Configuration du nœud 3 (création dossiers): ${node.name}`);
          
          // Le nœud "Create a folder" doit être configuré pour créer des dossiers
          // Les paramètres seront définis dynamiquement par le workflow (nom du dossier depuis le code JavaScript)
          // On s'assure juste que les paramètres de base sont présents
          if (!cleanedNode.parameters.displayName) {
            // Le displayName sera défini dynamiquement depuis le code JavaScript précédent
            console.log(`ℹ️ [MicrosoftTriInjector] displayName sera défini dynamiquement par le workflow`);
          }
          
          console.log(`✅ [MicrosoftTriInjector] Nœud 3 configuré: création de dossiers`);
        }
        
        // Nœud 4: Vérifie tous les dossiers
        if (isCheckFoldersNode && cleanedNode.parameters?.resource === 'folderMessage') {
          console.log(`🔧 [MicrosoftTriInjector] Configuration du nœud 4 (vérification tous dossiers): ${node.name}`);
          
          // Ce nœud vérifie les dossiers créés, donc folderId sera défini dynamiquement
          // On s'assure juste que la structure est correcte
          if (!cleanedNode.parameters.folderId) {
            cleanedNode.parameters.folderId = {
              __rl: true,
              mode: 'list',
              value: '' // Sera défini dynamiquement par le workflow
            };
          }
          
          if (!cleanedNode.parameters.limit) {
            cleanedNode.parameters.limit = 100;
          }
          
          console.log(`✅ [MicrosoftTriInjector] Nœud 4 configuré: vérification tous dossiers (folderId dynamique)`);
        }
        
        // Nœud 5: Déplace les messages vers les bons dossiers
        if (isMoveMessageNode && cleanedNode.parameters?.operation === 'move') {
          console.log(`🔧 [MicrosoftTriInjector] Configuration du nœud 5 (déplacement messages): ${node.name}`);
          
          // Le nœud "Move a message" doit avoir messageId et folderId
          // Ces paramètres seront définis dynamiquement par le workflow
          if (!cleanedNode.parameters.messageId) {
            cleanedNode.parameters.messageId = {
              __rl: true,
              mode: 'list',
              value: '' // Sera défini dynamiquement
            };
          }
          
          if (!cleanedNode.parameters.folderId) {
            cleanedNode.parameters.folderId = {
              __rl: true,
              mode: 'list',
              value: '' // Sera défini dynamiquement
            };
          }
          
          console.log(`✅ [MicrosoftTriInjector] Nœud 5 configuré: déplacement messages (paramètres dynamiques)`);
        }
        
        // Log des paramètres existants pour debug
        console.log(`🔍 [MicrosoftTriInjector] Paramètres existants pour ${node.name}:`, {
          resource: cleanedNode.parameters.resource,
          operation: cleanedNode.parameters.operation,
          folder: cleanedNode.parameters.folder,
          folderId: cleanedNode.parameters.folderId,
          returnAll: cleanedNode.parameters.returnAll,
          limit: cleanedNode.parameters.limit,
          messageId: cleanedNode.parameters.messageId
        });
        
        // Assigner le credential Microsoft Outlook OAuth2
        cleanedNode.credentials = {
          microsoftOutlookOAuth2Api: {
            id: createdCredentials.microsoftOutlookOAuth2.id,
            name: createdCredentials.microsoftOutlookOAuth2.name
          }
        };
        
        console.log(`✅ [MicrosoftTriInjector] Credential Microsoft Outlook OAuth2 assigné à ${node.name}:`);
        console.log(`  - Ancien (template): ${oldCredId} (${oldCredName})`);
        console.log(`  - Nouveau (créé): ${createdCredentials.microsoftOutlookOAuth2.id} (${createdCredentials.microsoftOutlookOAuth2.name})`);
        
        // ⚠️ IMPORTANT: S'assurer que folderId est préservé et correctement formaté
        // Si folderId existe mais est vide, on le préserve tel quel (l'utilisateur devra le sélectionner dans n8n)
        // Mais on s'assure que la structure est correcte
        if (cleanedNode.parameters.folderId && typeof cleanedNode.parameters.folderId === 'object') {
          // Si folderId est un objet avec __rl, on le préserve tel quel
          console.log(`✅ [MicrosoftTriInjector] folderId préservé pour ${node.name}:`, JSON.stringify(cleanedNode.parameters.folderId));
        } else if (!cleanedNode.parameters.folderId && node.parameters?.folderId) {
          // Si folderId a été perdu, on le restaure
          cleanedNode.parameters.folderId = node.parameters.folderId;
          console.log(`🔄 [MicrosoftTriInjector] folderId restauré pour ${node.name}:`, JSON.stringify(cleanedNode.parameters.folderId));
        }
        
        // Vérifier que les paramètres sont toujours présents après l'assignation
        console.log(`🔍 [MicrosoftTriInjector] Paramètres après assignation pour ${node.name}:`, {
          resource: cleanedNode.parameters.resource,
          operation: cleanedNode.parameters.operation,
          folder: cleanedNode.parameters.folder,
          folderId: cleanedNode.parameters.folderId ? JSON.stringify(cleanedNode.parameters.folderId) : 'MANQUANT',
          returnAll: cleanedNode.parameters.returnAll,
          limit: cleanedNode.parameters.limit
        });
        
        const assignedCred = cleanedNode.credentials.microsoftOutlookOAuth2Api;
        if (!assignedCred || assignedCred.id !== createdCredentials.microsoftOutlookOAuth2.id) {
          console.error(`❌ [MicrosoftTriInjector] ERREUR CRITIQUE: Le credential n'a pas été correctement assigné!`);
          throw new Error(`Le credential Microsoft Outlook OAuth2 n'a pas été correctement assigné au nœud ${node.name}.`);
        }
        console.log(`✅ [MicrosoftTriInjector] Vérification réussie pour ${node.name}`);
      }
      
      // Nœuds emailSend - utiliser SMTP admin
      if (node.type === 'n8n-nodes-base.emailSend') {
        if (!createdCredentials.smtp || !createdCredentials.smtp.id) {
          console.error(`❌ [MicrosoftTriInjector] ERREUR: Aucun credential SMTP admin disponible pour ${node.name}!`);
          throw new Error('Credential SMTP admin non trouvé. Vérifiez que le credential SMTP admin existe dans n8n.');
        }
        
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        
        const oldSmtpId = cleanedNode.credentials?.smtp?.id || 'aucun';
        
        cleanedNode.credentials.smtp = {
          id: createdCredentials.smtp.id,
          name: createdCredentials.smtp.name
        };
        console.log(`✅ [MicrosoftTriInjector] Credential SMTP admin assigné dans ${node.name}:`);
        console.log(`  - Ancien (template): ${oldSmtpId}`);
        console.log(`  - Nouveau (admin): ${createdCredentials.smtp.id} (${createdCredentials.smtp.name})`);
        
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = {};
        }
        
        const oldFromEmail = cleanedNode.parameters.fromEmail || 'non défini';
        cleanedNode.parameters.fromEmail = 'admin@heleam.com';
        console.log(`✅ [MicrosoftTriInjector] From Email modifié dans ${node.name}:`);
        console.log(`  - Ancien: ${oldFromEmail}`);
        console.log(`  - Nouveau: admin@heleam.com`);
      }
      
      // ⚠️ CRITIQUE: Modifier le nœud "Générer Rapport2" pour utiliser l'email de l'utilisateur
      if (node.name === 'Générer Rapport2' && node.type === 'n8n-nodes-base.code') {
        if (node.parameters && node.parameters.jsCode) {
          const oldCode = node.parameters.jsCode;
          const userEmailForCode = userEmail || 'user@heleam.com';
          
          // Remplacer USER_EMAIL_PLACEHOLDER par l'email de l'utilisateur
          let newCode = oldCode.replace(
            /USER_EMAIL_PLACEHOLDER/g,
            userEmailForCode
          );
          
          // Remplacer aussi les patterns d'email hardcodés
          newCode = newCode.replace(
            /let\s+mailboxOwner\s*=\s*['"][^'"]+['"];?/g,
            `let mailboxOwner = '${userEmailForCode}';`
          );
          
          if (newCode === oldCode) {
            newCode = oldCode.replace(
              /mailboxOwner\s*=\s*['"]user@heleam\.com['"]/g,
              `mailboxOwner = '${userEmailForCode}'`
            );
          }
          
          if (newCode === oldCode) {
            newCode = oldCode.replace(
              /mailboxOwner\s*=\s*['"][^'"]*@[^'"]*['"]/g,
              `mailboxOwner = '${userEmailForCode}'`
            );
          }
          
          cleanedNode.parameters.jsCode = newCode;
          
          if (newCode !== oldCode) {
            console.log(`✅ [MicrosoftTriInjector] Email utilisateur injecté dans ${node.name}: ${userEmailForCode}`);
          } else {
            console.log(`⚠️ [MicrosoftTriInjector] Aucun pattern d'email trouvé dans ${node.name}, email utilisateur: ${userEmailForCode}`);
          }
        }
      }
      
      return cleanedNode;
    });
  }
  
  // Gérer les webhooks
  if (uniqueWebhookPath) {
    const webhookNodes = injectedWorkflow.nodes?.filter(n => 
      n.type === 'n8n-nodes-base.webhook' || n.type === 'n8n-nodes-base.webhookTrigger'
    );
    if (webhookNodes && webhookNodes.length > 0) {
      webhookNodes.forEach(node => {
        if (node.parameters && node.parameters.path) {
          node.parameters.path = uniqueWebhookPath;
          console.log(`✅ [MicrosoftTriInjector] Webhook path mis à jour pour ${node.name}: ${uniqueWebhookPath}`);
        }
      });
    }
  }
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: createdCredentials
  };
}

module.exports = {
  injectUserCredentials
};
