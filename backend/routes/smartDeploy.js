const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const { analyzeWorkflowCredentials, generateDynamicForm } = require('../services/workflowAnalyzer');
const { deployWorkflow } = require('../services/deployments');
const db = require('../database');
const logger = require('../utils/logger');

/**
 * Analyser un workflow et retourner le formulaire dynamique
 * POST /api/smart-deploy/analyze
 */
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    logger.debug('Analyse du workflow demandée', { user: req.user.email });
    
    const { workflowId } = req.body;
    
    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID requis' });
    }
    
    logger.debug('Recherche du template', { workflowId, userId: req.user.id });
    
    const template = await db.getTemplateByIdForUser(workflowId, req.user.id);
    
    if (!template) {
      logger.warn('Template non trouvé', { workflowId, userId: req.user.id });
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    logger.info('Template trouvé', { templateName: template.name, templateId: template.id });
    
    // Utiliser le workflow JSON du template
    let workflowJson;
    try {
      workflowJson = typeof template.json === 'string'
        ? JSON.parse(template.json)
        : template.json;
      logger.debug('JSON parsé avec succès');
    } catch (parseErr) {
      logger.error('Erreur parsing JSON workflow', { error: parseErr.message, templateId: template.id });
      return res.status(400).json({ 
        error: 'JSON du workflow invalide', 
        details: parseErr.message,
        templateId: template.id
      });
    }
    
    if (!workflowJson) {
      logger.error('Template JSON manquant après parsing', { templateId: template.id });
      return res.status(500).json({ error: 'Template JSON manquant' });
    }
    
    // Analyser les credentials requis (passer le templateId pour exclure IMAP si nécessaire)
    let requiredCredentials;
    try {
      requiredCredentials = analyzeWorkflowCredentials(workflowJson, template.id);
      logger.info('Credentials analysés', { count: requiredCredentials.length });
    } catch (analyzeErr) {
      logger.error('Erreur analyse des credentials', { error: analyzeErr.message, templateId: template.id });
      return res.status(400).json({ 
        error: 'Erreur analyse credentials', 
        details: analyzeErr.message,
        templateId: template.id
      });
    }
    
    // Générer le formulaire dynamique
    const formConfig = generateDynamicForm(requiredCredentials);
    
    logger.success('Analyse terminée', { credentialsCount: requiredCredentials.length });
    
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
    logger.error('Erreur analyse du workflow', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
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
    logger.info('Déploiement intelligent demandé', { user: req.user.email });
    
    const { workflowId, credentials } = req.body;
    
    if (!workflowId || !credentials) {
      return res.status(400).json({ error: 'Workflow ID et credentials requis' });
    }
    
    // Récupérer le template depuis la base de données
    const template = await db.getTemplateByIdForUser(workflowId, req.user.id);
    
    if (!template) {
      logger.error('Template non trouvé', { workflowId, userId: req.user.id });
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    
    logger.info('Template trouvé', { templateName: template.name, templateId: template.id });
    
    // Vérifier que l'ID correspond bien
    if (template.id !== workflowId) {
      logger.error('Template ID mismatch', { requestedId: workflowId, foundId: template.id });
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
    
    logger.success('Déploiement réussi', { workflowId, templateName: template.name });
    res.json(result);
    
  } catch (error) {
    logger.error('Erreur déploiement du workflow', { 
      error: error.message, 
      stack: error.stack,
      workflowId: req.body?.workflowId,
      userId: req.user?.id 
    });
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
    logger.debug('Récupération des workflows disponibles', { 
      user: req.user.email, 
      role: req.user.role 
    });
    
    // Récupérer les templates visibles pour l'utilisateur
    const templates = await db.getTemplates(req.user.id, req.user.role);
    
    logger.info('Templates trouvés', { count: templates.length });
    
    const workflows = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      created_at: template.created_at
    }));
    
    logger.debug('Workflows retournés', { count: workflows.length });
    
    res.json({
      success: true,
      workflows: workflows
    });
    
  } catch (error) {
    logger.error('Erreur récupération workflows', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des workflows',
      details: error.message 
    });
  }
});

module.exports = router;

