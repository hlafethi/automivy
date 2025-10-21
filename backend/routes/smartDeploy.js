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
    const template = await db.getTemplateByIdForUser(workflowId, req.user.id);
    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    // Utiliser le workflow JSON du template
    const workflowJson = template.json;
    
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
    
    let injectedWorkflow;
    try {
      console.log('🔧 [SmartDeploy] Appel injectUserCredentials...');
      injectedWorkflow = await injectUserCredentials(workflowJson, credentials, req.user.id);
      console.log('✅ [SmartDeploy] Injection réussie');
      console.log('🔧 [SmartDeploy] Workflow injecté - nodes:', injectedWorkflow.nodes?.length);
    } catch (injectionError) {
      console.error('❌ [SmartDeploy] Erreur injection:', injectionError.message);
      console.error('❌ [SmartDeploy] Stack:', injectionError.stack);
      throw injectionError;
    }
    
    // Créer un nouveau workflow dans n8n avec les credentials injectés
    console.log('🔧 [SmartDeploy] Création du workflow dans n8n...');
    const config = require('../config');
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    const deployResponse = await fetch('http://localhost:3004/api/n8n/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${template.name} - ${req.user.email}`,
        nodes: injectedWorkflow.nodes,
        connections: injectedWorkflow.connections,
        settings: injectedWorkflow.settings
      })
    });
    
    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Erreur déploiement n8n: ${error}`);
    }
    
    const deployedWorkflow = await deployResponse.json();
    
    // Vérifier si le workflow a un nœud de déclenchement avant activation
    console.log('🔧 [SmartDeploy] Vérification des nœuds de déclenchement...');
    const hasTriggerNode = injectedWorkflow.nodes?.some(node => {
      const triggerTypes = [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.scheduleTrigger', 
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.manualTrigger',
        'n8n-nodes-base.files'
      ];
      return triggerTypes.includes(node.type);
    });
    
    console.log('🔧 [SmartDeploy] Nœuds de déclenchement trouvés:', hasTriggerNode);
    
    if (hasTriggerNode) {
      // ACTIVATION AUTOMATIQUE du workflow dans n8n
      console.log('🔧 [SmartDeploy] Activation automatique du workflow...');
      console.log('🔧 [SmartDeploy] Workflow ID à activer:', deployedWorkflow.id);
      try {
        // Utiliser l'URL n8n directe au lieu du proxy local
        const n8nUrl = config.n8n.url;
        const n8nApiKey = config.n8n.apiKey;
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
          console.log('✅ [SmartDeploy] Workflow activé automatiquement dans n8n:', activateResult);
        } else {
          const errorText = await activateResponse.text();
          console.log('⚠️ [SmartDeploy] Impossible d\'activer automatiquement le workflow:', errorText);
          console.log('⚠️ [SmartDeploy] Status:', activateResponse.status);
          console.log('⚠️ [SmartDeploy] Headers:', activateResponse.headers);
        }
      } catch (activateError) {
        console.log('⚠️ [SmartDeploy] Erreur activation automatique:', activateError.message);
        console.log('⚠️ [SmartDeploy] Stack:', activateError.stack);
      }
    } else {
      console.log('⚠️ [SmartDeploy] Workflow sans nœud de déclenchement - activation manuelle requise');
      console.log('⚠️ [SmartDeploy] Types de nœuds trouvés:', injectedWorkflow.nodes?.map(n => n.type));
    }
    
    // Enregistrer le workflow déployé dans la base de données
    const userWorkflow = await db.createUserWorkflow({
      userId: req.user.id,
      templateId: template.id,
      n8nWorkflowId: deployedWorkflow.id,
      n8nCredentialId: null, // Pas de credential spécifique pour ce workflow
      name: `${template.name} - ${req.user.email}`,
      isActive: true
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
    
    // Récupérer les templates visibles pour l'utilisateur
    const templates = await db.getTemplates(req.user.id, req.user.role);
    
    console.log('✅ [SmartDeploy] Templates trouvés:', templates.length);
    
    res.json({
      success: true,
      workflows: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        created_at: template.created_at
      }))
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
