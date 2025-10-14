const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { analyzeWorkflowCredentials, generateDynamicForm } = require('../services/workflowAnalyzer');
const { injectUserCredentials } = require('../services/credentialInjector');
const db = require('../database');

/**
 * Analyser un workflow et retourner le formulaire dynamique
 * POST /api/smart-deploy/analyze
 */
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [SmartDeploy] Analyse du workflow demandée');
    console.log('🔍 [SmartDeploy] User:', req.user.email);
    
    const { workflowId } = req.body;
    
    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID requis' });
    }
    
    // Récupérer le workflow depuis la base de données
    const workflow = await db.getWorkflowById(workflowId, req.user.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }
    
    // Récupérer le workflow JSON depuis n8n
    const n8nResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.n8n_workflow_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${req.headers.authorization.split(' ')[1]}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!n8nResponse.ok) {
      return res.status(404).json({ error: 'Workflow non trouvé dans n8n' });
    }
    
    const workflowJson = await n8nResponse.json();
    
    // Analyser les credentials requis
    const requiredCredentials = analyzeWorkflowCredentials(workflowJson);
    
    // Générer le formulaire dynamique
    const formConfig = generateDynamicForm(requiredCredentials);
    
    console.log('✅ [SmartDeploy] Analyse terminée:', requiredCredentials.length, 'credentials requis');
    
    res.json({
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        n8n_workflow_id: workflow.n8n_workflow_id
      },
      requiredCredentials: requiredCredentials,
      formConfig: formConfig
    });
    
  } catch (error) {
    console.error('❌ [SmartDeploy] Erreur analyse:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'analyse du workflow',
      details: error.message 
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
    
    // Récupérer le workflow depuis la base de données
    const workflow = await db.getWorkflowById(workflowId, req.user.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }
    
    // Récupérer le workflow JSON depuis n8n
    const n8nResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.n8n_workflow_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${req.headers.authorization.split(' ')[1]}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!n8nResponse.ok) {
      return res.status(404).json({ error: 'Workflow non trouvé dans n8n' });
    }
    
    const workflowJson = await n8nResponse.json();
    
    // Injecter les credentials utilisateur
    console.log('🔧 [SmartDeploy] Injection des credentials...');
    const injectedWorkflow = await injectUserCredentials(workflowJson, credentials, req.user.id);
    
    // Créer un nouveau workflow dans n8n avec les credentials injectés
    console.log('🔧 [SmartDeploy] Création du workflow dans n8n...');
    const deployResponse = await fetch('http://localhost:3004/api/n8n/workflows', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.headers.authorization.split(' ')[1]}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${workflow.name} - ${req.user.email}`,
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
    
    // Enregistrer le workflow déployé dans la base de données
    const userWorkflow = await db.createUserWorkflow({
      user_id: req.user.id,
      workflow_id: workflow.id,
      n8n_workflow_id: deployedWorkflow.id,
      name: `${workflow.name} - ${req.user.email}`,
      status: 'active'
    });
    
    console.log('✅ [SmartDeploy] Workflow déployé avec succès:', deployedWorkflow.id);
    
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
    
    // Récupérer les workflows visibles pour l'utilisateur
    const workflows = await db.getTemplates(req.user.id, req.user.role);
    
    console.log('✅ [SmartDeploy] Workflows trouvés:', workflows.length);
    
    res.json({
      success: true,
      workflows: workflows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        created_at: workflow.created_at
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
