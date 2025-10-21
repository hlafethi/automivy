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
      // Créer le credential SMTP natif dans n8n avec SSL/TLS
      const smtpCred = await createSmtpCredential(userCredentials, userId);
      createdCredentials.smtp = smtpCred;
      console.log('✅ [CredentialInjector] Credential SMTP natif créé:', smtpCred.id);
    }
  }
  
  // Injecter les credentials et paramètres dans les nœuds
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      const updatedNode = { ...node };
      
      // Injecter les credentials
      if (node.credentials && Object.keys(node.credentials).length > 0) {
        const updatedCredentials = {};
        
        Object.entries(node.credentials).forEach(([credType, credValue]) => {
          // Remplacer les credentials IMAP et SMTP par les nouveaux créés
          if (credType === 'imap' && createdCredentials.imap) {
            updatedCredentials[credType] = {
              id: createdCredentials.imap.id,
              name: createdCredentials.imap.name
            };
            console.log(`✅ [CredentialInjector] Credential IMAP remplacé dans ${node.name}: ${createdCredentials.imap.id}`);
          } else if (credType === 'smtp' && createdCredentials.smtp) {
            updatedCredentials[credType] = {
              id: createdCredentials.smtp.id,
              name: createdCredentials.smtp.name
            };
            console.log(`✅ [CredentialInjector] Credential SMTP remplacé dans ${node.name}: ${createdCredentials.smtp.id}`);
          } else if (credType === 'smtp' && credValue.id === 'USER_SMTP_CREDENTIAL_ID' && createdCredentials.smtp) {
            updatedCredentials[credType] = {
              id: createdCredentials.smtp.id,
              name: createdCredentials.smtp.name
            };
            console.log(`✅ [CredentialInjector] Placeholder SMTP remplacé dans ${node.name}: ${createdCredentials.smtp.id}`);
          } else if (credType === 'imap' && credValue.id === 'USER_IMAP_CREDENTIAL_ID' && createdCredentials.imap) {
            updatedCredentials[credType] = {
              id: createdCredentials.imap.id,
              name: createdCredentials.imap.name
            };
            console.log(`✅ [CredentialInjector] Placeholder IMAP remplacé dans ${node.name}: ${createdCredentials.imap.id}`);
          } else {
            // Garder les credentials admin existants (ex: OpenRouter)
            updatedCredentials[credType] = credValue;
            console.log(`🔒 [CredentialInjector] Credential ${credType} conservé dans ${node.name}`);
          }
        });
        
        updatedNode.credentials = updatedCredentials;
      }
      
      // Injecter les paramètres des nœuds
      if (node.parameters) {
        const updatedParameters = { ...node.parameters };
        
        // Remplacer les placeholders dans les paramètres
        Object.keys(updatedParameters).forEach(paramKey => {
          if (typeof updatedParameters[paramKey] === 'string') {
            // Remplacer USER_EMAIL par l'email de l'utilisateur
            if (updatedParameters[paramKey].includes('{{USER_EMAIL}}')) {
              updatedParameters[paramKey] = updatedParameters[paramKey].replace('{{USER_EMAIL}}', userCredentials.email);
              console.log(`✅ [CredentialInjector] Paramètre ${paramKey} mis à jour avec l'email utilisateur`);
            }
            // Remplacer d'autres placeholders si nécessaire
            if (updatedParameters[paramKey].includes('{{USER_EMAIL_PLACEHOLDER}}')) {
              updatedParameters[paramKey] = updatedParameters[paramKey].replace('{{USER_EMAIL_PLACEHOLDER}}', userCredentials.email);
              console.log(`✅ [CredentialInjector] Paramètre ${paramKey} mis à jour avec l'email utilisateur`);
            }
            // Remplacer les expressions n8n qui ne fonctionnent pas
            if (updatedParameters[paramKey].includes('{{ $credentials.smtp.user }}')) {
              updatedParameters[paramKey] = updatedParameters[paramKey].replace('{{ $credentials.smtp.user }}', userCredentials.email);
              console.log(`✅ [CredentialInjector] Paramètre ${paramKey} remplacé par l'email utilisateur`);
            }
            if (updatedParameters[paramKey].includes('{{ $credentials.imap.user }}')) {
              updatedParameters[paramKey] = updatedParameters[paramKey].replace('{{ $credentials.imap.user }}', userCredentials.email);
              console.log(`✅ [CredentialInjector] Paramètre ${paramKey} remplacé par l'email utilisateur`);
            }
          }
        });
        
        // Ajouter les options de retry et timeout pour le nœud Send Email
        if (node.type === 'n8n-nodes-base.emailSend') {
          console.log('🔧 [CredentialInjector] Configuration options pour Send Email...');
          
          updatedParameters.options = {
            ...updatedParameters.options,
            retryOnFail: true,
            retryTimes: 5,
            retryDelay: 10000,
            timeout: 60000,
            connectionTimeout: 30000,
            greetingTimeout: 15000,
            socketTimeout: 30000,
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 1000,
            rateLimit: 5
          };
          
          console.log('✅ [CredentialInjector] Options Send Email configurées');
        }
        
        updatedNode.parameters = updatedParameters;
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
  console.log('🔍 [CredentialInjector] DEBUG - Credentials reçus pour IMAP:');
  console.log('  - userCredentials.email:', userCredentials.email);
  console.log('  - userCredentials.imapPassword:', userCredentials.imapPassword);
  console.log('  - userCredentials.imapPassword type:', typeof userCredentials.imapPassword);
  console.log('  - userCredentials.imapPassword length:', userCredentials.imapPassword?.length);
  console.log('  - userCredentials.imapServer:', userCredentials.imapServer);
  console.log('  - userCredentials.imapPort:', userCredentials.imapPort);
  console.log('  - userCredentials.imapPassword COMPLET:', JSON.stringify(userCredentials.imapPassword));
  
  const credentialData = {
    name: `IMAP-${userId}-${Date.now()}`,
    type: 'imap',
    data: {
      user: userCredentials.email,
      password: userCredentials.imapPassword, // Utiliser le mot de passe IMAP
      host: userCredentials.imapServer,
      port: 993, // Port en number
      secure: true
    }
  };
  
  console.log('🔧 [CredentialInjector] Création credential IMAP:', credentialData.name);
  console.log('🔧 [CredentialInjector] Données IMAP finales:', {
    user: credentialData.data.user,
    host: credentialData.data.host,
    port: credentialData.data.port,
    secure: credentialData.data.secure,
    passwordLength: credentialData.data.password?.length,
    passwordPreview: credentialData.data.password ? credentialData.data.password.substring(0, 2) + '***' : 'UNDEFINED'
  });
  
  // Créer le credential IMAP via le proxy backend
  try {
    console.log('🔧 [CredentialInjector] Création credential IMAP via proxy...');
    
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentialData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur création credential IMAP: ${response.status} - ${errorText}`);
    }

    const credential = await response.json();
    console.log('✅ [CredentialInjector] Credential IMAP créé via proxy:', credential.id);
    
    return credential;
  } catch (error) {
    console.error('❌ [CredentialInjector] Erreur création credential IMAP via proxy:', error);
    throw error;
  }
}

/**
 * Crée un credential SMTP pour l'utilisateur avec SSL/TLS natif
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Credential créé
 */
async function createSmtpCredential(userCredentials, userId) {
  try {
    console.log('🚨🚨🚨 [CredentialInjector] ========================================== 🚨🚨🚨');
    console.log('🚨🚨🚨 [CredentialInjector] CRÉATION CREDENTIAL SMTP DÉMARRÉE 🚨🚨🚨');
    console.log('🚨🚨🚨 [CredentialInjector] ========================================== 🚨🚨🚨');
    console.log('🔧 [CredentialInjector] Création credential SMTP natif avec SSL/TLS...');
    console.log('🔧 [CredentialInjector] User credentials reçus:', {
      smtpPort: userCredentials.smtpPort,
      smtpPortType: typeof userCredentials.smtpPort,
      smtpServer: userCredentials.smtpServer,
      smtpEmail: userCredentials.smtpEmail
    });
    
    // Payload exact pour garantir le bouton SSL/TLS activé
    const smtpCredentialData = {
      name: `SMTP-${userId}`,
      type: "smtp",
      data: {
        host: userCredentials.smtpServer || userCredentials.IMAP_SERVER?.replace('imap', 'smtp'),
        user: userCredentials.smtpEmail || userCredentials.email,
        password: userCredentials.smtpPassword,
        port: Number(userCredentials.smtpPort) || 465, // Utiliser le port utilisateur ou 465 par défaut
        secure: Number(userCredentials.smtpPort) === 465 || Number(userCredentials.smtpPort) === 587 // SSL si port 465, TLS si 587
      }
    };

    console.log('📤 [CredentialInjector] Payload SMTP natif:', JSON.stringify(smtpCredentialData, null, 2));
    console.log('🔍 [CredentialInjector] DEBUG - Port type:', typeof smtpCredentialData.data.port);
    console.log('🔍 [CredentialInjector] DEBUG - Port value:', smtpCredentialData.data.port);
    console.log('🔍 [CredentialInjector] DEBUG - User credentials smtpPort:', userCredentials.smtpPort);
    console.log('🔍 [CredentialInjector] DEBUG - User credentials smtpPort type:', typeof userCredentials.smtpPort);
    console.log('🔍 [CredentialInjector] DEBUG - Number conversion result:', Number(userCredentials.smtpPort));
    console.log('🔍 [CredentialInjector] DEBUG - Number conversion type:', typeof Number(userCredentials.smtpPort));
    console.log('🔍 [CredentialInjector] DEBUG - isNaN check:', isNaN(Number(userCredentials.smtpPort)));
    console.log('🔍 [CredentialInjector] DEBUG - Final port value:', Number(userCredentials.smtpPort) || 465);

    console.log('🔧 [CredentialInjector] Envoi de la requête à n8n...');
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smtpCredentialData),
    });

    console.log('📋 [CredentialInjector] Réponse n8n:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ [CredentialInjector] Erreur détaillée:', errorText);
      throw new Error(`Erreur création credential SMTP: ${response.status} - ${errorText}`);
    }

    const credential = await response.json();
    console.log('✅ [CredentialInjector] Credential SMTP natif créé:', credential.id);
    console.log('📋 [CredentialInjector] Détails credential créé:', {
      id: credential.id,
      name: credential.name,
      type: credential.type
    });
    
    return credential;
  } catch (error) {
    console.error('❌ [CredentialInjector] Erreur création credential SMTP natif:', error);
    throw error;
  }
}

/**
 * Crée un credential dans n8n
 * @param {Object} credentialData - Données du credential
 * @returns {Object} Credential créé
 */
async function createCredentialInN8n(credentialData) {
  try {
    console.log('🔍 [CredentialInjector] DEBUG - Envoi à n8n:');
    console.log('  - Type:', credentialData.type);
    console.log('  - Name:', credentialData.name);
    console.log('  - Data keys:', Object.keys(credentialData.data));
    console.log('  - Password length:', credentialData.data.password?.length);
    console.log('  - Password preview:', credentialData.data.password ? credentialData.data.password.substring(0, 2) + '***' : 'UNDEFINED');
    console.log('  - Password COMPLET:', JSON.stringify(credentialData.data.password));
    
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentialData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ [CredentialInjector] Erreur API n8n:', error);
      throw new Error(`Erreur création credential: ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ [CredentialInjector] Credential créé dans n8n:', result.id);
    console.log('✅ [CredentialInjector] Credential name:', result.name);
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
