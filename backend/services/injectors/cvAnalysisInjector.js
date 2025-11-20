// Injecteur spécifique pour le template "CV Analysis and Candidate Evaluation"
// Ce template nécessite :
// - OpenRouter (admin) pour l'extraction et l'évaluation des CVs
// - SMTP (admin pour l'envoi du rapport)

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials } = require('../n8nService');

/**
 * Injecte les credentials utilisateur pour le template CV Analysis and Candidate Evaluation
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  console.log('🎯 [CVAnalysisInjector] Injection spécifique pour CV Analysis and Candidate Evaluation...');
  console.log('🎯 [CVAnalysisInjector] Template ID:', templateId);
  console.log('🎯 [CVAnalysisInjector] Template Name:', templateName);
  
  // Générer un webhook unique
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    const templateIdShort = templateId.replace(/-/g, '').substring(0, 8);
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);
    uniqueWebhookPath = `workflow-${templateIdShort}-${userIdShort}`;
    console.log('🔧 [CVAnalysisInjector] Webhook unique généré:', uniqueWebhookPath);
  }
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow);
  console.log('🔧 [CVAnalysisInjector] Credentials requis:', requiredCredentials.length);
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  
  // ⚠️ IMPORTANT: Déclarer createdCredentials pour stocker les credentials utilisés
  const createdCredentials = {};
  
  // Récupérer les credentials admin
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    console.log('✅ [CVAnalysisInjector] Credentials admin récupérés');
  } catch (error) {
    console.error('❌ [CVAnalysisInjector] Erreur récupération credentials admin:', error.message);
    console.warn('⚠️ [CVAnalysisInjector] Continuation avec credentials admin vides');
  }
  
  // Remplacer les placeholders OpenRouter
  if (adminCreds.OPENROUTER_ID) {
    // Remplacer ADMIN_OPENROUTER_CREDENTIAL_ID et ADMIN_OPENROUTER_CREDENTIAL_NAME
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_ID"/g,
      JSON.stringify(adminCreds.OPENROUTER_ID)
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_NAME"/g,
      JSON.stringify(adminCreds.OPENROUTER_NAME || 'OpenRouter Admin')
    );
    
    // Stocker le credential OpenRouter dans createdCredentials
    createdCredentials.openRouterApi = {
      id: adminCreds.OPENROUTER_ID,
      name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
    };
    console.log('✅ [CVAnalysisInjector] Credential OpenRouter admin injecté:', createdCredentials.openRouterApi.id);
  }
  
  // Remplacer les placeholders SMTP admin
  if (adminCreds.SMTP_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_CREDENTIAL_ID"/g,
      JSON.stringify(adminCreds.SMTP_ID)
    );
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_CREDENTIAL_NAME"/g,
      JSON.stringify(adminCreds.SMTP_NAME || 'SMTP Admin')
    );
    
    // Stocker le credential SMTP dans createdCredentials
    createdCredentials.smtp = {
      id: adminCreds.SMTP_ID,
      name: adminCreds.SMTP_NAME || 'SMTP Admin'
    };
    console.log('✅ [CVAnalysisInjector] Credential SMTP admin trouvé et utilisé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
  } else {
    // ⚠️ IMPORTANT: Si le credential SMTP admin n'est pas trouvé, le créer
    console.log('⚠️ [CVAnalysisInjector] Credential SMTP admin non trouvé, création...');
    const config = require('../../config');
    const { createCredential } = require('../n8nService');
    
    // Construire le nom du credential avec le template name et l'email de l'utilisateur
    const userEmail = userCredentials.email || '';
    const cleanTemplateName = templateName ? templateName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50) : null;
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
      console.log('✅ [CVAnalysisInjector] Credential SMTP admin créé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
    } catch (error) {
      console.error('❌ [CVAnalysisInjector] Erreur création credential SMTP admin:', error);
      throw new Error('Impossible de créer le credential SMTP admin. Vérifiez la configuration SMTP dans config.js.');
    }
  }
  
  // Parser le workflow
  const injectedWorkflow = JSON.parse(workflowString);
  
  // Injecter les credentials dans les nœuds
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      const cleanedNode = { ...node };
      
      // Nœuds HTTP Request avec OpenRouter
      if (node.type === 'n8n-nodes-base.httpRequest' && 
          (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))) {
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        
        // Utiliser openRouterApi si disponible, sinon httpHeaderAuth
        if (adminCreds.OPENROUTER_ID) {
          if (node.parameters?.authentication === 'predefinedCredentialType' && 
              node.parameters?.nodeCredentialType === 'openRouterApi') {
            cleanedNode.credentials.openRouterApi = {
              id: adminCreds.OPENROUTER_ID,
              name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
            };
            console.log(`✅ [CVAnalysisInjector] Credential OpenRouter injecté dans ${node.name}`);
          } else {
            // Fallback: utiliser httpHeaderAuth
            cleanedNode.credentials.httpHeaderAuth = {
              id: adminCreds.OPENROUTER_ID,
              name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
            };
            console.log(`✅ [CVAnalysisInjector] Credential OpenRouter (httpHeaderAuth) injecté dans ${node.name}`);
          }
        }
      }
      
      // Nœuds Email Send - Utiliser SMTP admin
      if (node.type === 'n8n-nodes-base.emailSend') {
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        
        if (createdCredentials.smtp) {
          cleanedNode.credentials.smtp = {
            id: createdCredentials.smtp.id,
            name: createdCredentials.smtp.name
          };
          console.log(`✅ [CVAnalysisInjector] Credential SMTP admin injecté dans ${node.name}`);
        }
      }
      
      return cleanedNode;
    });
  }
  
  // Mettre à jour le webhook path si nécessaire
  if (uniqueWebhookPath) {
    const webhookNode = injectedWorkflow.nodes?.find(node => 
      node.type === 'n8n-nodes-base.webhook' && 
      (node.name?.includes('AUTOMIVY') || node.name?.includes('Webhook Trigger'))
    );
    
    if (webhookNode && webhookNode.parameters) {
      webhookNode.parameters.path = uniqueWebhookPath;
      console.log('✅ [CVAnalysisInjector] Webhook path mis à jour:', uniqueWebhookPath);
    }
  }
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: createdCredentials
  };
}

module.exports = { injectUserCredentials };

