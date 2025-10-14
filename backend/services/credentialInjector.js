// Service pour injecter intelligemment les credentials dans les workflows

const { analyzeWorkflowCredentials, validateFormData } = require('./workflowAnalyzer');

/**
 * Injecte les credentials utilisateur dans un workflow
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId) {
  console.log('🔧 [CredentialInjector] Injection des credentials utilisateur...');
  console.log('🔧 [CredentialInjector] User ID:', userId);
  console.log('🔧 [CredentialInjector] Credentials reçus:', Object.keys(userCredentials));
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow);
  console.log('🔧 [CredentialInjector] Credentials requis:', requiredCredentials.length);
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  const injectedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
  const createdCredentials = {};
  
  // Créer les credentials utilisateur
  for (const credConfig of requiredCredentials) {
    if (credConfig.type === 'imap') {
      const imapCred = await createImapCredential(userCredentials, userId);
      createdCredentials.imap = imapCred;
      console.log('✅ [CredentialInjector] Credential IMAP créé:', imapCred.id);
    }
    
    if (credConfig.type === 'smtp') {
      const smtpCred = await createSmtpCredential(userCredentials, userId);
      createdCredentials.smtp = smtpCred;
      console.log('✅ [CredentialInjector] Credential SMTP créé:', smtpCred.id);
    }
  }
  
  // Injecter les credentials dans les nœuds
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      const updatedNode = { ...node };
      
      if (node.credentials && Object.keys(node.credentials).length > 0) {
        const updatedCredentials = {};
        
        Object.entries(node.credentials).forEach(([credType, credValue]) => {
          // Vérifier si c'est un credential utilisateur
          if (typeof credValue === 'string' && credValue.includes('USER_')) {
            if (createdCredentials[credType]) {
              updatedCredentials[credType] = {
                id: createdCredentials[credType].id,
                name: createdCredentials[credType].name
              };
              console.log(`✅ [CredentialInjector] Credential ${credType} injecté dans ${node.name}`);
            }
          } else if (typeof credValue === 'object' && credValue.id && credValue.id.includes('USER_')) {
            if (createdCredentials[credType]) {
              updatedCredentials[credType] = {
                id: createdCredentials[credType].id,
                name: createdCredentials[credType].name
              };
              console.log(`✅ [CredentialInjector] Credential ${credType} injecté dans ${node.name}`);
            }
          } else {
            // Garder les credentials admin existants
            updatedCredentials[credType] = credValue;
          }
        });
        
        updatedNode.credentials = updatedCredentials;
      }
      
      return updatedNode;
    });
  }
  
  console.log('✅ [CredentialInjector] Injection terminée avec succès');
  return injectedWorkflow;
}

/**
 * Crée un credential IMAP pour l'utilisateur
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createImapCredential(userCredentials, userId) {
  const credentialData = {
    name: `IMAP-${userId}-${Date.now()}`,
    type: 'imap',
    data: {
      user: userCredentials.email,
      password: userCredentials.imapPassword,
      host: userCredentials.imapServer,
      port: userCredentials.imapPort || 993,
      secure: true
    }
  };
  
  console.log('🔧 [CredentialInjector] Création credential IMAP:', credentialData.name);
  return await createCredentialInN8n(credentialData);
}

/**
 * Crée un credential SMTP pour l'utilisateur
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createSmtpCredential(userCredentials, userId) {
  const credentialData = {
    name: `SMTP-${userId}-${Date.now()}`,
    type: 'smtp',
    data: {
      user: userCredentials.smtpEmail || userCredentials.email,
      password: userCredentials.smtpPassword,
      host: userCredentials.smtpServer,
      port: userCredentials.smtpPort || 587,
      secure: false // STARTTLS
    }
  };
  
  console.log('🔧 [CredentialInjector] Création credential SMTP:', credentialData.name);
  return await createCredentialInN8n(credentialData);
}

/**
 * Crée un credential dans n8n
 * @param {Object} credentialData - Données du credential
 * @returns {Object} Credential créé
 */
async function createCredentialInN8n(credentialData) {
  try {
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentialData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur création credential: ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ [CredentialInjector] Credential créé dans n8n:', result.id);
    return result;
    
  } catch (error) {
    console.error('❌ [CredentialInjector] Erreur création credential:', error);
    throw error;
  }
}

/**
 * Nettoie les credentials utilisateur (supprime les credentials temporaires)
 * @param {Object} createdCredentials - Credentials créés
 */
async function cleanupUserCredentials(createdCredentials) {
  console.log('🧹 [CredentialInjector] Nettoyage des credentials...');
  
  for (const [type, cred] of Object.entries(createdCredentials)) {
    try {
      await fetch(`http://localhost:3004/api/n8n/credentials/${cred.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log(`✅ [CredentialInjector] Credential ${type} supprimé`);
    } catch (error) {
      console.error(`❌ [CredentialInjector] Erreur suppression credential ${type}:`, error);
    }
  }
}

module.exports = {
  injectUserCredentials,
  createImapCredential,
  createSmtpCredential,
  cleanupUserCredentials
};
