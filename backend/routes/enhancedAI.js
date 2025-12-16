// Routes pour l'AI Generator Ultimate - Le meilleur générateur de workflows au monde
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const UltimateAIGenerator = require('../services/ultimateAIGenerator');
const ApplicationContextService = require('../services/applicationContextService');
const AdvancedWorkflowValidator = require('../services/advancedWorkflowValidator');
const logger = require('../utils/logger');

// Nouveau générateur PARFAIT
const PerfectAIGenerator = require('../services/perfectAIGenerator');
const PerfectWorkflowValidator = require('../services/perfectWorkflowValidator');
const PerfectN8nNodesRegistry = require('../services/perfectN8nNodesRegistry');
const EnhancedAIGenerator = require('../services/enhancedAIGenerator');

const router = express.Router();

  // Générer un workflow intelligent avec le système Ultimate
  router.post('/generate-intelligent', authenticateToken, async (req, res) => {
    try {
      const { description, aiProvider = 'openrouter', aiModel = 'openai/gpt-4o-mini' } = req.body;
      
      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Description du workflow requise'
        });
      }
      
      logger.info('🚀 Génération Ultimate demandée', { description: description.substring(0, 100), aiProvider, aiModel, userId: req.user.id });
      
      // Utiliser le nouveau générateur Ultimate
      const result = await UltimateAIGenerator.generateWorkflow(description, {
        aiProvider,
        aiModel,
        userId: req.user.id,
        includeContext: true
      });
      
      // Valider avec le validateur avancé
      const validation = AdvancedWorkflowValidator.validateAndFix(result.workflow);
    
    res.json({
      success: true,
      data: {
        workflow: validation.fixedWorkflow || result.workflow,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          fixes: validation.fixes
        },
        analysis: result.analysis,
        metadata: {
          ...result.metadata,
          userId: req.user.id
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la génération Ultimate', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du workflow',
      details: error.message || 'Erreur inconnue'
    });
  }
});

// Générer un workflow optimisé pour l'utilisateur
router.post('/generate-optimized', authenticateToken, async (req, res) => {
  try {
    const { description, aiProvider = 'openrouter', aiModel = 'openai/gpt-4o-mini' } = req.body;
    const userId = req.user.id;
    
    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Description du workflow requise'
      });
    }
    
    logger.info('🎯 Génération optimisée demandée', { userId, description: description.substring(0, 100) });
    
    // Utiliser le générateur Ultimate avec options optimisées
    const result = await UltimateAIGenerator.generateWorkflow(description, {
      aiProvider,
      aiModel,
      userId,
      includeContext: true,
      maxRetries: 3
    });
    
    // Valider avec le validateur avancé
    const validation = AdvancedWorkflowValidator.validateAndFix(result.workflow);
    
    res.json({
      success: true,
      data: {
        workflow: validation.fixedWorkflow || result.workflow,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          fixes: validation.fixes
        },
        analysis: result.analysis,
        metadata: {
          ...result.metadata,
          userId,
          optimized: true
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la génération optimisée', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du workflow optimisé',
      details: error.message
    });
  }
});

// Générer un workflow basé sur un template existant
router.post('/generate-from-template', authenticateToken, async (req, res) => {
  try {
    const { templateId, customizations = {} } = req.body;
    
    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'ID du template requis'
      });
    }
    
    logger.info('Génération depuis template', { templateId, userId: req.user.id });
    
    // Générer le workflow depuis le template
    const workflow = await EnhancedAIGenerator.generateFromTemplate(templateId, customizations);
    
    // Valider le workflow final
    const validation = N8nNodeValidator.validateWorkflow(workflow);
    
    res.json({
      success: true,
      data: {
        workflow,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: validation.suggestions
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          templateId,
          customizations
        }
      }
    });
    
  } catch (error) {
    logger.error('Erreur lors de la génération depuis template', {
      error: error.message,
      stack: error.stack,
      templateId: req.body?.templateId,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération depuis le template',
      details: error.message
    });
  }
});

// Obtenir le contexte de l'application
router.get('/context', authenticateToken, async (req, res) => {
  try {
    logger.debug('Récupération du contexte de l\'application', { userId: req.user.id });
    
    const context = await ApplicationContextService.getFullContext();
    
    res.json({
      success: true,
      data: {
        context,
        metadata: {
          retrievedAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    logger.error('Erreur lors de la récupération du contexte', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du contexte',
      details: error.message
    });
  }
});

// Valider un workflow avec le validateur avancé
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow à valider requis'
      });
    }
    
    logger.debug('🔍 Validation avancée du workflow', { userId: req.user.id });
    
    const validation = AdvancedWorkflowValidator.validateAndFix(workflow);
    
    res.json({
      success: true,
      data: {
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          fixes: validation.fixes
        },
        fixedWorkflow: validation.fixedWorkflow,
        metadata: {
          validatedAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la validation', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation du workflow',
      details: error.message
    });
  }
});

// Corriger automatiquement un workflow
router.post('/fix', authenticateToken, async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow à corriger requis'
      });
    }
    
    logger.info('🔧 Correction avancée du workflow', { userId: req.user.id });
    
    const result = AdvancedWorkflowValidator.validateAndFix(workflow);
    
    res.json({
      success: true,
      data: {
        originalWorkflow: result.originalWorkflow,
        fixedWorkflow: result.fixedWorkflow,
        validation: {
          valid: result.valid,
          errors: result.errors,
          warnings: result.warnings,
          fixes: result.fixes
        },
        metadata: {
          fixedAt: new Date().toISOString(),
          totalFixes: result.fixes.length
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la correction', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la correction du workflow',
      details: error.message
    });
  }
});

// Nouvelle route: Générer rapidement un workflow email
router.post('/generate-email-summary', authenticateToken, async (req, res) => {
  try {
    const { schedule, emailCount, aiModel } = req.body;
    
    logger.info('📧 Génération rapide workflow email', { userId: req.user.id });
    
    const result = await UltimateAIGenerator.generateEmailSummaryWorkflow({
      schedule,
      emailCount,
      aiModel
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('❌ Erreur génération email workflow', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Nouvelle route: Générer rapidement une newsletter
router.post('/generate-newsletter', authenticateToken, async (req, res) => {
  try {
    const { schedule, rssUrl, articleCount, aiModel } = req.body;
    
    logger.info('📰 Génération rapide newsletter', { userId: req.user.id });
    
    const result = await UltimateAIGenerator.generateNewsletterWorkflow({
      schedule,
      rssUrl,
      articleCount,
      aiModel
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('❌ Erreur génération newsletter', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Nouvelle route: Obtenir les nœuds disponibles
router.get('/nodes', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    
    let nodes;
    if (category) {
      nodes = UltimateAIGenerator.getNodesByCategory(category);
    } else {
      nodes = UltimateAIGenerator.getAvailableNodes();
    }
    
    res.json({
      success: true,
      data: {
        nodes,
        categories: ['trigger', 'email', 'ai', 'data', 'http', 'content', 'database', 'productivity', 'files']
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur récupération nœuds', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Nouvelle route: Obtenir les nœuds recommandés pour un cas d'usage
router.get('/recommended-nodes/:useCase', authenticateToken, async (req, res) => {
  try {
    const { useCase } = req.params;
    
    const nodes = UltimateAIGenerator.getRecommendedNodes(useCase);
    
    res.json({
      success: true,
      data: {
        useCase,
        recommendedNodes: nodes
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur récupération nœuds recommandés', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOUVELLES ROUTES: Générateur PARFAIT avec validation exhaustive
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Génère un workflow PARFAIT avec le nouveau générateur
 * Garantit :
 * - AUCUN nœud oublié
 * - TOUS les nœuds sont compatibles n8n
 * - TOUTES les connexions sont valides
 * - TOUS les paramètres requis sont présents
 */
router.post('/generate-perfect', authenticateToken, async (req, res) => {
  try {
    const { description, aiModel = 'openai/gpt-4o-mini' } = req.body;
    
    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Description du workflow requise'
      });
    }
    
    logger.info('🚀 Génération PARFAITE demandée', { 
      description: description.substring(0, 100), 
      aiModel, 
      userId: req.user.id 
    });
    
    // Utiliser le générateur PARFAIT
    const workflow = await PerfectAIGenerator.generateWorkflow(description, aiModel);
    
    // Valider une dernière fois avec le validateur parfait
    const validationResult = PerfectWorkflowValidator.validate(workflow);
    
    res.json({
      success: true,
      data: {
        workflow,
        validation: {
          valid: validationResult.valid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
          stats: validationResult.stats
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          generator: 'PerfectAIGenerator',
          model: aiModel,
          userId: req.user.id
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la génération PARFAITE', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du workflow parfait',
      details: error.message
    });
  }
});

/**
 * Valide un workflow avec le validateur PARFAIT (ultra-strict)
 */
router.post('/validate-perfect', authenticateToken, async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow à valider requis'
      });
    }
    
    logger.debug('🔍 Validation PARFAITE du workflow', { userId: req.user.id });
    
    const validation = PerfectWorkflowValidator.validate(workflow);
    
    res.json({
      success: true,
      data: {
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: validation.suggestions,
          stats: validation.stats
        },
        metadata: {
          validatedAt: new Date().toISOString(),
          validator: 'PerfectWorkflowValidator'
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la validation PARFAITE', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation du workflow',
      details: error.message
    });
  }
});

/**
 * Corrige automatiquement un workflow avec le système PARFAIT
 */
router.post('/fix-perfect', authenticateToken, async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow à corriger requis'
      });
    }
    
    logger.info('🔧 Correction PARFAITE du workflow', { userId: req.user.id });
    
    const result = PerfectWorkflowValidator.validateAndFix(workflow);
    
    res.json({
      success: true,
      data: {
        originalWorkflow: workflow,
        fixedWorkflow: result.workflow,
        validation: {
          valid: result.valid,
          errors: result.report.errors,
          warnings: result.report.warnings,
          fixes: result.report.fixes,
          stats: result.report.stats
        },
        metadata: {
          fixedAt: new Date().toISOString(),
          totalFixes: result.report.fixes?.length || 0,
          validator: 'PerfectWorkflowValidator'
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la correction PARFAITE', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la correction du workflow',
      details: error.message
    });
  }
});

/**
 * Obtient tous les nœuds n8n valides du registre PARFAIT
 */
router.get('/nodes-registry', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    
    let nodes;
    if (category) {
      nodes = PerfectN8nNodesRegistry.getNodesByCategory(category);
    } else {
      nodes = PerfectN8nNodesRegistry.getAllNodes();
    }
    
    const allTypes = PerfectN8nNodesRegistry.getAllValidTypes();
    
    res.json({
      success: true,
      data: {
        nodes,
        totalCount: allTypes.length,
        categories: ['trigger', 'email', 'ai', 'data', 'http', 'content', 'database', 'productivity', 'files', 'flow'],
        allTypes
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur récupération registre nœuds', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Vérifie si un type de nœud est valide
 */
router.get('/validate-node-type/:nodeType', authenticateToken, async (req, res) => {
  try {
    const { nodeType } = req.params;
    
    const exists = PerfectN8nNodesRegistry.nodeExists(decodeURIComponent(nodeType));
    const nodeInfo = PerfectN8nNodesRegistry.getNode(decodeURIComponent(nodeType));
    const suggestion = !exists ? PerfectN8nNodesRegistry.findClosestMatch(decodeURIComponent(nodeType)) : null;
    
    res.json({
      success: true,
      data: {
        nodeType: decodeURIComponent(nodeType),
        valid: exists,
        nodeInfo,
        suggestion
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur validation type nœud', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Génère un workflow simple pour un cas d'usage prédéfini
 */
router.post('/generate-simple', authenticateToken, async (req, res) => {
  try {
    const { useCase } = req.body;
    
    if (!useCase) {
      return res.status(400).json({
        success: false,
        error: 'Cas d\'usage requis',
        availableUseCases: ['email-summary', 'newsletter', 'webhook-api', 'slack-notification', 'cv-screening']
      });
    }
    
    logger.info('🎯 Génération simple demandée', { useCase, userId: req.user.id });
    
    const workflow = await PerfectAIGenerator.generateSimpleWorkflow(useCase);
    
    res.json({
      success: true,
      data: {
        workflow,
        metadata: {
          generatedAt: new Date().toISOString(),
          useCase,
          generator: 'PerfectAIGenerator'
        }
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur génération simple', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
