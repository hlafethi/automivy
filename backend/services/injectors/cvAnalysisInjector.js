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
  
  // Récupérer les credentials admin (OpenRouter + SMTP)
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    console.log('✅ [CVAnalysisInjector] Credentials admin récupérés');
    console.log('  - OpenRouter ID:', adminCreds.OPENROUTER_ID);
    console.log('  - OpenRouter API Key:', adminCreds.OPENROUTER_API_KEY ? 'présente' : 'manquante');
  } catch (error) {
    console.warn('⚠️ [CVAnalysisInjector] Erreur récupération credentials admin:', error.message);
  }
  
  // ✅ CRÉER un credential httpHeaderAuth avec la clé API OpenRouter pour chaque workflow
  // Cette méthode est plus fiable que les variables d'environnement dans les headers
  if (adminCreds.OPENROUTER_API_KEY) {
    console.log('🔧 [CVAnalysisInjector] Création d\'un credential httpHeaderAuth pour OpenRouter...');
    const config = require('../../config');
    const { createCredential } = require('../n8nService');
    
    const userEmail = userCredentials.email || '';
    const cleanTemplateName = templateName ? templateName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50) : null;
    const templateNamePart = cleanTemplateName ? `-${cleanTemplateName}` : '';
    const userEmailPart = userEmail ? `-${userEmail}` : '';
    const httpHeaderAuthName = `OpenRouter - CV-Analysis${templateNamePart}${userEmailPart}`;
    
    try {
      const httpHeaderAuthData = {
        name: httpHeaderAuthName,
        type: 'httpHeaderAuth',
        data: {
          name: 'Authorization',
          value: `Bearer ${adminCreds.OPENROUTER_API_KEY}`
        }
      };
      
      const httpHeaderAuthCred = await createCredential(httpHeaderAuthData);
      createdCredentials.httpHeaderAuth = {
        id: httpHeaderAuthCred.id,
        name: httpHeaderAuthCred.name || httpHeaderAuthName
      };
      console.log('✅ [CVAnalysisInjector] Credential httpHeaderAuth créé:', createdCredentials.httpHeaderAuth.id, '- Nom:', createdCredentials.httpHeaderAuth.name);
    } catch (error) {
      console.error('❌ [CVAnalysisInjector] Erreur création credential httpHeaderAuth:', error);
      // Si la création échoue, utiliser le credential admin existant
      if (adminCreds.OPENROUTER_ID) {
        createdCredentials.httpHeaderAuth = {
          id: adminCreds.OPENROUTER_ID,
          name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
        };
        console.log('⚠️ [CVAnalysisInjector] Utilisation du credential OpenRouter admin existant:', createdCredentials.httpHeaderAuth.id);
      } else {
        throw new Error('Impossible de créer ou récupérer un credential OpenRouter. Vérifiez OPENROUTER_API_KEY dans config.js.');
      }
    }
  } else if (adminCreds.OPENROUTER_ID) {
    // Si pas de clé API mais un credential existant, l'utiliser
    createdCredentials.httpHeaderAuth = {
      id: adminCreds.OPENROUTER_ID,
      name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
    };
    console.log('✅ [CVAnalysisInjector] Utilisation du credential OpenRouter admin existant:', createdCredentials.httpHeaderAuth.id);
  } else {
    throw new Error('Aucun credential OpenRouter disponible. Vérifiez OPENROUTER_API_KEY ou OPENROUTER_CREDENTIAL_ID dans config.js.');
  }
  
  // ⚠️ CRITIQUE: Créer un credential SMTP spécifique pour chaque workflow (comme pour OpenRouter)
  // Cela garantit que chaque workflow a son propre credential SMTP, évitant les conflits
  console.log('🔧 [CVAnalysisInjector] Création d\'un credential SMTP spécifique pour ce workflow...');
  const config = require('../../config');
  const { createCredential } = require('../n8nService');
  
  // Construire le nom du credential avec le template name et l'email de l'utilisateur
  const userEmail = userCredentials.email || '';
  const cleanTemplateName = templateName ? templateName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50) : null;
  const templateNamePart = cleanTemplateName ? `-${cleanTemplateName}` : '';
  const userEmailPart = userEmail ? `-${userEmail}` : '';
  let smtpCredentialName = `SMTP Admin - admin@heleam.com${templateNamePart}${userEmailPart}`;
  
  let smtpCredentialId = null;
  
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
    smtpCredentialId = smtpCred.id;
    smtpCredentialName = smtpCred.name || smtpCredentialName;
    
    createdCredentials.smtp = {
      id: smtpCredentialId,
      name: smtpCredentialName
    };
    console.log('✅ [CVAnalysisInjector] Credential SMTP créé pour ce workflow:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
    console.log('✅ [CVAnalysisInjector] Ce credential sera supprimé avec le workflow car il contient l\'email de l\'utilisateur');
    
    // ⚠️ CRITIQUE: Remplacer USER_SMTP_CREDENTIAL_ID dans workflowString après création
    workflowString = workflowString.replace(
      /"USER_SMTP_CREDENTIAL_ID"/g,
      JSON.stringify({ id: smtpCredentialId, name: smtpCredentialName })
    );
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_CREDENTIAL_ID"/g,
      JSON.stringify(smtpCredentialId)
    );
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_CREDENTIAL_NAME"/g,
      JSON.stringify(smtpCredentialName)
    );
  } catch (error) {
    console.error('❌ [CVAnalysisInjector] Erreur création credential SMTP:', error);
    // Fallback: utiliser le credential SMTP admin existant si la création échoue
    if (adminCreds.SMTP_ID) {
      smtpCredentialId = adminCreds.SMTP_ID;
      smtpCredentialName = adminCreds.SMTP_NAME || 'SMTP Admin';
      createdCredentials.smtp = {
        id: smtpCredentialId,
        name: smtpCredentialName
      };
      console.log('⚠️ [CVAnalysisInjector] Utilisation du credential SMTP admin existant en fallback:', createdCredentials.smtp.id);
      
      workflowString = workflowString.replace(
        /"USER_SMTP_CREDENTIAL_ID"/g,
        JSON.stringify({ id: smtpCredentialId, name: smtpCredentialName })
      );
      workflowString = workflowString.replace(
        /"ADMIN_SMTP_CREDENTIAL_ID"/g,
        JSON.stringify(smtpCredentialId)
      );
      workflowString = workflowString.replace(
        /"ADMIN_SMTP_CREDENTIAL_NAME"/g,
        JSON.stringify(smtpCredentialName)
      );
    } else {
      throw new Error('Impossible de créer le credential SMTP. Vérifiez la configuration SMTP dans config.js.');
    }
  }
  
  // ⚠️ CRITIQUE: Remplacer TOUS les IDs SMTP hardcodés dans le workflowString (même ceux qui ne sont pas des placeholders)
  // Cela garantit que les workflows déployés avec d'anciens IDs seront mis à jour
  if (smtpCredentialId) {
    // Liste des IDs SMTP connus qui pourraient être hardcodés dans les templates
    const knownSmtpIds = [
      'jPPRchjVCtC56CY6', // ID mentionné dans l'erreur
      // Ajouter d'autres IDs si nécessaire
    ];
    
    for (const oldSmtpId of knownSmtpIds) {
      if (workflowString.includes(oldSmtpId)) {
        console.log(`🔄 [CVAnalysisInjector] Remplacement de l'ID SMTP hardcodé ${oldSmtpId} par ${smtpCredentialId}`);
        // Remplacer l'ID dans les credentials smtp
        workflowString = workflowString.replace(
          new RegExp(`"smtp":\\s*{[^}]*"id":\\s*"${oldSmtpId}"[^}]*}`, 'g'),
          `"smtp": {"id": "${smtpCredentialId}", "name": ${JSON.stringify(smtpCredentialName)}}`
        );
        // Remplacer aussi si l'ID est seul
        workflowString = workflowString.replace(
          new RegExp(`"${oldSmtpId}"`, 'g'),
          JSON.stringify(smtpCredentialId)
        );
      }
    }
    
    // Remplacer aussi tous les IDs SMTP qui ne sont pas des placeholders valides
    // Pattern: "smtp": {"id": "XXXXX", ...} où XXXXX n'est pas un placeholder
    // ⚠️ AMÉLIORATION: Capturer aussi les cas avec "name" ou sans "name"
    workflowString = workflowString.replace(
      /"smtp":\s*{\s*"id":\s*"([^"]+)"([^}]*)}/g,
      (match, id, rest) => {
        // Si ce n'est pas un placeholder et que ce n'est pas déjà le bon ID
        if (!id.includes('ADMIN_SMTP') && !id.includes('USER_SMTP') && id !== smtpCredentialId) {
          console.log(`🔄 [CVAnalysisInjector] Remplacement de l'ID SMTP ${id} par ${smtpCredentialId}`);
          return `"smtp": {"id": "${smtpCredentialId}", "name": ${JSON.stringify(smtpCredentialName)}}`;
        }
        return match;
      }
    );
    
    // ⚠️ AMÉLIORATION: Remplacer aussi les IDs SMTP dans credentials au niveau du nœud
    // Pattern: "credentials": { "smtp": { "id": "XXXXX", ... } }
    workflowString = workflowString.replace(
      /"credentials":\s*{[^}]*"smtp":\s*{\s*"id":\s*"([^"]+)"([^}]*)}[^}]*}/g,
      (match, id, rest) => {
        if (!id.includes('ADMIN_SMTP') && !id.includes('USER_SMTP') && id !== smtpCredentialId) {
          console.log(`🔄 [CVAnalysisInjector] Remplacement de l'ID SMTP dans credentials: ${id} -> ${smtpCredentialId}`);
          // Préserver la structure des credentials, remplacer seulement smtp
          return match.replace(
            /"smtp":\s*{\s*"id":\s*"[^"]+"[^}]*}/,
            `"smtp": {"id": "${smtpCredentialId}", "name": ${JSON.stringify(smtpCredentialName)}}`
          );
        }
        return match;
      }
    );
  }
  
  // Parser le workflow
  const injectedWorkflow = JSON.parse(workflowString);
  
  // Injecter les credentials dans les nœuds
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      const cleanedNode = { ...node };
      
      // Nœuds HTTP Request avec OpenRouter - Utiliser credential httpHeaderAuth
      if (node.type === 'n8n-nodes-base.httpRequest' && 
          (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))) {
        
        console.log(`🔍 [CVAnalysisInjector] Traitement du nœud ${node.name} - Configuration avec credential httpHeaderAuth`);
        console.log(`  - Authentication AVANT:`, node.parameters?.authentication);
        console.log(`  - Credentials AVANT:`, node.credentials ? Object.keys(node.credentials) : 'aucun');
        
        // ✅ MÉTHODE RECOMMANDÉE: Utiliser un credential httpHeaderAuth avec la clé API OpenRouter
        // Configurer l'authentification pour utiliser httpHeaderAuth
        cleanedNode.parameters = {
          ...cleanedNode.parameters,
          authentication: 'genericCredentialType',
          genericAuthType: 'httpHeaderAuth'
        };
        
        // Supprimer nodeCredentialType si présent (remplacé par genericAuthType)
        delete cleanedNode.parameters.nodeCredentialType;
        
        // Assigner le credential httpHeaderAuth créé
        if (createdCredentials.httpHeaderAuth) {
          cleanedNode.credentials = {
            httpHeaderAuth: {
              id: createdCredentials.httpHeaderAuth.id,
              name: createdCredentials.httpHeaderAuth.name
            }
          };
          console.log(`✅ [CVAnalysisInjector] Nœud ${node.name} configuré avec credential httpHeaderAuth`);
          console.log(`  - Authentication: genericCredentialType (httpHeaderAuth)`);
          console.log(`  - Credential ID: ${createdCredentials.httpHeaderAuth.id}`);
          console.log(`  - Credential Name: ${createdCredentials.httpHeaderAuth.name}`);
        } else {
          throw new Error(`Aucun credential httpHeaderAuth disponible pour le nœud ${node.name}`);
        }
      }
      
      // Nœuds Email Send - TOUJOURS remplacer le credential SMTP (même si hardcodé dans le template)
      if (node.type === 'n8n-nodes-base.emailSend') {
        console.log(`🔍 [CVAnalysisInjector] Traitement du nœud Email Send: ${node.name}`);
        console.log(`  - Credentials AVANT traitement:`, node.credentials ? JSON.stringify(node.credentials, null, 2) : 'aucun');
        
        // ⚠️ CRITIQUE: Le credential SMTP admin DOIT être assigné
        if (!createdCredentials.smtp || !createdCredentials.smtp.id) {
          console.error(`❌ [CVAnalysisInjector] ERREUR: Aucun credential SMTP admin disponible pour ${node.name}!`);
          console.error(`❌ [CVAnalysisInjector] createdCredentials.smtp:`, createdCredentials.smtp);
          throw new Error('Credential SMTP admin non trouvé. Vérifiez que le credential SMTP admin existe dans n8n.');
        }
        
        // ⚠️ CRITIQUE: Initialiser cleanedNode.credentials si absent
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
          console.log(`  - Credentials initialisés (étaient absents)`);
        }
        
        // Récupérer l'ancien ID pour logging
        const oldSmtpId = cleanedNode.credentials?.smtp?.id || node.credentials?.smtp?.id || 'aucun';
        
        // ⚠️ FORCER le remplacement du credential SMTP
        cleanedNode.credentials.smtp = {
          id: createdCredentials.smtp.id,
          name: createdCredentials.smtp.name
        };
        
        console.log(`✅ [CVAnalysisInjector] Credential SMTP admin assigné dans ${node.name}:`);
        console.log(`  - Ancien (template/workflow): ${oldSmtpId}`);
        console.log(`  - Nouveau (admin): ${createdCredentials.smtp.id} (${createdCredentials.smtp.name})`);
        console.log(`  - Credentials APRÈS traitement:`, JSON.stringify(cleanedNode.credentials, null, 2));
        
        // ⚠️ IMPORTANT: Modifier le fromEmail pour utiliser l'email admin
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = {};
        }
        
        // Remplacer fromEmail par admin@heleam.com (même si c'est une expression)
        const oldFromEmail = cleanedNode.parameters.fromEmail || node.parameters?.fromEmail || 'non défini';
        cleanedNode.parameters.fromEmail = 'admin@heleam.com';
        console.log(`✅ [CVAnalysisInjector] From Email modifié dans ${node.name}: ${oldFromEmail} -> admin@heleam.com`);
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

