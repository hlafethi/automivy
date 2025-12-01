// Routes pour l'AI Generator amélioré
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const EnhancedAIGenerator = require('../services/enhancedAIGenerator');
const ApplicationContextService = require('../services/applicationContextService');
const N8nNodeValidator = require('../services/n8nNodeValidator');
const logger = require('../utils/logger');

const router = express.Router();

  // Générer un workflow intelligent avec contexte
  router.post('/generate-intelligent', authenticateToken, async (req, res) => {
    try {
      // Modèle par défaut : openai/gpt-4o-mini (bon rapport performance/prix, très peu cher)
      const { description, aiProvider = 'openrouter', aiModel = 'openai/gpt-4o-mini' } = req.body;
      
      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Description du workflow requise'
        });
      }
      
      logger.info('Génération intelligente demandée', { description, aiProvider, aiModel, userId: req.user.id });
      
      // Générer le workflow intelligent
      const workflow = await EnhancedAIGenerator.generateIntelligentWorkflow(description, aiProvider, aiModel);
    
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
          description,
          aiProvider
        }
      }
    });
    
  } catch (error) {
    logger.error('Erreur lors de la génération intelligente', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du workflow intelligent',
      details: error.message || 'Erreur inconnue'
    });
  }
});

// Générer un workflow optimisé pour l'utilisateur
router.post('/generate-optimized', authenticateToken, async (req, res) => {
  try {
    const { description, aiProvider = 'openrouter' } = req.body;
    const userId = req.user.id;
    
    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Description du workflow requise'
      });
    }
    
    logger.info('Génération optimisée demandée', { userId, description });
    
    // Générer le workflow optimisé
    const workflow = await EnhancedAIGenerator.generateOptimizedWorkflow(description, userId, aiProvider);
    
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
          description,
          aiProvider,
          userId,
          optimized: true
        }
      }
    });
    
  } catch (error) {
    logger.error('Erreur lors de la génération optimisée', {
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

// Valider un workflow
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow à valider requis'
      });
    }
    
    logger.debug('Validation du workflow', { userId: req.user.id });
    
    const validation = N8nNodeValidator.validateWorkflow(workflow);
    
    res.json({
      success: true,
      data: {
        validation,
        metadata: {
          validatedAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    logger.error('Erreur lors de la validation', {
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

// Corriger un workflow
router.post('/fix', authenticateToken, async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow à corriger requis'
      });
    }
    
    logger.info('Correction du workflow', { userId: req.user.id });
    
    const fixedWorkflow = N8nNodeValidator.fixWorkflow(workflow);
    const validation = N8nNodeValidator.validateWorkflow(fixedWorkflow);
    
    res.json({
      success: true,
      data: {
        originalWorkflow: workflow,
        fixedWorkflow,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: validation.suggestions
        },
        metadata: {
          fixedAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    logger.error('Erreur lors de la correction', {
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

module.exports = router;
