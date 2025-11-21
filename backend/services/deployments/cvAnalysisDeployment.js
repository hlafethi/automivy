// Déploiement spécifique pour "CV Analysis and Candidate Evaluation"
// Utilise directement cvAnalysisInjector et les fonctions utilitaires

const cvAnalysisInjector = require('../injectors/cvAnalysisInjector');
const db = require('../../database');
const deploymentUtils = require('./deploymentUtils');

/**
 * Déploie le workflow "CV Analysis" avec sa logique spécifique
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  console.log('🚀 [CVAnalysisDeployment] Déploiement spécifique du workflow CV Analysis...');
  console.log('🚀 [CVAnalysisDeployment] Template:', template.name);
  console.log('🚀 [CVAnalysisDeployment] User:', userEmail);
  
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
  console.log('🔧 [CVAnalysisDeployment] Injection des credentials avec cvAnalysisInjector...');
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
  
  // 4.1. DEBUG: Vérifier la configuration des nœuds HTTP Request avant envoi
  const httpNodes = workflowPayload.nodes.filter(n => 
    n.type === 'n8n-nodes-base.httpRequest' && 
    (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
  );
  httpNodes.forEach(node => {
    console.log(`🔍 [CVAnalysisDeployment] Nœud ${node.name} - Configuration avant envoi:`);
    console.log(`  - Authentication: ${node.parameters?.authentication || 'non défini'}`);
    console.log(`  - Credentials:`, node.credentials ? Object.keys(node.credentials) : 'aucun');
    if (node.parameters?.options?.headerParameters?.parameters) {
      const authHeader = node.parameters.options.headerParameters.parameters.find(p => p.name === 'Authorization');
      if (authHeader) {
        console.log(`  - Header Authorization: ${authHeader.value}`);
      }
    }
  });
  
  // 4.2. DEBUG: Vérifier la configuration des nœuds Email Send avant envoi
  const emailNodes = workflowPayload.nodes.filter(n => 
    n.type === 'n8n-nodes-base.emailSend'
  );
  console.log(`🔍 [CVAnalysisDeployment] Vérification des nœuds Email Send (${emailNodes.length} trouvé(s))...`);
  emailNodes.forEach(node => {
    console.log(`🔍 [CVAnalysisDeployment] Nœud ${node.name} - Configuration SMTP avant envoi:`);
    console.log(`  - Credentials:`, node.credentials ? Object.keys(node.credentials) : 'aucun');
    if (node.credentials?.smtp) {
      console.log(`  - SMTP ID: ${node.credentials.smtp.id}`);
      console.log(`  - SMTP Name: ${node.credentials.smtp.name}`);
    } else {
      console.error(`  ❌ ERREUR: Aucun credential SMTP trouvé dans ${node.name}!`);
      console.error(`  ❌ Node credentials complet:`, JSON.stringify(node.credentials, null, 2));
    }
  });
  
  // 5. Vérifier qu'aucun placeholder n'est présent
  deploymentUtils.verifyNoPlaceholders(workflowPayload);
  
  // 6. Supprimer les workflows existants AVANT de créer le nouveau
  await deploymentUtils.cleanupExistingWorkflows(userId, template.id);
  
  // 7. Créer le workflow dans n8n
  const deployedWorkflow = await deploymentUtils.createWorkflowInN8n(workflowPayload);
  console.log('✅ [CVAnalysisDeployment] Workflow créé dans n8n:', deployedWorkflow.id);
  
  // 8. Mettre à jour le workflow avec les credentials (si nécessaire)
  await new Promise(resolve => setTimeout(resolve, 1000));
  const updatedWorkflow = await deploymentUtils.updateWorkflowInN8n(deployedWorkflow.id, injectedWorkflow);
  if (updatedWorkflow) {
    Object.assign(deployedWorkflow, updatedWorkflow);
  }
  
  // 9. Activer le workflow
  await new Promise(resolve => setTimeout(resolve, 2000));
  const workflowActivated = await deploymentUtils.activateWorkflow(deployedWorkflow.id);
  
  if (!workflowActivated) {
    console.warn('⚠️ [CVAnalysisDeployment] Le workflow n\'a pas pu être activé automatiquement');
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
  
  console.log('✅ [CVAnalysisDeployment] Workflow déployé avec succès:', deployedWorkflow.id);
  
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

