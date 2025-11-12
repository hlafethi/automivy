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
  let hasScheduleTrigger = false;
  
  if (!workflow.nodes) {
    console.log('⚠️ [WorkflowAnalyzer] Aucun nœud trouvé dans le workflow');
    return requiredCredentials;
  }
  
  // Détecter si c'est un workflow de rapport (Gmail/AI) pour utiliser SMTP admin
  const hasGmailNode = workflow.nodes.some(node => 
    node.type === 'n8n-nodes-base.gmail' || 
    (node.type && node.type.includes('gmail')) ||
    (node.name && node.name.toLowerCase().includes('gmail'))
  );
  const hasAINode = workflow.nodes.some(node =>
    node.type === '@n8n/n8n-nodes-langchain.agent' ||
    (node.type && node.type.includes('langchain')) ||
    (node.name && node.name.toLowerCase().includes('ai agent'))
  );
  const isReportWorkflow = hasGmailNode || hasAINode;
  
  if (isReportWorkflow) {
    console.log('📧 [WorkflowAnalyzer] Workflow de type Gmail/AI détecté - SMTP admin sera utilisé automatiquement');
  }
  
  workflow.nodes.forEach((node, index) => {
    console.log(`🔍 [WorkflowAnalyzer] Analyse du nœud ${index + 1}: ${node.name} (${node.type})`);
    console.log(`  - Nom du nœud: "${node.name}"`);
    console.log(`  - Type du nœud: "${node.type}"`);
    console.log(`  - Credentials existants:`, node.credentials ? Object.keys(node.credentials) : 'aucun');
    
    // Détecter les Schedule Triggers
    if (node.type === 'n8n-nodes-base.schedule' || 
        node.type === 'n8n-nodes-base.scheduleTrigger' ||
        (node.type && node.type.includes('schedule'))) {
      hasScheduleTrigger = true;
      console.log('  ✅ Schedule Trigger détecté:', node.name);
    }
    
    // Détecter automatiquement les nœuds qui nécessitent des credentials utilisateur
    // IMPORTANT: Cette détection se fait TOUJOURS, même si le nœud a déjà des credentials
    // car l'utilisateur doit pouvoir fournir ses propres credentials
    const userCredentialTypes = detectUserCredentialTypes(node, isReportWorkflow);
    console.log(`  🔍 [WorkflowAnalyzer] Types de credentials détectés pour ${node.name}:`, Array.from(userCredentialTypes));
    userCredentialTypes.forEach(credType => {
      console.log(`  ✅ Credential utilisateur détecté: ${credType}`);
      credentialTypes.add(credType);
    });
    
    // Vérifier aussi les credentials existants pour des placeholders
    // (mais la détection automatique ci-dessus a déjà priorité)
    if (node.credentials && Object.keys(node.credentials).length > 0) {
      Object.entries(node.credentials).forEach(([credType, credValue]) => {
        console.log(`  - Credential ${credType}: ${JSON.stringify(credValue)}`);
        
        // Détecter si c'est un placeholder utilisateur
        if (typeof credValue === 'string' && credValue.includes('USER_')) {
          console.log(`  ✅ Credential utilisateur détecté: ${credValue}`);
          // Ne pas ajouter SMTP si c'est un workflow de rapport (utilise SMTP admin)
          if (credType === 'smtp' && isReportWorkflow) {
            console.log(`  ⏭️ [WorkflowAnalyzer] SMTP ignoré pour workflow de rapport (SMTP admin sera utilisé)`);
          } else {
            credentialTypes.add(credType);
          }
        } else if (typeof credValue === 'object' && credValue.id && credValue.id.includes('USER_')) {
          console.log(`  ✅ Credential utilisateur détecté: ${credValue.id}`);
          // Ne pas ajouter SMTP si c'est un workflow de rapport
          if (credType === 'smtp' && isReportWorkflow) {
            console.log(`  ⏭️ [WorkflowAnalyzer] SMTP ignoré pour workflow de rapport (SMTP admin sera utilisé)`);
          } else {
            credentialTypes.add(credType);
          }
        } else if (typeof credValue === 'object' && credValue.id === 'USER_SMTP_CREDENTIAL_ID') {
          if (!isReportWorkflow) {
            console.log(`  ✅ Credential SMTP utilisateur détecté: ${credValue.id}`);
            credentialTypes.add('smtp');
          } else {
            console.log(`  ⏭️ [WorkflowAnalyzer] SMTP utilisateur ignoré pour workflow de rapport (SMTP admin sera utilisé)`);
          }
        } else if (typeof credValue === 'object' && credValue.id === 'USER_IMAP_CREDENTIAL_ID') {
          console.log(`  ✅ Credential IMAP utilisateur détecté: ${credValue.id}`);
          credentialTypes.add('imap');
        } else if (credType === 'gmailOAuth2') {
          // Si le nœud a un credential gmailOAuth2, vérifier si c'est un nœud de lecture
          const nodeNameLower = node.name?.toLowerCase() || '';
          const isReadNode = nodeNameLower.includes('lire') || 
                            nodeNameLower.includes('read') || 
                            nodeNameLower.includes('inbox') ||
                            (nodeNameLower.includes('email') && !nodeNameLower.includes('send'));
          
          if (node.type === 'n8n-nodes-base.emailReadImap' || 
              (node.type === 'n8n-nodes-base.gmail' && isReadNode)) {
            // Pour les nœuds de lecture, utiliser IMAP au lieu de Gmail OAuth2
            console.log(`  ⚠️ [WorkflowAnalyzer] Nœud de lecture avec credential gmailOAuth2 - conversion en IMAP`);
            credentialTypes.add('imap');
          } else {
            // Pour les autres nœuds Gmail (création labels, etc.), utiliser Gmail OAuth2
            console.log(`  ✅ Credential Gmail OAuth2 détecté: ${credType}`);
            credentialTypes.add('gmailOAuth2');
          }
        }
      });
    }
  });
  
  // Générer les credentials requis basés sur les types détectés
  console.log(`🔍 [WorkflowAnalyzer] Types de credentials uniques détectés:`, Array.from(credentialTypes));
  credentialTypes.forEach(credType => {
    // Ne pas inclure SMTP si c'est un workflow de rapport
    if (credType === 'smtp' && isReportWorkflow) {
      console.log(`  ⏭️ [WorkflowAnalyzer] SMTP exclu des credentials requis (workflow de rapport)`);
      return;
    }
    const credentialConfig = getCredentialConfig(credType);
    if (credentialConfig) {
      console.log(`  ✅ [WorkflowAnalyzer] Configuration ajoutée pour ${credType}:`, credentialConfig.name);
      requiredCredentials.push(credentialConfig);
    } else {
      console.warn(`  ⚠️ [WorkflowAnalyzer] Aucune configuration trouvée pour ${credType}`);
    }
  });
  
  console.log('✅ [WorkflowAnalyzer] Credentials requis détectés:', requiredCredentials.length);
  console.log('✅ [WorkflowAnalyzer] Détails des credentials:', requiredCredentials.map(c => ({ type: c.type, name: c.name, fields: c.fields?.length || 0 })));
  console.log('✅ [WorkflowAnalyzer] Schedule Trigger détecté:', hasScheduleTrigger);
  
  // Si un Schedule Trigger est présent, ajouter un champ pour l'heure
  if (hasScheduleTrigger) {
    requiredCredentials.push({
      type: 'schedule',
      name: 'Planification',
      description: 'Configurez l\'heure d\'exécution quotidienne',
      fields: [
        { 
          name: 'scheduleTime', 
          label: 'Heure d\'exécution quotidienne', 
          type: 'time', 
          required: true, 
          defaultValue: '09:00',
          placeholder: 'HH:MM'
        }
      ]
    });
    console.log('✅ [WorkflowAnalyzer] Champ scheduleTime ajouté');
  }
  
  requiredCredentials.forEach(cred => {
    console.log(`  - ${cred.name} (${cred.type})`);
  });
  
  return requiredCredentials;
}

/**
 * Détecte automatiquement les types de credentials utilisateur requis par un nœud
 * @param {Object} node - Le nœud à analyser
 * @param {boolean} isReportWorkflow - Si true, c'est un workflow de rapport (Gmail/AI) qui utilise SMTP admin
 * @returns {Array} Liste des types de credentials requis
 */
function detectUserCredentialTypes(node, isReportWorkflow = false) {
  const credentialTypes = [];
  
  // PRIORITÉ 1: Détecter les nœuds IMAP (y compris emailReadImap avec "gmail" dans le nom)
  // Les nœuds emailReadImap nécessitent des credentials IMAP, même pour Gmail
  // IMPORTANT: Vérifier IMAP AVANT Gmail OAuth2 pour éviter les conflits
  const nodeNameLower = node.name?.toLowerCase() || '';
  const isEmailReadImap = node.type === 'n8n-nodes-base.emailReadImap';
  const isImapNode = node.type === 'n8n-nodes-imap.imap' || (node.type && node.type.includes('imap'));
  const hasGmailInName = nodeNameLower.includes('gmail');
  const hasImapInName = nodeNameLower.includes('imap');
  
  // Détecter IMAP si c'est un nœud emailReadImap ou IMAP (même avec "gmail" dans le nom)
  if (isEmailReadImap || isImapNode || hasImapInName || (hasGmailInName && isEmailReadImap)) {
    if (!credentialTypes.includes('imap')) {
      credentialTypes.push('imap');
      console.log(`  ✅ [WorkflowAnalyzer] IMAP détecté pour nœud: ${node.name} (type: ${node.type})`);
      console.log(`    - isEmailReadImap: ${isEmailReadImap}`);
      console.log(`    - isImapNode: ${isImapNode}`);
      console.log(`    - hasGmailInName: ${hasGmailInName}`);
      console.log(`    - hasImapInName: ${hasImapInName}`);
    }
  }
  
  // PRIORITÉ 2: Détecter les nœuds Gmail
  // Pour les nœuds de lecture (avec "Lire", "Read", "INBOX" dans le nom), utiliser IMAP uniquement
  // Pour les autres nœuds Gmail (création labels, etc.), utiliser Gmail OAuth2
  if (node.type === 'n8n-nodes-base.gmail' || 
      (node.type && node.type.includes('gmail') && !node.type.includes('emailReadImap'))) {
    // Vérifier si c'est un nœud de lecture d'emails
    const isReadNode = nodeNameLower.includes('lire') || 
                       nodeNameLower.includes('read') || 
                       nodeNameLower.includes('inbox') ||
                       (nodeNameLower.includes('email') && !nodeNameLower.includes('send'));
    
    if (isReadNode) {
      // Pour les nœuds de lecture Gmail, utiliser IMAP uniquement (pas OAuth2)
      if (!credentialTypes.includes('imap')) {
        credentialTypes.push('imap');
        console.log(`  ✅ [WorkflowAnalyzer] IMAP détecté pour nœud de lecture Gmail: ${node.name} (type: ${node.type})`);
        console.log(`  ⏭️ [WorkflowAnalyzer] Gmail OAuth2 ignoré pour ce nœud de lecture (IMAP uniquement)`);
      }
    } else {
      // Pour les autres nœuds Gmail (création labels, etc.), utiliser Gmail OAuth2
      if (!credentialTypes.includes('gmailOAuth2')) {
        credentialTypes.push('gmailOAuth2');
        console.log(`  ✅ [WorkflowAnalyzer] Gmail OAuth2 détecté pour nœud: ${node.name} (type: ${node.type})`);
      }
    }
  }
  
  // Détecter les nœuds SMTP
  // MAIS : Si c'est un workflow de rapport (Gmail/AI), on utilise SMTP admin, pas utilisateur
  if (node.type === 'n8n-nodes-base.emailSend' || 
      (node.type && node.type.includes('smtp')) ||
      (node.name && node.name.toLowerCase().includes('smtp')) ||
      (node.name && node.name.toLowerCase().includes('send email'))) {
    // Seulement demander SMTP utilisateur si ce n'est PAS un workflow de rapport
    if (!isReportWorkflow) {
      credentialTypes.push('smtp');
    } else {
      console.log(`  ⏭️ [WorkflowAnalyzer] SMTP ignoré pour workflow de rapport (SMTP admin sera utilisé automatiquement)`);
    }
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
    'gmailOAuth2': {
      type: 'gmailOAuth2',
      name: 'Gmail OAuth2',
      description: 'Connexion à votre compte Gmail via OAuth2',
      fields: [
        { name: 'gmailOAuth2', label: 'Connecter Gmail', type: 'oauth', required: true, provider: 'gmail' }
      ],
      oauth: true,
      provider: 'gmail'
    },
    'imap': {
      type: 'imap',
      name: 'IMAP Email',
      description: 'Configuration pour récupérer les emails (Gmail ou autre)',
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'user@gmail.com' },
        { name: 'imapPassword', label: 'Mot de passe IMAP', type: 'password', required: true, placeholder: 'Mot de passe d\'application Gmail' },
        { name: 'imapServer', label: 'Serveur IMAP', type: 'text', required: true, placeholder: 'imap.gmail.com', defaultValue: 'imap.gmail.com' },
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
  console.log('🔧 [WorkflowAnalyzer] Credentials reçus:', requiredCredentials.length);
  requiredCredentials.forEach((cred, index) => {
    console.log(`  Credential ${index + 1}: ${cred.type} - ${cred.name} - ${cred.fields?.length || 0} champ(s)`);
  });
  
  const formConfig = {
    title: 'Configuration des credentials',
    description: 'Veuillez remplir les informations nécessaires pour déployer ce workflow',
    sections: [],
    submitText: 'Déployer le workflow'
  };
  
  requiredCredentials.forEach((cred, index) => {
    console.log(`🔧 [WorkflowAnalyzer] Traitement credential ${index + 1}: ${cred.type} - ${cred.name}`);
    console.log(`  - Fields:`, cred.fields?.length || 0);
    if (cred.fields && cred.fields.length > 0) {
      console.log(`  ✅ Ajout section "${cred.name}" avec ${cred.fields.length} champ(s)`);
      formConfig.sections.push({
        title: cred.name,
        description: cred.description,
        fields: cred.fields
      });
    } else {
      console.warn(`  ⚠️ Credential ${cred.type} ignoré car pas de champs`);
    }
  });
  
  console.log('✅ [WorkflowAnalyzer] Formulaire généré avec', formConfig.sections.length, 'sections');
  formConfig.sections.forEach((section, index) => {
    console.log(`  Section ${index + 1}: ${section.title} - ${section.fields.length} champ(s)`);
  });
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
        
        // Pour les champs OAuth, on accepte si l'utilisateur a cliqué sur "Connecter" (value = 'connected')
        if (field.type === 'oauth') {
          if (field.required && (!value || value !== 'connected')) {
            errors.push(`${field.label} doit être connecté`);
          } else if (value === 'connected') {
            validatedData[field.name] = value;
          }
        } else if (field.type === 'time') {
          // Validation pour les champs time (format HH:MM)
          if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
            errors.push(`${field.label} est requis`);
          } else if (value) {
            // Valider le format HH:MM
            const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(value)) {
              errors.push(`${field.label} doit être au format HH:MM (ex: 09:00)`);
            } else {
              validatedData[field.name] = value;
            }
          }
        } else if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
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
