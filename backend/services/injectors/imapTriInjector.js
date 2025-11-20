// Injecteur spécifique pour le template "imap Tri Automatique BAL"
// Ce template nécessite :
// - IMAP pour tous les nœuds IMAP (lecture emails, création dossiers, déplacement emails)
// - SMTP admin pour l'envoi du rapport

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials } = require('../n8nService');
const { createImapCredential } = require('../credentialInjector');

/**
 * Injecte les credentials utilisateur pour le template IMAP Tri Automatique
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  console.log('🎯 [ImapTriInjector] Injection spécifique pour IMAP Tri Automatique BAL...');
  console.log('🎯 [ImapTriInjector] Template ID:', templateId);
  console.log('🎯 [ImapTriInjector] Template Name:', templateName);
  
  // Nettoyer le nom du template pour les noms de credentials
  const cleanTemplateName = templateName 
    ? templateName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40)
    : null;
  
  // Générer un webhook unique
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    const templateIdShort = templateId.replace(/-/g, '').substring(0, 8);
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);
    uniqueWebhookPath = `workflow-${templateIdShort}-${userIdShort}`;
    console.log('🔧 [ImapTriInjector] Webhook unique généré:', uniqueWebhookPath);
  }
  
  // Analyser les credentials requis
  let requiredCredentials = analyzeWorkflowCredentials(workflow);
  console.log('🔧 [ImapTriInjector] Credentials requis (avant filtrage):', requiredCredentials.length);
  
  // ⚠️ IMPORTANT: Exclure SMTP des credentials requis car on utilise toujours SMTP admin
  // L'injecteur IMAP utilise toujours le credential SMTP admin pour l'envoi des rapports
  requiredCredentials = requiredCredentials.filter(cred => cred.type !== 'smtp');
  console.log('🔧 [ImapTriInjector] Credentials requis (après filtrage SMTP):', requiredCredentials.length);
  console.log('🔧 [ImapTriInjector] SMTP exclu - utilisation du credential SMTP admin automatique');
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  const createdCredentials = {};
  
  // Récupérer les credentials admin
  console.log('🔍 [ImapTriInjector] Appel de getAdminCredentials()...');
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    console.log('✅ [ImapTriInjector] getAdminCredentials() terminé');
  } catch (error) {
    console.error('❌ [ImapTriInjector] Erreur lors de l\'appel à getAdminCredentials():', error.message);
    console.error('❌ [ImapTriInjector] Stack:', error.stack);
    // Continuer avec adminCreds vide, on gérera l'erreur plus tard
  }
  
  // ⚠️ IMPORTANT: Pour ce template, utiliser le credential SMTP ADMIN pour les nœuds emailSend
  // L'email de rapport doit être envoyé depuis l'email admin
  console.log('🔍 [ImapTriInjector] Vérification credential SMTP admin...');
  if (adminCreds.SMTP_ID) {
    createdCredentials.smtp = {
      id: adminCreds.SMTP_ID,
      name: adminCreds.SMTP_NAME || 'SMTP Admin'
    };
    console.log('✅ [ImapTriInjector] Credential SMTP admin trouvé et utilisé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
  } else {
    // ⚠️ IMPORTANT: Si le credential SMTP admin n'est pas trouvé, le créer
    console.log('⚠️ [ImapTriInjector] Credential SMTP admin non trouvé, création...');
    const config = require('../../config');
    const { createCredential } = require('../n8nService');
    
    // Construire le nom du credential avec le template name et l'email de l'utilisateur
    const userEmail = userCredentials.email || '';
    const templateNamePart = cleanTemplateName ? `-${cleanTemplateName}` : '';
    const userEmailPart = userEmail ? `-${userEmail}` : '';
    const smtpCredentialName = `SMTP Admin - admin@heleam.com${templateNamePart}${userEmailPart}`;
    
    try {
      const smtpCredentialData = {
        name: smtpCredentialName,
        type: 'smtp',
        data: {
          host: config.email.smtpHost,
          port: config.email.smtpPort || 587,
          user: config.email.smtpUser || 'admin@heleam.com',
          password: config.email.smtpPassword,
          secure: config.email.smtpPort === 465,
          disableStartTls: config.email.smtpPort === 465
        }
      };
      
      const smtpCred = await createCredential(smtpCredentialData);
      createdCredentials.smtp = {
        id: smtpCred.id,
        name: smtpCred.name || smtpCredentialName
      };
      console.log('✅ [ImapTriInjector] Credential SMTP admin créé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
      console.log('✅ [ImapTriInjector] Ce credential sera supprimé avec le workflow car il contient l\'email de l\'utilisateur');
    } catch (error) {
      console.error('❌ [ImapTriInjector] Erreur création credential SMTP admin:', error);
      throw new Error('Impossible de créer le credential SMTP admin. Vérifiez la configuration SMTP dans config.js.');
    }
  }
  
  // Créer les credentials utilisateur selon les besoins spécifiques de ce template
  // ⚠️ NOTE: SMTP a déjà été filtré de requiredCredentials ci-dessus, donc il ne sera pas traité ici
  for (const credConfig of requiredCredentials) {
    if (credConfig.type === 'imap') {
      // Créer un nouveau credential IMAP à chaque redéploiement
      // (l'ancien sera supprimé avec l'ancien workflow)
      console.log('🔧 [ImapTriInjector] Création d\'un nouveau credential IMAP...');
      const imapCred = await createImapCredential(userCredentials, userId, cleanTemplateName);
      createdCredentials.imap = imapCred;
      console.log('✅ [ImapTriInjector] Credential IMAP créé:', imapCred.id, '- Nom:', imapCred.name);
      
      // ⚠️ CRITIQUE: Vérifier que le credential est bien accessible dans n8n après création
      // Attendre un peu pour que n8n traite la création du credential
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Vérifier que le credential existe bien dans n8n
      try {
        const config = require('../../config');
        const n8nUrl = config.n8n.url;
        const n8nApiKey = config.n8n.apiKey;
        
        const verifyCredResponse = await fetch(`${n8nUrl}/api/v1/credentials/${imapCred.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': n8nApiKey
          }
        });
        
        if (verifyCredResponse.ok) {
          const verifiedCred = await verifyCredResponse.json();
          console.log(`✅ [ImapTriInjector] Credential IMAP vérifié dans n8n: ${verifiedCred.name} (ID: ${imapCred.id})`);
        } else {
          const errorText = await verifyCredResponse.text();
          console.error(`❌ [ImapTriInjector] ERREUR: Le credential IMAP ${imapCred.id} n'est pas accessible dans n8n!`);
          console.error(`❌ [ImapTriInjector] Status: ${verifyCredResponse.status}, Erreur: ${errorText}`);
          throw new Error(`Le credential IMAP ${imapCred.id} n'est pas accessible dans n8n après création. Status: ${verifyCredResponse.status}`);
        }
      } catch (verifyError) {
        console.error('❌ [ImapTriInjector] Erreur lors de la vérification du credential:', verifyError.message);
        // Ne pas throw, juste logger l'erreur pour continuer
      }
    }
    
    // ⚠️ SMTP ne devrait jamais arriver ici car il a été filtré de requiredCredentials
    // Mais on garde cette vérification par sécurité
    if (credConfig.type === 'smtp') {
      console.log('⏭️ [ImapTriInjector] SMTP ignoré - utilisation du credential SMTP admin (ne devrait pas arriver ici)');
    }
  }
  
  // Remplacer les placeholders OpenRouter si nécessaire
  if (adminCreds.OPENROUTER_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_PLACEHOLDER"/g,
      JSON.stringify({ id: adminCreds.OPENROUTER_ID, name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin' })
    );
  }
  
  // ⚠️ CRITIQUE: Remplacer les anciens credentials IMAP dans la string JSON AVANT le parsing
  // Cela garantit que tous les anciens credentials sont remplacés, même si le nœud n'est pas traité dans le map
  // Liste des anciens credentials connus à remplacer
  const oldCredentialIds = [
    'TzbdyviB9rwphQKY',
    'LHBrt9bgHWvgfN4C',
    'zDtY5xDI7IO0bwOY',
    'MyExjQHQcE7OQq3k',
    'uTAvaVgPIcQtnKbj',
    '7tcFf2ZH4qlW6GtS'
  ];
  
  // ⚠️ IMPORTANT: Attendre que le credential IMAP soit créé avant de faire les remplacements
  if (createdCredentials.imap && createdCredentials.imap.id) {
    console.log('🔧 [ImapTriInjector] Remplacement des anciens credentials IMAP dans la string JSON...');
    const newCredId = createdCredentials.imap.id;
    const newCredName = createdCredentials.imap.name;
    
    // Remplacer tous les anciens credentials IMAP par le nouveau
    oldCredentialIds.forEach(oldId => {
      const escapedOldId = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedNewId = newCredId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedNewName = newCredName.replace(/"/g, '\\"');
      
      // ⚠️ APPROCHE SIMPLE ET ROBUSTE: Remplacer directement l'ID du credential
      // Pattern qui cherche "id":"OLD_ID" dans un contexte credential (précédé de "imapApi" ou "imap")
      // Utiliser un pattern qui gère les retours à la ligne et les espaces multiples
      // Pattern pour imapApi - avec gestion des retours à la ligne
      const pattern1 = new RegExp(`("imapApi"\\s*:\\s*\\{[\\s\\S]*?"id"\\s*:\\s*")${escapedOldId}([\\s\\S]*?"name"\\s*:\\s*")[^"]*(")`, 'g');
      let count1 = 0;
      workflowString = workflowString.replace(pattern1, (match, p1, p2, p3) => {
        count1++;
        return `${p1}${escapedNewId}${p2}${escapedNewName}${p3}`;
      });
      if (count1 > 0) {
        console.log(`  ✅ [ImapTriInjector] ${count1} occurrence(s) de l'ancien credential imapApi ${oldId} remplacée(s) par ${newCredId}`);
      }
      
      // Pattern pour imap - avec gestion des retours à la ligne
      const pattern2 = new RegExp(`("imap"\\s*:\\s*\\{[\\s\\S]*?"id"\\s*:\\s*")${escapedOldId}([\\s\\S]*?"name"\\s*:\\s*")[^"]*(")`, 'g');
      let count2 = 0;
      workflowString = workflowString.replace(pattern2, (match, p1, p2, p3) => {
        count2++;
        return `${p1}${escapedNewId}${p2}${escapedNewName}${p3}`;
      });
      if (count2 > 0) {
        console.log(`  ✅ [ImapTriInjector] ${count2} occurrence(s) de l'ancien credential imap ${oldId} remplacée(s) par ${newCredId}`);
      }
      
      // ⚠️ FALLBACK: Si les patterns complexes ne fonctionnent pas, utiliser un remplacement simple de l'ID
      // Remplacer directement "id":"OLD_ID" par "id":"NEW_ID" dans tout le JSON
      // Mais seulement si c'est dans un contexte credential (précédé de "imapApi" ou "imap" dans les 200 caractères précédents)
      if (count1 === 0 && count2 === 0) {
        const simplePattern = new RegExp(`("id"\\s*:\\s*")${escapedOldId}(")`, 'g');
        let simpleCount = 0;
        workflowString = workflowString.replace(simplePattern, (match, p1, p2, offset) => {
          // Vérifier que c'est dans un contexte credential (chercher "imapApi" ou "imap" dans les 200 caractères précédents)
          const before = workflowString.substring(Math.max(0, offset - 200), offset);
          if (before.includes('"imapApi"') || before.includes('"imap"')) {
            simpleCount++;
            return `${p1}${escapedNewId}${p2}`;
          }
          return match;
        });
        if (simpleCount > 0) {
          console.log(`  ✅ [ImapTriInjector] Remplacement simple de l'ID ${oldId} par ${newCredId} (${simpleCount} occurrence(s) dans contexte credential)`);
        }
      }
    });
  }
  
  // Parser le workflow
  const injectedWorkflow = JSON.parse(workflowString);
  
  // Récupérer l'email de l'utilisateur pour le rapport
  const userEmail = userCredentials.email || '';
  
  // ⚠️ CRITIQUE: Vérifier que le credential IMAP a bien été créé avant d'injecter
  if (!createdCredentials.imap || !createdCredentials.imap.id) {
    console.error('❌ [ImapTriInjector] ERREUR CRITIQUE: Aucun credential IMAP créé!');
    console.error('❌ [ImapTriInjector] createdCredentials:', createdCredentials);
    throw new Error('Le credential IMAP n\'a pas été créé. Impossible de continuer.');
  }
  
  console.log('✅ [ImapTriInjector] Credential IMAP créé et prêt à être injecté:', createdCredentials.imap.id);
  
  // ⚠️ CRITIQUE: Modifier le code JavaScript pour gérer le cas où aucun email n'est trouvé
  // Le nœud "Normaliser Emails2" doit retourner au moins un item pour continuer le workflow
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map((node) => {
      if (node.name === 'Normaliser Emails2' && node.type === 'n8n-nodes-base.code') {
        const originalCode = node.parameters.jsCode || '';
        
        // Modifier le code pour retourner un item avec skip: true au lieu de [] quand aucun email
        // Pattern 1: Remplacer "return [];" quand items.length === 0
        let modifiedCode = originalCode.replace(
          /if\s*\(!items\s*\|\|\s*items\.length\s*===\s*0\)\s*\{[\s\S]*?return\s*\[\];[\s\S]*?\}/g,
          `if (!items || items.length === 0) {
  console.log('❌ Aucun email reçu');
  return [{ json: { skip: true, message: 'Aucun email à traiter', emails: [] } }];
}`
        );
        
        // Pattern 2: Remplacer "return [];" quand emails.length === 0
        modifiedCode = modifiedCode.replace(
          /if\s*\(emails\.length\s*===\s*0\)\s*\{[\s\S]*?return\s*\[\];[\s\S]*?\}/g,
          `if (emails.length === 0) {
  console.log('⚠️ Aucun email valide à traiter');
  return [{ json: { skip: true, message: 'Aucun email valide à traiter', emails: [] } }];
}`
        );
        
        if (modifiedCode !== originalCode) {
          node.parameters.jsCode = modifiedCode;
          console.log('✅ [ImapTriInjector] Code "Normaliser Emails2" modifié pour gérer le cas sans emails');
        }
      }
      
      return node;
    });
  }
  
  // Injecter les credentials dans les nœuds selon les règles spécifiques de ce template
  if (injectedWorkflow.nodes) {
    console.log(`🔍 [ImapTriInjector] Traitement de ${injectedWorkflow.nodes.length} nœuds pour injection des credentials...`);
    
    // ⚠️ DEBUG: Lister tous les nœuds IMAP avant traitement
    const imapNodesBefore = injectedWorkflow.nodes.filter(n => 
      n.type === 'n8n-nodes-imap.imap' || 
      n.type === 'n8n-nodes-base.emailReadImap' ||
      n.type === 'n8n-nodes-imap-enhanced.imapEnhanced'
    );
    console.log(`🔍 [ImapTriInjector] ${imapNodesBefore.length} nœud(s) IMAP trouvé(s) avant traitement:`);
    imapNodesBefore.forEach(n => {
      const cred = n.credentials?.imapApi || n.credentials?.imap;
      console.log(`  - ${n.name}: type=${n.type}, credential=${cred?.id || 'aucun'}`);
    });
    
    injectedWorkflow.nodes = injectedWorkflow.nodes.map((node) => {
      // ⚠️ CRITIQUE: Créer une copie profonde du nœud pour éviter les références partagées
      const cleanedNode = JSON.parse(JSON.stringify(node));
      
      // ⚠️ CRITIQUE: Configurer automatiquement le nœud IMAP qui lit les emails depuis INBOX
      // Cela permet au workflow de fonctionner sans configuration manuelle
      if (node.type === 'n8n-nodes-imap-enhanced.imapEnhanced' && 
          node.name?.toLowerCase().includes('loadmailbox') &&
          !node.name?.toLowerCase().includes('mailbox1') &&
          !node.name?.toLowerCase().includes('mailbox2')) {
        // C'est le nœud principal qui lit les emails depuis INBOX
        // Configurer automatiquement tous les paramètres nécessaires
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = {};
        }
        
        // Configurer les paramètres pour lire les emails depuis INBOX
        // Format selon le JSON fonctionnel fourni par l'utilisateur
        cleanedNode.parameters.resource = 'email';
        cleanedNode.parameters.emailDateRange = {
          "since": ""
        };
        cleanedNode.parameters.emailFlags = {
          "seen": true
        };
        cleanedNode.parameters.customLabels = {};
        cleanedNode.parameters.emailSearchFilters = {};
        
        // Activer "Always Output Data" pour continuer même si aucun email n'est trouvé
        if (cleanedNode.alwaysOutputData !== true) {
          cleanedNode.alwaysOutputData = true;
        }
        
        console.log(`✅ [ImapTriInjector] Configuration automatique appliquée pour ${node.name}:`);
        console.log(`  - Resource: email`);
        console.log(`  - Email Flags: seen=true (emails lus uniquement)`);
        console.log(`  - Email Date Range: since="" (tous les emails)`);
        console.log(`  - Always Output Data: true`);
      } else if ((node.type === 'n8n-nodes-imap.imap' || node.type === 'n8n-nodes-imap-enhanced.imapEnhanced') && 
          (node.parameters?.resource === 'email' || node.parameters?.operation === 'getEmails') &&
          (node.name?.toLowerCase().includes('lire') || 
           node.name?.toLowerCase().includes('read') ||
           node.parameters?.mailboxPath?.value === 'INBOX')) {
        // Pour les autres nœuds IMAP qui lisent INBOX (ancien format)
        if (cleanedNode.alwaysOutputData !== true) {
          cleanedNode.alwaysOutputData = true;
          console.log(`✅ [ImapTriInjector] Option "alwaysOutputData" activée pour ${node.name}`);
        }
      }
      
      // Tous les nœuds IMAP utilisent le credential IMAP utilisateur
      // ⚠️ IMPORTANT: Les nœuds n8n-nodes-imap.imap utilisent "imapApi" comme clé de credential
      // Les nœuds n8n-nodes-base.emailReadImap utilisent "imap" comme clé de credential
      // Les nœuds n8n-nodes-imap-enhanced.imapEnhanced utilisent "imap" comme clé de credential
      if (node.type === 'n8n-nodes-imap.imap' || 
          node.type === 'n8n-nodes-base.emailReadImap' ||
          node.type === 'n8n-nodes-imap-enhanced.imapEnhanced') {
        console.log(`🔍 [ImapTriInjector] Traitement du nœud IMAP: ${node.name} (type: ${node.type})`);
        console.log(`🔍 [ImapTriInjector] Credentials avant traitement: ${JSON.stringify(node.credentials)}`);
        
        // ⚠️ CRITIQUE: Remplacer TOUJOURS le credential, même s'il existe déjà dans le template
        // Le template peut contenir un ancien credential qui n'existe plus
        const oldCredId = node.credentials?.imapApi?.id || node.credentials?.imap?.id || 'aucun';
        const oldCredName = node.credentials?.imapApi?.name || node.credentials?.imap?.name || 'aucun';
        console.log(`🔍 [ImapTriInjector] Ancien credential détecté: ${oldCredId} (${oldCredName})`);
        
        // Liste des anciens credentials connus à détecter et remplacer
        const oldCredentialIds = [
          'TzbdyviB9rwphQKY',
          'LHBrt9bgHWvgfN4C',
          'zDtY5xDI7IO0bwOY',
          'MyExjQHQcE7OQq3k',
          'uTAvaVgPIcQtnKbj',
          '7tcFf2ZH4qlW6GtS'
        ];
        
        // Si c'est un ancien credential, le remplacer immédiatement
        if (oldCredentialIds.includes(oldCredId)) {
          console.log(`  ⚠️ [ImapTriInjector] Ancien credential détecté dans le template: ${oldCredId}`);
          console.log(`  ⚠️ [ImapTriInjector] Remplacement immédiat par le nouveau credential...`);
        }
        
        // ⚠️ CRITIQUE: Supprimer complètement l'ancien credential et le remplacer
        // FORCER le remplacement même si le credential semble déjà correct
        // Utiliser la bonne clé selon le type de nœud
        // ⚠️ CRITIQUE: Créer un NOUVEL objet credentials (pas de référence partagée)
        if (node.type === 'n8n-nodes-imap.imap') {
          // Nœuds n8n-nodes-imap.imap utilisent "imapApi"
          cleanedNode.credentials = {
            imapApi: {
              id: createdCredentials.imap.id,
              name: createdCredentials.imap.name
            }
          };
        } else if (node.type === 'n8n-nodes-base.emailReadImap' || 
                   node.type === 'n8n-nodes-imap-enhanced.imapEnhanced') {
          // Nœuds n8n-nodes-base.emailReadImap et n8n-nodes-imap-enhanced.imapEnhanced utilisent "imap"
          cleanedNode.credentials = {
            imap: {
              id: createdCredentials.imap.id,
              name: createdCredentials.imap.name
            }
          };
        }
        
        console.log(`✅ [ImapTriInjector] Credential IMAP assigné à ${node.name} (type: ${node.type}):`);
        console.log(`  - Ancien (template): ${oldCredId} (${oldCredName})`);
        console.log(`  - Nouveau (créé): ${createdCredentials.imap.id} (${createdCredentials.imap.name})`);
        
        // Vérification finale
        const assignedCred = cleanedNode.credentials.imapApi || cleanedNode.credentials.imap;
        console.log(`🔍 [ImapTriInjector] Credential assigné après traitement: ${JSON.stringify(cleanedNode.credentials)}`);
        if (!assignedCred || assignedCred.id !== createdCredentials.imap.id) {
          console.error(`❌ [ImapTriInjector] ERREUR CRITIQUE: Le credential n'a pas été correctement assigné!`);
          console.error(`❌ [ImapTriInjector] Attendu: ${createdCredentials.imap.id}`);
          console.error(`❌ [ImapTriInjector] Trouvé: ${assignedCred?.id || 'aucun'}`);
          console.error(`❌ [ImapTriInjector] credentials = ${JSON.stringify(cleanedNode.credentials)}`);
          console.error(`❌ [ImapTriInjector] node.credentials original = ${JSON.stringify(node.credentials)}`);
          throw new Error(`Le credential IMAP n'a pas été correctement assigné au nœud ${node.name}.`);
        }
        console.log(`✅ [ImapTriInjector] Vérification réussie pour ${node.name}`);
      }
      
      // Nœuds emailSend - utiliser SMTP admin
      if (node.type === 'n8n-nodes-base.emailSend') {
        // ⚠️ CRITIQUE: Le credential SMTP admin DOIT être assigné
        if (!createdCredentials.smtp || !createdCredentials.smtp.id) {
          console.error(`❌ [ImapTriInjector] ERREUR: Aucun credential SMTP admin disponible pour ${node.name}!`);
          throw new Error('Credential SMTP admin non trouvé. Vérifiez que le credential SMTP admin existe dans n8n.');
        }
        
        // Remplacer le credential SMTP par celui de l'admin
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        
        const oldSmtpId = cleanedNode.credentials?.smtp?.id || 'aucun';
        
        // Assigner le credential SMTP admin
        cleanedNode.credentials.smtp = {
          id: createdCredentials.smtp.id,
          name: createdCredentials.smtp.name
        };
        console.log(`✅ [ImapTriInjector] Credential SMTP admin assigné dans ${node.name}:`);
        console.log(`  - Ancien (template): ${oldSmtpId}`);
        console.log(`  - Nouveau (admin): ${createdCredentials.smtp.id} (${createdCredentials.smtp.name})`);
        
        // ⚠️ IMPORTANT: Modifier le fromEmail pour utiliser l'email admin
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = {};
        }
        
        const oldFromEmail = cleanedNode.parameters.fromEmail || 'non défini';
        cleanedNode.parameters.fromEmail = 'admin@heleam.com';
        console.log(`✅ [ImapTriInjector] From Email modifié dans ${node.name}:`);
        console.log(`  - Ancien: ${oldFromEmail}`);
        console.log(`  - Nouveau: admin@heleam.com`);
        
        // ⚠️ IMPORTANT: Modifier le toEmail pour utiliser l'email de l'utilisateur si c'est hardcodé
        // Le template utilise déjà {{ $json.mailboxOwner }}, mais on doit s'assurer que mailboxOwner est défini
        // On va modifier le nœud "Générer Rapport2" pour utiliser l'email de l'utilisateur
      }
      
      // ⚠️ CRITIQUE: Modifier le nœud "Générer Rapport2" pour utiliser l'email de l'utilisateur
      if (node.name === 'Générer Rapport2' && node.type === 'n8n-nodes-base.code') {
        if (node.parameters && node.parameters.jsCode) {
          // Remplacer le hardcodé "user@heleam.com" par l'email de l'utilisateur
          const oldCode = node.parameters.jsCode;
          const userEmailForCode = userEmail || 'user@heleam.com';
          
          // Pattern 1: Remplacer "let mailboxOwner = 'user@heleam.com';" ou similaire
          let newCode = oldCode.replace(
            /let\s+mailboxOwner\s*=\s*['"][^'"]+['"];?/g,
            `let mailboxOwner = '${userEmailForCode}';`
          );
          
          // Pattern 2: Si le pattern 1 n'a pas matché, chercher d'autres patterns
          if (newCode === oldCode) {
            newCode = oldCode.replace(
              /mailboxOwner\s*=\s*['"]user@heleam\.com['"]/g,
              `mailboxOwner = '${userEmailForCode}'`
            );
          }
          
          // Pattern 3: Chercher toute assignation de mailboxOwner avec un email hardcodé
          if (newCode === oldCode) {
            newCode = oldCode.replace(
              /mailboxOwner\s*=\s*['"][^'"]*@[^'"]*['"]/g,
              `mailboxOwner = '${userEmailForCode}'`
            );
          }
          
          cleanedNode.parameters.jsCode = newCode;
          
          if (newCode !== oldCode) {
            console.log(`✅ [ImapTriInjector] Email utilisateur injecté dans ${node.name}: ${userEmailForCode}`);
          } else {
            console.log(`⚠️ [ImapTriInjector] Aucun pattern d'email trouvé dans ${node.name}, email utilisateur: ${userEmailForCode}`);
          }
        }
      }
      
      return cleanedNode;
    });
    
    // ⚠️ DEBUG: Lister tous les nœuds IMAP APRÈS traitement
    const imapNodesAfter = injectedWorkflow.nodes.filter(n => 
      n.type === 'n8n-nodes-imap.imap' || n.type === 'n8n-nodes-base.emailReadImap'
    );
    console.log(`🔍 [ImapTriInjector] ${imapNodesAfter.length} nœud(s) IMAP trouvé(s) APRÈS traitement:`);
    imapNodesAfter.forEach(n => {
      const cred = n.credentials?.imapApi || n.credentials?.imap;
      const expectedCredId = createdCredentials.imap?.id || 'AUCUN';
      const isCorrect = cred?.id === expectedCredId;
      console.log(`  ${isCorrect ? '✅' : '❌'} ${n.name}: credential=${cred?.id || 'aucun'}, attendu=${expectedCredId}`);
      if (!isCorrect) {
        console.error(`  ❌ [ImapTriInjector] ERREUR: ${n.name} n'a pas le bon credential!`);
        console.error(`  ❌ [ImapTriInjector] credentials complet: ${JSON.stringify(n.credentials)}`);
      }
    });
  }
  
  // Gérer les webhooks
  if (uniqueWebhookPath) {
    const webhookNodes = injectedWorkflow.nodes?.filter(n => 
      n.type === 'n8n-nodes-base.webhook' || n.type === 'n8n-nodes-base.webhookTrigger'
    );
    if (webhookNodes && webhookNodes.length > 0) {
      webhookNodes.forEach(node => {
        if (node.parameters && node.parameters.path) {
          node.parameters.path = uniqueWebhookPath;
          console.log(`✅ [ImapTriInjector] Webhook path mis à jour pour ${node.name}: ${uniqueWebhookPath}`);
        }
      });
    }
  }
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: createdCredentials // ⚠️ IMPORTANT: Retourner les credentials créés pour stockage dans la BDD
  };
}

module.exports = {
  injectUserCredentials
};

