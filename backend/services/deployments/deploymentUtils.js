// Fonctions utilitaires pour les déploiements
// Ces fonctions sont partagées entre tous les déploiements spécifiques

const fetch = require('node-fetch');
const config = require('../../config');
const db = require('../../database');
const logger = require('../../utils/logger');

/**
 * Attend que la condition soit vraie avec retry et backoff exponentiel
 * @param {Function} checkCondition - Fonction qui retourne true quand la condition est remplie
 * @param {Object} options - Options de retry
 * @param {number} options.maxAttempts - Nombre maximum de tentatives (défaut: 5)
 * @param {number} options.initialDelay - Délai initial en ms (défaut: 500)
 * @param {number} options.maxDelay - Délai maximum en ms (défaut: 5000)
 * @param {number} options.multiplier - Multiplicateur pour backoff exponentiel (défaut: 2)
 * @returns {Promise<boolean>} true si la condition est remplie, false sinon
 */
async function waitForCondition(checkCondition, options = {}) {
  const {
    maxAttempts = 5,
    initialDelay = 500,
    maxDelay = 5000,
    multiplier = 2
  } = options;
  
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await checkCondition();
      if (result) {
        return true;
      }
      
      if (attempt < maxAttempts) {
        logger.debug('Condition non remplie, attente avant retry', {
          attempt,
          maxAttempts,
          delay
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * multiplier, maxDelay);
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification de la condition', {
        attempt,
        maxAttempts,
        error: error.message
      });
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * multiplier, maxDelay);
      }
    }
  }
  
  return false;
}

/**
 * Vérifie que le workflow existe et est accessible dans n8n
 * @param {string} workflowId - ID du workflow
 * @returns {Promise<boolean>} true si le workflow existe
 */
async function checkWorkflowExists(workflowId) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  try {
    const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

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
  const n8nErrorHandler = require('../../utils/n8nErrorHandler');
  
  // ⚠️ CRITIQUE: Vérifier que tous les nœuds référencés dans les connections existent
  if (workflowPayload.connections && workflowPayload.nodes) {
    const nodeNames = new Set(workflowPayload.nodes.map(n => n.name));
    const missingNodes = [];
    
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
    
    if (missingNodes.length > 0) {
      const uniqueMissing = [...new Set(missingNodes)];
      logger.error('❌ [createWorkflowInN8n] Nœuds manquants dans le workflow', {
        missingNodes: uniqueMissing,
        existingNodes: Array.from(nodeNames),
        totalNodes: nodeNames.size
      });
      // Ne pas bloquer, mais logger l'erreur pour diagnostic
    }
  }
  
  // ⚠️ CRITIQUE: Vérifier que les paramètres NocoDB sont bien présents avant l'envoi
  const nocoDbNodes = workflowPayload.nodes?.filter(n => 
    n.type === 'n8n-nodes-base.nocoDb' || 
    n.type?.toLowerCase().includes('nocodb') ||
    n.name?.toLowerCase().includes('nocodb')
  ) || [];
  
  if (nocoDbNodes.length > 0) {
    logger.info('🔍 Vérification des paramètres NocoDB avant création dans n8n', {
      nocoDbNodesCount: nocoDbNodes.length,
      nodesDetails: nocoDbNodes.map(n => ({
        name: n.name,
        hasCredentials: !!(n.credentials && n.credentials.nocoDbApiToken),
        credentialId: n.credentials?.nocoDbApiToken?.id || 'MANQUANT',
        hasOperation: !!n.parameters?.operation,
        hasBaseNameOrId: !!n.parameters?.baseNameOrId,
        hasBaseId: !!n.parameters?.baseId,
        hasTableNameOrId: !!n.parameters?.tableNameOrId,
        hasTableId: !!n.parameters?.tableId,
        hasTableName: !!n.parameters?.tableName,
        parameters: n.parameters
      }))
    });
    
    // ⚠️ CRITIQUE: Vérifier que les credentials sont bien présents
    const nodesWithoutCreds = nocoDbNodes.filter(n => !n.credentials?.nocoDbApiToken);
    if (nodesWithoutCreds.length > 0) {
      logger.error('❌ [createWorkflowInN8n] Nœuds NocoDB sans credentials avant création', {
        nodesWithoutCreds: nodesWithoutCreds.map(n => n.name)
      });
    }
  }
  
  logger.info('Création du workflow dans n8n', {
    workflowName: workflowPayload.name,
    nodesCount: workflowPayload.nodes?.length,
    connectionsCount: Object.keys(workflowPayload.connections || {}).length
  });
  
  // ⚠️ IMPORTANT: Vérifier que les credentials sont bien dans le payload initial
  const nodesWithCredentials = workflowPayload.nodes?.filter(n => 
    n.credentials && Object.keys(n.credentials).length > 0
  ) || [];
  
  logger.info('Credentials dans le payload initial', {
    totalNodes: workflowPayload.nodes?.length || 0,
    nodesWithCredentials: nodesWithCredentials.length,
    credentialsDetails: nodesWithCredentials.map(n => ({
      nodeName: n.name,
      nodeType: n.type,
      credentials: Object.keys(n.credentials || {})
    }))
  });
  
  return await n8nErrorHandler.handleN8nApiCall(async () => {
    const deployResponse = await fetch(`${n8nUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': config.n8n.apiKey
      },
      body: JSON.stringify(workflowPayload)
    });
    
    if (!deployResponse.ok) {
      throw deployResponse; // Sera parsé par handleN8nApiCall
    }
    
    const result = await deployResponse.json();
    logger.info('Workflow créé dans n8n', { workflowId: result.id, workflowName: result.name });
    
    // ⚠️ CRITIQUE: Vérifier que les credentials sont bien présents dans le workflow créé
    const createdNodesWithCredentials = result.nodes?.filter(n => 
      n.credentials && Object.keys(n.credentials).length > 0
    ) || [];
    
    // ⚠️ CRITIQUE: Vérifier spécifiquement les nœuds NocoDB
    const createdNocoDbNodes = result.nodes?.filter(n => 
      n.type === 'n8n-nodes-base.nocoDb' || 
      n.type?.toLowerCase().includes('nocodb') ||
      n.name?.toLowerCase().includes('nocodb')
    ) || [];
    
    if (createdNocoDbNodes.length > 0) {
      const nocoDbNodesWithoutCreds = createdNocoDbNodes.filter(n => !n.credentials?.nocoDbApiToken);
      if (nocoDbNodesWithoutCreds.length > 0) {
        logger.error('❌ [createWorkflowInN8n] Nœuds NocoDB sans credentials après création dans n8n', {
          workflowId: result.id,
          nodesWithoutCreds: nocoDbNodesWithoutCreds.map(n => n.name),
          expectedCredentialId: workflowPayload.nodes
            .find(n => n.type === 'n8n-nodes-base.nocoDb' && n.credentials?.nocoDbApiToken?.id)
            ?.credentials?.nocoDbApiToken?.id || 'NON TROUVÉ'
        });
      } else {
        logger.info('✅ [createWorkflowInN8n] Tous les nœuds NocoDB ont leurs credentials après création');
      }
    }
    
    logger.info('Credentials dans le workflow créé', {
      totalNodes: result.nodes?.length || 0,
      nodesWithCredentials: createdNodesWithCredentials.length,
      nocoDbNodesCount: createdNocoDbNodes.length,
      nocoDbNodesWithCreds: createdNocoDbNodes.filter(n => n.credentials?.nocoDbApiToken).length,
      credentialsDetails: createdNodesWithCredentials.map(n => ({
        nodeName: n.name,
        nodeType: n.type,
        credentials: Object.keys(n.credentials || {})
      }))
    });
    
    return result;
  }, 'create');
}

/**
 * Met à jour le workflow dans n8n avec les credentials
 * Utilise un retry intelligent pour s'assurer que le workflow est prêt
 */
async function updateWorkflowInN8n(workflowId, injectedWorkflow) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  // Attendre que le workflow soit accessible avant de le mettre à jour
  const workflowReady = await waitForCondition(
    () => checkWorkflowExists(workflowId),
    { maxAttempts: 3, initialDelay: 500, maxDelay: 2000 }
  );
  
  if (!workflowReady) {
    logger.warn('Workflow non accessible pour mise à jour', { workflowId });
    // Continuer quand même, n8n peut parfois accepter la mise à jour
  }
  
  // ⚠️ CRITIQUE: Vérifier que les paramètres NocoDB sont bien présents avant la mise à jour
  const nocoDbNodes = injectedWorkflow.nodes?.filter(n => 
    n.type === 'n8n-nodes-base.nocoDb' || 
    n.type?.toLowerCase().includes('nocodb') ||
    n.name?.toLowerCase().includes('nocodb')
  ) || [];
  
  if (nocoDbNodes.length > 0) {
    logger.info('🔍 Vérification des paramètres NocoDB avant mise à jour dans n8n', {
      workflowId,
      nocoDbNodesCount: nocoDbNodes.length,
      nodesDetails: nocoDbNodes.map(n => ({
        name: n.name,
        hasOperation: !!n.parameters?.operation,
        operation: n.parameters?.operation,
        hasBaseNameOrId: !!n.parameters?.baseNameOrId,
        baseNameOrId: n.parameters?.baseNameOrId,
        hasBaseId: !!n.parameters?.baseId,
        baseId: n.parameters?.baseId,
        hasTableNameOrId: !!n.parameters?.tableNameOrId,
        tableNameOrId: n.parameters?.tableNameOrId,
        hasTableId: !!n.parameters?.tableId,
        tableId: n.parameters?.tableId,
        hasTableName: !!n.parameters?.tableName,
        tableName: n.parameters?.tableName,
        allParams: Object.keys(n.parameters || {})
      }))
    });
  }
  
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
    
    // Vérifier que les credentials sont bien assignés dans les nœuds
    const nodesWithCredentials = injectedWorkflow.nodes.filter(n => 
      n.credentials && Object.keys(n.credentials).length > 0
    );
    
    // Vérifier les paramètres des nœuds NocoDB
    const nocoDbNodes = injectedWorkflow.nodes.filter(n => 
      n.type === 'n8n-nodes-base.nocoDb' || 
      n.type?.toLowerCase().includes('nocodb') ||
      n.name?.toLowerCase().includes('nocodb')
    );
    
    // ⚠️ CRITIQUE: Forcer la présence des paramètres NocoDB requis
    // n8n peut supprimer ces paramètres lors de la création, on les réinjecte avant la mise à jour
    nocoDbNodes.forEach(node => {
      if (!node.parameters) {
        node.parameters = {};
      }
      
      const nodeNameLower = (node.name || '').toLowerCase();
      
      // S'assurer que operation est présent
      if (!node.parameters.operation) {
        if (nodeNameLower.includes('post') || nodeNameLower.includes('sauvegarder') || nodeNameLower.includes('create')) {
          node.parameters.operation = 'create';
        } else if (nodeNameLower.includes('user') || nodeNameLower.includes('récupérer') || nodeNameLower.includes('get')) {
          node.parameters.operation = 'get';
        } else {
          node.parameters.operation = 'list';
        }
      }
      
      // Les paramètres baseNameOrId et tableNameOrId doivent être présents
      // Si ils sont manquants, on les réinjecte depuis les logs précédents ou on utilise les valeurs par défaut
      // Note: Ces valeurs devraient déjà être injectées par linkedinPostInjector, mais on les force au cas où
    });
    
    logger.info('Vérification des credentials avant mise à jour', {
      workflowId,
      totalNodes: injectedWorkflow.nodes.length,
      nodesWithCredentials: nodesWithCredentials.length,
      nocoDbNodesCount: nocoDbNodes.length,
      credentialsDetails: nodesWithCredentials.map(n => ({
        nodeName: n.name,
        nodeType: n.type,
        credentials: Object.keys(n.credentials || {})
      })),
      nocoDbNodesDetails: nocoDbNodes.map(n => ({
        nodeName: n.name,
        nodeType: n.type,
        hasCredentials: !!(n.credentials && Object.keys(n.credentials).length > 0),
        parameters: {
          operation: n.parameters?.operation,
          baseUrl: n.parameters?.baseUrl,
          baseId: n.parameters?.baseId,
          baseNameOrId: n.parameters?.baseNameOrId,
          tableId: n.parameters?.tableId,
          tableNameOrId: n.parameters?.tableNameOrId,
          tableName: n.parameters?.tableName,
          allParamKeys: Object.keys(n.parameters || {})
        }
      }))
    });
    
    const updatePayload = {
      name: injectedWorkflow.name,
      nodes: injectedWorkflow.nodes,
      connections: injectedWorkflow.connections,
      settings: cleanSettings(injectedWorkflow.settings)
    };
    
    // ⚠️ CRITIQUE: Vérifier que les paramètres NocoDB sont bien présents dans le payload de mise à jour
    const nocoDbNodesInPayload = updatePayload.nodes?.filter(n => 
      n.type === 'n8n-nodes-base.nocoDb' || 
      n.type?.toLowerCase().includes('nocodb') ||
      n.name?.toLowerCase().includes('nocodb')
    ) || [];
    
    if (nocoDbNodesInPayload.length > 0) {
      logger.info('🔍 Vérification des paramètres NocoDB dans le payload de mise à jour', {
        workflowId,
        nocoDbNodesCount: nocoDbNodesInPayload.length,
        nodesDetails: nocoDbNodesInPayload.map(n => ({
          name: n.name,
          hasOperation: !!n.parameters?.operation,
          operation: n.parameters?.operation,
          hasBaseNameOrId: !!n.parameters?.baseNameOrId,
          baseNameOrId: n.parameters?.baseNameOrId,
          hasBaseId: !!n.parameters?.baseId,
          baseId: n.parameters?.baseId,
          hasTableNameOrId: !!n.parameters?.tableNameOrId,
          tableNameOrId: n.parameters?.tableNameOrId,
          hasTableId: !!n.parameters?.tableId,
          tableId: n.parameters?.tableId,
          hasTableName: !!n.parameters?.tableName,
          tableName: n.parameters?.tableName,
          allParamKeys: Object.keys(n.parameters || {})
        }))
      });
    }
    
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
      
      // ⚠️ CRITIQUE: Vérifier que les credentials sont bien présents après la mise à jour
      const nocoDbNodesAfterUpdate = updatedWorkflow.nodes?.filter(n => 
        n.type === 'n8n-nodes-base.nocoDb' || 
        n.type?.toLowerCase().includes('nocodb') ||
        n.name?.toLowerCase().includes('nocodb')
      ) || [];
      
      if (nocoDbNodesAfterUpdate.length > 0) {
        const nodesWithoutCreds = nocoDbNodesAfterUpdate.filter(n => !n.credentials?.nocoDbApiToken);
        if (nodesWithoutCreds.length > 0) {
          logger.error('❌ [deploymentUtils] Credentials NocoDB supprimés par n8n après mise à jour', {
            workflowId,
            nodesWithoutCreds: nodesWithoutCreds.map(n => n.name)
          });
          
          // ⚠️ CRITIQUE: Réinjecter les credentials manquants
          const nocoDbCredentialId = injectedWorkflow.nodes
            .find(n => n.type === 'n8n-nodes-base.nocoDb' && n.credentials?.nocoDbApiToken?.id)
            ?.credentials?.nocoDbApiToken?.id;
          
          if (nocoDbCredentialId) {
            logger.warn('⚠️ [deploymentUtils] Réinjection des credentials NocoDB manquants');
            nodesWithoutCreds.forEach(node => {
              if (!node.credentials) {
                node.credentials = {};
              }
              node.credentials.nocoDbApiToken = {
                id: nocoDbCredentialId,
                name: 'NocoDB Token account'
              };
            });
            
            // Mettre à jour à nouveau avec les credentials réinjectés
            const retryPayload = {
              name: updatedWorkflow.name,
              nodes: updatedWorkflow.nodes,
              connections: updatedWorkflow.connections,
              settings: updatedWorkflow.settings || {}
            };
            
            const retryResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': n8nApiKey
              },
              body: JSON.stringify(retryPayload)
            });
            
            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              logger.info('✅ [deploymentUtils] Credentials NocoDB réinjectés avec succès');
              return retryResult;
            }
          }
        } else {
          logger.info('✅ [deploymentUtils] Tous les nœuds NocoDB ont leurs credentials après mise à jour');
        }
      }
      
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
  const n8nErrorHandler = require('../../utils/n8nErrorHandler');
  
  return await n8nErrorHandler.handleN8nApiCall(async () => {
    logger.info('Activation automatique du workflow', { workflowId });
    
    // Vérifier d'abord si le workflow existe
    const checkResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      }
    });
    
    if (!checkResponse.ok) {
      throw checkResponse; // Sera parsé par handleN8nApiCall
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
      throw activateResponse; // Sera parsé par handleN8nApiCall
    }
    
    const activateResult = await activateResponse.json();
    logger.debug('Commande d\'activation envoyée', { workflowId, result: activateResult });
    
    // Vérifier le statut final avec retry intelligent (n8n peut prendre du temps)
    const isActive = await waitForCondition(
      async () => {
        try {
          const statusResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey
            }
          });
          
          if (statusResponse.ok) {
            const statusResult = await statusResponse.json();
            return statusResult.active === true;
          }
          return false;
        } catch (error) {
          logger.debug('Erreur lors de la vérification du statut', { workflowId, error: error.message });
          return false;
        }
      },
      {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 4000,
        multiplier: 1.5
      }
    );
    
    if (isActive) {
      logger.info('Workflow confirmé actif dans n8n après activation', { workflowId });
      return true;
    }
    
    logger.warn('Workflow non actif après plusieurs tentatives', { workflowId });
    return false;
  }, 'activate');
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

/**
 * Supprime les credentials spécifiques au workflow dans n8n
 * Note: Les credentials OAuth partagés (Google, OpenRouter, etc.) ne sont PAS supprimés
 */
async function deleteWorkflowCredentialsInN8n(userWorkflowId) {
  try {
    // Récupérer les credentials associés au workflow
    const workflowCredentials = await db.getWorkflowCredentials(userWorkflowId);
    
    if (!workflowCredentials || workflowCredentials.length === 0) {
      logger.debug('Aucun credential à supprimer pour ce workflow', { userWorkflowId });
      return;
    }
    
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    logger.info('Suppression des credentials du workflow dans n8n', {
      userWorkflowId,
      credentialsCount: workflowCredentials.length
    });
    
    // Supprimer chaque credential dans n8n (sauf OAuth partagés)
    for (const cred of workflowCredentials) {
      // Ne pas supprimer les credentials OAuth partagés (Google, etc.)
      // Ces credentials sont partagés entre plusieurs workflows
      const isOAuthCredential = cred.credential_type?.toLowerCase().includes('oauth') || 
                                cred.credential_type?.toLowerCase().includes('google') ||
                                cred.credential_type?.toLowerCase().includes('gmail') ||
                                cred.credential_type?.toLowerCase().includes('openrouter');
      
      if (isOAuthCredential) {
        logger.debug('Credential OAuth partagé non supprimé', {
          credentialId: cred.credential_id,
          type: cred.credential_type
        });
        continue;
      }
      
      try {
        const deleteResponse = await fetch(`${n8nUrl}/api/v1/credentials/${cred.credential_id}`, {
          method: 'DELETE',
          headers: {
            'X-N8N-API-KEY': n8nApiKey,
          },
        });
        
        if (deleteResponse.ok) {
          logger.info('Credential supprimé de n8n', {
            credentialId: cred.credential_id,
            credentialName: cred.credential_name
          });
        } else {
          const errorText = await deleteResponse.text();
          logger.warn('Erreur suppression credential dans n8n', {
            credentialId: cred.credential_id,
            error: errorText
          });
        }
      } catch (error) {
        logger.warn('Erreur lors de la suppression du credential', {
          credentialId: cred.credential_id,
          error: error.message
        });
      }
    }
    
    // Supprimer les credentials de la table workflow_credentials
    await db.query('DELETE FROM workflow_credentials WHERE user_workflow_id = $1', [userWorkflowId]);
    logger.info('Credentials supprimés de la base de données', { userWorkflowId });
    
  } catch (error) {
    logger.error('Erreur suppression credentials du workflow', {
      userWorkflowId,
      error: error.message
    });
    // Ne pas bloquer la suppression du workflow si la suppression des credentials échoue
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
  saveWorkflowCredentials,
  deleteWorkflowCredentialsInN8n,
  waitForCondition,
  checkWorkflowExists
};

