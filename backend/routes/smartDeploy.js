const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const { analyzeWorkflowCredentials, generateDynamicForm } = require('../services/workflowAnalyzer');
const { injectUserCredentials } = require('../services/injectors');
const db = require('../database');

/**
 * Analyser un workflow et retourner le formulaire dynamique
 * POST /api/smart-deploy/analyze
 */
router.post('/analyze', authenticateToken, async (req, res) => {
  console.log('🚨 [DEBUG] Route /analyze appelée !');
  console.log('🚨 [DEBUG] Headers:', req.headers);
  console.log('🚨 [DEBUG] Body:', req.body);
  console.log('🚨 [DEBUG] User:', req.user);
  console.log('🚨 [DEBUG] Timestamp:', new Date().toISOString());
  
  try {
    console.log('🔍 [SmartDeploy] Analyse du workflow demandée');
    console.log('🔍 [SmartDeploy] User:', req.user.email);
    console.log('🔍 [SmartDeploy] Body:', req.body);
    
    const { workflowId } = req.body;
    console.log('🔍 [SmartDeploy] WorkflowId reçu:', workflowId);
    
    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID requis' });
    }
    
    // Récupérer le template depuis la base de données
    console.log('🔍 [SmartDeploy] Recherche du template avec ID:', workflowId, 'pour user:', req.user.id);
    console.log('🔍 [SmartDeploy] Type workflowId:', typeof workflowId);
    console.log('🔍 [SmartDeploy] Type userId:', typeof req.user.id);
    
    const template = await db.getTemplateByIdForUser(workflowId, req.user.id);
    console.log('🔍 [SmartDeploy] Template trouvé:', !!template);
    
    if (!template) {
      console.log('❌ [SmartDeploy] Template non trouvé');
      console.log('🔍 [SmartDeploy] Vérification directe en base...');
      
      // Test direct en base pour debug
      const directTest = await db.query('SELECT * FROM templates WHERE id = $1', [workflowId]);
      console.log('🔍 [SmartDeploy] Template direct en base:', directTest.rows.length > 0);
      if (directTest.rows.length > 0) {
        const directTemplate = directTest.rows[0];
        console.log('🔍 [SmartDeploy] Template direct - visible:', directTemplate.visible);
        console.log('🔍 [SmartDeploy] Template direct - créé par:', directTemplate.created_by);
        console.log('🔍 [SmartDeploy] Template direct - user actuel:', req.user.id);
        console.log('🔍 [SmartDeploy] Template direct - user admin:', req.user.role === 'admin');
      }
      
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    console.log('✅ [SmartDeploy] Template trouvé:', template.name);
    console.log('🔍 [SmartDeploy] Template JSON présent:', !!template.json);
    console.log('🔍 [SmartDeploy] Template JSON type:', typeof template.json);
    
    // Utiliser le workflow JSON du template
    let workflowJson;
    try {
      workflowJson = typeof template.json === 'string'
        ? JSON.parse(template.json)
        : template.json;
      console.log('✅ [SmartDeploy] JSON parsé avec succès');
      console.log('🔍 [SmartDeploy] Workflow JSON type:', typeof workflowJson);
      console.log('🔍 [SmartDeploy] Workflow JSON keys:', Object.keys(workflowJson || {}));
    } catch (parseErr) {
      console.error('❌ [SmartDeploy] Erreur parsing JSON workflow:', parseErr);
      console.error('❌ [SmartDeploy] Template JSON brut:', template.json);
      return res.status(400).json({ 
        error: 'JSON du workflow invalide', 
        details: parseErr.message,
        templateId: template.id
      });
    }
    
    if (!workflowJson) {
      console.log('❌ [SmartDeploy] Template JSON manquant après parsing');
      return res.status(500).json({ error: 'Template JSON manquant' });
    }
    
    console.log('🔍 [SmartDeploy] Début analyse des credentials...');
    
    // Analyser les credentials requis
    let requiredCredentials;
    try {
      requiredCredentials = analyzeWorkflowCredentials(workflowJson);
      console.log('✅ [SmartDeploy] Credentials analysés:', requiredCredentials.length);
    } catch (analyzeErr) {
      console.error('❌ [SmartDeploy] Erreur analyse des credentials:', analyzeErr);
      console.error('❌ [SmartDeploy] Workflow JSON:', JSON.stringify(workflowJson, null, 2));
      return res.status(400).json({ 
        error: 'Erreur analyse credentials', 
        details: analyzeErr.message,
        templateId: template.id
      });
    }
    
    // Générer le formulaire dynamique
    const formConfig = generateDynamicForm(requiredCredentials);
    console.log('✅ [SmartDeploy] Formulaire généré');
    
    console.log('✅ [SmartDeploy] Analyse terminée:', requiredCredentials.length, 'credentials requis');
    
    res.json({
      success: true,
      workflow: {
        id: template.id,
        name: template.name,
        description: template.description
      },
      requiredCredentials: requiredCredentials,
      formConfig: formConfig
    });
    
  } catch (error) {
    console.error('❌ [SmartDeploy] Erreur analyse:', error);
    console.error('❌ [SmartDeploy] Stack trace:', error.stack);
    console.error('❌ [SmartDeploy] Error name:', error.name);
    console.error('❌ [SmartDeploy] Error message:', error.message);
    res.status(500).json({ 
      error: 'Erreur lors de l\'analyse du workflow',
      details: error.message,
      stack: error.stack
    });
  }
});

/**
 * Déployer un workflow avec injection automatique des credentials
 * POST /api/smart-deploy/deploy
 */
router.post('/deploy', authenticateToken, async (req, res) => {
  console.log('🚨🚨🚨 [DEBUG] Route /deploy appelée ! 🚨🚨🚨');
  console.log('🚨🚨🚨 [DEBUG] ========================================== 🚨🚨🚨');
  console.log('🚨🚨🚨 [DEBUG] DÉPLOIEMENT WORKFLOW DÉMARRÉ 🚨🚨🚨');
  console.log('🚨🚨🚨 [DEBUG] ========================================== 🚨🚨🚨');
  console.log('🚨🚨🚨 [DEBUG] TIMESTAMP:', new Date().toISOString());
  console.log('🚨🚨🚨 [DEBUG] USER ID:', req.user?.id);
  console.log('🚨🚨🚨 [DEBUG] USER EMAIL:', req.user?.email);
  
  // Écrire dans un fichier pour être sûr de voir les logs
  const fs = require('fs');
  const logMessage = `[${new Date().toISOString()}] Route /deploy appelée - User: ${req.user?.email} - ID: ${req.user?.id}\n`;
  fs.appendFileSync('backend-logs.txt', logMessage);
  
  // Logs détaillés dans le fichier
  fs.appendFileSync('backend-logs.txt', `[${new Date().toISOString()}] Body reçu: ${JSON.stringify(req.body, null, 2)}\n`);
  fs.appendFileSync('backend-logs.txt', `[${new Date().toISOString()}] Headers: ${JSON.stringify(req.headers, null, 2)}\n`);
  console.log('🚨 [DEBUG] Headers:', req.headers);
  console.log('🚨 [DEBUG] Body:', req.body);
  console.log('🚨 [DEBUG] User:', req.user);
  console.log('🚨 [DEBUG] Timestamp:', new Date().toISOString());
  
  try {
    console.log('🚀 [SmartDeploy] Déploiement intelligent demandé');
    console.log('🚀 [SmartDeploy] User:', req.user.email);
    console.log('🚀 [SmartDeploy] Body:', JSON.stringify(req.body, null, 2));
    
    const { workflowId, credentials } = req.body;
    
    if (!workflowId || !credentials) {
      return res.status(400).json({ error: 'Workflow ID et credentials requis' });
    }
    
    // Récupérer le template depuis la base de données
    console.log('🔍 [SmartDeploy] Recherche du template avec ID:', workflowId);
    console.log('🔍 [SmartDeploy] User ID:', req.user.id);
    console.log('🔍 [SmartDeploy] User Email:', req.user.email);
    
    const template = await db.getTemplateByIdForUser(workflowId, req.user.id);
    
    if (!template) {
      console.error('❌ [SmartDeploy] Template non trouvé avec ID:', workflowId);
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    console.log('✅ [SmartDeploy] Template trouvé:');
    console.log('  - ID demandé:', workflowId);
    console.log('  - ID trouvé:', template.id);
    console.log('  - Nom:', template.name);
    console.log('  - Description:', template.description?.substring(0, 100) + '...');
    
    // Vérifier que l'ID correspond bien
    if (template.id !== workflowId) {
      console.error('❌ [SmartDeploy] ERREUR CRITIQUE: L\'ID du template ne correspond pas!');
      console.error('❌ [SmartDeploy] ID demandé:', workflowId);
      console.error('❌ [SmartDeploy] ID trouvé:', template.id);
      return res.status(400).json({ 
        error: 'Template ID mismatch',
        message: `Le template récupéré (ID: ${template.id}) ne correspond pas à l'ID demandé (${workflowId}).`,
        details: {
          requestedId: workflowId,
          foundId: template.id,
          foundName: template.name
        }
      });
    }
    
    // Vérifier que c'est bien le bon template
    if (template.name !== 'GMAIL Tri Automatique Boite Email' && 
        !template.name.includes('GMAIL Tri Automatique') &&
        !template.name.includes('Gmail Tri Automatique')) {
      console.error('⚠️ [SmartDeploy] ATTENTION: Le template trouvé ne correspond pas au nom attendu!');
      console.error('⚠️ [SmartDeploy] Template attendu: GMAIL Tri Automatique Boite Email');
      console.error('⚠️ [SmartDeploy] Template trouvé:', template.name);
      console.error('⚠️ [SmartDeploy] ID du template:', template.id);
    }
    
    // Utiliser le workflow JSON du template
    let workflowJson;
    try {
      workflowJson = typeof template.json === 'string'
        ? JSON.parse(template.json)
        : template.json;
      console.log('✅ [SmartDeploy] JSON parsé avec succès');
      console.log('🔍 [SmartDeploy] Workflow JSON type:', typeof workflowJson);
      console.log('🔍 [SmartDeploy] Workflow JSON keys:', Object.keys(workflowJson || {}));
      console.log('🔍 [SmartDeploy] Nom du workflow dans le JSON:', workflowJson?.name);
      console.log('🔍 [SmartDeploy] Nom du template dans la BDD:', template.name);
      console.log('🔍 [SmartDeploy] Comparaison des noms:');
      console.log('  - Template BDD:', template.name);
      console.log('  - Workflow JSON:', workflowJson?.name);
      console.log('  - Correspondent?', template.name === workflowJson?.name);
      console.log('🔍 [SmartDeploy] Settings avant injection:', JSON.stringify(workflowJson?.settings || {}, null, 2));
      
      // Vérifier que le nom du workflow dans le JSON correspond au nom du template (comparaison insensible à la casse)
      const templateNameLower = template.name.toLowerCase();
      const workflowNameLower = workflowJson?.name?.toLowerCase() || '';
      
      // Vérifier si le JSON contient le mauvais workflow
      const isWrongWorkflow = 
        workflowNameLower.includes('v2 template fonctionnel resume email') ||
        workflowNameLower.includes('v2 modèle de cv fonctionnel email') ||
        workflowNameLower.includes('v2 modele de cv fonctionnel email') ||
        (workflowNameLower.includes('cv') && workflowNameLower.includes('modèle')) ||
        (workflowNameLower.includes('cv') && workflowNameLower.includes('modele'));
      
      if (workflowJson?.name && isWrongWorkflow) {
        console.error('❌ [SmartDeploy] ERREUR CRITIQUE: Le JSON contient un mauvais workflow!');
        console.error('❌ [SmartDeploy] Template attendu:', template.name);
        console.error('❌ [SmartDeploy] Workflow trouvé dans le JSON:', workflowJson.name);
        console.error('❌ [SmartDeploy] Le template doit être corrigé dans l\'interface d\'édition admin.');
        console.error('❌ [SmartDeploy] Le JSON du template contient le workflow:', workflowJson.name);
        console.error('❌ [SmartDeploy] Mais le template devrait contenir:', template.name);
        return res.status(400).json({ 
          error: 'Template JSON incorrect',
          message: `Le template "${template.name}" contient le workflow "${workflowJson.name}" au lieu du workflow attendu. Le JSON du template doit être corrigé dans l'interface d'édition admin.`,
          details: {
            templateName: template.name,
            workflowNameInJson: workflowJson.name,
            templateId: template.id,
            instruction: 'Veuillez aller dans l\'interface admin, éditer le template "GMAIL Tri Automatique Boite Email", et corriger le JSON du workflow pour qu\'il corresponde au bon workflow.'
          }
        });
      }
      
      // Vérifier si le nom du workflow contient des mots-clés du template (insensible à la casse)
      const hasGmailTriAutomatique = templateNameLower.includes('gmail') && 
                                      templateNameLower.includes('tri') && 
                                      templateNameLower.includes('automatique');
      
      const workflowHasGmailTriAutomatique = workflowNameLower.includes('gmail') && 
                                              workflowNameLower.includes('tri') && 
                                              workflowNameLower.includes('automatique');
      
      // Si le template est "GMAIL Tri Automatique" mais le workflow JSON ne l'est pas, c'est une erreur
      if (hasGmailTriAutomatique && !workflowHasGmailTriAutomatique && workflowJson?.name) {
        console.error('❌ [SmartDeploy] ERREUR CRITIQUE: Le nom du workflow dans le JSON ne correspond pas au template!');
        console.error('❌ [SmartDeploy] Nom du template dans la BDD:', template.name);
        console.error('❌ [SmartDeploy] Nom du workflow dans le JSON:', workflowJson.name);
        console.error('❌ [SmartDeploy] Le JSON du template contient le mauvais workflow!');
        console.error('❌ [SmartDeploy] Le template doit être corrigé dans l\'interface d\'édition admin.');
        
        // Retourner une erreur explicite à l'utilisateur
        return res.status(400).json({ 
          error: 'Template JSON incorrect',
          message: `Le template "${template.name}" contient le workflow "${workflowJson.name}" au lieu du workflow attendu. Veuillez contacter l'administrateur pour corriger le template.`,
          details: {
            templateName: template.name,
            workflowNameInJson: workflowJson.name,
            templateId: template.id
          }
        });
      }
      
      // Si les noms sont différents mais contiennent les mêmes mots-clés, c'est probablement juste une différence de casse
      if (workflowJson?.name && templateNameLower !== workflowNameLower && workflowHasGmailTriAutomatique && hasGmailTriAutomatique) {
        console.log('⚠️ [SmartDeploy] Différence de casse détectée entre template et workflow JSON (normal):');
        console.log('  - Template:', template.name);
        console.log('  - Workflow JSON:', workflowJson.name);
      }
    } catch (parseErr) {
      console.error('❌ [SmartDeploy] Erreur parsing JSON workflow:', parseErr);
      console.error('❌ [SmartDeploy] Template JSON brut:', template.json);
      return res.status(400).json({ 
        error: 'JSON du workflow invalide', 
        details: parseErr.message,
        templateId: template.id
      });
    }
    
    if (!workflowJson) {
      console.log('❌ [SmartDeploy] Template JSON manquant après parsing');
      return res.status(500).json({ error: 'Template JSON manquant' });
    }
    
    // Injecter les credentials utilisateur
    console.log('🔧 [SmartDeploy] ===== INJECTION DES CREDENTIALS =====');
    console.log('🔧 [SmartDeploy] Credentials reçus:', Object.keys(credentials));
    console.log('🔧 [SmartDeploy] Détails credentials:', {
      email: credentials.email,
      smtpEmail: credentials.smtpEmail,
      smtpServer: credentials.smtpServer,
      smtpPort: credentials.smtpPort,
      smtpPasswordLength: credentials.smtpPassword?.length,
      googleSheetsOAuth2: credentials.googleSheetsOAuth2,
      storageType: credentials.storageType
    });
    console.log('🔧 [SmartDeploy] Tous les credentials OAuth:', Object.keys(credentials).filter(key => key.includes('OAuth')));
    console.log('🔧 [SmartDeploy] ===== FIN INJECTION DES CREDENTIALS =====');
    console.log('🔧 [SmartDeploy] Type smtpPort:', typeof credentials.smtpPort);
    console.log('🔧 [SmartDeploy] Valeur smtpPort:', credentials.smtpPort);
    console.log('🔧 [SmartDeploy] Number conversion:', Number(credentials.smtpPort));
    console.log('🔧 [SmartDeploy] Number type:', typeof Number(credentials.smtpPort));
    console.log('🔧 [SmartDeploy] isNaN check:', isNaN(Number(credentials.smtpPort)));
    
    // Définir le nom du workflow avec l'email de l'utilisateur
    // Utiliser le nom du template tel quel, sans modifier le JSON
    const workflowName = `${template.name} - ${req.user.email}`;
    console.log('✅ [SmartDeploy] Nom du workflow défini:', workflowName);
    console.log('🔍 [SmartDeploy] Template utilisé tel quel, sans modification');
    console.log('  - Nom du template:', template.name);
    console.log('  - Nom du workflow JSON (conservé):', workflowJson?.name);
    console.log('  - Nom final du workflow déployé:', workflowName);
    
    // ⚠️ IMPORTANT: Ne PAS modifier le workflowJson
    // Le template doit être utilisé tel quel, seuls les credentials seront injectés
    
    let injectedWorkflow;
    let webhookPath;
    let injectionResult = null; // Déclarer injectionResult en dehors du try pour y accéder plus tard
    try {
      console.log('🔧 [SmartDeploy] Appel injectUserCredentials...');
      console.log('🔧 [SmartDeploy] Template ID:', template.id);
      console.log('🔧 [SmartDEploy] Admin OpenRouter ID disponible:', process.env.OPENROUTER_API_KEY ? 'OUI (via env)' : 'NON');
      injectionResult = await injectUserCredentials(workflowJson, credentials, req.user.id, template.id);
      console.log('✅ [SmartDeploy] Injection réussie');
      console.log('🔍 [SmartDeploy] injectionResult:', {
        hasWorkflow: !!injectionResult.workflow,
        hasWebhookPath: !!injectionResult.webhookPath,
        hasCreatedCredentials: !!injectionResult.createdCredentials,
        createdCredentialsKeys: injectionResult.createdCredentials ? Object.keys(injectionResult.createdCredentials) : []
      });
      
      // ⚠️ DEBUG: Vérifier les credentials OpenRouter dans le workflow injecté
      const openRouterNodesInjected = injectionResult.workflow?.nodes?.filter(node => 
        node.type === 'n8n-nodes-base.httpRequest' && 
        (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))
      );
      if (openRouterNodesInjected && openRouterNodesInjected.length > 0) {
        console.log(`🔍 [SmartDeploy] DEBUG: ${openRouterNodesInjected.length} nœud(s) OpenRouter dans workflow injecté`);
        openRouterNodesInjected.forEach(node => {
          const credId = node.credentials?.httpHeaderAuth?.id || node.credentials?.openRouterApi?.id || 'aucun';
          const hasPlaceholder = credId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || credId?.includes('ADMIN_OPENROUTER');
          if (hasPlaceholder) {
            console.error(`❌ [SmartDeploy] DEBUG: ${node.name} a toujours le placeholder: ${credId}`);
          } else {
            console.log(`✅ [SmartDeploy] DEBUG: ${node.name} a le credential: ${credId}`);
          }
        });
      }
      
      if (!injectionResult || !injectionResult.workflow) {
        throw new Error('Injection échouée: injectionResult ou workflow manquant');
      }
      
      injectedWorkflow = injectionResult.workflow;
      webhookPath = injectionResult.webhookPath;
      
      console.log('🔧 [SmartDeploy] Workflow injecté - nodes:', injectedWorkflow.nodes?.length);
      if (webhookPath) {
        console.log('🔧 [SmartDeploy] Webhook unique généré:', webhookPath);
      }
      
      // Mettre à jour le nom du workflow avec l'email de l'utilisateur
      injectedWorkflow.name = workflowName;
      console.log('✅ [SmartDeploy] Nom du workflow mis à jour dans injectedWorkflow:', workflowName);
      
      // Vérifier que les credentials OpenRouter sont bien injectés
      const openRouterNodes = injectedWorkflow.nodes?.filter(node => 
        node.credentials?.openRouterApi
      );
      if (openRouterNodes && openRouterNodes.length > 0) {
        console.log('🔧 [SmartDeploy] Vérification des credentials OpenRouter injectés:');
        openRouterNodes.forEach(node => {
          console.log(`  - ${node.name}: ${node.credentials.openRouterApi.id} (${node.credentials.openRouterApi.name})`);
          if (node.credentials.openRouterApi.id === 'ADMIN_OPENROUTER_CREDENTIAL_ID') {
            console.error(`❌ [SmartDeploy] ERREUR: Placeholder OpenRouter non remplacé dans ${node.name}!`);
          }
        });
      }
      
      // Vérifier que les credentials Gmail OAuth2 sont bien injectés
      const gmailNodes = injectedWorkflow.nodes?.filter(node => 
        node.type === 'n8n-nodes-base.gmail' && node.credentials?.gmailOAuth2
      );
      if (gmailNodes && gmailNodes.length > 0) {
        console.log('🔧 [SmartDeploy] ===== VÉRIFICATION CRITIQUE DES CREDENTIALS GMAIL =====');
        console.log(`🔧 [SmartDeploy] ${gmailNodes.length} nœud(s) Gmail trouvé(s)`);
        gmailNodes.forEach(node => {
          const credId = node.credentials.gmailOAuth2.id;
          const credName = node.credentials.gmailOAuth2.name;
          console.log(`  - ${node.name}: Credential ID: ${credId}, Name: ${credName}`);
          // Vérifier si c'est le credential template (ne devrait jamais arriver)
          if (credId === 'L0i4xm1EZLNLQI09' || credId.includes('L0i4xm1EZLNLQI09')) {
            console.error(`  ❌ [SmartDeploy] ERREUR CRITIQUE: Credential template conservé dans ${node.name}!`);
            console.error(`  ❌ [SmartDeploy] Le credential utilisateur n'a pas été injecté!`);
          } else {
            console.log(`  ✅ [SmartDeploy] Credential utilisateur correctement assigné`);
          }
        });
        console.log('🔧 [SmartDeploy] ====================================================');
      } else {
        console.error('❌ [SmartDeploy] ERREUR: Aucun credential Gmail OAuth2 trouvé dans les nœuds Gmail!');
        const allGmailNodes = injectedWorkflow.nodes?.filter(node => node.type === 'n8n-nodes-base.gmail');
        if (allGmailNodes && allGmailNodes.length > 0) {
          console.error(`❌ [SmartDeploy] ${allGmailNodes.length} nœud(s) Gmail trouvé(s) mais sans credentials:`);
          allGmailNodes.forEach(node => {
            console.error(`  - ${node.name}: credentials = ${JSON.stringify(node.credentials)}`);
          });
        }
      }
    } catch (injectionError) {
      console.error('❌ [SmartDeploy] Erreur injection:', injectionError.message);
      console.error('❌ [SmartDeploy] Stack:', injectionError.stack);
      throw injectionError;
    }
    
    if (!injectedWorkflow) {
      throw new Error('Workflow injection failed - injectedWorkflow is undefined');
    }
    
    // Fonction pour nettoyer l'objet settings - n8n n'accepte qu'un objet vide {} lors de la création
    // Les propriétés settings peuvent être ajoutées après la création via PUT
    function cleanSettings(settings) {
      // Pour la création de workflow, n8n n'accepte qu'un objet vide {}
      // Les propriétés settings peuvent être ajoutées après via PUT si nécessaire
      return {};
    }
    
    // Créer un nouveau workflow dans n8n avec les credentials injectés
    console.log('🔧 [SmartDeploy] Création du workflow dans n8n...');
    const config = require('../config');
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    // Nettoyer l'objet settings pour ne garder que les propriétés autorisées
    console.log('🔍 [SmartDeploy] Settings AVANT nettoyage:', JSON.stringify(injectedWorkflow.settings || {}, null, 2));
    console.log('🔍 [SmartDeploy] Settings keys AVANT nettoyage:', Object.keys(injectedWorkflow.settings || {}));
    const cleanedSettings = cleanSettings(injectedWorkflow.settings);
    console.log('🔧 [SmartDeploy] Settings nettoyés:', Object.keys(cleanedSettings));
    console.log('🔧 [SmartDeploy] Settings nettoyés (JSON):', JSON.stringify(cleanedSettings, null, 2));
    
    // Vérifier que tous les nœuds sont présents
    console.log('🔍 [SmartDeploy] Vérification des nœuds avant déploiement...');
    console.log('🔍 [SmartDeploy] Nombre de nœuds:', injectedWorkflow.nodes?.length);
    console.log('🔍 [SmartDeploy] Noms des nœuds:', injectedWorkflow.nodes?.map(n => n.name).join(', '));
    console.log('🔍 [SmartDeploy] Nombre de connexions:', Object.keys(injectedWorkflow.connections || {}).length);
    console.log('🔍 [SmartDeploy] Connexions:', Object.keys(injectedWorkflow.connections || {}));
    
    // ⚠️ IMPORTANT: n8n n'accepte que name, nodes, connections, et settings lors de la création
    // Ne pas inclure pinData, tags, ou active (ces propriétés peuvent être ajoutées après)
    const workflowPayload = {
      name: workflowName,
      nodes: injectedWorkflow.nodes,
      connections: injectedWorkflow.connections,
      settings: cleanedSettings
      // ⚠️ IMPORTANT: Ne pas inclure 'active' - c'est un champ read-only dans l'API n8n
      // L'activation se fait via l'endpoint /activate après la création
      // ⚠️ Ne pas inclure 'pinData' ou 'tags' - n8n les rejette lors de la création
    };
    
    console.log('🔧 [SmartDeploy] Payload pour création workflow:');
    console.log('  - Nom:', workflowPayload.name);
    console.log('  - Nœuds:', workflowPayload.nodes?.length);
    console.log('  - Connexions:', Object.keys(workflowPayload.connections || {}).length);
    console.log('  - Settings:', Object.keys(workflowPayload.settings || {}).length);
    
    // ⚠️ VÉRIFICATION CRITIQUE: Vérifier que les connexions LangChain sont présentes AVANT la création
    console.log('🔍 [SmartDeploy] Vérification des connexions LangChain AVANT création...');
    const langchainConnectionsBeforeCreate = {
      ai_languageModel: [],
      ai_tool: [],
      ai_memory: []
    };
    
    Object.keys(workflowPayload.connections || {}).forEach(nodeName => {
      const nodeConnections = workflowPayload.connections[nodeName];
      if (nodeConnections.ai_languageModel) {
        langchainConnectionsBeforeCreate.ai_languageModel.push({
          from: nodeName,
          to: nodeConnections.ai_languageModel[0]?.[0]?.node || 'NON DÉFINI'
        });
      }
      if (nodeConnections.ai_tool) {
        langchainConnectionsBeforeCreate.ai_tool.push({
          from: nodeName,
          to: nodeConnections.ai_tool[0]?.[0]?.node || 'NON DÉFINI'
        });
      }
      if (nodeConnections.ai_memory) {
        langchainConnectionsBeforeCreate.ai_memory.push({
          from: nodeName,
          to: nodeConnections.ai_memory[0]?.[0]?.node || 'NON DÉFINI'
        });
      }
    });
    
    console.log('🔍 [SmartDeploy] Connexions LangChain AVANT création:');
    console.log(`  - ai_languageModel: ${langchainConnectionsBeforeCreate.ai_languageModel.length} connexion(s)`);
    langchainConnectionsBeforeCreate.ai_languageModel.forEach(conn => {
      console.log(`    → ${conn.from} → ${conn.to}`);
    });
    console.log(`  - ai_tool: ${langchainConnectionsBeforeCreate.ai_tool.length} connexion(s)`);
    langchainConnectionsBeforeCreate.ai_tool.forEach(conn => {
      console.log(`    → ${conn.from} → ${conn.to}`);
    });
    console.log(`  - ai_memory: ${langchainConnectionsBeforeCreate.ai_memory.length} connexion(s)`);
    langchainConnectionsBeforeCreate.ai_memory.forEach(conn => {
      console.log(`    → ${conn.from} → ${conn.to}`);
    });
    
    if (langchainConnectionsBeforeCreate.ai_languageModel.length === 0) {
      console.error('❌ [SmartDeploy] CRITIQUE: Aucune connexion ai_languageModel détectée AVANT la création!');
      console.error('❌ [SmartDeploy] L\'agent IA ne pourra pas fonctionner sans modèle de langage!');
    }
    
    // ⚠️ VÉRIFICATION FINALE: S'assurer qu'aucun placeholder n'est présent dans le payload
    const payloadString = JSON.stringify(workflowPayload);
    const hasPlaceholderInPayload = payloadString.includes('ADMIN_OPENROUTER_CREDENTIAL_ID') ||
                                    payloadString.includes('ADMIN_OPENROUTER_CREDENTIAL_NAME') ||
                                    payloadString.includes('USER_') && payloadString.includes('_CREDENTIAL_ID');
    
    if (hasPlaceholderInPayload) {
      console.error('❌ [SmartDeploy] ERREUR CRITIQUE: Placeholders détectés dans le payload avant envoi à n8n!');
      console.error('❌ [SmartDeploy] Payload contient des placeholders - vérification des nœuds...');
      
      // Vérifier chaque nœud
      workflowPayload.nodes?.forEach(node => {
        if (node.credentials) {
          Object.keys(node.credentials).forEach(credType => {
            const cred = node.credentials[credType];
            // ⚠️ IMPORTANT: Détecter tous les types de placeholders (OpenRouter, Google Sheets avec/sans "SHEETS", etc.)
            const isPlaceholder = cred?.id?.includes('ADMIN_OPENROUTER') || 
                                 cred?.id?.includes('ADMIN_SMTP') ||
                                 (cred?.id?.includes('USER_') && cred?.id?.includes('_CREDENTIAL_ID')) ||
                                 cred?.id === 'USER_GOOGLE_CREDENTIAL_ID' ||
                                 cred?.id === 'USER_GOOGLE_SHEETS_CREDENTIAL_ID';
            if (isPlaceholder) {
              console.error(`❌ [SmartDeploy] Nœud ${node.name} a un placeholder: ${cred.id}`);
            }
          });
        }
      });
      
      throw new Error('Des placeholders sont encore présents dans le workflow. Les credentials doivent être remplacés avant l\'envoi à n8n.');
    } else {
      console.log('✅ [SmartDeploy] Vérification: Aucun placeholder détecté dans le payload');
      
      // Vérifier que les credentials OpenRouter sont présents
      const openRouterNodes = workflowPayload.nodes?.filter(node => 
        node.type === 'n8n-nodes-base.httpRequest' && 
        (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))
      );
      if (openRouterNodes && openRouterNodes.length > 0) {
        openRouterNodes.forEach(node => {
          const credId = node.credentials?.httpHeaderAuth?.id;
          if (!credId || credId.includes('ADMIN_OPENROUTER') || credId.includes('_CREDENTIAL_ID')) {
            console.error(`❌ [SmartDeploy] Nœud ${node.name} n'a pas de credential OpenRouter valide: ${credId}`);
          } else {
            console.log(`✅ [SmartDeploy] Nœud ${node.name} a un credential OpenRouter valide: ${credId}`);
          }
        });
      }
    }
    
    const deployResponse = await fetch('http://localhost:3004/api/n8n/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowPayload)
    });
    
    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Erreur déploiement n8n: ${error}`);
    }
    
    const deployedWorkflow = await deployResponse.json();
    console.log('✅ [SmartDeploy] Workflow créé dans n8n:', deployedWorkflow.id);
    console.log('✅ [SmartDeploy] Nom du workflow créé:', deployedWorkflow.name);
    
    // ⚠️ VÉRIFICATION CRITIQUE: Vérifier que les connexions LangChain sont présentes APRÈS la création
    console.log('🔍 [SmartDeploy] Vérification des connexions LangChain APRÈS création...');
    const langchainConnectionsAfterCreate = {
      ai_languageModel: [],
      ai_tool: [],
      ai_memory: []
    };
    
    Object.keys(deployedWorkflow.connections || {}).forEach(nodeName => {
      const nodeConnections = deployedWorkflow.connections[nodeName];
      if (nodeConnections.ai_languageModel) {
        langchainConnectionsAfterCreate.ai_languageModel.push({
          from: nodeName,
          to: nodeConnections.ai_languageModel[0]?.[0]?.node || 'NON DÉFINI'
        });
      }
      if (nodeConnections.ai_tool) {
        langchainConnectionsAfterCreate.ai_tool.push({
          from: nodeName,
          to: nodeConnections.ai_tool[0]?.[0]?.node || 'NON DÉFINI'
        });
      }
      if (nodeConnections.ai_memory) {
        langchainConnectionsAfterCreate.ai_memory.push({
          from: nodeName,
          to: nodeConnections.ai_memory[0]?.[0]?.node || 'NON DÉFINI'
        });
      }
    });
    
    console.log('🔍 [SmartDeploy] Connexions LangChain APRÈS création:');
    console.log(`  - ai_languageModel: ${langchainConnectionsAfterCreate.ai_languageModel.length} connexion(s)`);
    langchainConnectionsAfterCreate.ai_languageModel.forEach(conn => {
      console.log(`    → ${conn.from} → ${conn.to}`);
    });
    console.log(`  - ai_tool: ${langchainConnectionsAfterCreate.ai_tool.length} connexion(s)`);
    langchainConnectionsAfterCreate.ai_tool.forEach(conn => {
      console.log(`    → ${conn.from} → ${conn.to}`);
    });
    console.log(`  - ai_memory: ${langchainConnectionsAfterCreate.ai_memory.length} connexion(s)`);
    langchainConnectionsAfterCreate.ai_memory.forEach(conn => {
      console.log(`    → ${conn.from} → ${conn.to}`);
    });
    
    if (langchainConnectionsAfterCreate.ai_languageModel.length === 0) {
      console.error('❌ [SmartDeploy] CRITIQUE: Aucune connexion ai_languageModel détectée APRÈS la création!');
      console.error('❌ [SmartDeploy] Les connexions LangChain ont été perdues lors de la création!');
      console.error('❌ [SmartDeploy] Vérification du payload envoyé:');
      console.error('  - Connexions dans le payload:', JSON.stringify(workflowPayload.connections, null, 2).substring(0, 1000));
    } else {
      console.log('✅ [SmartDeploy] Les connexions LangChain sont présentes dans le workflow retourné par n8n après création');
    }
    
    // ⚠️ DEBUG: Vérifier les credentials OpenRouter dans le workflow retourné par n8n APRÈS création (avant mise à jour)
    const openRouterNodesAfterCreate = deployedWorkflow.nodes?.filter(node => 
      node.type === 'n8n-nodes-base.httpRequest' && 
      (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))
    );
    if (openRouterNodesAfterCreate && openRouterNodesAfterCreate.length > 0) {
      console.log(`🔍 [SmartDeploy] DEBUG APRÈS CRÉATION (avant update): ${openRouterNodesAfterCreate.length} nœud(s) OpenRouter`);
      openRouterNodesAfterCreate.forEach(node => {
        const credId = node.credentials?.httpHeaderAuth?.id || node.credentials?.openRouterApi?.id || 'aucun';
        const hasPlaceholder = credId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || credId?.includes('ADMIN_OPENROUTER');
        if (hasPlaceholder) {
          console.error(`❌ [SmartDeploy] DEBUG APRÈS CREATE: ${node.name} a toujours le placeholder: ${credId}`);
        } else if (credId === 'aucun') {
          console.error(`❌ [SmartDeploy] DEBUG APRÈS CREATE: ${node.name} n'a pas de credential OpenRouter`);
        } else {
          console.log(`✅ [SmartDeploy] DEBUG APRÈS CREATE: ${node.name} a le credential: ${credId}`);
        }
      });
    }
    
    // ⚠️ CRITIQUE: Mettre à jour le workflow avec les credentials après création (comme les workflows fonctionnels)
    // Cela garantit que les credentials OpenRouter et autres sont correctement appliqués
    console.log('🔧 [SmartDeploy] Mise à jour du workflow avec les credentials (comme les workflows fonctionnels)...');
    try {
      const n8nUrl = config.n8n.url;
      const n8nApiKey = config.n8n.apiKey;
      
      // Pour la mise à jour, on peut inclure pinData et tags si nécessaire
      // Mais pour l'instant, on garde seulement les propriétés essentielles
      const updatePayload = {
        name: workflowName,
        nodes: injectedWorkflow.nodes,
        connections: injectedWorkflow.connections,
        settings: cleanSettings(injectedWorkflow.settings)
        // pinData et tags peuvent être ajoutés plus tard si nécessaire
      };
      
      // ⚠️ VÉRIFICATION CRITIQUE: Vérifier que les connexions LangChain sont présentes
      console.log('🔍 [SmartDeploy] Vérification des connexions LangChain dans le payload...');
      const langchainConnections = {
        ai_languageModel: [],
        ai_tool: [],
        ai_memory: []
      };
      
      Object.keys(updatePayload.connections || {}).forEach(nodeName => {
        const nodeConnections = updatePayload.connections[nodeName];
        if (nodeConnections.ai_languageModel) {
          langchainConnections.ai_languageModel.push({
            from: nodeName,
            to: nodeConnections.ai_languageModel[0]?.[0]?.node || 'NON DÉFINI'
          });
        }
        if (nodeConnections.ai_tool) {
          langchainConnections.ai_tool.push({
            from: nodeName,
            to: nodeConnections.ai_tool[0]?.[0]?.node || 'NON DÉFINI'
          });
        }
        if (nodeConnections.ai_memory) {
          langchainConnections.ai_memory.push({
            from: nodeName,
            to: nodeConnections.ai_memory[0]?.[0]?.node || 'NON DÉFINI'
          });
        }
      });
      
      console.log('🔍 [SmartDeploy] Connexions LangChain détectées:');
      console.log(`  - ai_languageModel: ${langchainConnections.ai_languageModel.length} connexion(s)`);
      langchainConnections.ai_languageModel.forEach(conn => {
        console.log(`    → ${conn.from} → ${conn.to}`);
      });
      console.log(`  - ai_tool: ${langchainConnections.ai_tool.length} connexion(s)`);
      langchainConnections.ai_tool.forEach(conn => {
        console.log(`    → ${conn.from} → ${conn.to}`);
      });
      console.log(`  - ai_memory: ${langchainConnections.ai_memory.length} connexion(s)`);
      langchainConnections.ai_memory.forEach(conn => {
        console.log(`    → ${conn.from} → ${conn.to}`);
      });
      
      if (langchainConnections.ai_languageModel.length === 0) {
        console.error('❌ [SmartDeploy] CRITIQUE: Aucune connexion ai_languageModel détectée!');
        console.error('❌ [SmartDeploy] L\'agent IA ne pourra pas fonctionner sans modèle de langage!');
      }
      
      // ⚠️ DEBUG: Vérifier les credentials OpenRouter dans les nœuds AVANT la mise à jour
      const openRouterNodesBeforeUpdate = updatePayload.nodes?.filter(node => 
        node.type === 'n8n-nodes-base.httpRequest' && 
        (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))
      );
      if (openRouterNodesBeforeUpdate && openRouterNodesBeforeUpdate.length > 0) {
        console.log(`🔍 [SmartDeploy] DEBUG AVANT MISE À JOUR: ${openRouterNodesBeforeUpdate.length} nœud(s) OpenRouter`);
        openRouterNodesBeforeUpdate.forEach(node => {
          const credId = node.credentials?.httpHeaderAuth?.id || node.credentials?.openRouterApi?.id || 'aucun';
          const hasPlaceholder = credId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || credId?.includes('ADMIN_OPENROUTER');
          if (hasPlaceholder) {
            console.error(`❌ [SmartDeploy] DEBUG AVANT UPDATE: ${node.name} a toujours le placeholder: ${credId}`);
            console.error(`❌ [SmartDeploy] DEBUG: Credentials complets du nœud:`, JSON.stringify(node.credentials, null, 2));
          } else {
            console.log(`✅ [SmartDeploy] DEBUG AVANT UPDATE: ${node.name} a le credential: ${credId}`);
          }
        });
      }
      
      // ⚠️ DEBUG: Vérifier les credentials Google Sheets dans les nœuds AVANT la mise à jour
      const googleSheetsNodesBeforeUpdate = updatePayload.nodes?.filter(node => 
        node.type === 'n8n-nodes-base.googleSheets'
      );
      if (googleSheetsNodesBeforeUpdate && googleSheetsNodesBeforeUpdate.length > 0) {
        console.log(`🔍 [SmartDeploy] DEBUG AVANT MISE À JOUR: ${googleSheetsNodesBeforeUpdate.length} nœud(s) Google Sheets`);
        googleSheetsNodesBeforeUpdate.forEach(node => {
          // ⚠️ IMPORTANT: n8n utilise googleSheetsOAuth2Api (avec "Api"), pas googleSheetsOAuth2
          const credId = node.credentials?.googleSheetsOAuth2Api?.id || node.credentials?.googleSheetsOAuth2?.id || 'aucun';
          // ⚠️ IMPORTANT: Vérifier les deux variantes du placeholder (avec et sans "SHEETS")
          const hasPlaceholder = credId === 'USER_GOOGLE_SHEETS_CREDENTIAL_ID' || 
                                credId === 'USER_GOOGLE_CREDENTIAL_ID' ||
                                credId?.includes('USER_GOOGLE_SHEETS') ||
                                credId?.includes('USER_GOOGLE_CREDENTIAL');
          if (hasPlaceholder) {
            console.error(`❌ [SmartDeploy] DEBUG AVANT UPDATE: ${node.name} a toujours le placeholder: ${credId}`);
          } else if (credId === 'aucun') {
            console.error(`❌ [SmartDeploy] DEBUG AVANT UPDATE: ${node.name} n'a pas de credential Google Sheets`);
          } else {
            console.log(`✅ [SmartDeploy] DEBUG AVANT UPDATE: ${node.name} a le credential: ${credId}`);
          }
        });
      }
      
      console.log('🔧 [SmartDeploy] Mise à jour workflow - Nombre de nœuds:', updatePayload.nodes?.length);
      console.log('🔧 [SmartDeploy] Mise à jour workflow - Connexions:', Object.keys(updatePayload.connections || {}).length);
      
      const updateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey
        },
        body: JSON.stringify(updatePayload)
      });
      
      if (updateResponse.ok) {
        const updatedWorkflow = await updateResponse.json();
        console.log('✅ [SmartDeploy] Workflow mis à jour avec les credentials');
        console.log('✅ [SmartDeploy] Workflow mis à jour - Nombre de nœuds:', updatedWorkflow.nodes?.length);
        console.log('✅ [SmartDeploy] Workflow mis à jour - Connexions:', Object.keys(updatedWorkflow.connections || {}).length);
        
        // ⚠️ VÉRIFICATION CRITIQUE: Vérifier que les connexions LangChain sont présentes APRÈS la mise à jour
        console.log('🔍 [SmartDeploy] Vérification des connexions LangChain APRÈS la mise à jour...');
        const langchainConnectionsAfterUpdate = {
          ai_languageModel: [],
          ai_tool: [],
          ai_memory: []
        };
        
        Object.keys(updatedWorkflow.connections || {}).forEach(nodeName => {
          const nodeConnections = updatedWorkflow.connections[nodeName];
          if (nodeConnections.ai_languageModel) {
            langchainConnectionsAfterUpdate.ai_languageModel.push({
              from: nodeName,
              to: nodeConnections.ai_languageModel[0]?.[0]?.node || 'NON DÉFINI'
            });
          }
          if (nodeConnections.ai_tool) {
            langchainConnectionsAfterUpdate.ai_tool.push({
              from: nodeName,
              to: nodeConnections.ai_tool[0]?.[0]?.node || 'NON DÉFINI'
            });
          }
          if (nodeConnections.ai_memory) {
            langchainConnectionsAfterUpdate.ai_memory.push({
              from: nodeName,
              to: nodeConnections.ai_memory[0]?.[0]?.node || 'NON DÉFINI'
            });
          }
        });
        
        console.log('🔍 [SmartDeploy] Connexions LangChain APRÈS mise à jour:');
        console.log(`  - ai_languageModel: ${langchainConnectionsAfterUpdate.ai_languageModel.length} connexion(s)`);
        langchainConnectionsAfterUpdate.ai_languageModel.forEach(conn => {
          console.log(`    → ${conn.from} → ${conn.to}`);
        });
        console.log(`  - ai_tool: ${langchainConnectionsAfterUpdate.ai_tool.length} connexion(s)`);
        langchainConnectionsAfterUpdate.ai_tool.forEach(conn => {
          console.log(`    → ${conn.from} → ${conn.to}`);
        });
        console.log(`  - ai_memory: ${langchainConnectionsAfterUpdate.ai_memory.length} connexion(s)`);
        langchainConnectionsAfterUpdate.ai_memory.forEach(conn => {
          console.log(`    → ${conn.from} → ${conn.to}`);
        });
        
        if (langchainConnectionsAfterUpdate.ai_languageModel.length === 0) {
          console.error('❌ [SmartDeploy] CRITIQUE: Aucune connexion ai_languageModel détectée APRÈS la mise à jour!');
          console.error('❌ [SmartDeploy] Les connexions LangChain ont été perdues lors de la mise à jour!');
          console.error('❌ [SmartDeploy] Vérification du payload envoyé:');
          console.error('  - Connexions dans le payload:', JSON.stringify(updatePayload.connections, null, 2).substring(0, 500));
        } else {
          console.log('✅ [SmartDeploy] Les connexions LangChain sont présentes dans le workflow retourné par n8n');
        }
        
        // ⚠️ DEBUG: Vérifier les credentials OpenRouter dans le workflow APRÈS la mise à jour
        const openRouterNodesAfterUpdate = updatedWorkflow.nodes?.filter(node => 
          node.type === 'n8n-nodes-base.httpRequest' && 
          (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))
        );
        if (openRouterNodesAfterUpdate && openRouterNodesAfterUpdate.length > 0) {
          console.log(`🔍 [SmartDeploy] DEBUG APRÈS MISE À JOUR: ${openRouterNodesAfterUpdate.length} nœud(s) OpenRouter`);
          openRouterNodesAfterUpdate.forEach(node => {
            const credId = node.credentials?.httpHeaderAuth?.id || node.credentials?.openRouterApi?.id || 'aucun';
            const hasPlaceholder = credId === 'ADMIN_OPENROUTER_CREDENTIAL_ID' || credId?.includes('ADMIN_OPENROUTER');
            if (hasPlaceholder) {
              console.error(`❌ [SmartDeploy] DEBUG APRÈS UPDATE: ${node.name} a toujours le placeholder: ${credId}`);
            } else if (credId === 'aucun') {
              console.error(`❌ [SmartDeploy] DEBUG APRÈS UPDATE: ${node.name} n'a pas de credential OpenRouter`);
            } else {
              console.log(`✅ [SmartDeploy] DEBUG APRÈS UPDATE: ${node.name} a le credential: ${credId}`);
            }
          });
        }
        
        // ⚠️ DEBUG: Vérifier les credentials Google Sheets dans le workflow APRÈS la mise à jour
      const googleSheetsNodesAfterUpdate = updatedWorkflow.nodes?.filter(node => 
        node.type === 'n8n-nodes-base.googleSheets'
      );
      if (googleSheetsNodesAfterUpdate && googleSheetsNodesAfterUpdate.length > 0) {
        console.log(`🔍 [SmartDeploy] DEBUG APRÈS MISE À JOUR: ${googleSheetsNodesAfterUpdate.length} nœud(s) Google Sheets`);
        googleSheetsNodesAfterUpdate.forEach(node => {
          // ⚠️ IMPORTANT: n8n utilise googleSheetsOAuth2Api (avec "Api"), pas googleSheetsOAuth2
          const credId = node.credentials?.googleSheetsOAuth2Api?.id || node.credentials?.googleSheetsOAuth2?.id || 'aucun';
          const hasPlaceholder = credId === 'USER_GOOGLE_SHEETS_CREDENTIAL_ID' || credId?.includes('USER_GOOGLE_SHEETS');
          if (hasPlaceholder) {
            console.error(`❌ [SmartDeploy] DEBUG APRÈS UPDATE: ${node.name} a toujours le placeholder: ${credId}`);
          } else if (credId === 'aucun') {
            console.error(`❌ [SmartDeploy] DEBUG APRÈS UPDATE: ${node.name} n'a pas de credential Google Sheets`);
          } else {
            console.log(`✅ [SmartDeploy] DEBUG APRÈS UPDATE: ${node.name} a le credential: ${credId}`);
          }
        });
      }
        
        // ⚠️ VÉRIFICATION CRITIQUE: Si les credentials OpenRouter ne sont pas présents après la mise à jour,
        // forcer leur assignation en faisant une deuxième mise à jour
        const { getAdminCredentials } = require('../services/n8nService');
        const adminCreds = await getAdminCredentials();
        
        // Liste des credentials OpenRouter valides (ancien et nouveau)
        const VALID_OPENROUTER_CREDENTIAL_IDS = [
          'hgQk9lN7epSIRRcg', // Nouveau credential créé
          'o7MztG7VAoDGoDSp'  // Ancien credential (peut ne plus exister)
        ];
        
        // Utiliser le credential utilisateur accessible par défaut si adminCreds.OPENROUTER_ID n'est pas disponible
        // Nouveau ID: hgQk9lN7epSIRRcg (ancien: o7MztG7VAoDGoDSp)
        const expectedCredId = adminCreds.OPENROUTER_ID || 'hgQk9lN7epSIRRcg';
        const expectedCredName = adminCreds.OPENROUTER_NAME || 'Header Auth account 2';
        
        const openRouterNodesAfterUpdateCheck = updatedWorkflow.nodes?.filter(node => 
          node.type === 'n8n-nodes-base.httpRequest' && 
          (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))
        );
        
        let needsSecondUpdate = false;
        if (openRouterNodesAfterUpdateCheck && openRouterNodesAfterUpdateCheck.length > 0) {
          openRouterNodesAfterUpdateCheck.forEach(node => {
            const credId = node.credentials?.httpHeaderAuth?.id;
            
            // Vérifier si le credential actuel est valide (dans la liste des credentials valides)
            const isCurrentCredValid = credId && VALID_OPENROUTER_CREDENTIAL_IDS.includes(credId);
            
            // Si le credential actuel est valide, ne pas le changer
            if (isCurrentCredValid) {
              console.log(`✅ [SmartDeploy] ${node.name} a déjà un credential OpenRouter valide: ${credId}`);
              return; // Ne pas forcer le changement
            }
            
            // Si le credential n'est pas valide ou manquant, forcer l'assignation
            if (!credId || !isCurrentCredValid) {
              console.warn(`⚠️ [SmartDeploy] ${node.name} a un credential OpenRouter invalide ou manquant: ${credId || 'AUCUN'}, assignation de ${expectedCredId}`);
              if (!node.credentials) {
                node.credentials = {};
              }
              node.credentials.httpHeaderAuth = {
                id: expectedCredId,
                name: expectedCredName
              };
              needsSecondUpdate = true;
              console.log(`✅ [SmartDeploy] Credential OpenRouter FORCÉ pour ${node.name}: ${expectedCredId}`);
            }
          });
        }
        
        // Si des credentials ont été forcés, faire une deuxième mise à jour
        if (needsSecondUpdate) {
          console.log('🔧 [SmartDeploy] Deuxième mise à jour nécessaire pour forcer les credentials OpenRouter...');
          const secondUpdatePayload = {
            name: updatedWorkflow.name,
            nodes: updatedWorkflow.nodes,
            connections: updatedWorkflow.connections,
            settings: updatedWorkflow.settings || {}
          };
          
          const secondUpdateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey,
            },
            body: JSON.stringify(secondUpdatePayload)
          });
          
          if (secondUpdateResponse.ok) {
            const secondUpdatedWorkflow = await secondUpdateResponse.json();
            console.log('✅ [SmartDeploy] Deuxième mise à jour réussie - credentials OpenRouter forcés');
            
            // Vérifier que les credentials sont bien présents après la deuxième mise à jour
            const openRouterNodesAfterSecondUpdate = secondUpdatedWorkflow.nodes?.filter(node => 
              node.type === 'n8n-nodes-base.httpRequest' && 
              (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))
            );
            if (openRouterNodesAfterSecondUpdate && openRouterNodesAfterSecondUpdate.length > 0) {
              // Liste des credentials OpenRouter valides (réutilisée pour la vérification)
              const validCredIds = ['hgQk9lN7epSIRRcg', 'o7MztG7VAoDGoDSp'];
              
              openRouterNodesAfterSecondUpdate.forEach(node => {
                const credId = node.credentials?.httpHeaderAuth?.id;
                const isCredValid = credId && validCredIds.includes(credId);
                
                if (isCredValid) {
                  console.log(`✅ [SmartDeploy] VÉRIFICATION FINALE: ${node.name} a un credential OpenRouter valide: ${credId}`);
                } else {
                  console.error(`❌ [SmartDeploy] VÉRIFICATION FINALE: ${node.name} a un credential OpenRouter invalide: ${credId || 'AUCUN'}`);
                  console.error(`❌ [SmartDeploy] Cela peut indiquer que le credential n'est pas accessible par l'utilisateur dans n8n.`);
                  console.error(`❌ [SmartDeploy] Credentials valides: ${validCredIds.join(', ')}`);
                }
              });
            }
            
            updatedWorkflow = secondUpdatedWorkflow;
          } else {
            const errorText = await secondUpdateResponse.text();
            console.error(`❌ [SmartDeploy] Erreur lors de la deuxième mise à jour: ${errorText}`);
          }
        }
        
        // Mettre à jour deployedWorkflow avec la version mise à jour pour avoir les credentials injectés
        deployedWorkflow.nodes = updatedWorkflow.nodes;
        deployedWorkflow.connections = updatedWorkflow.connections;
        
        // ⚠️ VÉRIFICATION FINALE: Valider que tous les nœuds critiques ont des credentials
        console.log('🔍 [SmartDeploy] Vérification finale des credentials dans le workflow...');
        const criticalNodes = updatedWorkflow.nodes?.filter(node => {
          const needsCreds = (node.type === 'n8n-nodes-base.httpRequest' && 
                             (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))) ||
                            node.type === 'n8n-nodes-base.googleSheets' ||
                            node.type === 'n8n-nodes-base.emailSend';
          return needsCreds;
        });
        
        if (criticalNodes && criticalNodes.length > 0) {
          criticalNodes.forEach(node => {
            const hasCreds = node.credentials && Object.keys(node.credentials).length > 0;
            if (!hasCreds) {
              console.error(`❌ [SmartDeploy] ATTENTION: Nœud "${node.name}" (${node.type}) n'a pas de credentials assignés!`);
            } else {
              console.log(`✅ [SmartDeploy] Nœud "${node.name}" a des credentials:`, Object.keys(node.credentials).join(', '));
            }
          });
        }
      } else {
        const errorText = await updateResponse.text();
        console.warn('⚠️ [SmartDeploy] Impossible de mettre à jour le workflow:', errorText);
        console.warn('⚠️ [SmartDeploy] Status:', updateResponse.status);
        // Si la mise à jour échoue, récupérer le workflow depuis n8n pour avoir les nodes
        try {
          const getResponse = await fetch(`${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey
            }
          });
          if (getResponse.ok) {
            const fetchedWorkflow = await getResponse.json();
            deployedWorkflow.nodes = fetchedWorkflow.nodes;
            deployedWorkflow.connections = fetchedWorkflow.connections;
            console.log('✅ [SmartDeploy] Workflow récupéré depuis n8n pour extraction des credentials');
          }
        } catch (getError) {
          console.warn('⚠️ [SmartDeploy] Impossible de récupérer le workflow depuis n8n:', getError.message);
        }
      }
    } catch (updateError) {
      console.warn('⚠️ [SmartDeploy] Erreur mise à jour workflow:', updateError.message);
      // Ne pas bloquer si la mise à jour échoue
    }
    
    // Attendre un peu pour que n8n traite la mise à jour avant l'activation
    await new Promise(resolve => setTimeout(resolve, 2000)); // Augmenté à 2 secondes pour plus de stabilité
    
    // Vérifier si le workflow a un trigger node (requis pour l'activation)
    const triggerNode = injectedWorkflow.nodes?.find(node => {
      const triggerTypes = [
        'n8n-nodes-base.manualTrigger',
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.scheduleTrigger',
        'n8n-nodes-base.webhookTrigger' // Ajout pour webhookTrigger
      ];
      const nodeTypeLower = node.type?.toLowerCase() || '';
      const nodeNameLower = node.name?.toLowerCase() || '';
      return triggerTypes.includes(node.type) || 
             nodeTypeLower.includes('trigger') || 
             nodeTypeLower.includes('webhook') ||
             nodeNameLower.includes('trigger') ||
             nodeNameLower.includes('webhook');
    });
    
    const hasTriggerNode = !!triggerNode;
    console.log('🔧 [SmartDeploy] Vérification trigger node:', hasTriggerNode ? `✅ Présent (${triggerNode?.type} - ${triggerNode?.name})` : '❌ Absent');
    if (triggerNode) {
      console.log('🔧 [SmartDeploy] Détails trigger:', {
        type: triggerNode.type,
        name: triggerNode.name,
        id: triggerNode.id,
        webhookPath: triggerNode.parameters?.path,
        webhookId: triggerNode.webhookId
      });
      
      // Vérifier que le webhook trigger a un path configuré
      if (triggerNode.type === 'n8n-nodes-base.webhook' || triggerNode.type === 'n8n-nodes-base.webhookTrigger') {
        if (!triggerNode.parameters?.path && !triggerNode.webhookId) {
          console.error('❌ [SmartDeploy] ATTENTION: Le webhook trigger n\'a pas de path configuré!');
          console.error('❌ [SmartDeploy] Cela peut empêcher le workflow de s\'exécuter correctement.');
        } else {
          console.log(`✅ [SmartDeploy] Webhook trigger configuré avec path: ${triggerNode.parameters?.path || triggerNode.webhookId}`);
        }
      }
    }
    
    // ⚠️ VÉRIFICATION CRITIQUE: Vérifier que les connexions LangChain sont présentes AVANT l'activation
    // Seulement si le workflow contient des nœuds LangChain
    const hasLangChainNodes = deployedWorkflow.nodes?.some(node => 
      node.type?.includes('langchain') || 
      node.type?.includes('agent') ||
      node.type === '@n8n/n8n-nodes-langchain.agent'
    );
    
    if (hasLangChainNodes) {
      console.log('🔍 [SmartDeploy] Workflow contient des nœuds LangChain - Vérification des connexions AVANT activation...');
      const langchainConnectionsBeforeActivation = {
        ai_languageModel: [],
        ai_tool: [],
        ai_memory: []
      };
      
      // Utiliser deployedWorkflow.connections qui contient les connexions après mise à jour
      Object.keys(deployedWorkflow.connections || {}).forEach(nodeName => {
        const nodeConnections = deployedWorkflow.connections[nodeName];
        if (nodeConnections.ai_languageModel) {
          langchainConnectionsBeforeActivation.ai_languageModel.push({
            from: nodeName,
            to: nodeConnections.ai_languageModel[0]?.[0]?.node || 'NON DÉFINI'
          });
        }
        if (nodeConnections.ai_tool) {
          langchainConnectionsBeforeActivation.ai_tool.push({
            from: nodeName,
            to: nodeConnections.ai_tool[0]?.[0]?.node || 'NON DÉFINI'
          });
        }
        if (nodeConnections.ai_memory) {
          langchainConnectionsBeforeActivation.ai_memory.push({
            from: nodeName,
            to: nodeConnections.ai_memory[0]?.[0]?.node || 'NON DÉFINI'
          });
        }
      });
      
      console.log('🔍 [SmartDeploy] Connexions LangChain AVANT activation:');
      console.log(`  - ai_languageModel: ${langchainConnectionsBeforeActivation.ai_languageModel.length} connexion(s)`);
      langchainConnectionsBeforeActivation.ai_languageModel.forEach(conn => {
        console.log(`    → ${conn.from} → ${conn.to}`);
      });
      console.log(`  - ai_tool: ${langchainConnectionsBeforeActivation.ai_tool.length} connexion(s)`);
      langchainConnectionsBeforeActivation.ai_tool.forEach(conn => {
        console.log(`    → ${conn.from} → ${conn.to}`);
      });
      console.log(`  - ai_memory: ${langchainConnectionsBeforeActivation.ai_memory.length} connexion(s)`);
      langchainConnectionsBeforeActivation.ai_memory.forEach(conn => {
        console.log(`    → ${conn.from} → ${conn.to}`);
      });
      
      if (langchainConnectionsBeforeActivation.ai_languageModel.length === 0) {
        console.error('❌ [SmartDeploy] CRITIQUE: Aucune connexion ai_languageModel détectée AVANT l\'activation!');
        console.error('❌ [SmartDeploy] Le workflow ne pourra pas fonctionner sans modèle de langage!');
        console.error('❌ [SmartDeploy] Vérification des connexions dans deployedWorkflow:');
        console.error('  - Connexions disponibles:', Object.keys(deployedWorkflow.connections || {}).join(', '));
      } else {
        console.log('✅ [SmartDeploy] Les connexions LangChain sont présentes AVANT l\'activation');
      }
    } else {
      console.log('ℹ️ [SmartDeploy] Workflow ne contient pas de nœuds LangChain - Vérification des connexions LangChain ignorée');
    }
    
    // ACTIVATION AUTOMATIQUE du workflow dans n8n (TOUJOURS activer)
    console.log('🔧 [SmartDeploy] Activation automatique du workflow...');
    console.log('🔧 [SmartDeploy] Workflow ID à activer:', deployedWorkflow.id);
    console.log('🔧 [SmartDeploy] Trigger node détecté:', hasTriggerNode ? `✅ ${triggerNode?.type}` : '❌ Aucun');
    
    // Toujours essayer d'activer, même sans trigger (n8n peut accepter certains workflows)
    let workflowActivated = false;
    try {
      // Utiliser l'URL n8n directe au lieu du proxy local
      const n8nUrl = config.n8n.url;
      const n8nApiKey = config.n8n.apiKey;
      
      console.log('🔧 [SmartDeploy] Appel API activation:', `${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}/activate`);
      console.log('🔧 [SmartDeploy] Headers:', {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey ? 'PRÉSENT' : 'MANQUANT'
      });
      
      const activateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey
        },
        body: JSON.stringify({}) // Certaines versions de n8n nécessitent un body vide
      });
      
      console.log('🔧 [SmartDeploy] Réponse activation:', activateResponse.status, activateResponse.statusText);
      
      if (activateResponse.ok) {
        const activateResult = await activateResponse.json();
        workflowActivated = activateResult.active === true;
        console.log('✅ [SmartDeploy] Workflow activé automatiquement dans n8n:', activateResult.id);
        console.log('✅ [SmartDeploy] Workflow actif:', activateResult.active);
        
        // Vérifier le statut final du workflow pour confirmer l'activation
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2 secondes pour que n8n mette à jour
          
          const statusResponse = await fetch(`${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey
            }
          });
          
          if (statusResponse.ok) {
            const statusResult = await statusResponse.json();
            workflowActivated = statusResult.active === true;
            console.log('✅ [SmartDeploy] Statut final du workflow vérifié:', statusResult.active ? '✅ ACTIF' : '❌ INACTIF');
            if (!statusResult.active) {
              console.error('❌ [SmartDeploy] CRITIQUE: Le workflow n\'est PAS actif dans n8n après activation!');
              console.error('❌ [SmartDeploy] ID workflow:', deployedWorkflow.id);
              console.error('❌ [SmartDeploy] Nom workflow:', deployedWorkflow.name);
              
              // ⚠️ FORCER UNE DEUXIÈME ACTIVATION
              console.log('🔧 [SmartDeploy] Tentative de réactivation forcée...');
              try {
                const reactivateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}/activate`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': n8nApiKey
                  },
                  body: JSON.stringify({})
                });
                
                if (reactivateResponse.ok) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  const finalStatusResponse = await fetch(`${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-N8N-API-KEY': n8nApiKey
                    }
                  });
                  
                  if (finalStatusResponse.ok) {
                    const finalStatus = await finalStatusResponse.json();
                    if (finalStatus.active) {
                      console.log('✅ [SmartDeploy] Workflow activé après réactivation forcée');
                      workflowActivated = true;
                    } else {
                      console.error('❌ [SmartDeploy] Le workflow est toujours inactif après réactivation forcée');
                    }
                  }
                }
              } catch (reactivateError) {
                console.error('❌ [SmartDeploy] Erreur lors de la réactivation forcée:', reactivateError.message);
              }
            } else {
              console.log('✅ [SmartDeploy] ✅✅✅ WORKFLOW CONFIRMÉ ACTIF DANS N8N ✅✅✅');
              
              // ⚠️ VÉRIFICATION CRITIQUE: Vérifier que les connexions LangChain sont présentes APRÈS l'activation
              // Seulement si le workflow contient des nœuds LangChain
              const hasLangChainNodesAfter = statusResult.nodes?.some(node => 
                node.type?.includes('langchain') || 
                node.type?.includes('agent') ||
                node.type === '@n8n/n8n-nodes-langchain.agent'
              );
              
              if (hasLangChainNodesAfter) {
                console.log('🔍 [SmartDeploy] Workflow contient des nœuds LangChain - Vérification des connexions APRÈS activation...');
                const langchainConnectionsAfterActivation = {
                  ai_languageModel: [],
                  ai_tool: [],
                  ai_memory: []
                };
                
                Object.keys(statusResult.connections || {}).forEach(nodeName => {
                  const nodeConnections = statusResult.connections[nodeName];
                  if (nodeConnections.ai_languageModel) {
                    langchainConnectionsAfterActivation.ai_languageModel.push({
                      from: nodeName,
                      to: nodeConnections.ai_languageModel[0]?.[0]?.node || 'NON DÉFINI'
                    });
                  }
                  if (nodeConnections.ai_tool) {
                    langchainConnectionsAfterActivation.ai_tool.push({
                      from: nodeName,
                      to: nodeConnections.ai_tool[0]?.[0]?.node || 'NON DÉFINI'
                    });
                  }
                  if (nodeConnections.ai_memory) {
                    langchainConnectionsAfterActivation.ai_memory.push({
                      from: nodeName,
                      to: nodeConnections.ai_memory[0]?.[0]?.node || 'NON DÉFINI'
                    });
                  }
                });
                
                console.log('🔍 [SmartDeploy] Connexions LangChain APRÈS activation:');
                console.log(`  - ai_languageModel: ${langchainConnectionsAfterActivation.ai_languageModel.length} connexion(s)`);
                langchainConnectionsAfterActivation.ai_languageModel.forEach(conn => {
                  console.log(`    → ${conn.from} → ${conn.to}`);
                });
                console.log(`  - ai_tool: ${langchainConnectionsAfterActivation.ai_tool.length} connexion(s)`);
                langchainConnectionsAfterActivation.ai_tool.forEach(conn => {
                  console.log(`    → ${conn.from} → ${conn.to}`);
                });
                console.log(`  - ai_memory: ${langchainConnectionsAfterActivation.ai_memory.length} connexion(s)`);
                langchainConnectionsAfterActivation.ai_memory.forEach(conn => {
                  console.log(`    → ${conn.from} → ${conn.to}`);
                });
                
                if (langchainConnectionsAfterActivation.ai_languageModel.length === 0) {
                  console.error('❌ [SmartDeploy] CRITIQUE: Aucune connexion ai_languageModel détectée APRÈS l\'activation!');
                  console.error('❌ [SmartDeploy] Les connexions LangChain ont été perdues lors de l\'activation!');
                } else {
                  console.log('✅ [SmartDeploy] Les connexions LangChain sont présentes APRÈS l\'activation');
                }
              } else {
                console.log('ℹ️ [SmartDeploy] Workflow ne contient pas de nœuds LangChain - Vérification des connexions LangChain ignorée');
              }
              
              // Vérifier que le webhook trigger est correctement configuré
              const webhookNode = statusResult.nodes?.find(node => 
                node.type === 'n8n-nodes-base.webhook' || 
                node.type === 'n8n-nodes-base.webhookTrigger'
              );
              
              if (webhookNode) {
                const webhookPath = webhookNode.parameters?.path || webhookNode.webhookId;
                console.log('🔍 [SmartDeploy] Vérification webhook trigger dans le workflow actif:');
                console.log(`  - Path: ${webhookPath || 'NON DÉFINI'}`);
                console.log(`  - WebhookId: ${webhookNode.webhookId || 'NON DÉFINI'}`);
                console.log(`  - Type: ${webhookNode.type}`);
                
                if (!webhookPath && !webhookNode.webhookId) {
                  console.error('❌ [SmartDeploy] ATTENTION: Le webhook trigger n\'a pas de path configuré dans le workflow actif!');
                  console.error('❌ [SmartDeploy] Cela peut empêcher le workflow de recevoir des données via webhook.');
                }
                
                // Vérifier les connexions du webhook trigger
                const webhookConnections = statusResult.connections?.[webhookNode.name];
                if (webhookConnections && webhookConnections.main && webhookConnections.main.length > 0) {
                  console.log(`✅ [SmartDeploy] Webhook trigger connecté à ${webhookConnections.main[0].length} nœud(s)`);
                  webhookConnections.main[0].forEach(conn => {
                    console.log(`  - → ${conn.node}`);
                  });
                } else {
                  console.error('❌ [SmartDeploy] ATTENTION: Le webhook trigger n\'a pas de connexions!');
                  console.error('❌ [SmartDeploy] Le workflow ne peut pas s\'exécuter sans connexions depuis le webhook.');
                }
              }
            }
          }
        } catch (statusError) {
          console.warn('⚠️ [SmartDeploy] Impossible de vérifier le statut final:', statusError.message);
        }
      } else {
        const errorText = await activateResponse.text();
        console.error('❌ [SmartDeploy] Impossible d\'activer automatiquement le workflow:', errorText);
        console.error('❌ [SmartDeploy] Status:', activateResponse.status);
        console.error('❌ [SmartDeploy] Workflow ID:', deployedWorkflow.id);
        
        // Si l'erreur indique qu'il manque un trigger, on logue un message clair
        if (errorText.includes('trigger') || errorText.includes('poller') || errorText.includes('webhook')) {
          console.warn('⚠️ [SmartDeploy] Le workflow nécessite un trigger node pour être activé');
          console.warn('⚠️ [SmartDeploy] Types de trigger acceptés: manualTrigger, schedule, webhook, scheduleTrigger');
          console.warn('⚠️ [SmartDeploy] Trigger détecté dans le workflow:', hasTriggerNode ? `✅ ${triggerNode?.type}` : '❌ Aucun');
        }
        // Ne pas bloquer le déploiement si l'activation échoue, mais loguer l'erreur
      }
    } catch (activateError) {
      console.error('❌ [SmartDeploy] Erreur activation automatique:', activateError.message);
      console.error('❌ [SmartDeploy] Stack:', activateError.stack);
      // Ne pas bloquer le déploiement si l'activation échoue
    }
    
    if (!workflowActivated) {
      console.error('❌ [SmartDeploy] ⚠️ ATTENTION: Le workflow n\'a pas pu être activé automatiquement!');
      console.error('❌ [SmartDeploy] L\'utilisateur devra l\'activer manuellement dans n8n');
    }
    
    // Vérifier s'il existe déjà un workflow avec le même nom pour cet utilisateur et ce template
    // Si oui, le supprimer avant de créer le nouveau
    console.log('🔍 [SmartDeploy] Vérification des workflows existants...');
    try {
      const existingWorkflows = await db.query(
        'SELECT * FROM user_workflows WHERE user_id = $1 AND template_id = $2',
        [req.user.id, template.id]
      );
      
      if (existingWorkflows.rows && existingWorkflows.rows.length > 0) {
        console.log(`🔍 [SmartDeploy] ${existingWorkflows.rows.length} workflow(s) existant(s) trouvé(s) pour ce template`);
        
        for (const existingWorkflow of existingWorkflows.rows) {
          console.log(`🗑️ [SmartDeploy] Suppression de l'ancien workflow: ${existingWorkflow.name} (ID: ${existingWorkflow.id})`);
          
          // 1. Supprimer les credentials associés au workflow depuis n8n
          try {
            const workflowCredentials = await db.getWorkflowCredentials(existingWorkflow.id);
            if (workflowCredentials && workflowCredentials.length > 0) {
              console.log(`🔍 [SmartDeploy] ${workflowCredentials.length} credential(s) trouvé(s) pour ce workflow`);
              const n8nUrl = config.n8n.url;
              const n8nApiKey = config.n8n.apiKey;
              
              for (const cred of workflowCredentials) {
                if (cred.credential_id) {
                  // ⚠️ PROTECTION: Ne jamais supprimer le credential "Header Auth account 2" (partagé par tous les workflows)
                  // IDs possibles: o7MztG7VAoDGoDSp (ancien), hgQk9lN7epSIRRcg (nouveau)
                  const isSharedCredential = cred.credential_id === 'o7MztG7VAoDGoDSp' || 
                                             cred.credential_id === 'hgQk9lN7epSIRRcg' ||
                                             cred.credential_name?.toLowerCase().includes('header auth account 2');
                  
                  if (isSharedCredential) {
                    console.log(`⚠️ [SmartDeploy] PROTECTION: Credential partagé ignoré (ne sera pas supprimé): ${cred.credential_name} (${cred.credential_id})`);
                    continue;
                  }
                  
                  try {
                    const deleteCredResponse = await fetch(`${n8nUrl}/api/v1/credentials/${cred.credential_id}`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-N8N-API-KEY': n8nApiKey
                      }
                    });
                    
                    if (deleteCredResponse.ok) {
                      console.log(`✅ [SmartDeploy] Credential supprimé de n8n: ${cred.credential_name} (${cred.credential_id})`);
                    } else {
                      const errorText = await deleteCredResponse.text();
                      console.warn(`⚠️ [SmartDeploy] Impossible de supprimer le credential ${cred.credential_id}:`, errorText);
                    }
                  } catch (credError) {
                    console.warn(`⚠️ [SmartDeploy] Erreur suppression credential ${cred.credential_id}:`, credError.message);
                  }
                }
              }
            }
          } catch (credError) {
            console.warn('⚠️ [SmartDeploy] Erreur lors de la récupération des credentials:', credError.message);
          }
          
          // 2. Supprimer de n8n si l'ID n8n existe
          if (existingWorkflow.n8n_workflow_id) {
            try {
              const n8nUrl = config.n8n.url;
              const n8nApiKey = config.n8n.apiKey;
              const deleteResponse = await fetch(`${n8nUrl}/api/v1/workflows/${existingWorkflow.n8n_workflow_id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'X-N8N-API-KEY': n8nApiKey
                }
              });
              
              if (deleteResponse.ok) {
                console.log(`✅ [SmartDeploy] Ancien workflow supprimé de n8n: ${existingWorkflow.n8n_workflow_id}`);
              } else {
                console.warn(`⚠️ [SmartDeploy] Impossible de supprimer l'ancien workflow de n8n: ${existingWorkflow.n8n_workflow_id}`);
              }
            } catch (deleteError) {
              console.warn(`⚠️ [SmartDeploy] Erreur lors de la suppression de l'ancien workflow de n8n:`, deleteError.message);
            }
          }
          
          // 3. Supprimer de la base de données (les credentials seront supprimés en cascade si FK CASCADE)
          await db.query(
            'DELETE FROM user_workflows WHERE id = $1',
            [existingWorkflow.id]
          );
          console.log(`✅ [SmartDeploy] Ancien workflow supprimé de la base de données: ${existingWorkflow.id}`);
        }
      }
    } catch (checkError) {
      console.warn('⚠️ [SmartDeploy] Erreur lors de la vérification des workflows existants:', checkError.message);
      // Continuer même en cas d'erreur
    }
    
    // Enregistrer le workflow déployé dans la base de données
    const userWorkflow = await db.createUserWorkflow({
      userId: req.user.id,
      templateId: template.id,
      n8nWorkflowId: deployedWorkflow.id,
      n8nCredentialId: null, // Pas de credential spécifique pour ce workflow
      name: workflowName,
      isActive: true,
      webhookPath: webhookPath // Stocker le webhook unique pour ce workflow
    });
    
    // Sauvegarder les credentials créés dans workflow_credentials pour pouvoir les supprimer plus tard
    try {
      if (!injectionResult) {
        console.error('❌ [SmartDeploy] injectionResult est null - impossible de sauvegarder les credentials');
        throw new Error('injectionResult est null');
      }
      
      const credentialsToSave = [];
      
      // Récupérer les credentials créés depuis injectionResult
      if (injectionResult.createdCredentials) {
        console.log('🔍 [SmartDeploy] Credentials créés trouvés:', Object.keys(injectionResult.createdCredentials));
        console.log('🔍 [SmartDeploy] Détails createdCredentials:', JSON.stringify(injectionResult.createdCredentials, null, 2));
        for (const [credType, cred] of Object.entries(injectionResult.createdCredentials)) {
          if (cred && cred.id) {
            credentialsToSave.push({
              id: cred.id,
              name: cred.name || `${credType} - ${req.user.email}`,
              type: credType
            });
            console.log(`✅ [SmartDeploy] Credential à sauvegarder: ${credType} - ${cred.id} (${cred.name})`);
          } else {
            console.warn(`⚠️ [SmartDeploy] Credential ${credType} sans ID ou invalide:`, cred);
          }
        }
      } else {
        console.warn('⚠️ [SmartDeploy] Aucun createdCredentials dans injectionResult');
        console.warn('⚠️ [SmartDeploy] injectionResult keys:', injectionResult ? Object.keys(injectionResult) : 'null');
      }
      
      // Aussi extraire les credentials depuis le workflow déployé pour être sûr de tous les capturer
      // (certains credentials peuvent être réutilisés et ne pas être dans createdCredentials)
      if (deployedWorkflow && deployedWorkflow.nodes) {
        console.log('🔍 [SmartDeploy] Extraction des credentials depuis le workflow déployé...');
        const extractedCreds = new Map(); // Utiliser une Map pour éviter les doublons
        
        // Ajouter ceux déjà trouvés
        for (const cred of credentialsToSave) {
          extractedCreds.set(cred.id, cred);
        }
        
        // Extraire depuis les nœuds
        for (const node of deployedWorkflow.nodes) {
          if (node.credentials) {
            for (const [credType, credValue] of Object.entries(node.credentials)) {
              if (credValue && typeof credValue === 'object' && 'id' in credValue) {
                const credId = credValue.id;
                const credName = credValue.name || `${credType} - ${req.user.email}`;
                
                // Ignorer les credentials admin (OpenRouter, SMTP admin) qui ne doivent pas être supprimés
                const isAdminCred = credName.toLowerCase().includes('admin') || 
                                   credName.toLowerCase().includes('openrouter') ||
                                   credId.includes('admin');
                
                if (!isAdminCred && credId && typeof credId === 'string' && credId.length > 0) {
                  // Vérifier si ce credential n'est pas déjà dans la liste
                  if (!extractedCreds.has(credId)) {
                    extractedCreds.set(credId, {
                      id: credId,
                      name: credName,
                      type: credType
                    });
                    console.log(`🔍 [SmartDeploy] Credential extrait depuis nœud ${node.name}: ${credType} - ${credId} (${credName})`);
                  }
                }
              }
            }
          }
        }
        
        // Convertir la Map en tableau
        const finalCredentialsToSave = Array.from(extractedCreds.values());
        
        // Si des credentials ont été trouvés, les sauvegarder
        if (finalCredentialsToSave.length > 0) {
          await db.saveWorkflowCredentials(userWorkflow.id, finalCredentialsToSave);
          console.log(`✅ [SmartDeploy] ${finalCredentialsToSave.length} credential(s) sauvegardé(s) pour ce workflow`);
          finalCredentialsToSave.forEach(cred => {
            console.log(`  - ${cred.type}: ${cred.name} (${cred.id})`);
          });
        } else {
          console.log('ℹ️ [SmartDeploy] Aucun credential utilisateur à sauvegarder (peut-être uniquement des credentials admin)');
        }
      } else {
        // Fallback: sauvegarder ceux trouvés dans createdCredentials
        if (credentialsToSave.length > 0) {
          await db.saveWorkflowCredentials(userWorkflow.id, credentialsToSave);
          console.log(`✅ [SmartDeploy] ${credentialsToSave.length} credential(s) sauvegardé(s) pour ce workflow`);
        } else {
          console.log('ℹ️ [SmartDeploy] Aucun credential à sauvegarder');
        }
      }
    } catch (credSaveError) {
      console.error('❌ [SmartDeploy] Erreur lors de la sauvegarde des credentials:', credSaveError);
      console.error('❌ [SmartDeploy] Stack:', credSaveError.stack);
      // Ne pas bloquer le déploiement si la sauvegarde des credentials échoue
    }
    
    console.log('✅ [SmartDeploy] Workflow déployé et activé avec succès:', deployedWorkflow.id);
    
    res.json({
      success: true,
      message: 'Workflow déployé avec succès',
      workflow: {
        id: userWorkflow.id,
        name: userWorkflow.name,
        n8n_workflow_id: deployedWorkflow.id,
        status: userWorkflow.status
      }
    });
    
  } catch (error) {
    console.error('❌ [SmartDeploy] Erreur déploiement:', error);
    
    // Écrire l'erreur dans le fichier de logs
    const fs = require('fs');
    fs.appendFileSync('backend-logs.txt', `[${new Date().toISOString()}] ERREUR: ${error.message}\n`);
    fs.appendFileSync('backend-logs.txt', `[${new Date().toISOString()}] Stack: ${error.stack}\n`);
    
    res.status(500).json({ 
      error: 'Erreur lors du déploiement du workflow',
      details: error.message 
    });
  }
});

/**
 * Obtenir la liste des workflows disponibles pour le déploiement intelligent
 * GET /api/smart-deploy/workflows
 */
router.get('/workflows', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [SmartDeploy] Récupération des workflows disponibles');
    console.log('🔍 [SmartDeploy] User:', req.user.email);
    console.log('🔍 [SmartDeploy] User Role:', req.user.role);
    
    // Récupérer les templates visibles pour l'utilisateur
    const templates = await db.getTemplates(req.user.id, req.user.role);
    
    console.log('✅ [SmartDeploy] Templates trouvés:', templates.length);
    
    // Logger chaque template pour vérifier
    templates.forEach((template, index) => {
      console.log(`🔍 [SmartDeploy] Template ${index + 1}:`, {
        id: template.id,
        name: template.name,
        description: template.description?.substring(0, 50) + '...',
        visible: template.visible,
        created_by: template.created_by
      });
    });
    
    const workflows = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      created_at: template.created_at
    }));
    
    console.log('✅ [SmartDeploy] Workflows retournés:', workflows.length);
    workflows.forEach((workflow, index) => {
      console.log(`  ${index + 1}. ${workflow.name} (ID: ${workflow.id})`);
    });
    
    res.json({
      success: true,
      workflows: workflows
    });
    
  } catch (error) {
    console.error('❌ [SmartDeploy] Erreur récupération workflows:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des workflows',
      details: error.message 
    });
  }
});

module.exports = router;

