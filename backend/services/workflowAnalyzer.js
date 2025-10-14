// Service pour analyser les workflows et détecter les credentials requis

/**
 * Analyse un workflow et détecte les credentials utilisateur requis
 * @param {Object} workflow - Le workflow JSON à analyser
 * @returns {Array} Liste des credentials requis avec leurs types et métadonnées
 */
function analyzeWorkflowCredentials(workflow) {
  console.log('🔍 [WorkflowAnalyzer] Analyse du workflow:', workflow.name);
  
  const requiredCredentials = [];
  const credentialTypes = new Set();
  
  if (!workflow.nodes) {
    console.log('⚠️ [WorkflowAnalyzer] Aucun nœud trouvé dans le workflow');
    return requiredCredentials;
  }
  
  workflow.nodes.forEach((node, index) => {
    console.log(`🔍 [WorkflowAnalyzer] Analyse du nœud ${index + 1}: ${node.name} (${node.type})`);
    
    // Détecter automatiquement les nœuds qui nécessitent des credentials utilisateur
    const userCredentialTypes = detectUserCredentialTypes(node);
    userCredentialTypes.forEach(credType => {
      console.log(`  ✅ Credential utilisateur détecté: ${credType}`);
      credentialTypes.add(credType);
    });
    
    // Vérifier aussi les credentials existants pour des placeholders
    if (node.credentials && Object.keys(node.credentials).length > 0) {
      Object.entries(node.credentials).forEach(([credType, credValue]) => {
        console.log(`  - Credential ${credType}: ${JSON.stringify(credValue)}`);
        
        // Détecter si c'est un placeholder utilisateur
        if (typeof credValue === 'string' && credValue.includes('USER_')) {
          console.log(`  ✅ Credential utilisateur détecté: ${credValue}`);
          credentialTypes.add(credType);
        } else if (typeof credValue === 'object' && credValue.id && credValue.id.includes('USER_')) {
          console.log(`  ✅ Credential utilisateur détecté: ${credValue.id}`);
          credentialTypes.add(credType);
        }
      });
    }
  });
  
  // Générer les credentials requis basés sur les types détectés
  credentialTypes.forEach(credType => {
    const credentialConfig = getCredentialConfig(credType);
    if (credentialConfig) {
      requiredCredentials.push(credentialConfig);
    }
  });
  
  console.log('✅ [WorkflowAnalyzer] Credentials requis détectés:', requiredCredentials.length);
  requiredCredentials.forEach(cred => {
    console.log(`  - ${cred.name} (${cred.type})`);
  });
  
  return requiredCredentials;
}

/**
 * Détecte automatiquement les types de credentials utilisateur requis par un nœud
 * @param {Object} node - Le nœud à analyser
 * @returns {Array} Liste des types de credentials requis
 */
function detectUserCredentialTypes(node) {
  const credentialTypes = [];
  
  // Détecter les nœuds IMAP
  if (node.type === 'n8n-nodes-base.emailReadImap' || 
      (node.type && node.type.includes('imap')) ||
      (node.name && node.name.toLowerCase().includes('imap'))) {
    credentialTypes.push('imap');
  }
  
  // Détecter les nœuds SMTP
  if (node.type === 'n8n-nodes-base.emailSend' || 
      (node.type && node.type.includes('smtp')) ||
      (node.name && node.name.toLowerCase().includes('smtp')) ||
      (node.name && node.name.toLowerCase().includes('send email'))) {
    credentialTypes.push('smtp');
  }
  
  // Détecter les nœuds OpenAI/OpenRouter (gérés par l'admin)
  if (node.type === 'n8n-nodes-base.openAi' || 
      (node.type && node.type.includes('openai')) ||
      (node.name && node.name.toLowerCase().includes('openai')) ||
      (node.name && node.name.toLowerCase().includes('openrouter'))) {
    // Les credentials OpenAI sont gérés par l'admin, pas par l'utilisateur
    // credentialTypes.push('openAiApi');
  }
  
  return credentialTypes;
}

/**
 * Configuration des credentials par type
 * @param {string} credType - Type de credential (imap, smtp, etc.)
 * @returns {Object|null} Configuration du credential
 */
function getCredentialConfig(credType) {
  const credentialConfigs = {
    'imap': {
      type: 'imap',
      name: 'IMAP Email',
      description: 'Configuration pour récupérer les emails',
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'user@example.com' },
        { name: 'imapPassword', label: 'Mot de passe IMAP', type: 'password', required: true },
        { name: 'imapServer', label: 'Serveur IMAP', type: 'text', required: true, placeholder: 'imap.gmail.com' },
        { name: 'imapPort', label: 'Port IMAP', type: 'number', required: false, defaultValue: 993 }
      ]
    },
    'smtp': {
      type: 'smtp',
      name: 'SMTP Email',
      description: 'Configuration pour envoyer les emails',
      fields: [
        { name: 'smtpEmail', label: 'Email SMTP', type: 'email', required: true, placeholder: 'user@example.com' },
        { name: 'smtpPassword', label: 'Mot de passe SMTP', type: 'password', required: true },
        { name: 'smtpServer', label: 'Serveur SMTP', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
        { name: 'smtpPort', label: 'Port SMTP', type: 'number', required: false, defaultValue: 587 }
      ]
    },
    'openAiApi': {
      type: 'openAiApi',
      name: 'OpenAI/OpenRouter',
      description: 'Configuration pour l\'IA (géré par l\'admin)',
      fields: [] // Géré par l'admin, pas par l'utilisateur
    }
  };
  
  return credentialConfigs[credType] || null;
}

/**
 * Génère un formulaire dynamique basé sur les credentials requis
 * @param {Array} requiredCredentials - Liste des credentials requis
 * @returns {Object} Configuration du formulaire
 */
function generateDynamicForm(requiredCredentials) {
  console.log('🔧 [WorkflowAnalyzer] Génération du formulaire dynamique...');
  
  const formConfig = {
    title: 'Configuration des credentials',
    description: 'Veuillez remplir les informations nécessaires pour déployer ce workflow',
    sections: [],
    submitText: 'Déployer le workflow'
  };
  
  requiredCredentials.forEach(cred => {
    if (cred.fields && cred.fields.length > 0) {
      formConfig.sections.push({
        title: cred.name,
        description: cred.description,
        fields: cred.fields
      });
    }
  });
  
  console.log('✅ [WorkflowAnalyzer] Formulaire généré avec', formConfig.sections.length, 'sections');
  return formConfig;
}

/**
 * Valide les données du formulaire
 * @param {Object} formData - Données du formulaire
 * @param {Array} requiredCredentials - Credentials requis
 * @returns {Object} Résultat de la validation
 */
function validateFormData(formData, requiredCredentials) {
  console.log('🔍 [WorkflowAnalyzer] Validation des données du formulaire...');
  
  const errors = [];
  const validatedData = {};
  
  requiredCredentials.forEach(cred => {
    if (cred.fields) {
      cred.fields.forEach(field => {
        const value = formData[field.name];
        
        if (field.required && (!value || value.trim() === '')) {
          errors.push(`${field.label} est requis`);
        } else if (value) {
          validatedData[field.name] = value;
        }
      });
    }
  });
  
  console.log('✅ [WorkflowAnalyzer] Validation terminée:', errors.length, 'erreurs');
  return {
    isValid: errors.length === 0,
    errors: errors,
    data: validatedData
  };
}

module.exports = {
  analyzeWorkflowCredentials,
  generateDynamicForm,
  validateFormData,
  getCredentialConfig
};
