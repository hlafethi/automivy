/**
 * Route simple pour la planification des workflows
 * Utilise le script schedule-workflows.js
 */

const express = require('express');
const router = express.Router();
const { scheduleUserWorkflow, unscheduleUserWorkflow, scheduleDirectWebhook } = require('../scripts/schedule-workflows');
const { authenticateToken } = require('../middleware/auth');

/**
 * Planifier un workflow
 */
router.post('/schedule-workflow', authenticateToken, async (req, res) => {
  try {
    console.log('🕐 [Schedule] Planification demandée:', req.body);
    
    const { userId, n8nWorkflowId, schedule, userWorkflowId } = req.body;
    
    if (!userId || !n8nWorkflowId || !schedule) {
      return res.status(400).json({ error: 'userId, n8nWorkflowId et schedule requis' });
    }
    
    console.log('🕐 [Schedule] Paramètres:', { userId, n8nWorkflowId, schedule, userWorkflowId });
    
    await scheduleUserWorkflow(userId, n8nWorkflowId, schedule, userWorkflowId);
    
    console.log('✅ [Schedule] Workflow planifié avec webhook unique');
    res.json({ 
      success: true, 
      message: 'Workflow planifié avec succès',
      schedule 
    });
    
  } catch (error) {
    console.error('❌ [Schedule] Erreur:', error);
    res.status(500).json({ error: error.message || 'Erreur planification' });
  }
});

/**
 * Annuler la planification
 */
router.delete('/schedule-workflow/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await unscheduleUserWorkflow(userId);
    
    console.log('✅ [Schedule] Planification annulée');
    res.json({ 
      success: true, 
      message: 'Planification annulée' 
    });
    
  } catch (error) {
    console.error('❌ [Schedule] Erreur annulation:', error);
    res.status(500).json({ error: error.message || 'Erreur annulation' });
  }
});

/**
 * Planifier directement un webhook
 */
router.post('/schedule-direct-webhook', authenticateToken, async (req, res) => {
  try {
    const { userId, webhookUrl, schedule } = req.body;
    
    if (!userId || !webhookUrl || !schedule) {
      return res.status(400).json({ error: 'Missing required parameters: userId, webhookUrl, schedule' });
    }

    console.log('🕐 [Schedule] Planification directe demandée:', { userId, webhookUrl, schedule });

    scheduleDirectWebhook(userId, webhookUrl, schedule);

    res.json({ success: true, message: `Webhook ${webhookUrl} scheduled for ${schedule}` });
  } catch (error) {
    console.error('Error scheduling direct webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
