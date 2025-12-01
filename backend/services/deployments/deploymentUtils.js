// Fonctions utilitaires pour les déploiements
// Ces fonctions sont partagées entre tous les déploiements spécifiques

const fetch = require('node-fetch');
const config = require('../../config');
const db = require('../../database');
const logger = require('../../utils/logger');

/**
 * Nettoie l'objet settings pour n8n (n'accepte que {} lors de la création)
 */
function cleanSettings(settings) {
  return {};
}

/**
 * Vérifie qu'aucun placeholder n'est présent dans le payload
 * Détecte tous les patterns de placeholders connus
 */
function verifyNoPlaceholders(workflowPayload) {
  const payloadString = JSON.stringify(workflowPayload);
  
  // Patterns de placeholders à détecter (regex)
  const placeholderPatterns = [
    /ADMIN_OPENROUTER_CREDENTIAL_ID/,
    /ADMIN_OPENROUTER_CREDENTIAL_NAME/,
    /ADMIN_SMTP_CREDENTIAL_ID/,
    /ADMIN_SMTP_CREDENTIAL_NAME/,
    /USER_[A-Z_]+_CREDENTIAL_ID/,
    /USER_[A-Z_]+_CREDENTIAL_NAME/,
    /USER_GOOGLE_CREDENTIAL_ID/,
    /USER_GOOGLE_SHEETS_CREDENTIAL_ID/,
    /USER_IMAP_CREDENTIAL_ID/,
    /USER_IMAP_CREDENTIAL_NAME/,
    /USER_SMTP_CREDENTIAL_ID/,
    /USER_SMTP_CREDENTIAL_NAME/,
  ];
  
  // Détecter les placeholders dans la string
  const foundPlaceholders = [];
  placeholderPatterns.forEach(pattern => {
    const matches = payloadString.match(pattern);
    if (matches) {
      foundPlaceholders.push(...matches);
    }
  });
  
  // Détecter aussi dans les credentials des nœuds (format objet)
  const nodePlaceholders = [];
  workflowPayload.nodes?.forEach(node => {
    if (node.credentials) {
      Object.keys(node.credentials).forEach(credType => {
        const cred = node.credentials[credType];
        if (cred && typeof cred === 'object') {
          // Vérifier l'ID
          if (cred.id && typeof cred.id === 'string') {
            const isPlaceholder = placeholderPatterns.some(pattern => 
              pattern.test(cred.id)
            );
            if (isPlaceholder) {
              nodePlaceholders.push({
                nodeName: node.name,
                nodeType: node.type,
                credType,
                placeholder: cred.id
              });
            }
          }
          // Vérifier le name (peut aussi contenir des placeholders)
          if (cred.name && typeof cred.name === 'string') {
            const isPlaceholder = placeholderPatterns.some(pattern => 
              pattern.test(cred.name)
            );
            if (isPlaceholder) {
              nodePlaceholders.push({
                nodeName: node.name,
                nodeType: node.type,
                credType,
                placeholder: cred.name
              });
            }
          }
        }
      });
    }
  });
  
  // Si des placeholders sont trouvés, logger les détails et lancer une erreur
  if (foundPlaceholders.length > 0 || nodePlaceholders.length > 0) {
    const uniquePlaceholders = [...new Set(foundPlaceholders)];
    
    logger.error('Placeholders détectés dans le workflow', {
      placeholdersInString: uniquePlaceholders,
      nodePlaceholders: nodePlaceholders,
      nodeCount: workflowPayload.nodes?.length || 0
    });
    
    // Construire un message d'erreur détaillé
    let errorMessage = 'Des placeholders sont encore présents dans le workflow. Les credentials doivent être remplacés avant l\'envoi à n8n.\n\n';
    
    if (uniquePlaceholders.length > 0) {
      errorMessage += `Placeholders trouvés dans le JSON: ${uniquePlaceholders.join(', ')}\n`;
    }
    
    if (nodePlaceholders.length > 0) {
      errorMessage += '\nPlaceholders trouvés dans les nœuds:\n';
      nodePlaceholders.forEach(({ nodeName, nodeType, credType, placeholder }) => {
        errorMessage += `  - Nœud "${nodeName}" (${nodeType}): ${credType} = ${placeholder}\n`;
      });
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Crée le workflow dans n8n
 */
async function createWorkflowInN8n(workflowPayload) {
  const n8nUrl = config.n8n.url;
  
  logger.info('Création du workflow dans n8n', {
    workflowName: workflowPayload.name,
    nodesCount: workflowPayload.nodes?.length,
    connectionsCount: Object.keys(workflowPayload.connections || {}).length
  });
  
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
    logger.error('Erreur déploiement n8n', { error, status: deployResponse.status });
    throw new Error(`Erreur déploiement n8n: ${error}`);
  }
  
  const result = await deployResponse.json();
  logger.info('Workflow créé dans n8n', { workflowId: result.id, workflowName: result.name });
  return result;
}

/**
 * Met à jour le workflow dans n8n avec les credentials
 */
async function updateWorkflowInN8n(workflowId, injectedWorkflow) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  try {
    // Vérifier les credentials dans les nœuds HTTP Request avant update
    const httpNodes = injectedWorkflow.nodes.filter(n => 
      n.type === 'n8n-nodes-base.httpRequest' && 
      (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
    );
    
    if (httpNodes.length > 0) {
      logger.debug('Vérification credentials OpenRouter avant update', { 
        nodesCount: httpNodes.length,
        nodes: httpNodes.map(n => ({
          name: n.name,
          hasOpenRouter: !!n.credentials?.openRouterApi,
          hasHttpHeader: !!n.credentials?.httpHeaderAuth
        }))
      });
    }
    
    // Vérifier les credentials SMTP dans les nœuds Email Send avant update
    const emailNodes = injectedWorkflow.nodes.filter(n => 
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
      logger.info('Workflow mis à jour avec les credentials', { workflowId });
      return updatedWorkflow;
    } else {
      const errorText = await updateResponse.text();
      logger.warn('Impossible de mettre à jour le workflow', { 
        workflowId, 
        error: errorText,
        status: updateResponse.status 
      });
      return null;
    }
  } catch (updateError) {
    logger.warn('Erreur mise à jour workflow', { 
      workflowId, 
      error: updateError.message 
    });
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
  
  logger.debug('Validation du workflow', { workflowId });
  
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
      const nodeNameLower = (node.name || '').toLowerCase();
      const isDynamicFolderNode = nodeNameLower.includes('get many folder messages2') || 
                                   nodeNameLower.includes('messages2') ||
                                   nodeNameLower.includes('check folders') ||
                                   nodeNameLower.includes('vérifier tous');
      
      if (node.parameters?.resource === 'folderMessage') {
        const folderId = node.parameters?.folderId;
        
        if (isDynamicFolderNode) {
          if (!node.parameters?.folderId) {
            issues.push(`Nœud "${node.name}" (Microsoft Outlook): La structure folderId est requise (sera remplie dynamiquement par le workflow).`);
          }
        } else {
          const isFolderIdEmpty = !folderId || 
                                   (typeof folderId === 'object' && (!folderId.value || folderId.value === '')) ||
                                   (typeof folderId === 'string' && folderId === '');
          if (isFolderIdEmpty) {
            issues.push(`Nœud "${node.name}" (Microsoft Outlook): Le paramètre "folder" est requis mais n'est pas configuré. Veuillez sélectionner un dossier dans n8n.`);
          }
        }
      }
      
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
      logger.error('Problèmes détectés dans le workflow', { workflowId, issues });
      throw new Error(`Le workflow a des problèmes et ne peut pas être exécuté:\n${issues.join('\n')}`);
    }
    
    logger.info('Workflow validé avec succès', { workflowId });
    return true;
    
  } catch (error) {
    logger.error('Erreur validation workflow', { workflowId, error: error.message });
    throw error;
  }
}

async function activateWorkflow(workflowId) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  logger.info('Activation automatique du workflow', { workflowId });
  
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
      logger.error('Workflow non trouvé dans n8n', { workflowId, error: errorText, status: checkResponse.status });
      throw new Error(`Workflow ${workflowId} non trouvé dans n8n (${checkResponse.status})`);
    }
    
    const workflowData = await checkResponse.json();
    logger.debug('Workflow trouvé', { workflowId, workflowName: workflowData.name, active: workflowData.active });
    
    // Valider le workflow avant activation
    await validateWorkflow(workflowId);
    
    // Si déjà actif, retourner true
    if (workflowData.active) {
      logger.info('Workflow déjà actif', { workflowId });
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
      logger.error('Impossible d\'activer le workflow', { workflowId, error: errorText, status: activateResponse.status });
      throw new Error(`Impossible d'activer le workflow: ${errorText}`);
    }
    
    const activateResult = await activateResponse.json();
    logger.debug('Commande d\'activation envoyée', { workflowId, result: activateResult });
    
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
          logger.info('Workflow confirmé actif dans n8n après activation', { workflowId });
          return true;
        } else {
          attempts++;
          logger.debug('Workflow non encore actif', { workflowId, attempt: attempts, maxAttempts });
        }
      } else {
        attempts++;
        logger.warn('Impossible de vérifier le statut', { workflowId, attempt: attempts, maxAttempts, status: statusResponse.status });
      }
    }
    
    logger.warn('Workflow non actif après plusieurs tentatives', { workflowId, maxAttempts });
    return false;
    
  } catch (activateError) {
    logger.error('Erreur activation', { workflowId, error: activateError.message });
    throw activateError;
  }
}

/**
 * Supprime les workflows existants pour cet utilisateur et ce template
 */
async function cleanupExistingWorkflows(userId, templateId) {
  logger.debug('Vérification des workflows existants', { userId, templateId });
  
  try {
    const existingWorkflows = await db.query(
      'SELECT * FROM user_workflows WHERE user_id = $1 AND template_id = $2',
      [userId, templateId]
    );
    
    if (existingWorkflows.rows && existingWorkflows.rows.length > 0) {
      logger.info('Workflows existants trouvés', { 
        count: existingWorkflows.rows.length,
        userId,
        templateId
      });
      
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
                    logger.debug('Credential supprimé', { credentialName: cred.credential_name, credentialId: cred.credential_id });
                  } catch (credError) {
                    logger.warn('Erreur suppression credential', { 
                      credentialId: cred.credential_id,
                      error: credError.message 
                    });
                  }
                }
              }
            }
          }
        } catch (credError) {
          logger.warn('Erreur récupération credentials', { 
            workflowId: existingWorkflow.id,
            error: credError.message 
          });
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
            logger.info('Ancien workflow supprimé de n8n', { n8nWorkflowId: existingWorkflow.n8n_workflow_id });
          } catch (deleteError) {
            logger.warn('Erreur suppression workflow n8n', { 
              n8nWorkflowId: existingWorkflow.n8n_workflow_id,
              error: deleteError.message 
            });
          }
        }
        
        // Supprimer de la base de données
        await db.query('DELETE FROM user_workflows WHERE id = $1', [existingWorkflow.id]);
        logger.info('Ancien workflow supprimé de la BDD', { workflowId: existingWorkflow.id });
      }
    }
  } catch (checkError) {
    logger.warn('Erreur vérification workflows existants', { 
      userId,
      templateId,
      error: checkError.message 
    });
  }
}

/**
 * Sauvegarde les credentials créés dans workflow_credentials
 */
async function saveWorkflowCredentials(userWorkflowId, injectionResult, userEmail) {
  try {
    if (!injectionResult || !injectionResult.createdCredentials) {
      logger.debug('Aucun credential créé à sauvegarder', { userWorkflowId });
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
      logger.info('Credentials sauvegardés', { 
        userWorkflowId,
        count: credentialsToSave.length 
      });
    }
  } catch (credSaveError) {
    logger.error('Erreur sauvegarde credentials', { 
      userWorkflowId,
      error: credSaveError.message 
    });
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

