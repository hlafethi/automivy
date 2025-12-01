// Injector pour les workflows Newsletter
// Injecte les credentials SMTP admin et OpenRouter
// Vérifie les crédits avant de créer le workflow

const { createCredential } = require('../n8nService');
const config = require('../../config');
const creditsService = require('../creditsService');

async function injectNewsletterCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  const createdCredentials = {};
  let workflowString = JSON.stringify(workflow);

  console.log('🔧 [NewsletterInjector] Injection des credentials pour workflow newsletter...');

  // Récupérer les credentials admin (OpenRouter + SMTP)
  const n8nService = require('../n8nService');
  const adminCreds = await n8nService.getAdminCredentials();

  // 1. Remplacer les placeholders OpenRouter
  if (adminCreds.OPENROUTER_ID && adminCreds.OPENROUTER_NAME) {
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_ID"/g,
      adminCreds.OPENROUTER_ID
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_NAME"/g,
      adminCreds.OPENROUTER_NAME
    );

    createdCredentials.openRouter = {
      id: adminCreds.OPENROUTER_ID,
      name: adminCreds.OPENROUTER_NAME
    };
    console.log('✅ [NewsletterInjector] Credential OpenRouter admin utilisé:', createdCredentials.openRouter.id);
  } else {
    throw new Error('Credential OpenRouter admin non trouvé. Vérifiez la configuration.');
  }

  // 2. Créer ou récupérer le credential SMTP admin
  let smtpCredentialId = adminCreds.SMTP_ID;
  let smtpCredentialName = adminCreds.SMTP_NAME;

  if (!smtpCredentialId) {
    console.log('🔧 [NewsletterInjector] Création du credential SMTP admin...');
    
    const userEmail = userCredentials.email || '';
    const cleanTemplateName = templateName ? templateName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50) : null;
    const templateNamePart = cleanTemplateName ? `-${cleanTemplateName}` : '';
    const userEmailPart = userEmail ? `-${userEmail}` : '';
    const smtpCredentialNameFull = `SMTP Admin - admin@heleam.com${templateNamePart}${userEmailPart}`;

    try {
      const smtpCredentialData = {
        name: smtpCredentialNameFull,
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
      smtpCredentialName = smtpCred.name || smtpCredentialNameFull;

      createdCredentials.smtp = {
        id: smtpCredentialId,
        name: smtpCredentialName
      };
      console.log('✅ [NewsletterInjector] Credential SMTP admin créé:', createdCredentials.smtp.id);
    } catch (error) {
      console.error('❌ [NewsletterInjector] Erreur création credential SMTP admin:', error);
      throw new Error('Impossible de créer le credential SMTP admin. Vérifiez la configuration SMTP dans config.js.');
    }
  } else {
    createdCredentials.smtp = {
      id: smtpCredentialId,
      name: smtpCredentialName || 'SMTP Admin - admin@heleam.com'
    };
    console.log('✅ [NewsletterInjector] Credential SMTP admin trouvé:', createdCredentials.smtp.id);
  }

  // 3. Remplacer les placeholders SMTP dans le workflow
  workflowString = workflowString.replace(
    /"ADMIN_SMTP_CREDENTIAL_ID"/g,
    smtpCredentialId
  );
  workflowString = workflowString.replace(
    /"ADMIN_SMTP_CREDENTIAL_NAME"/g,
    smtpCredentialName
  );

  // 4. Remplacer les IDs hardcodés dans les credentials
  if (smtpCredentialId) {
    // Remplacer les credentials SMTP dans les nœuds
    workflowString = workflowString.replace(
      /"credentials":\s*{[^}]*"smtp":\s*{\s*"id":\s*"[^"]+"[^}]*}[^}]*}/g,
      (match) => {
        return match.replace(
          /"smtp":\s*{\s*"id":\s*"[^"]+"[^}]*}/,
          `"smtp": {"id": "${smtpCredentialId}", "name": ${JSON.stringify(smtpCredentialName)}}`
        );
      }
    );
  }

  // 5. Parser le workflow modifié
  workflow = JSON.parse(workflowString);

  // 6. Vérifier et mettre à jour les nœuds Email Send
  workflow.nodes = workflow.nodes.map((node) => {
    if (node.type === 'n8n-nodes-base.emailSend') {
      // Forcer le credential SMTP admin
      if (!node.credentials) {
        node.credentials = {};
      }
      node.credentials.smtp = {
        id: smtpCredentialId,
        name: smtpCredentialName
      };

      // Modifier le fromEmail pour utiliser l'email admin
      if (node.parameters && node.parameters.fromEmail) {
        const oldFromEmail = node.parameters.fromEmail;
        node.parameters.fromEmail = 'admin@heleam.com';
        console.log(`✅ [NewsletterInjector] From Email modifié dans ${node.name}: ${oldFromEmail} -> admin@heleam.com`);
      }

      console.log(`✅ [NewsletterInjector] Credential SMTP admin assigné dans ${node.name}`);
    }

    // Vérifier et mettre à jour les nœuds OpenRouter
    if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi' || 
        node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter') {
      if (!node.credentials) {
        node.credentials = {};
      }
      node.credentials.openAiApi = {
        id: adminCreds.OPENROUTER_ID,
        name: adminCreds.OPENROUTER_NAME
      };
      console.log(`✅ [NewsletterInjector] Credential OpenRouter assigné dans ${node.name}`);
    }

    return node;
  });

  return {
    workflow,
    createdCredentials
  };
}

/**
 * Vérifie les crédits avant de créer un workflow newsletter
 * @param {string} userId - ID de l'utilisateur
 * @param {number} requiredCredits - Nombre de crédits requis (défaut: 1)
 * @returns {Promise<boolean>}
 */
async function checkCreditsBeforeWorkflow(userId, requiredCredits = 1) {
  try {
    const hasCredits = await creditsService.hasEnoughCredits(userId, requiredCredits);
    if (!hasCredits) {
      const balance = await creditsService.getCreditsBalance(userId);
      throw new Error(
        `Crédits insuffisants. Vous avez ${balance.remaining_credits} crédit(s) restant(s), ` +
        `mais ${requiredCredits} crédit(s) sont requis pour générer une newsletter.`
      );
    }
    return true;
  } catch (error) {
    console.error('❌ [NewsletterInjector] Erreur vérification crédits:', error);
    throw error;
  }
}

/**
 * Consomme les crédits après la création réussie d'un workflow newsletter
 * @param {string} userId - ID de l'utilisateur
 * @param {string} workflowId - ID du workflow créé
 * @param {number} amount - Nombre de crédits à consommer (défaut: 1)
 */
async function consumeCreditsAfterWorkflow(userId, workflowId, amount = 1) {
  try {
    await creditsService.consumeCredits(
      userId,
      amount,
      workflowId,
      'Génération de newsletter via webhook'
    );
    console.log(`✅ [NewsletterInjector] ${amount} crédit(s) consommé(s) pour le workflow ${workflowId}`);
  } catch (error) {
    console.error('❌ [NewsletterInjector] Erreur consommation crédits:', error);
    // Ne pas faire échouer le workflow si la consommation de crédits échoue
    // On log juste l'erreur
  }
}

module.exports = {
  injectNewsletterCredentials,
  checkCreditsBeforeWorkflow,
  consumeCreditsAfterWorkflow
};

