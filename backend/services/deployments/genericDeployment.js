// Déploiement générique pour les workflows sans déploiement spécifique
// Contient toute la logique commune de déploiement

const fetch = require('node-fetch');
const { injectUserCredentials } = require('../injectors');
const config = require('../../config');
const db = require('../../database');

/**
 * Nettoie l'objet settings pour n8n (n'accepte que {} lors de la création)
 */
function cleanSettings(settings) {
  return {};
}

/**
 * Vérifie qu'aucun placeholder n'est présent dans le payload
 */
function verifyNoPlaceholders(workflowPayload) {
  const payloadString = JSON.stringify(workflowPayload);
  const hasPlaceholder = payloadString.includes('ADMIN_OPENROUTER_CREDENTIAL_ID') ||
                        payloadString.includes('ADMIN_OPENROUTER_CREDENTIAL_NAME') ||
                        (payloadString.includes('USER_') && payloadString.includes('_CREDENTIAL_ID'));
  
  if (hasPlaceholder) {
    // Vérifier chaque nœud pour identifier le problème
    workflowPayload.nodes?.forEach(node => {
      if (node.credentials) {
        Object.keys(node.credentials).forEach(credType => {
          const cred = node.credentials[credType];
          const isPlaceholder = cred?.id?.includes('ADMIN_OPENROUTER') ||
                               cred?.id?.includes('ADMIN_SMTP') ||
                               (cred?.id?.includes('USER_') && cred?.id?.includes('_CREDENTIAL_ID')) ||
                               cred?.id === 'USER_GOOGLE_CREDENTIAL_ID' ||
                               cred?.id === 'USER_GOOGLE_SHEETS_CREDENTIAL_ID';
          if (isPlaceholder) {
            console.error(`❌ [GenericDeployment] Nœud ${node.name} a un placeholder: ${cred.id}`);
          }
        });
      }
    });
    throw new Error('Des placeholders sont encore présents dans le workflow. Les credentials doivent être remplacés avant l\'envoi à n8n.');
  }
}

/**
 * Crée le workflow dans n8n
 */
async function createWorkflowInN8n(workflowPayload) {
  const n8nUrl = config.n8n.url;
  
  console.log('🔧 [GenericDeployment] Création du workflow dans n8n...');
  console.log('  - Nom:', workflowPayload.name);
  console.log('  - Nœuds:', workflowPayload.nodes?.length);
  console.log('  - Connexions:', Object.keys(workflowPayload.connections || {}).length);
  
  // ⚠️ CORRECTION: Utiliser config.n8n.url au lieu de localhost:3004
  const deployResponse = await fetch(`${n8nUrl}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': config.n8n.apiKey
    },
    body: JSON.stringify(workflowPayload)
  });
  
  if (!deployResponse.ok) {
    const error = await deployResponse.text();
    throw new Error(`Erreur déploiement n8n: ${error}`);
  }
  
  return await deployResponse.json();
}

/**
 * Met à jour le workflow dans n8n avec les credentials
 */
async function updateWorkflowInN8n(workflowId, injectedWorkflow) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  try {
    const updatePayload = {
      name: injectedWorkflow.name,
      nodes: injectedWorkflow.nodes,
      connections: injectedWorkflow.connections,
      settings: cleanSettings(injectedWorkflow.settings)
    };
    
    const updateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (updateResponse.ok) {
      const updatedWorkflow = await updateResponse.json();
      console.log('✅ [GenericDeployment] Workflow mis à jour avec les credentials');
      return updatedWorkflow;
    } else {
      const errorText = await updateResponse.text();
      console.warn('⚠️ [GenericDeployment] Impossible de mettre à jour le workflow:', errorText);
      return null;
    }
  } catch (updateError) {
    console.warn('⚠️ [GenericDeployment] Erreur mise à jour workflow:', updateError.message);
    return null;
  }
}

/**
 * Active le workflow dans n8n
 */
async function activateWorkflow(workflowId) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  console.log('🔧 [GenericDeployment] Activation automatique du workflow...');
  
  try {
    const activateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      },
      body: JSON.stringify({})
    });
    
    if (activateResponse.ok) {
      const activateResult = await activateResponse.json();
      console.log('✅ [GenericDeployment] Workflow activé:', activateResult.active);
      
      // Vérifier le statut final après un délai
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey
        }
      });
      
      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        if (statusResult.active) {
          console.log('✅ [GenericDeployment] Workflow confirmé actif dans n8n');
          return true;
        } else {
          console.warn('⚠️ [GenericDeployment] Workflow non actif après activation');
          return false;
        }
      }
    } else {
      const errorText = await activateResponse.text();
      console.error('❌ [GenericDeployment] Impossible d\'activer le workflow:', errorText);
      return false;
    }
  } catch (activateError) {
    console.error('❌ [GenericDeployment] Erreur activation:', activateError.message);
    return false;
  }
  
  return false;
}

/**
 * Supprime les workflows existants pour cet utilisateur et ce template
 */
async function cleanupExistingWorkflows(userId, templateId) {
  console.log('🔍 [GenericDeployment] Vérification des workflows existants...');
  
  try {
    const existingWorkflows = await db.query(
      'SELECT * FROM user_workflows WHERE user_id = $1 AND template_id = $2',
      [userId, templateId]
    );
    
    if (existingWorkflows.rows && existingWorkflows.rows.length > 0) {
      console.log(`🔍 [GenericDeployment] ${existingWorkflows.rows.length} workflow(s) existant(s) trouvé(s)`);
      
      const n8nUrl = config.n8n.url;
      const n8nApiKey = config.n8n.apiKey;
      
      for (const existingWorkflow of existingWorkflows.rows) {
        // Supprimer les credentials associés
        try {
          const workflowCredentials = await db.getWorkflowCredentials(existingWorkflow.id);
          if (workflowCredentials && workflowCredentials.length > 0) {
            for (const cred of workflowCredentials) {
              if (cred.credential_id) {
                // Protection: Ne jamais supprimer les credentials partagés (OpenRouter)
                const isSharedCredential = cred.credential_id === 'o7MztG7VAoDGoDSp' ||
                                         cred.credential_id === 'hgQk9lN7epSIRRcg' ||
                                         cred.credential_name?.toLowerCase().includes('header auth account 2');
                
                if (!isSharedCredential) {
                  try {
                    await fetch(`${n8nUrl}/api/v1/credentials/${cred.credential_id}`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-N8N-API-KEY': n8nApiKey
                      }
                    });
                    console.log(`✅ [GenericDeployment] Credential supprimé: ${cred.credential_name}`);
                  } catch (credError) {
                    console.warn(`⚠️ [GenericDeployment] Erreur suppression credential:`, credError.message);
                  }
                }
              }
            }
          }
        } catch (credError) {
          console.warn('⚠️ [GenericDeployment] Erreur récupération credentials:', credError.message);
        }
        
        // Supprimer le workflow de n8n
        if (existingWorkflow.n8n_workflow_id) {
          try {
            await fetch(`${n8nUrl}/api/v1/workflows/${existingWorkflow.n8n_workflow_id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': n8nApiKey
              }
            });
            console.log(`✅ [GenericDeployment] Ancien workflow supprimé de n8n: ${existingWorkflow.n8n_workflow_id}`);
          } catch (deleteError) {
            console.warn(`⚠️ [GenericDeployment] Erreur suppression workflow n8n:`, deleteError.message);
          }
        }
        
        // Supprimer de la base de données
        await db.query('DELETE FROM user_workflows WHERE id = $1', [existingWorkflow.id]);
        console.log(`✅ [GenericDeployment] Ancien workflow supprimé de la BDD: ${existingWorkflow.id}`);
      }
    }
  } catch (checkError) {
    console.warn('⚠️ [GenericDeployment] Erreur vérification workflows existants:', checkError.message);
  }
}

/**
 * Sauvegarde les credentials créés dans workflow_credentials
 */
async function saveWorkflowCredentials(userWorkflowId, injectionResult, userEmail) {
  try {
    if (!injectionResult || !injectionResult.createdCredentials) {
      console.log('ℹ️ [GenericDeployment] Aucun credential créé à sauvegarder');
      return;
    }
    
    const credentialsToSave = [];
    
    for (const [credType, cred] of Object.entries(injectionResult.createdCredentials)) {
      if (cred && cred.id) {
        credentialsToSave.push({
          id: cred.id,
          name: cred.name || `${credType} - ${userEmail}`,
          type: credType
        });
      }
    }
    
    if (credentialsToSave.length > 0) {
      await db.saveWorkflowCredentials(userWorkflowId, credentialsToSave);
      console.log(`✅ [GenericDeployment] ${credentialsToSave.length} credential(s) sauvegardé(s)`);
    }
  } catch (credSaveError) {
    console.error('❌ [GenericDeployment] Erreur sauvegarde credentials:', credSaveError.message);
  }
}

/**
 * Déploie un workflow de manière générique
 */
async function deployWorkflow(template, credentials, userId, userEmail) {
  console.log('🚀 [GenericDeployment] Déploiement générique du workflow:', template.name);
  
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
  
  // 3. Injecter les credentials
  console.log('🔧 [GenericDeployment] Injection des credentials...');
  const injectionResult = await injectUserCredentials(workflowJson, credentials, userId, template.id, template.name);
  
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
    settings: cleanSettings(injectedWorkflow.settings)
  };
  
  // 5. Vérifier qu'aucun placeholder n'est présent
  verifyNoPlaceholders(workflowPayload);
  
  // 6. Supprimer les workflows existants AVANT de créer le nouveau
  await cleanupExistingWorkflows(userId, template.id);
  
  // 7. Créer le workflow dans n8n
  const deployedWorkflow = await createWorkflowInN8n(workflowPayload);
  console.log('✅ [GenericDeployment] Workflow créé dans n8n:', deployedWorkflow.id);
  
  // 8. Mettre à jour le workflow avec les credentials (si nécessaire)
  await new Promise(resolve => setTimeout(resolve, 1000));
  const updatedWorkflow = await updateWorkflowInN8n(deployedWorkflow.id, injectedWorkflow);
  if (updatedWorkflow) {
    Object.assign(deployedWorkflow, updatedWorkflow);
  }
  
  // 9. Activer le workflow
  await new Promise(resolve => setTimeout(resolve, 2000));
  const workflowActivated = await activateWorkflow(deployedWorkflow.id);
  
  if (!workflowActivated) {
    console.warn('⚠️ [GenericDeployment] Le workflow n\'a pas pu être activé automatiquement');
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
  await saveWorkflowCredentials(userWorkflow.id, injectionResult, userEmail);
  
  console.log('✅ [GenericDeployment] Workflow déployé avec succès:', deployedWorkflow.id);
  
  return {
    success: true,
    message: 'Workflow déployé avec succès',
    workflow: {
      id: userWorkflow.id,
      name: userWorkflow.name,
      n8n_workflow_id: deployedWorkflow.id,
      status: userWorkflow.status
    }
  };
}

module.exports = { deployWorkflow };

