// Fonctions utilitaires pour les déploiements
// Ces fonctions sont partagées entre tous les déploiements spécifiques

const fetch = require('node-fetch');
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
            console.error(`❌ [DeploymentUtils] Nœud ${node.name} a un placeholder: ${cred.id}`);
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
  
  console.log('🔧 [DeploymentUtils] Création du workflow dans n8n...');
  console.log('  - Nom:', workflowPayload.name);
  console.log('  - Nœuds:', workflowPayload.nodes?.length);
  console.log('  - Connexions:', Object.keys(workflowPayload.connections || {}).length);
  
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
    // DEBUG: Vérifier les credentials dans les nœuds HTTP Request avant update
    const httpNodes = injectedWorkflow.nodes.filter(n => 
      n.type === 'n8n-nodes-base.httpRequest' && 
      (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
    );
    console.log('🔍 [DeploymentUtils] Vérification credentials avant update...');
    httpNodes.forEach(node => {
      console.log(`  - Nœud ${node.name}:`, 
        node.credentials ? Object.keys(node.credentials) : 'aucun credential');
      if (node.credentials?.openRouterApi) {
        console.log(`    - openRouterApi: ${node.credentials.openRouterApi.id} (${node.credentials.openRouterApi.name})`);
      }
      if (node.credentials?.httpHeaderAuth) {
        console.log(`    - httpHeaderAuth: ${node.credentials.httpHeaderAuth.id} (${node.credentials.httpHeaderAuth.name})`);
      }
    });
    
    // DEBUG: Vérifier les credentials SMTP dans les nœuds Email Send avant update
    const emailNodes = injectedWorkflow.nodes.filter(n => 
      n.type === 'n8n-nodes-base.emailSend'
    );
    console.log(`🔍 [DeploymentUtils] Vérification credentials SMTP avant update (${emailNodes.length} nœud(s) emailSend)...`);
    emailNodes.forEach(node => {
      console.log(`  - Nœud ${node.name}:`, 
        node.credentials ? Object.keys(node.credentials) : 'aucun credential');
      if (node.credentials?.smtp) {
        console.log(`    ✅ SMTP: ${node.credentials.smtp.id} (${node.credentials.smtp.name})`);
      } else {
        console.error(`    ❌ ERREUR: Aucun credential SMTP dans ${node.name}!`);
        console.error(`    ❌ Node credentials complet:`, JSON.stringify(node.credentials, null, 2));
      }
    });
    
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
      console.log('✅ [DeploymentUtils] Workflow mis à jour avec les credentials');
      
      // DEBUG: Vérifier les credentials dans le workflow retourné par n8n
      const updatedHttpNodes = updatedWorkflow.nodes.filter(n => 
        n.type === 'n8n-nodes-base.httpRequest' && 
        (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
      );
      updatedHttpNodes.forEach(node => {
        console.log(`🔍 [DeploymentUtils] Nœud ${node.name} après update:`, 
          node.credentials ? Object.keys(node.credentials) : 'aucun credential');
        if (node.credentials?.openRouterApi) {
          console.log(`    - openRouterApi: ${node.credentials.openRouterApi.id} (${node.credentials.openRouterApi.name})`);
        }
        if (node.credentials?.httpHeaderAuth) {
          console.log(`    - httpHeaderAuth: ${node.credentials.httpHeaderAuth.id} (${node.credentials.httpHeaderAuth.name})`);
        }
      });
      
      return updatedWorkflow;
    } else {
      const errorText = await updateResponse.text();
      console.warn('⚠️ [DeploymentUtils] Impossible de mettre à jour le workflow:', errorText);
      return null;
    }
  } catch (updateError) {
    console.warn('⚠️ [DeploymentUtils] Erreur mise à jour workflow:', updateError.message);
    return null;
  }
}

/**
 * Active le workflow dans n8n
 */
async function activateWorkflow(workflowId) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  console.log('🔧 [DeploymentUtils] Activation automatique du workflow...');
  
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
      console.log('✅ [DeploymentUtils] Workflow activé:', activateResult.active);
      
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
          console.log('✅ [DeploymentUtils] Workflow confirmé actif dans n8n');
          return true;
        } else {
          console.warn('⚠️ [DeploymentUtils] Workflow non actif après activation');
          return false;
        }
      }
    } else {
      const errorText = await activateResponse.text();
      console.error('❌ [DeploymentUtils] Impossible d\'activer le workflow:', errorText);
      return false;
    }
  } catch (activateError) {
    console.error('❌ [DeploymentUtils] Erreur activation:', activateError.message);
    return false;
  }
  
  return false;
}

/**
 * Supprime les workflows existants pour cet utilisateur et ce template
 */
async function cleanupExistingWorkflows(userId, templateId) {
  console.log('🔍 [DeploymentUtils] Vérification des workflows existants...');
  
  try {
    const existingWorkflows = await db.query(
      'SELECT * FROM user_workflows WHERE user_id = $1 AND template_id = $2',
      [userId, templateId]
    );
    
    if (existingWorkflows.rows && existingWorkflows.rows.length > 0) {
      console.log(`🔍 [DeploymentUtils] ${existingWorkflows.rows.length} workflow(s) existant(s) trouvé(s)`);
      
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
                    console.log(`✅ [DeploymentUtils] Credential supprimé: ${cred.credential_name}`);
                  } catch (credError) {
                    console.warn(`⚠️ [DeploymentUtils] Erreur suppression credential:`, credError.message);
                  }
                }
              }
            }
          }
        } catch (credError) {
          console.warn('⚠️ [DeploymentUtils] Erreur récupération credentials:', credError.message);
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
            console.log(`✅ [DeploymentUtils] Ancien workflow supprimé de n8n: ${existingWorkflow.n8n_workflow_id}`);
          } catch (deleteError) {
            console.warn(`⚠️ [DeploymentUtils] Erreur suppression workflow n8n:`, deleteError.message);
          }
        }
        
        // Supprimer de la base de données
        await db.query('DELETE FROM user_workflows WHERE id = $1', [existingWorkflow.id]);
        console.log(`✅ [DeploymentUtils] Ancien workflow supprimé de la BDD: ${existingWorkflow.id}`);
      }
    }
  } catch (checkError) {
    console.warn('⚠️ [DeploymentUtils] Erreur vérification workflows existants:', checkError.message);
  }
}

/**
 * Sauvegarde les credentials créés dans workflow_credentials
 */
async function saveWorkflowCredentials(userWorkflowId, injectionResult, userEmail) {
  try {
    if (!injectionResult || !injectionResult.createdCredentials) {
      console.log('ℹ️ [DeploymentUtils] Aucun credential créé à sauvegarder');
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
      console.log(`✅ [DeploymentUtils] ${credentialsToSave.length} credential(s) sauvegardé(s)`);
    }
  } catch (credSaveError) {
    console.error('❌ [DeploymentUtils] Erreur sauvegarde credentials:', credSaveError.message);
  }
}

module.exports = {
  cleanSettings,
  verifyNoPlaceholders,
  createWorkflowInN8n,
  updateWorkflowInN8n,
  activateWorkflow,
  cleanupExistingWorkflows,
  saveWorkflowCredentials
};

