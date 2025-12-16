/**
 * Route simple pour la planification des workflows
 * Utilise le script schedule-workflows.js
 */

const express = require('express');
const router = express.Router();
const { scheduleUserWorkflow, unscheduleUserWorkflow, scheduleDirectWebhook } = require('../scripts/schedule-workflows');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { sendSuccess, sendError, sendValidationError } = require('../utils/apiResponse');

/**
 * Planifier un workflow
 */
router.post('/schedule-workflow', authenticateToken, async (req, res) => {
  try {
    logger.info('Planification demandée', { body: req.body });
    
    const { userId, n8nWorkflowId, schedule, userWorkflowId } = req.body;
    
    if (!userId || !n8nWorkflowId || !schedule) {
      return sendValidationError(res, 'userId, n8nWorkflowId et schedule requis');
    }
    
    // Validation du format de l'heure (HH:MM)
    const scheduleRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!scheduleRegex.test(schedule)) {
      return sendValidationError(res, 'Format d\'heure invalide. Utilisez HH:MM (ex: 09:30)');
    }
    
    logger.debug('Paramètres de planification', { userId, n8nWorkflowId, schedule, userWorkflowId });
    
    await scheduleUserWorkflow(userId, n8nWorkflowId, schedule, userWorkflowId);
    
    logger.info('Workflow planifié avec succès', { userId, n8nWorkflowId, schedule });
    return sendSuccess(res, { 
      message: 'Workflow planifié avec succès',
      schedule 
    });
    
  } catch (error) {
    logger.error('Erreur lors de la planification', { 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });
    
    // Messages d'erreur plus clairs pour l'utilisateur
    let userMessage = error.message;
    if (error.message.includes('n\'est pas actif')) {
      userMessage = 'Le workflow n\'est pas actif dans n8n. Veuillez l\'activer (bouton ON) avant de planifier.';
    } else if (error.message.includes('Webhook non trouvé') || error.message.includes('404')) {
      userMessage = 'Le webhook du workflow n\'est pas accessible. Vérifiez que le workflow est actif dans n8n et que le path du webhook est correct.';
    } else if (error.message.includes('Aucun nœud webhook')) {
      userMessage = 'Le workflow ne contient pas de nœud Webhook. Ajoutez un nœud Webhook au workflow dans n8n.';
    }
    
    return sendError(res, userMessage, error.message, { 
      userId: req.body.userId,
      n8nWorkflowId: req.body.n8nWorkflowId 
    }, 500);
  }
});

/**
 * Annuler la planification
 */
router.delete('/schedule-workflow/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await unscheduleUserWorkflow(userId);
    
    logger.info('Planification annulée', { userId });
    return sendSuccess(res, { message: 'Planification annulée' });
    
  } catch (error) {
    logger.error('Erreur lors de l\'annulation', { 
      error: error.message, 
      userId: req.params.userId 
    });
    return sendError(res, 'Erreur lors de l\'annulation de la planification', error.message, { userId: req.params.userId }, 500);
  }
});

/**
 * Planifier directement un webhook
 */
router.post('/schedule-direct-webhook', authenticateToken, async (req, res) => {
  try {
    const { userId, webhookUrl, schedule, n8nWorkflowId } = req.body;
    
    if (!userId || !webhookUrl || !schedule) {
      return sendValidationError(res, 'Paramètres requis manquants: userId, webhookUrl, schedule');
    }

    // Validation du format de l'heure
    const scheduleRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!scheduleRegex.test(schedule)) {
      return sendValidationError(res, 'Format d\'heure invalide. Utilisez HH:MM (ex: 09:30)');
    }

    // Validation de l'URL webhook
    try {
      new URL(webhookUrl);
    } catch (urlError) {
      return sendValidationError(res, 'URL webhook invalide');
    }

    logger.info('Planification directe demandée', { userId, webhookUrl, schedule, n8nWorkflowId, skipValidation: req.body.skipValidation });

    await scheduleDirectWebhook(userId, webhookUrl, schedule, req.body.skipValidation === true, n8nWorkflowId || null);

    return sendSuccess(res, { 
      message: `Webhook planifié pour ${schedule}`,
      webhookUrl,
      schedule 
    });
  } catch (error) {
    logger.error('Erreur lors de la planification directe', { 
      error: error.message, 
      body: req.body 
    });
    return sendError(res, 'Erreur lors de la planification du webhook', error.message, { userId: req.body.userId }, 500);
  }
});

module.exports = router;
