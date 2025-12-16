// Service pour analyser les workflows et détecter les credentials requis

/**
 * Analyse un workflow et détecte les credentials utilisateur requis
 * @param {Object} workflow - Le workflow JSON à analyser
 * @param {string} templateId - ID du template (optionnel)
 * @param {string} templateName - Nom du template dans la BDD (optionnel)
 * @returns {Array} Liste des credentials requis avec leurs types et métadonnées
 */
function analyzeWorkflowCredentials(workflow, templateId = null, templateName = null) {
  console.log('🔍 [WorkflowAnalyzer] Analyse du workflow:', workflow.name);
  if (templateId) {
    console.log('🔍 [WorkflowAnalyzer] Template ID:', templateId);
  }
  if (templateName) {
    console.log('🔍 [WorkflowAnalyzer] Template Name (BDD):', templateName);
  }
  
  const requiredCredentials = [];
  const credentialTypes = new Set();
  let hasScheduleTrigger = false;
  let hasMultipleStorageOptions = false;
  const storageCredentialTypes = new Set();
  
  if (!workflow.nodes) {
    console.log('⚠️ [WorkflowAnalyzer] Aucun nœud trouvé dans le workflow');
    return requiredCredentials;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTECTION SPÉCIALE: Workflows Nextcloud
  // Si le workflow OU le template contient "nextcloud", on ne demande QUE Nextcloud
  // ═══════════════════════════════════════════════════════════════════════════
  const workflowNameLower = (workflow.name || '').toLowerCase();
  const templateNameLower = (templateName || '').toLowerCase();
  const isNextcloudWorkflow = workflowNameLower.includes('nextcloud') || 
                              templateNameLower.includes('nextcloud') ||
                              workflow.nodes.some(node => 
                                node.type === 'n8n-nodes-base.nextCloud' ||
                                node.type?.toLowerCase().includes('nextcloud') ||
                                node.name?.toLowerCase().includes('nextcloud')
                              );
  
  if (isNextcloudWorkflow) {
    console.log('☁️ [WorkflowAnalyzer] Workflow Nextcloud détecté - credentials Nextcloud uniquement');
    
    // Vérifier s'il y a un Schedule Trigger
    const hasSchedule = workflow.nodes.some(node => 
      node.type === 'n8n-nodes-base.schedule' || 
      node.type === 'n8n-nodes-base.scheduleTrigger'
    );
    
    // Ajouter les credentials Nextcloud
    const nextcloudConfig = getCredentialConfig('nextCloudApi');
    if (nextcloudConfig) {
      requiredCredentials.push(nextcloudConfig);
      console.log('  ✅ [WorkflowAnalyzer] Credentials Nextcloud ajoutés');
    }
    
    // Ajouter le champ schedule si présent
    if (hasSchedule) {
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
      console.log('  ✅ [WorkflowAnalyzer] Schedule ajouté pour workflow Nextcloud');
    }
    
    console.log('✅ [WorkflowAnalyzer] Credentials Nextcloud: ', requiredCredentials.length);
    return requiredCredentials;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTECTION SPÉCIALE: Workflows LinkedIn
  // Si le workflow OU le template contient "linkedin", on ne demande QUE:
  // 1. Email de notification (pour recevoir les posts générés)
  // 2. LinkedIn OAuth2 (connexion LinkedIn)
  // ═══════════════════════════════════════════════════════════════════════════
  const isLinkedInWorkflow = workflowNameLower.includes('linkedin') || 
                            templateNameLower.includes('linkedin') ||
                            workflow.nodes.some(node => 
                              node.type === 'n8n-nodes-base.linkedIn' ||
                              node.type?.toLowerCase().includes('linkedin') ||
                              node.name?.toLowerCase().includes('linkedin')
                            );
  
  if (isLinkedInWorkflow) {
    console.log('💼 [WorkflowAnalyzer] Workflow LinkedIn détecté - credentials LinkedIn uniquement');
    
    // Vérifier si le workflow contient des nœuds NocoDB
    const hasNocoDbNodes = workflow.nodes.some(node => 
      node.type === 'n8n-nodes-base.nocoDb' || 
      node.type?.toLowerCase().includes('nocodb') ||
      node.name?.toLowerCase().includes('nocodb')
    );
    
    // Ajouter le champ email de notification
    requiredCredentials.push({
      type: 'notificationEmail',
      name: 'Email de notification',
      description: 'Adresse email où vous recevrez les posts LinkedIn générés automatiquement',
      fields: [
        { 
          name: 'notificationEmail', 
          label: 'Adresse email', 
          type: 'email', 
          required: true, 
          placeholder: 'votre-email@example.com'
        }
      ]
    });
    console.log('  ✅ [WorkflowAnalyzer] Champ email de notification ajouté');
    
    // Pas besoin de demander les credentials LinkedIn à l'utilisateur
    // L'admin configure les credentials LinkedIn une fois (dans admin_api_keys ou .env)
    // Tous les utilisateurs utilisent les mêmes credentials (comme pour Google)
    console.log('  ✅ [WorkflowAnalyzer] Credentials LinkedIn gérés par l\'admin (pas demandés à l\'utilisateur)');
    
    // Ajouter LinkedIn OAuth2 (bouton de connexion)
    const linkedinConfig = getCredentialConfig('linkedInOAuth2');
    if (linkedinConfig) {
      requiredCredentials.push(linkedinConfig);
      console.log('  ✅ [WorkflowAnalyzer] Credentials LinkedIn OAuth2 ajoutés');
    }
    
    // NocoDB est géré par l'admin (dans admin_api_keys ou .env)
    // Pas besoin de le demander à l'utilisateur - transparent comme OpenRouter et SMTP
    if (hasNocoDbNodes) {
      console.log('  ✅ [WorkflowAnalyzer] Nœuds NocoDB détectés - credentials gérés par l\'admin (transparent pour l\'utilisateur)');
    }
    
    console.log('✅ [WorkflowAnalyzer] Credentials LinkedIn: ', requiredCredentials.length);
    return requiredCredentials;
  }
  
  // Détecter si le workflow a plusieurs options de stockage (CV Screening, etc.)
  const hasSwitchStorage = workflow.nodes.some(node => 
    node.type === 'n8n-nodes-base.switch' && 
    (node.name?.toLowerCase().includes('storage') || 
     node.name?.toLowerCase().includes('stockage'))
  );
  
  if (hasSwitchStorage) {
    console.log('📦 [WorkflowAnalyzer] Workflow avec options de stockage multiples détecté');
    hasMultipleStorageOptions = true;
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
    const userCredentialTypes = detectUserCredentialTypes(node, isReportWorkflow, templateId);
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
          console.log(`  ✅ Credential utilisateur détecté (string): ${credValue}`);
          // Ne pas ajouter SMTP si c'est un workflow de rapport (utilise SMTP admin)
          if (credType === 'smtp' && isReportWorkflow) {
            console.log(`  ⏭️ [WorkflowAnalyzer] SMTP ignoré pour workflow de rapport (SMTP admin sera utilisé)`);
          } else {
            credentialTypes.add(credType);
          }
        } else if (typeof credValue === 'object' && credValue.id) {
          // Détecter les placeholders USER_*_CREDENTIAL_ID
          if (typeof credValue.id === 'string' && credValue.id.includes('USER_')) {
            console.log(`  ✅ Credential utilisateur détecté (placeholder): ${credValue.id}`);
            
            // Mapper les placeholders aux types de credentials
            if (credValue.id.includes('NOTION')) {
              credentialTypes.add('notionApi');
              console.log(`  ✅ Type de credential mappé: notionApi`);
            } else if (credValue.id.includes('POSTGRES')) {
              credentialTypes.add('postgres');
              console.log(`  ✅ Type de credential mappé: postgres`);
            } else if (credValue.id.includes('AIRTABLE')) {
              credentialTypes.add('airtableApi');
              console.log(`  ✅ Type de credential mappé: airtableApi`);
            } else if (credValue.id.includes('GOOGLE_SHEETS') || credValue.id.includes('SHEETS')) {
              credentialTypes.add('googleSheetsOAuth2');
              console.log(`  ✅ Type de credential mappé: googleSheetsOAuth2`);
            } else if (credValue.id.includes('SMTP')) {
              if (!isReportWorkflow) {
                credentialTypes.add('smtp');
                console.log(`  ✅ Type de credential mappé: smtp`);
              } else {
                console.log(`  ⏭️ [WorkflowAnalyzer] SMTP ignoré pour workflow de rapport (SMTP admin sera utilisé)`);
              }
            } else if (credValue.id.includes('IMAP')) {
              credentialTypes.add('imap');
              console.log(`  ✅ Type de credential mappé: imap`);
            } else if (credValue.id.includes('GMAIL')) {
              credentialTypes.add('gmailOAuth2');
              console.log(`  ✅ Type de credential mappé: gmailOAuth2`);
            } else {
              // Si on ne peut pas mapper, utiliser le type du credential
              if (credType === 'smtp' && isReportWorkflow) {
                console.log(`  ⏭️ [WorkflowAnalyzer] SMTP ignoré pour workflow de rapport (SMTP admin sera utilisé)`);
              } else {
                credentialTypes.add(credType);
                console.log(`  ✅ Type de credential utilisé tel quel: ${credType}`);
              }
            }
          } else if (credValue.id === 'USER_SMTP_CREDENTIAL_ID') {
            if (!isReportWorkflow) {
              console.log(`  ✅ Credential SMTP utilisateur détecté: ${credValue.id}`);
              credentialTypes.add('smtp');
            } else {
              console.log(`  ⏭️ [WorkflowAnalyzer] SMTP utilisateur ignoré pour workflow de rapport (SMTP admin sera utilisé)`);
            }
          } else if (credValue.id === 'USER_IMAP_CREDENTIAL_ID') {
            console.log(`  ✅ Credential IMAP utilisateur détecté: ${credValue.id}`);
            credentialTypes.add('imap');
          }
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
  
  // Si workflow avec options de stockage multiples, identifier les types de stockage AVANT de générer les credentials
  if (hasMultipleStorageOptions) {
    credentialTypes.forEach(cred => {
      if (cred === 'googleSheetsOAuth2' || cred === 'airtableApi' || 
          cred === 'notionApi' || cred === 'postgres') {
        storageCredentialTypes.add(cred);
        credentialTypes.delete(cred); // Retirer des credentials normaux pour éviter la duplication
      }
    });
    console.log(`📦 [WorkflowAnalyzer] Types de stockage détectés:`, Array.from(storageCredentialTypes));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DÉTECTION SPÉCIALE: Plusieurs services Google détectés
  // Si plusieurs services Google sont nécessaires, proposer une connexion unique "Google"
  // ═══════════════════════════════════════════════════════════════════════════
  const googleServiceTypes = ['googleSheetsOAuth2', 'googleDocsOAuth2Api', 'googleDriveOAuth2', 'gmailOAuth2'];
  const detectedGoogleServices = Array.from(credentialTypes).filter(cred => googleServiceTypes.includes(cred));
  
  if (detectedGoogleServices.length > 1) {
    console.log('🔗 [WorkflowAnalyzer] Plusieurs services Google détectés:', detectedGoogleServices);
    console.log('🔗 [WorkflowAnalyzer] Proposition d\'une connexion Google unique avec tous les scopes');
    
    // Retirer les services Google individuels
    detectedGoogleServices.forEach(googleService => {
      credentialTypes.delete(googleService);
      console.log(`  ⏭️ [WorkflowAnalyzer] Service Google ${googleService} retiré (sera remplacé par connexion unique)`);
    });
    
    // Ajouter une connexion Google unique
    const googleUnifiedConfig = {
      type: 'googleUnified',
      name: 'Google (tous services)',
      description: 'Connexion unique à votre compte Google pour accéder à Gmail, Sheets, Docs et Drive',
      fields: [
        { name: 'googleUnified', label: 'Connecter Google', type: 'oauth', required: true, provider: 'google' }
      ],
      oauth: true,
      provider: 'google',
      coversServices: detectedGoogleServices // Indiquer quels services sont couverts
    };
    
    requiredCredentials.push(googleUnifiedConfig);
    console.log(`  ✅ [WorkflowAnalyzer] Connexion Google unique ajoutée (couvre: ${detectedGoogleServices.join(', ')})`);
  }
  
  // Générer les credentials requis basés sur les types détectés (après avoir retiré les stockages)
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
  
  // Si workflow avec options de stockage multiples, ajouter un champ de sélection
  if (hasMultipleStorageOptions && storageCredentialTypes.size > 0) {
    const storageOptions = [];
    if (storageCredentialTypes.has('googleSheetsOAuth2')) {
      storageOptions.push({ value: 'google_sheets', label: 'Google Sheets' });
    }
    if (storageCredentialTypes.has('airtableApi')) {
      storageOptions.push({ value: 'airtable', label: 'Airtable' });
    }
    if (storageCredentialTypes.has('notionApi')) {
      storageOptions.push({ value: 'notion', label: 'Notion' });
    }
    if (storageCredentialTypes.has('postgres')) {
      storageOptions.push({ value: 'postgresql', label: 'PostgreSQL' });
    }
    
    requiredCredentials.push({
      type: 'storageType',
      name: 'Type de stockage',
      description: 'Choisissez où stocker les résultats de l\'analyse',
      fields: [
        { 
          name: 'storageType', 
          label: 'Système de stockage', 
          type: 'select', 
          required: true,
          options: storageOptions,
          defaultValue: storageOptions[0]?.value || 'google_sheets'
        }
      ],
      conditionalCredentials: Array.from(storageCredentialTypes).map(credType => {
        const config = getCredentialConfig(credType);
        return {
          storageValue: credType === 'googleSheetsOAuth2' ? 'google_sheets' :
                       credType === 'airtableApi' ? 'airtable' :
                       credType === 'notionApi' ? 'notion' :
                       'postgresql',
          credentialType: credType,
          credentialConfig: config
        };
      })
    });
    console.log('✅ [WorkflowAnalyzer] Champ storageType ajouté avec', storageOptions.length, 'options');
  }
  
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
function detectUserCredentialTypes(node, isReportWorkflow = false, templateId = null) {
  const credentialTypes = [];
  
  // ⚠️ EXCEPTION: Pour le template Gmail Tri (5114f297-e56e-4fec-be2b-1afbb5ea8619), 
  // ne jamais demander IMAP - utiliser uniquement Gmail OAuth2
  const isGmailTriTemplate = templateId === '5114f297-e56e-4fec-be2b-1afbb5ea8619';
  
  // ⚠️ EXCEPTION: Pour le template Microsoft Tri (a3b5ba35-aeea-48f4-83d7-34e964a6a8b6),
  // ne jamais demander IMAP - utiliser uniquement Microsoft Outlook OAuth2
  const isMicrosoftTriTemplate = templateId === 'a3b5ba35-aeea-48f4-83d7-34e964a6a8b6';
  
  // ⚠️ EXCEPTION: Pour le template Production Vidéo IA,
  // ne demander QUE Google Drive OAuth2 - ignorer tous les autres credentials (email, SMTP, etc.)
  const isVideoProductionTemplate = templateId === 'ndkuzYMKt4nRyRXy' || 
                                    templateId === '6a60e84e-b5c1-414d-9f27-5770bc438a64';
  
  // Si c'est le template Production Vidéo IA, ne détecter QUE Google Drive
  if (isVideoProductionTemplate) {
    if (node.type === 'n8n-nodes-base.googleDrive' || 
        (node.type && node.type.includes('googleDrive'))) {
      if (!credentialTypes.includes('googleDriveOAuth2')) {
        credentialTypes.push('googleDriveOAuth2');
        console.log(`  ✅ [WorkflowAnalyzer] Google Drive OAuth2 détecté pour template Production Vidéo IA: ${node.name}`);
      }
    }
    // Retourner immédiatement - ignorer tous les autres types de credentials
    return credentialTypes;
  }
  
  const nodeNameLower = node.name?.toLowerCase() || '';
  const isEmailReadImap = node.type === 'n8n-nodes-base.emailReadImap';
  const isImapNode = node.type === 'n8n-nodes-imap.imap' || (node.type && node.type.includes('imap'));
  const hasGmailInName = nodeNameLower.includes('gmail');
  const hasImapInName = nodeNameLower.includes('imap');
  
  // PRIORITÉ 1: Détecter les nœuds IMAP (y compris emailReadImap avec "gmail" dans le nom)
  // SAUF pour le template Gmail Tri et Microsoft Tri qui utilisent uniquement OAuth2
  if (!isGmailTriTemplate && !isMicrosoftTriTemplate) {
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
  } else {
    if (isGmailTriTemplate) {
      console.log(`  ⏭️ [WorkflowAnalyzer] Template Gmail Tri détecté - IMAP ignoré, utilisation de Gmail OAuth2 uniquement`);
    }
    if (isMicrosoftTriTemplate) {
      console.log(`  ⏭️ [WorkflowAnalyzer] Template Microsoft Tri détecté - IMAP ignoré, utilisation de Microsoft Outlook OAuth2 uniquement`);
    }
  }
  
  // PRIORITÉ 2: Détecter les nœuds Gmail
  // Pour le template Gmail Tri: TOUJOURS utiliser Gmail OAuth2 (même pour la lecture)
  // Pour les autres templates: utiliser IMAP pour la lecture, Gmail OAuth2 pour le reste
  if (node.type === 'n8n-nodes-base.gmail' || 
      (node.type && node.type.includes('gmail') && !node.type.includes('emailReadImap'))) {
    // Vérifier si c'est un nœud de lecture d'emails
    const isReadNode = nodeNameLower.includes('lire') || 
                       nodeNameLower.includes('read') || 
                       nodeNameLower.includes('inbox') ||
                       (nodeNameLower.includes('email') && !nodeNameLower.includes('send'));
    
    if (isGmailTriTemplate || !isReadNode) {
      // Pour le template Gmail Tri OU pour les nœuds non-lecture: utiliser Gmail OAuth2
      if (!credentialTypes.includes('gmailOAuth2')) {
        credentialTypes.push('gmailOAuth2');
        console.log(`  ✅ [WorkflowAnalyzer] Gmail OAuth2 détecté pour nœud: ${node.name} (type: ${node.type})`);
        if (isGmailTriTemplate) {
          console.log(`  ℹ️ [WorkflowAnalyzer] Template Gmail Tri - Gmail OAuth2 utilisé même pour la lecture`);
        }
      }
    } else {
      // Pour les autres templates avec nœuds de lecture Gmail: utiliser IMAP uniquement
      if (!credentialTypes.includes('imap')) {
        credentialTypes.push('imap');
        console.log(`  ✅ [WorkflowAnalyzer] IMAP détecté pour nœud de lecture Gmail: ${node.name} (type: ${node.type})`);
        console.log(`  ⏭️ [WorkflowAnalyzer] Gmail OAuth2 ignoré pour ce nœud de lecture (IMAP uniquement)`);
      }
    }
  }
  
  // Détecter les nœuds SMTP
  // ⚠️ IMPORTANT: Tous les emails partent de l'adresse admin, on ne demande JAMAIS les credentials SMTP utilisateur
  if (node.type === 'n8n-nodes-base.emailSend' || 
      (node.type && node.type.includes('smtp')) ||
      (node.name && node.name.toLowerCase().includes('smtp')) ||
      (node.name && node.name.toLowerCase().includes('send email'))) {
    // Ne jamais demander SMTP utilisateur - SMTP admin sera utilisé automatiquement
    console.log(`  ⏭️ [WorkflowAnalyzer] SMTP ignoré (SMTP admin sera utilisé automatiquement pour tous les workflows)`);
  }
  
  // Détecter les nœuds OpenAI/OpenRouter (gérés par l'admin)
  if (node.type === 'n8n-nodes-base.openAi' || 
      (node.type && node.type.includes('openai')) ||
      (node.name && node.name.toLowerCase().includes('openai')) ||
      (node.name && node.name.toLowerCase().includes('openrouter'))) {
    // Les credentials OpenAI sont gérés par l'admin, pas par l'utilisateur
    // credentialTypes.push('openAiApi');
  }
  
  // Détecter les nœuds Google Sheets (y compris Tool)
  if (node.type === 'n8n-nodes-base.googleSheets' || 
      node.type === 'n8n-nodes-base.googleSheetsTool' ||
      (node.type && node.type.includes('googleSheets'))) {
    if (!credentialTypes.includes('googleSheetsOAuth2')) {
      credentialTypes.push('googleSheetsOAuth2');
      console.log(`  ✅ [WorkflowAnalyzer] Google Sheets OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Google Docs
  if (node.type === 'n8n-nodes-base.googleDocs' || 
      (node.type && node.type.includes('googleDocs')) ||
      node.type === 'n8n-nodes-base.googleDocsTool') {
    if (!credentialTypes.includes('googleDocsOAuth2Api')) {
      credentialTypes.push('googleDocsOAuth2Api');
      console.log(`  ✅ [WorkflowAnalyzer] Google Docs OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Google Drive (y compris Tool)
  if (node.type === 'n8n-nodes-base.googleDrive' || 
      node.type === 'n8n-nodes-base.googleDriveTool' ||
      (node.type && node.type.includes('googleDrive'))) {
    if (!credentialTypes.includes('googleDriveOAuth2')) {
      credentialTypes.push('googleDriveOAuth2');
      console.log(`  ✅ [WorkflowAnalyzer] Google Drive OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Gmail
  if (node.type === 'n8n-nodes-base.gmail' || 
      (node.type && node.type.includes('gmail')) ||
      node.type === 'n8n-nodes-base.gmailTool') {
    if (!credentialTypes.includes('gmailOAuth2')) {
      credentialTypes.push('gmailOAuth2');
      console.log(`  ✅ [WorkflowAnalyzer] Gmail OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Google Calendar
  if (node.type === 'n8n-nodes-base.googleCalendar' || 
      (node.type && node.type.includes('googleCalendar')) ||
      (node.type && node.type.includes('calendar')) ||
      (node.name && node.name.toLowerCase().includes('calendar'))) {
    if (!credentialTypes.includes('googleCalendarOAuth2Api')) {
      credentialTypes.push('googleCalendarOAuth2Api');
      console.log(`  ✅ [WorkflowAnalyzer] Google Calendar OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Google Ads
  if (node.type === 'n8n-nodes-base.googleAds' || 
      (node.type && node.type.includes('googleAds')) ||
      (node.type && node.type.includes('ads')) ||
      (node.name && node.name.toLowerCase().includes('ads'))) {
    if (!credentialTypes.includes('googleAdsOAuth2Api')) {
      credentialTypes.push('googleAdsOAuth2Api');
      console.log(`  ✅ [WorkflowAnalyzer] Google Ads OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Google Tasks
  if (node.type === 'n8n-nodes-base.googleTasks' || 
      (node.type && node.type.includes('googleTasks')) ||
      (node.type && node.type.includes('tasks')) ||
      (node.name && node.name.toLowerCase().includes('tasks'))) {
    if (!credentialTypes.includes('googleTasksOAuth2Api')) {
      credentialTypes.push('googleTasksOAuth2Api');
      console.log(`  ✅ [WorkflowAnalyzer] Google Tasks OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Google Slides
  if (node.type === 'n8n-nodes-base.googleSlides' || 
      (node.type && node.type.includes('googleSlides')) ||
      (node.type && node.type.includes('slides')) ||
      (node.type && node.type.includes('presentation')) ||
      (node.name && (node.name.toLowerCase().includes('slides') || node.name.toLowerCase().includes('presentation')))) {
    if (!credentialTypes.includes('googleSlidesOAuth2Api')) {
      credentialTypes.push('googleSlidesOAuth2Api');
      console.log(`  ✅ [WorkflowAnalyzer] Google Slides OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Airtable
  if (node.type === 'n8n-nodes-base.airtable' || 
      (node.type && node.type.includes('airtable'))) {
    if (!credentialTypes.includes('airtableApi')) {
      credentialTypes.push('airtableApi');
      console.log(`  ✅ [WorkflowAnalyzer] Airtable API détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Notion
  if (node.type === 'n8n-nodes-base.notion' || 
      (node.type && node.type.includes('notion'))) {
    if (!credentialTypes.includes('notionApi')) {
      credentialTypes.push('notionApi');
      console.log(`  ✅ [WorkflowAnalyzer] Notion API détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds PostgreSQL
  if (node.type === 'n8n-nodes-base.postgres' || 
      (node.type && node.type.includes('postgres'))) {
    if (!credentialTypes.includes('postgres')) {
      credentialTypes.push('postgres');
      console.log(`  ✅ [WorkflowAnalyzer] PostgreSQL détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Microsoft Outlook
  // PRIORITÉ: Pour le template Microsoft Tri, TOUJOURS utiliser Microsoft Outlook OAuth2
  // Pour les autres templates: détecter normalement
  if (node.type === 'n8n-nodes-base.microsoftOutlook' || 
      (node.type && node.type.includes('microsoftOutlook'))) {
    if (!credentialTypes.includes('microsoftOutlookOAuth2')) {
      credentialTypes.push('microsoftOutlookOAuth2');
      console.log(`  ✅ [WorkflowAnalyzer] Microsoft Outlook OAuth2 détecté pour nœud: ${node.name} (type: ${node.type})`);
      if (isMicrosoftTriTemplate) {
        console.log(`  ℹ️ [WorkflowAnalyzer] Template Microsoft Tri - Microsoft Outlook OAuth2 utilisé pour tous les nœuds`);
      }
    }
  }
  
  // Détecter les nœuds Google Drive
  if (node.type === 'n8n-nodes-base.googleDrive' || 
      (node.type && node.type.includes('googleDrive'))) {
    if (!credentialTypes.includes('googleDriveOAuth2')) {
      credentialTypes.push('googleDriveOAuth2');
      console.log(`  ✅ [WorkflowAnalyzer] Google Drive OAuth2 détecté pour nœud: ${node.name}`);
    }
  }
  
  // Détecter les nœuds Nextcloud
  if (node.type === 'n8n-nodes-base.nextCloud' || 
      node.type === 'n8n-nodes-base.nextcloud' ||
      (node.type && node.type.toLowerCase().includes('nextcloud')) ||
      (node.name && node.name.toLowerCase().includes('nextcloud'))) {
    if (!credentialTypes.includes('nextCloudApi')) {
      credentialTypes.push('nextCloudApi');
      console.log(`  ✅ [WorkflowAnalyzer] Nextcloud API détecté pour nœud: ${node.name} (type: ${node.type})`);
    }
  }
  
  // Détecter les nœuds WebDAV (souvent utilisé avec Nextcloud)
  if (node.type === 'n8n-nodes-base.webdav' || 
      (node.type && node.type.toLowerCase().includes('webdav')) ||
      (node.name && node.name.toLowerCase().includes('webdav'))) {
    if (!credentialTypes.includes('webDavApi')) {
      credentialTypes.push('webDavApi');
      console.log(`  ✅ [WorkflowAnalyzer] WebDAV API détecté pour nœud: ${node.name}`);
    }
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
    },
    'googleSheetsOAuth2': {
      type: 'googleSheetsOAuth2',
      name: 'Google Sheets',
      description: 'Connexion à Google Sheets pour stocker les résultats',
      fields: [
        { name: 'googleSheetsOAuth2', label: 'Connecter Google Sheets', type: 'oauth', required: true, provider: 'google_sheets' },
        { name: 'googleSheetsDocumentId', label: 'ID du document Google Sheets', type: 'text', required: true, placeholder: 'Copiez l\'ID depuis l\'URL du document (ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)' }
      ],
      oauth: true,
      provider: 'google_sheets'
    },
    'googleDriveOAuth2': {
      type: 'googleDriveOAuth2',
      name: 'Google Drive',
      description: 'Connexion à Google Drive pour stocker les fichiers',
      fields: [
        { name: 'googleDriveOAuth2', label: 'Connecter Google Drive', type: 'oauth', required: true, provider: 'google_drive' },
        { name: 'googleDriveFolderId', label: 'ID du dossier Google Drive (optionnel)', type: 'text', required: false, placeholder: 'Laissez vide pour la racine ou copiez l\'ID du dossier' }
      ],
      oauth: true,
      provider: 'google_drive'
    },
    'googleDocsOAuth2Api': {
      type: 'googleDocsOAuth2Api',
      name: 'Google Docs',
      description: 'Connexion à Google Docs pour créer et modifier des documents',
      fields: [
        { name: 'googleDocsOAuth2', label: 'Connecter Google Docs', type: 'oauth', required: true, provider: 'google_docs' }
      ],
      oauth: true,
      provider: 'google_docs'
    },
    'airtableApi': {
      type: 'airtableApi',
      name: 'Airtable',
      description: 'Connexion à Airtable pour stocker les résultats',
      fields: [
        { name: 'airtableApiKey', label: 'Clé API Airtable', type: 'password', required: true, placeholder: 'pat...' }
      ]
    },
    'notionApi': {
      type: 'notionApi',
      name: 'Notion',
      description: 'Connexion à Notion pour stocker les résultats',
      fields: [
        { name: 'notionApiKey', label: 'Clé API Notion', type: 'password', required: true, placeholder: 'secret_...' }
      ]
    },
    'postgres': {
      type: 'postgres',
      name: 'PostgreSQL',
      description: 'Connexion à PostgreSQL pour stocker les résultats',
      fields: [
        { name: 'host', label: 'Hôte', type: 'text', required: true, placeholder: 'localhost' },
        { name: 'database', label: 'Base de données', type: 'text', required: true, placeholder: 'mydb' },
        { name: 'user', label: 'Utilisateur', type: 'text', required: true, placeholder: 'postgres' },
        { name: 'password', label: 'Mot de passe', type: 'password', required: true },
        { name: 'port', label: 'Port', type: 'number', required: false, defaultValue: 5432 }
      ]
    },
    'nextCloudApi': {
      type: 'nextCloudApi',
      name: 'Nextcloud',
      description: 'Connexion à votre serveur Nextcloud',
      fields: [
        { name: 'nextcloudUrl', label: 'URL Nextcloud', type: 'text', required: true, placeholder: 'https://votre-serveur.nextcloud.com' },
        { name: 'nextcloudUsername', label: 'Nom d\'utilisateur', type: 'text', required: true, placeholder: 'admin' },
        { name: 'nextcloudPassword', label: 'Mot de passe ou Token d\'application', type: 'password', required: true, placeholder: 'Mot de passe ou token généré dans Nextcloud' },
        { name: 'nextcloudSourceFolder', label: '📁 Dossier(s) à trier', type: 'text', required: false, placeholder: '/Documents ou /Photos,/Videos (séparez par des virgules)', defaultValue: '/' },
        { name: 'nextcloudDestinationFolder', label: '📂 Dossier de destination', type: 'text', required: false, placeholder: '/Triés (dossier où seront créés les sous-dossiers)', defaultValue: '/Triés' }
      ]
    },
    'webDavApi': {
      type: 'webDavApi',
      name: 'WebDAV',
      description: 'Connexion WebDAV (compatible Nextcloud, ownCloud, etc.)',
      fields: [
        { name: 'webdavUrl', label: 'URL WebDAV', type: 'text', required: true, placeholder: 'https://votre-serveur.com/remote.php/webdav/' },
        { name: 'webdavUsername', label: 'Nom d\'utilisateur', type: 'text', required: true, placeholder: 'utilisateur' },
        { name: 'webdavPassword', label: 'Mot de passe', type: 'password', required: true }
      ]
    },
    'microsoftOutlookOAuth2': {
      type: 'microsoftOutlookOAuth2',
      name: 'Microsoft Outlook OAuth2',
      description: 'Connexion à votre compte Microsoft Outlook/Hotmail via OAuth2',
      fields: [
        { name: 'microsoftOutlookOAuth2', label: 'Connecter Microsoft Outlook', type: 'oauth', required: true, provider: 'microsoft' }
      ],
      oauth: true,
      provider: 'microsoft'
    },
    'googleUnified': {
      type: 'googleUnified',
      name: 'Google (tous services)',
      description: 'Connexion unique à votre compte Google pour accéder à Gmail, Sheets, Docs et Drive',
      fields: [
        { name: 'googleUnified', label: 'Connecter Google', type: 'oauth', required: true, provider: 'google' }
      ],
      oauth: true,
      provider: 'google'
    },
    'linkedInOAuth2': {
      type: 'linkedInOAuth2',
      name: 'LinkedIn OAuth2',
      description: 'Connexion à votre compte LinkedIn via OAuth2 pour publier des posts',
      fields: [
        { name: 'linkedInOAuth2', label: 'Connecter LinkedIn', type: 'oauth', required: true, provider: 'linkedin' }
      ],
      oauth: true,
      provider: 'linkedin'
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
  
  // Identifier la section SMTP/Email pour y fusionner le storageType si présent
  let smtpSectionIndex = -1;
  let storageTypeCredential = null;
  
  requiredCredentials.forEach((cred, index) => {
    if (cred.type === 'storageType') {
      storageTypeCredential = cred;
      return; // Ne pas l'ajouter maintenant, on le fusionnera avec SMTP
    }
    if (cred.type === 'smtp' || cred.type === 'imap') {
      smtpSectionIndex = formConfig.sections.length; // Index où sera ajoutée cette section
    }
  });
  
  requiredCredentials.forEach((cred, index) => {
    console.log(`🔧 [WorkflowAnalyzer] Traitement credential ${index + 1}: ${cred.type} - ${cred.name}`);
    console.log(`  - Fields:`, cred.fields?.length || 0);
    
    // Ignorer storageType ici, il sera fusionné avec SMTP
    if (cred.type === 'storageType') {
      return;
    }
    
    if (cred.fields && cred.fields.length > 0) {
      console.log(`  ✅ Ajout section "${cred.name}" avec ${cred.fields.length} champ(s)`);
      
      // ⚠️ DEBUG: Log des champs avant de les ajouter à la section
      cred.fields.forEach((field, fieldIndex) => {
        console.log(`    Champ ${fieldIndex + 1}:`, {
          name: field.name,
          label: field.label,
          type: field.type,
          provider: field.provider
        });
      });
      
      const section = {
        title: cred.name,
        description: cred.description,
        fields: cred.fields.map(field => ({ ...field })) // Créer une copie pour éviter les mutations
      };
      
      // Si c'est la section SMTP/Email ET qu'on a un storageType, fusionner
      if ((cred.type === 'smtp' || cred.type === 'imap') && storageTypeCredential) {
        console.log(`  🔗 Fusion de storageType avec section ${cred.name}`);
        // Ajouter le champ storageType en premier
        section.fields = [
          ...storageTypeCredential.fields,
          ...cred.fields
        ];
        // Ajouter les conditionalCredentials
        if (storageTypeCredential.conditionalCredentials) {
          section.conditionalCredentials = storageTypeCredential.conditionalCredentials;
          console.log(`  📦 ConditionalCredentials ajoutés: ${storageTypeCredential.conditionalCredentials.length} option(s)`);
        }
        // Mettre à jour la description pour inclure le stockage
        section.description = `${cred.description}. ${storageTypeCredential.description}`;
      }
      
      formConfig.sections.push(section);
    } else {
      console.warn(`  ⚠️ Credential ${cred.type} ignoré car pas de champs`);
    }
  });
  
  // Si storageType n'a pas été fusionné (pas de section SMTP/Email), l'ajouter comme section séparée
  if (storageTypeCredential && smtpSectionIndex === -1) {
    console.log(`  ✅ Ajout section storageType séparée (pas de section email trouvée)`);
    const section = {
      title: storageTypeCredential.name,
      description: storageTypeCredential.description,
      fields: storageTypeCredential.fields
    };
    if (storageTypeCredential.conditionalCredentials) {
      section.conditionalCredentials = storageTypeCredential.conditionalCredentials;
    }
    formConfig.sections.push(section);
  }
  
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
