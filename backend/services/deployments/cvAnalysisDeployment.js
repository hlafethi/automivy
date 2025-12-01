// Déploiement spécifique pour "CV Analysis and Candidate Evaluation"
// Utilise directement cvAnalysisInjector et les fonctions utilitaires

const cvAnalysisInjector = require('../injectors/cvAnalysisInjector');
const db = require('../../database');
const deploymentUtils = require('./deploymentUtils');
const logger = require('../../utils/logger');

/**
 * Déploie le workflow "CV Analysis" avec sa logique spécifique
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  logger.info('Déploiement spécifique du workflow CV Analysis', {
    templateName: template.name,
    templateId: template.id,
    userEmail,
    userId
  });
  
  // 1. Parser le JSON du template
  let workflowJson;
  try {
    workflowJson = typeof template.json === 'string'
      ? JSON.parse(template.json)
      : template.json;
  } catch (parseErr) {
    throw new Error(`JSON du workflow invalide: ${parseErr.message}`);
  }
  
  if (!workflowJson) {
    throw new Error('Template JSON manquant');
  }
  
  // 2. Définir le nom du workflow
  const workflowName = `${template.name} - ${userEmail}`;
  
  // 3. Injecter les credentials avec l'injecteur spécifique CV Analysis
  logger.debug('Injection des credentials avec cvAnalysisInjector', { templateId: template.id });
  const injectionResult = await cvAnalysisInjector.injectUserCredentials(
    workflowJson, 
    credentials, 
    userId, 
    template.id, 
    template.name
  );
  
  if (!injectionResult || !injectionResult.workflow) {
    throw new Error('Injection échouée: injectionResult ou workflow manquant');
  }
  
  const injectedWorkflow = injectionResult.workflow;
  const webhookPath = injectionResult.webhookPath;
  injectedWorkflow.name = workflowName;
  
  // 4. Préparer le payload pour n8n
  const workflowPayload = {
    name: workflowName,
    nodes: injectedWorkflow.nodes,
    connections: injectedWorkflow.connections,
    settings: deploymentUtils.cleanSettings(injectedWorkflow.settings)
  };
  
  // 4.1. Vérifier la configuration des nœuds HTTP Request avant envoi
  const httpNodes = workflowPayload.nodes.filter(n => 
    n.type === 'n8n-nodes-base.httpRequest' && 
    (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
  );
  if (httpNodes.length > 0) {
    logger.debug('Vérification des nœuds HTTP Request', {
      nodesCount: httpNodes.length,
      nodes: httpNodes.map(n => ({
        name: n.name,
        hasCredentials: !!n.credentials,
        credentialsKeys: n.credentials ? Object.keys(n.credentials) : []
      }))
    });
  }
  
  // 4.2. Vérifier la configuration des nœuds Email Send avant envoi
  const emailNodes = workflowPayload.nodes.filter(n => 
    n.type === 'n8n-nodes-base.emailSend'
  );
  if (emailNodes.length > 0) {
    const nodesWithoutSmtp = emailNodes.filter(n => !n.credentials?.smtp);
    if (nodesWithoutSmtp.length > 0) {
      logger.error('Nœuds Email Send sans credential SMTP', {
        nodes: nodesWithoutSmtp.map(n => n.name)
      });
    } else {
      logger.debug('Tous les nœuds Email Send ont un credential SMTP', {
        nodesCount: emailNodes.length
      });
    }
  }
  
  // 5. Vérifier qu'aucun placeholder n'est présent
  deploymentUtils.verifyNoPlaceholders(workflowPayload);
  
  // 6. Supprimer les workflows existants AVANT de créer le nouveau
  await deploymentUtils.cleanupExistingWorkflows(userId, template.id);
  
  // 7. Créer le workflow dans n8n
  const deployedWorkflow = await deploymentUtils.createWorkflowInN8n(workflowPayload);
  // Le log est déjà fait dans createWorkflowInN8n
  
  // 8. Mettre à jour le workflow avec les credentials (si nécessaire)
  // La fonction updateWorkflowInN8n gère maintenant les retries intelligents
  const updatedWorkflow = await deploymentUtils.updateWorkflowInN8n(deployedWorkflow.id, injectedWorkflow);
  if (updatedWorkflow) {
    Object.assign(deployedWorkflow, updatedWorkflow);
  }
  
  // 9. Activer le workflow
  // La fonction activateWorkflow gère maintenant les retries intelligents
  const workflowActivated = await deploymentUtils.activateWorkflow(deployedWorkflow.id);
  
  if (!workflowActivated) {
    logger.warn('Le workflow n\'a pas pu être activé automatiquement', {
      workflowId: deployedWorkflow.id,
      templateId: template.id
    });
  }
  
  // 10. Enregistrer dans user_workflows
  const userWorkflow = await db.createUserWorkflow({
    userId: userId,
    templateId: template.id,
    n8nWorkflowId: deployedWorkflow.id,
    n8nCredentialId: null,
    name: workflowName,
    isActive: true,
    webhookPath: webhookPath
  });
  
  // 11. Sauvegarder les credentials créés
  await deploymentUtils.saveWorkflowCredentials(userWorkflow.id, injectionResult, userEmail);
  
  logger.info('Workflow CV Analysis déployé avec succès', {
    workflowId: userWorkflow.id,
    n8nWorkflowId: deployedWorkflow.id,
    templateId: template.id,
    userEmail
  });
  
  return {
    success: true,
    message: 'Workflow CV Analysis déployé avec succès',
    workflow: {
      id: userWorkflow.id,
      name: userWorkflow.name,
      n8n_workflow_id: deployedWorkflow.id,
      status: userWorkflow.status
    }
  };
}

module.exports = { deployWorkflow };

