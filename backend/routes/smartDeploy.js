const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const { analyzeWorkflowCredentials, generateDynamicForm } = require('../services/workflowAnalyzer');
const { deployWorkflow } = require('../services/deployments');
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
  try {
    console.log('🚀 [SmartDeploy] Déploiement intelligent demandé');
    console.log('🚀 [SmartDeploy] User:', req.user.email);
    
    const { workflowId, credentials } = req.body;
    
    if (!workflowId || !credentials) {
      return res.status(400).json({ error: 'Workflow ID et credentials requis' });
    }
    
    // Récupérer le template depuis la base de données
    const template = await db.getTemplateByIdForUser(workflowId, req.user.id);
    
    if (!template) {
      console.error('❌ [SmartDeploy] Template non trouvé avec ID:', workflowId);
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    console.log('✅ [SmartDeploy] Template trouvé:', template.name);
    
    // Vérifier que l'ID correspond bien
    if (template.id !== workflowId) {
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
    
    // Déployer via le router de déploiements (qui appelle le bon déploiement spécifique ou générique)
    const result = await deployWorkflow(template, credentials, req.user.id, req.user.email);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ [SmartDeploy] Erreur déploiement:', error);
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

