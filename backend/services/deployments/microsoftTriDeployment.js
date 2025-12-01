// Déploiement spécifique pour "Microsoft Tri Automatique BAL"
// Utilise directement microsoftTriInjector et les fonctions utilitaires

const microsoftTriInjector = require('../injectors/microsoftTriInjector');
const db = require('../../database');
const deploymentUtils = require('./deploymentUtils');
const logger = require('../../utils/logger');

/**
 * Déploie le workflow "Microsoft Tri" avec sa logique spécifique
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  logger.info('Déploiement spécifique du workflow Microsoft Tri', {
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
  
  // 3. Injecter les credentials avec l'injecteur spécifique Microsoft Tri
  logger.debug('Injection des credentials avec microsoftTriInjector', { templateId: template.id });
  const injectionResult = await microsoftTriInjector.injectUserCredentials(
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
  
  // 5. Vérifier qu'aucun placeholder n'est présent
  deploymentUtils.verifyNoPlaceholders(workflowPayload);
  
  // 6. Supprimer les workflows existants AVANT de créer le nouveau
  await deploymentUtils.cleanupExistingWorkflows(userId, template.id);
  
  // 7. Créer le workflow dans n8n
  const deployedWorkflow = await deploymentUtils.createWorkflowInN8n(workflowPayload);
  // Le log est déjà fait dans createWorkflowInN8n
  
  // 8. Mettre à jour le workflow avec les credentials (si nécessaire)
  await new Promise(resolve => setTimeout(resolve, 1000));
  const updatedWorkflow = await deploymentUtils.updateWorkflowInN8n(deployedWorkflow.id, injectedWorkflow);
  if (updatedWorkflow) {
    Object.assign(deployedWorkflow, updatedWorkflow);
  }
  
  // 9. Activer le workflow
  await new Promise(resolve => setTimeout(resolve, 2000));
  try {
    const workflowActivated = await deploymentUtils.activateWorkflow(deployedWorkflow.id);
    
    if (!workflowActivated) {
      logger.warn('Le workflow n\'a pas pu être activé automatiquement', {
        workflowId: deployedWorkflow.id,
        templateId: template.id
      });
      throw new Error('Le workflow n\'a pas pu être activé dans n8n. Vérifiez les logs pour plus de détails.');
    }
    
    logger.info('Workflow activé avec succès', { workflowId: deployedWorkflow.id });
  } catch (activationError) {
    logger.error('Erreur lors de l\'activation du workflow', {
      workflowId: deployedWorkflow.id,
      error: activationError.message
    });
    throw new Error(`Impossible d'activer le workflow dans n8n: ${activationError.message}`);
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
  
  logger.info('Workflow Microsoft Tri déployé avec succès', {
    workflowId: userWorkflow.id,
    n8nWorkflowId: deployedWorkflow.id,
    templateId: template.id,
    userEmail
  });
  
  return {
    success: true,
    message: 'Workflow Microsoft Tri déployé avec succès',
    workflow: {
      id: userWorkflow.id,
      name: userWorkflow.name,
      n8n_workflow_id: deployedWorkflow.id,
      status: userWorkflow.status
    }
  };
}

module.exports = { deployWorkflow };

