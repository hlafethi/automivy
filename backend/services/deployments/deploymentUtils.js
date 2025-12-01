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
/**
 * Valide que le workflow peut être exécuté (vérifie les paramètres requis)
 */
async function validateWorkflow(workflowId) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  console.log(`🔍 [DeploymentUtils] Validation du workflow ${workflowId}...`);
  
  try {
    const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Impossible de récupérer le workflow: ${response.status}`);
    }
    
    const workflow = await response.json();
    const issues = [];
    
    // Vérifier les nœuds Microsoft Outlook
    const outlookNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.microsoftOutlook') || [];
    outlookNodes.forEach(node => {
      // Pour les nœuds "Get many folder messages", vérifier que folderId est configuré
      // SAUF pour les nœuds qui vérifient les dossiers créés dynamiquement (nœud 4)
      const nodeNameLower = (node.name || '').toLowerCase();
      const isDynamicFolderNode = nodeNameLower.includes('get many folder messages2') || 
                                   nodeNameLower.includes('messages2') ||
                                   nodeNameLower.includes('check folders') ||
                                   nodeNameLower.includes('vérifier tous');
      
      if (node.parameters?.resource === 'folderMessage') {
        const folderId = node.parameters?.folderId;
        
        if (isDynamicFolderNode) {
          // Pour les nœuds avec paramètres dynamiques, vérifier juste que la structure folderId existe
          if (!node.parameters?.folderId) {
            issues.push(`Nœud "${node.name}" (Microsoft Outlook): La structure folderId est requise (sera remplie dynamiquement par le workflow).`);
          } else {
            console.log(`ℹ️ [DeploymentUtils] Nœud "${node.name}" a des paramètres dynamiques (folderId sera défini par le workflow)`);
          }
        } else {
          // Pour les autres nœuds, folderId doit être configuré
          const isFolderIdEmpty = !folderId || 
                                   (typeof folderId === 'object' && (!folderId.value || folderId.value === '')) ||
                                   (typeof folderId === 'string' && folderId === '');
          if (isFolderIdEmpty) {
            issues.push(`Nœud "${node.name}" (Microsoft Outlook): Le paramètre "folder" est requis mais n'est pas configuré. Veuillez sélectionner un dossier dans n8n.`);
          }
        }
      }
      
      // Vérifier que le credential est présent
      if (!node.credentials?.microsoftOutlookOAuth2Api) {
        issues.push(`Nœud "${node.name}" (Microsoft Outlook): Credential Microsoft Outlook OAuth2 manquant`);
      }
    });
    
    // Vérifier les nœuds emailSend
    const emailNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.emailSend') || [];
    emailNodes.forEach(node => {
      if (!node.credentials?.smtp) {
        issues.push(`Nœud "${node.name}" (Email Send): Credential SMTP manquant`);
      }
    });
    
    // Vérifier les connexions
    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      issues.push('Aucune connexion entre les nœuds');
    }
    
    if (issues.length > 0) {
      console.error('❌ [DeploymentUtils] Problèmes détectés dans le workflow:');
      issues.forEach(issue => console.error(`  - ${issue}`));
      throw new Error(`Le workflow a des problèmes et ne peut pas être exécuté:\n${issues.join('\n')}`);
    }
    
    console.log('✅ [DeploymentUtils] Workflow validé avec succès');
    return true;
    
  } catch (error) {
    console.error('❌ [DeploymentUtils] Erreur validation workflow:', error.message);
    throw error;
  }
}

async function activateWorkflow(workflowId) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  console.log(`🔧 [DeploymentUtils] Activation automatique du workflow ${workflowId}...`);
  
  try {
    // Vérifier d'abord si le workflow existe
    const checkResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      }
    });
    
    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error(`❌ [DeploymentUtils] Workflow ${workflowId} non trouvé dans n8n:`, errorText);
      throw new Error(`Workflow ${workflowId} non trouvé dans n8n (${checkResponse.status})`);
    }
    
    const workflowData = await checkResponse.json();
    console.log(`🔍 [DeploymentUtils] Workflow trouvé: ${workflowData.name}, actif: ${workflowData.active}`);
    
    // Valider le workflow avant activation
    await validateWorkflow(workflowId);
    
    // Si déjà actif, retourner true
    if (workflowData.active) {
      console.log('✅ [DeploymentUtils] Workflow déjà actif');
      return true;
    }
    
    // Activer le workflow
    const activateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      },
      body: JSON.stringify({})
    });
    
    if (!activateResponse.ok) {
      const errorText = await activateResponse.text();
      console.error('❌ [DeploymentUtils] Impossible d\'activer le workflow:', errorText);
      throw new Error(`Impossible d'activer le workflow: ${errorText}`);
    }
    
    const activateResult = await activateResponse.json();
    console.log('✅ [DeploymentUtils] Commande d\'activation envoyée, résultat:', activateResult);
    
    // Vérifier le statut final après un délai (n8n peut prendre du temps)
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
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
          console.log('✅ [DeploymentUtils] Workflow confirmé actif dans n8n après activation');
          return true;
        } else {
          attempts++;
          console.log(`⏳ [DeploymentUtils] Workflow non encore actif, tentative ${attempts}/${maxAttempts}...`);
        }
      } else {
        attempts++;
        console.warn(`⚠️ [DeploymentUtils] Impossible de vérifier le statut (tentative ${attempts}/${maxAttempts})`);
      }
    }
    
    console.warn('⚠️ [DeploymentUtils] Workflow non actif après plusieurs tentatives');
    return false;
    
  } catch (activateError) {
    console.error('❌ [DeploymentUtils] Erreur activation:', activateError.message);
    throw activateError; // Propager l'erreur au lieu de retourner false silencieusement
  }
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
  validateWorkflow,
  activateWorkflow,
  cleanupExistingWorkflows,
  saveWorkflowCredentials
};

