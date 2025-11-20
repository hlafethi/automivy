// Injecteur spécifique pour le template "GMAIL Tri Automatique Boite Email"
// Ce template nécessite :
// - IMAP pour le premier nœud (lecture emails)
// - Gmail OAuth2 pour les autres nœuds Gmail (création labels, etc.)

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials } = require('../n8nService');
const { createImapCredential, createSmtpCredential } = require('../credentialInjector');
const db = require('../../database');

/**
 * Injecte les credentials utilisateur pour le template GMAIL Tri Automatique
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  console.log('🎯 [GmailTriInjector] Injection spécifique pour GMAIL Tri Automatique...');
  console.log('🎯 [GmailTriInjector] Template ID:', templateId);
  console.log('🎯 [GmailTriInjector] Template Name:', templateName);
  
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
    console.log('🔧 [GmailTriInjector] Webhook unique généré:', uniqueWebhookPath);
  }
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow);
  console.log('🔧 [GmailTriInjector] Credentials requis:', requiredCredentials.length);
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  const createdCredentials = {};
  
  // Récupérer les credentials admin
  console.log('🔍 [GmailTriInjector] Appel de getAdminCredentials()...');
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    console.log('✅ [GmailTriInjector] getAdminCredentials() terminé');
  } catch (error) {
    console.error('❌ [GmailTriInjector] Erreur lors de l\'appel à getAdminCredentials():', error.message);
    console.error('❌ [GmailTriInjector] Stack:', error.stack);
    // Continuer avec adminCreds vide, on gérera l'erreur plus tard
  }
  
  // ⚠️ IMPORTANT: Pour ce template, utiliser le credential SMTP ADMIN pour les nœuds emailSend
  // L'email de rapport doit être envoyé depuis l'email admin
  console.log('🔍 [GmailTriInjector] Vérification credential SMTP admin...');
  console.log('🔍 [GmailTriInjector] adminCreds reçus:', {
    hasSMTP_ID: !!adminCreds.SMTP_ID,
    SMTP_ID: adminCreds.SMTP_ID,
    SMTP_NAME: adminCreds.SMTP_NAME,
    allKeys: Object.keys(adminCreds),
    fullObject: JSON.stringify(adminCreds, null, 2)
  });
  
  if (adminCreds.SMTP_ID) {
    createdCredentials.smtp = {
      id: adminCreds.SMTP_ID,
      name: adminCreds.SMTP_NAME || 'SMTP Admin'
    };
    console.log('✅ [GmailTriInjector] Credential SMTP admin trouvé et utilisé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
  } else {
    // ⚠️ IMPORTANT: Si le credential SMTP admin n'est pas trouvé, le créer
    // ⚠️ NOUVEAU: Créer un credential SMTP Admin spécifique à ce workflow avec l'email de l'utilisateur
    console.log('⚠️ [GmailTriInjector] Credential SMTP admin non trouvé, création...');
    const config = require('../../config');
    const { createCredential } = require('../n8nService');
    
    // Construire le nom du credential avec le template name et l'email de l'utilisateur
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
      console.log('✅ [GmailTriInjector] Credential SMTP admin créé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
      console.log('✅ [GmailTriInjector] Ce credential sera supprimé avec le workflow car il contient l\'email de l\'utilisateur');
    } catch (error) {
      console.error('❌ [GmailTriInjector] Erreur création credential SMTP admin:', error);
      throw new Error('Impossible de créer le credential SMTP admin. Vérifiez la configuration SMTP dans config.js.');
    }
  }
  
  // Créer les credentials utilisateur selon les besoins spécifiques de ce template
  for (const credConfig of requiredCredentials) {
    if (credConfig.type === 'gmailOAuth2') {
      // Pour Gmail OAuth2, récupérer le credential depuis la base de données
      console.log('🔍 [GmailTriInjector] Recherche du credential Gmail OAuth2 pour user:', userId);
      const oauthCreds = await db.getOAuthCredentials(userId, 'gmail');
      console.log('🔍 [GmailTriInjector] Credentials OAuth trouvés dans la BDD:', oauthCreds?.length || 0);
      
      if (oauthCreds && oauthCreds.length > 0 && oauthCreds[0].n8n_credential_id) {
        createdCredentials.gmailOAuth2 = {
          id: oauthCreds[0].n8n_credential_id,
          name: `Gmail - ${oauthCreds[0].email || 'user'} - ${userId.substring(0, 8)}`
        };
        console.log('✅ [GmailTriInjector] Credential Gmail OAuth2 récupéré depuis la BDD:', createdCredentials.gmailOAuth2.id);
      } else {
        console.error('❌ [GmailTriInjector] Aucun credential Gmail OAuth2 trouvé dans la BDD pour cet utilisateur');
        console.error('❌ [GmailTriInjector] L\'utilisateur doit se connecter via OAuth AVANT de déployer ce workflow.');
      }
    }
    
    if (credConfig.type === 'imap') {
      // Créer le credential IMAP pour le premier nœud
      const imapCred = await createImapCredential(userCredentials, userId, cleanTemplateName);
      createdCredentials.imap = imapCred;
      console.log('✅ [GmailTriInjector] Credential IMAP créé:', imapCred.id, '- Nom:', imapCred.name);
    }
    
    // ⚠️ NE PAS créer de credential SMTP utilisateur - utiliser SMTP admin
    if (credConfig.type === 'smtp') {
      console.log('⏭️ [GmailTriInjector] SMTP ignoré - utilisation du credential SMTP admin');
    }
  }
  
  // Remplacer les placeholders OpenRouter
  if (adminCreds.OPENROUTER_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_PLACEHOLDER"/g,
      JSON.stringify({ id: adminCreds.OPENROUTER_ID, name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin' })
    );
  }
  
  // Parser le workflow
  const injectedWorkflow = JSON.parse(workflowString);
  
  // Injecter les credentials dans les nœuds selon les règles spécifiques de ce template
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map((node, index) => {
      const cleanedNode = { ...node };
      
      // Règle spécifique : Le PREMIER nœud IMAP/emailReadImap utilise IMAP
      // Les autres nœuds Gmail utilisent Gmail OAuth2
      const isFirstImapNode = index === injectedWorkflow.nodes.findIndex(n => 
        n.type === 'n8n-nodes-imap.imap' || n.type === 'n8n-nodes-base.emailReadImap'
      );
      
      if ((node.type === 'n8n-nodes-imap.imap' || node.type === 'n8n-nodes-base.emailReadImap') && isFirstImapNode) {
        // Premier nœud IMAP - utiliser le credential IMAP
        if (createdCredentials.imap) {
          cleanedNode.credentials = {
            imap: {
              id: createdCredentials.imap.id,
              name: createdCredentials.imap.name
            }
          };
          console.log(`✅ [GmailTriInjector] Credential IMAP assigné au premier nœud: ${node.name}`);
        }
      } else if (node.type === 'n8n-nodes-base.gmail') {
        // Nœuds Gmail - utiliser Gmail OAuth2 utilisateur
        if (createdCredentials.gmailOAuth2) {
          cleanedNode.credentials = {
            gmailOAuth2: {
              id: createdCredentials.gmailOAuth2.id,
              name: createdCredentials.gmailOAuth2.name
            }
          };
          console.log(`✅ [GmailTriInjector] Credential Gmail OAuth2 assigné à ${node.name}: ${createdCredentials.gmailOAuth2.id}`);
        } else {
          // Supprimer le credential template si aucun credential utilisateur n'est disponible
          if (cleanedNode.credentials) {
            delete cleanedNode.credentials.gmailOAuth2;
            console.error(`❌ [GmailTriInjector] Credential Gmail OAuth2 template supprimé de ${node.name} - aucun credential utilisateur disponible`);
          }
        }
      } else if (node.type === 'n8n-nodes-base.emailSend') {
        // Nœuds SMTP - TOUJOURS remplacer le credential SMTP (même si hardcodé dans le template)
        // ⚠️ CRITIQUE: Le credential SMTP admin DOIT être assigné
        if (!createdCredentials.smtp || !createdCredentials.smtp.id) {
          console.error(`❌ [GmailTriInjector] ERREUR: Aucun credential SMTP admin disponible pour ${node.name}!`);
          console.error(`❌ [GmailTriInjector] createdCredentials.smtp:`, createdCredentials.smtp);
          console.error(`❌ [GmailTriInjector] adminCreds reçus:`, adminCreds);
          throw new Error('Credential SMTP admin non trouvé. Vérifiez que le credential SMTP admin existe dans n8n avec le type "smtp" ou contenant "smtp" dans son nom.');
        }
        
        // Remplacer le credential SMTP par celui de l'admin
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        
        // Récupérer l'ancien ID pour logging
        const oldSmtpId = cleanedNode.credentials?.smtp?.id || 'aucun';
        
        // Assigner le credential SMTP admin
        cleanedNode.credentials.smtp = {
          id: createdCredentials.smtp.id,
          name: createdCredentials.smtp.name
        };
        console.log(`✅ [GmailTriInjector] Credential SMTP admin assigné dans ${node.name}:`);
        console.log(`  - Ancien (template): ${oldSmtpId}`);
        console.log(`  - Nouveau (admin): ${createdCredentials.smtp.id} (${createdCredentials.smtp.name})`);
        
        // ⚠️ IMPORTANT: Modifier le fromEmail pour utiliser l'email admin
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = {};
        }
        
        // Remplacer fromEmail par admin@heleam.com (même si c'est une expression)
        const oldFromEmail = cleanedNode.parameters.fromEmail || 'non défini';
        cleanedNode.parameters.fromEmail = 'admin@heleam.com';
        console.log(`✅ [GmailTriInjector] From Email modifié dans ${node.name}:`);
        console.log(`  - Ancien: ${oldFromEmail}`);
        console.log(`  - Nouveau: admin@heleam.com`);
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
          console.log(`✅ [GmailTriInjector] Webhook path mis à jour pour ${node.name}: ${uniqueWebhookPath}`);
        }
      });
    }
  }
  
  // Injecter l'heure dans le Schedule Trigger si fournie
  if (userCredentials.scheduleTime) {
    const scheduleNode = injectedWorkflow.nodes?.find(node => 
      node.type === 'n8n-nodes-base.schedule' || 
      node.type === 'n8n-nodes-base.scheduleTrigger'
    );
    
    if (scheduleNode) {
      const [hours, minutes] = userCredentials.scheduleTime.split(':').map(Number);
      const cronExpression = `${minutes} ${hours} * * *`;
      
      if (!scheduleNode.parameters) {
        scheduleNode.parameters = {};
      }
      
      scheduleNode.parameters.rule = {
        interval: [{
          field: 'cronExpression',
          cronExpression: cronExpression
        }]
      };
      
      console.log('✅ [GmailTriInjector] Schedule Trigger mis à jour avec l\'heure:', userCredentials.scheduleTime);
    }
  }
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: createdCredentials // ⚠️ IMPORTANT: Retourner les credentials créés pour stockage dans la BDD
  };
}

module.exports = {
  injectUserCredentials
};

