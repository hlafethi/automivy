const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const { analyzeWorkflowCredentials, generateDynamicForm } = require('../services/workflowAnalyzer');
const { injectUserCredentials } = require('../services/credentialInjector');
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
    console.log('🔧 [SmartDeploy] Injection des credentials...');
    console.log('🔧 [SmartDeploy] Credentials reçus:', Object.keys(credentials));
    console.log('🔧 [SmartDeploy] Détails credentials:', {
      email: credentials.email,
      smtpEmail: credentials.smtpEmail,
      smtpServer: credentials.smtpServer,
      smtpPort: credentials.smtpPort,
      smtpPasswordLength: credentials.smtpPassword?.length
    });
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
    try {
      console.log('🔧 [SmartDeploy] Appel injectUserCredentials...');
      console.log('🔧 [SmartDeploy] Template ID:', template.id);
      const injectionResult = await injectUserCredentials(workflowJson, credentials, req.user.id, template.id);
      console.log('✅ [SmartDeploy] Injection réussie');
      
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
      } else {
        const errorText = await updateResponse.text();
        console.warn('⚠️ [SmartDeploy] Impossible de mettre à jour le workflow:', errorText);
        console.warn('⚠️ [SmartDeploy] Status:', updateResponse.status);
      }
    } catch (updateError) {
      console.warn('⚠️ [SmartDeploy] Erreur mise à jour workflow:', updateError.message);
      // Ne pas bloquer si la mise à jour échoue
    }
    
    // Attendre un peu pour que n8n traite la mise à jour avant l'activation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Vérifier si le workflow a un trigger node (requis pour l'activation)
    const triggerNode = injectedWorkflow.nodes?.find(node => {
      const triggerTypes = [
        'n8n-nodes-base.manualTrigger',
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.scheduleTrigger'
      ];
      return triggerTypes.includes(node.type) || 
             node.type?.includes('trigger') || 
             node.name?.toLowerCase().includes('trigger');
    });
    
    const hasTriggerNode = !!triggerNode;
    console.log('🔧 [SmartDeploy] Vérification trigger node:', hasTriggerNode ? `✅ Présent (${triggerNode?.type})` : '❌ Absent');
    
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
      
      const activateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${deployedWorkflow.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey
        }
      });
      
      console.log('🔧 [SmartDeploy] Réponse activation:', activateResponse.status, activateResponse.statusText);
      
      if (activateResponse.ok) {
        const activateResult = await activateResponse.json();
        workflowActivated = activateResult.active === true;
        console.log('✅ [SmartDeploy] Workflow activé automatiquement dans n8n:', activateResult.id);
        console.log('✅ [SmartDeploy] Workflow actif:', activateResult.active);
        
        // Vérifier le statut final du workflow pour confirmer l'activation
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde pour que n8n mette à jour
          
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
            } else {
              console.log('✅ [SmartDeploy] ✅✅✅ WORKFLOW CONFIRMÉ ACTIF DANS N8N ✅✅✅');
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
          
          // Supprimer de n8n si l'ID n8n existe
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
          
          // Supprimer de la base de données
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
