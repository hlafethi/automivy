// Déploiement spécifique pour les workflows LinkedIn Post Generator
// ⚠️ IMPORTANT: Les 3 workflows LinkedIn sont déployés ENSEMBLE car ils travaillent en groupe
// - LinkedIn Post Generator (principal)
// - LinkedIn Token Monitor (surveillance)
// - LinkedIn OAuth Handler (authentification)
// Ils partagent les mêmes credentials et tables NocoDB

const linkedinPostInjector = require('../injectors/linkedinPostInjector');
const nocoDbService = require('../nocoDbService');
const db = require('../../database');
const deploymentUtils = require('./deploymentUtils');
const logger = require('../../utils/logger');

/**
 * Déploie les 3 workflows LinkedIn ensemble avec les mêmes credentials
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  logger.info('💼 Déploiement groupé des workflows LinkedIn', {
    templateName: template.name,
    templateId: template.id,
    userEmail,
    userId
  });
  
  // 1. Identifier les 3 workflows LinkedIn à déployer ensemble
  // Les workflows LinkedIn travaillent en groupe et partagent les mêmes credentials
  const linkedinWorkflowPatterns = [
    { pattern: /post.*generator|generator.*post/i, name: 'Post Generator' },
    { pattern: /token.*monitor|monitor.*token|surveillance/i, name: 'Token Monitor' },
    { pattern: /oauth.*handler|handler.*oauth|inscription|reconnexion/i, name: 'OAuth Handler' }
  ];
  
  // Récupérer tous les templates LinkedIn depuis la BDD
  const allTemplates = await db.getTemplates(userId, 'user');
  const linkedinTemplates = allTemplates.filter(t => 
    t.name?.toLowerCase().includes('linkedin')
  );
  
  // Si on a trouvé des templates LinkedIn, les utiliser
  // Sinon, utiliser seulement le template fourni (cas où un seul template est créé)
  let templatesToDeploy;
  
  if (linkedinTemplates.length >= 2) {
    // Dédupliquer par ID
    const uniqueTemplates = [];
    const seenIds = new Set();
    for (const t of linkedinTemplates) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        uniqueTemplates.push(t);
      }
    }
    
    // Trier pour avoir l'ordre logique : OAuth Handler -> Token Monitor -> Post Generator
    uniqueTemplates.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      
      if (aName.includes('oauth') || aName.includes('handler')) return -1;
      if (bName.includes('oauth') || bName.includes('handler')) return 1;
      if (aName.includes('monitor') || aName.includes('token')) return -1;
      if (bName.includes('monitor') || bName.includes('token')) return 1;
      return 0;
    });
    
    templatesToDeploy = uniqueTemplates;
    logger.info('💼 [LinkedInPostDeployment] Déploiement groupé de workflows LinkedIn:', {
      count: templatesToDeploy.length,
      names: templatesToDeploy.map(t => t.name)
    });
  } else {
    // Cas où un seul template LinkedIn est fourni (déploiement initial)
    // On déploie seulement celui-ci, les autres seront déployés lors d'un prochain déploiement
    templatesToDeploy = [template];
    logger.info('💼 [LinkedInPostDeployment] Déploiement d\'un seul workflow LinkedIn (les autres seront déployés séparément):', {
      name: template.name
    });
  }
  
  const deployedWorkflows = [];
  const errors = [];
  
  // 2. Créer les tables NocoDB pour cet utilisateur (AVANT l'injection pour récupérer les IDs)
  let userTables = { postsTable: null, usersTable: null };
  try {
    logger.info('📊 [LinkedInPostDeployment] Création des tables NocoDB pour l\'utilisateur...', { userId, userEmail });
    userTables = await nocoDbService.createUserTables(userId, userEmail);
    logger.info('✅ [LinkedInPostDeployment] Tables NocoDB créées/récupérées:', {
      postsTable: userTables.postsTable?.table_name || userTables.postsTable?.title,
      postsTableId: userTables.postsTable?.id,
      usersTable: userTables.usersTable?.table_name || userTables.usersTable?.title,
      usersTableId: userTables.usersTable?.id
    });
  } catch (tableError) {
    logger.error('❌ [LinkedInPostDeployment] Erreur création tables NocoDB:', tableError);
    // Ne pas bloquer le déploiement si les tables existent déjà ou si c'est une erreur non critique
    if (!tableError.message.includes('existe déjà')) {
      logger.warn('⚠️ [LinkedInPostDeployment] Les tables seront créées lors de la première utilisation');
    }
  }
  
  // 3. Déployer chaque workflow avec les mêmes credentials
  for (const linkedinTemplate of templatesToDeploy) {
    try {
      logger.info(`💼 [LinkedInPostDeployment] Déploiement du workflow: ${linkedinTemplate.name}`, {
        templateId: linkedinTemplate.id
      });
      
      // Parser le JSON du template
      let workflowJson;
      try {
        workflowJson = typeof linkedinTemplate.json === 'string'
          ? JSON.parse(linkedinTemplate.json)
          : linkedinTemplate.json;
      } catch (parseErr) {
        throw new Error(`JSON du workflow invalide pour ${linkedinTemplate.name}: ${parseErr.message}`);
      }
      
      if (!workflowJson) {
        throw new Error(`Template JSON manquant pour ${linkedinTemplate.name}`);
      }
      
      // Définir le nom du workflow
      const workflowName = `${linkedinTemplate.name} - ${userEmail}`;
      
      // Injecter les credentials avec l'injecteur spécifique LinkedIn (mêmes credentials pour tous)
      // Passer les tables créées pour injecter les IDs dans les nœuds NocoDB
      logger.debug('Injection des credentials avec linkedinPostInjector', { 
        templateId: linkedinTemplate.id,
        templateName: linkedinTemplate.name,
        hasTables: !!(userTables.postsTable || userTables.usersTable)
      });
      const injectionResult = await linkedinPostInjector.injectUserCredentials(
        workflowJson, 
        credentials, 
        userId, 
        linkedinTemplate.id, 
        linkedinTemplate.name,
        userTables // Passer les tables créées pour injection des IDs
      );
      
      if (!injectionResult || !injectionResult.workflow) {
        throw new Error(`Injection échouée pour ${linkedinTemplate.name}: injectionResult ou workflow manquant`);
      }
      
      const injectedWorkflow = injectionResult.workflow;
      const webhookPath = injectionResult.webhookPath;
      injectedWorkflow.name = workflowName;
      
      // Préparer le payload pour n8n
      const workflowPayload = {
        name: workflowName,
        nodes: injectedWorkflow.nodes,
        connections: injectedWorkflow.connections,
        settings: deploymentUtils.cleanSettings(injectedWorkflow.settings)
      };
      
      // ⚠️ CRITIQUE: Vérifier que tous les nœuds référencés dans les connections existent
      const nodeNames = new Set(workflowPayload.nodes.map(n => n.name));
      const missingNodes = [];
      
      if (workflowPayload.connections) {
        Object.keys(workflowPayload.connections).forEach(sourceNodeName => {
          if (!nodeNames.has(sourceNodeName)) {
            missingNodes.push(`Source: ${sourceNodeName}`);
          }
          
          const connections = workflowPayload.connections[sourceNodeName];
          Object.values(connections).forEach(connectionArray => {
            if (Array.isArray(connectionArray)) {
              connectionArray.forEach(connectionGroup => {
                if (Array.isArray(connectionGroup)) {
                  connectionGroup.forEach(connection => {
                    if (connection.node && !nodeNames.has(connection.node)) {
                      missingNodes.push(`Target: ${connection.node} (from ${sourceNodeName})`);
                    }
                  });
                }
              });
            }
          });
        });
      }
      
      if (missingNodes.length > 0) {
        logger.error('❌ [LinkedInPostDeployment] Nœuds manquants dans le workflow', {
          workflow: linkedinTemplate.name,
          missingNodes: [...new Set(missingNodes)]
        });
        throw new Error(`Nœuds manquants dans le workflow ${linkedinTemplate.name}: ${[...new Set(missingNodes)].join(', ')}`);
      }
      
      // Vérifications spécifiques LinkedIn
      // Vérifier que LinkedIn OAuth2 est configuré (sauf pour le workflow OAuth handler lui-même)
      if (!linkedinTemplate.name?.toLowerCase().includes('oauth') && 
          !linkedinTemplate.name?.toLowerCase().includes('handler')) {
        const linkedinNodes = workflowPayload.nodes.filter(n => 
          n.type === 'n8n-nodes-base.linkedIn'
        );
        
        if (linkedinNodes.length > 0) {
          const nodesWithoutOAuth = linkedinNodes.filter(n => !n.credentials?.linkedInOAuth2Api);
          if (nodesWithoutOAuth.length > 0) {
            logger.warn('⚠️ [LinkedInPostDeployment] Nœuds LinkedIn sans credential OAuth2', {
              workflow: linkedinTemplate.name,
              nodes: nodesWithoutOAuth.map(n => n.name)
            });
            // Ne pas bloquer, l'utilisateur pourra se connecter plus tard
          }
        }
      }
      
      // ⚠️ CRITIQUE: Vérifier que NocoDB est configuré et FORCER la présence des credentials
      const nocoDbNodes = workflowPayload.nodes.filter(n => 
        n.type === 'n8n-nodes-base.nocoDb' ||
        n.type?.toLowerCase().includes('nocodb') ||
        n.name?.toLowerCase().includes('nocodb')
      );
      
      if (nocoDbNodes.length > 0) {
        const nodesWithoutNocoDb = nocoDbNodes.filter(n => !n.credentials?.nocoDbApiToken);
        if (nodesWithoutNocoDb.length > 0) {
          logger.error('❌ [LinkedInPostDeployment] Nœuds NocoDB sans credential', {
            workflow: linkedinTemplate.name,
            nodes: nodesWithoutNocoDb.map(n => n.name)
          });
          
          // ⚠️ CRITIQUE: Forcer l'ajout des credentials si ils sont manquants
          const nocoDbCredentialId = injectionResult.createdCredentials?.nocoDbApiToken?.id;
          if (nocoDbCredentialId) {
            logger.warn('⚠️ [LinkedInPostDeployment] Forçage de l\'ajout des credentials NocoDB manquants');
            nodesWithoutNocoDb.forEach(node => {
              if (!node.credentials) {
                node.credentials = {};
              }
              node.credentials.nocoDbApiToken = {
                id: nocoDbCredentialId,
                name: injectionResult.createdCredentials.nocoDbApiToken?.name || 'NocoDB Token account'
              };
              logger.info(`✅ [LinkedInPostDeployment] Credential NocoDB forcé pour ${node.name}`);
            });
          } else {
            throw new Error(`Credential NocoDB manquant pour ${linkedinTemplate.name}. Veuillez fournir votre token NocoDB.`);
          }
        }
      }
      
      // Vérifier qu'aucun placeholder n'est présent
      deploymentUtils.verifyNoPlaceholders(workflowPayload);
      
      // Supprimer les workflows existants AVANT de créer le nouveau
      await deploymentUtils.cleanupExistingWorkflows(userId, linkedinTemplate.id);
      
      // Créer le workflow dans n8n
      const deployedWorkflow = await deploymentUtils.createWorkflowInN8n(workflowPayload);
      
      // Mettre à jour le workflow avec les credentials (si nécessaire)
      const updatedWorkflow = await deploymentUtils.updateWorkflowInN8n(deployedWorkflow.id, injectedWorkflow);
      if (updatedWorkflow) {
        Object.assign(deployedWorkflow, updatedWorkflow);
      }
      
      // Activer le workflow (tous les workflows LinkedIn doivent être actifs)
      const workflowActivated = await deploymentUtils.activateWorkflow(deployedWorkflow.id);
      
      if (!workflowActivated) {
        logger.warn('Le workflow n\'a pas pu être activé automatiquement', {
          workflowId: deployedWorkflow.id,
          templateId: linkedinTemplate.id,
          workflowName: linkedinTemplate.name
        });
      }
      
      // Enregistrer dans user_workflows
      const userWorkflow = await db.createUserWorkflow({
        userId: userId,
        templateId: linkedinTemplate.id,
        n8nWorkflowId: deployedWorkflow.id,
        n8nCredentialId: null,
        name: workflowName,
        isActive: true,
        webhookPath: webhookPath
      });
      
      // Sauvegarder les credentials créés (partagés entre les 3 workflows)
      await deploymentUtils.saveWorkflowCredentials(userWorkflow.id, injectionResult, userEmail);
      
      deployedWorkflows.push({
        id: userWorkflow.id,
        name: userWorkflow.name,
        n8n_workflow_id: deployedWorkflow.id,
        templateName: linkedinTemplate.name,
        status: userWorkflow.status
      });
      
      logger.info(`✅ [LinkedInPostDeployment] Workflow "${linkedinTemplate.name}" déployé avec succès`, {
        workflowId: userWorkflow.id,
        n8nWorkflowId: deployedWorkflow.id,
        templateId: linkedinTemplate.id
      });
      
    } catch (error) {
      logger.error(`❌ [LinkedInPostDeployment] Erreur déploiement workflow "${linkedinTemplate.name}"`, {
        templateId: linkedinTemplate.id,
        error: error.message
      });
      errors.push({
        templateName: linkedinTemplate.name,
        templateId: linkedinTemplate.id,
        error: error.message
      });
    }
  }
  
  // 3. Retourner le résultat groupé
  if (errors.length > 0 && deployedWorkflows.length === 0) {
    // Tous les déploiements ont échoué
    throw new Error(`Échec du déploiement des workflows LinkedIn: ${errors.map(e => e.error).join('; ')}`);
  }
  
  const successCount = deployedWorkflows.length;
  const totalCount = templatesToDeploy.length;
  
  logger.info('💼 [LinkedInPostDeployment] Déploiement groupé terminé', {
    successCount,
    totalCount,
    errorsCount: errors.length
  });
  
  return {
    success: true,
    message: `Workflows LinkedIn déployés: ${successCount}/${totalCount} réussis`,
    workflows: deployedWorkflows,
    errors: errors.length > 0 ? errors : undefined,
    isGroupDeployment: true
  };
}

module.exports = { deployWorkflow };

