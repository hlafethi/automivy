const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Envoyer un message au workflow MCP via webhook
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { workflowId, webhookPath, message, sessionId } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message requis'
      });
    }

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: 'Workflow ID requis'
      });
    }

    logger.info('💬 [McpChat] Envoi de message', {
      workflowId,
      userId,
      messageLength: message.length,
      sessionId
    });

    // Récupérer le workflow depuis la base de données
    const workflowResult = await db.query(
      'SELECT n8n_workflow_id, webhook_path FROM user_workflows WHERE id = $1 AND user_id = $2',
      [workflowId, userId]
    );

    if (workflowResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow non trouvé'
      });
    }

    const workflow = workflowResult.rows[0];
    const n8nWorkflowId = workflow.n8n_workflow_id;
    const finalWebhookPath = webhookPath || workflow.webhook_path || `mcp-chat-${workflowId}`;

    // Construire l'URL du webhook n8n
    const n8nUrl = config.n8n.url;
    const webhookUrl = `${n8nUrl}/webhook/${finalWebhookPath}`;

    logger.debug('🔗 [McpChat] URL webhook:', webhookUrl);

    // Préparer le payload
    const payload = {
      message: message.trim(),
      sessionId: sessionId || `mcp-${workflowId}-${userId}`,
      userId: userId,
      timestamp: new Date().toISOString()
    };
    
    logger.debug('📤 [McpChat] Payload envoyé:', JSON.stringify(payload, null, 2));

    // Envoyer le message au webhook n8n
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    logger.debug('📥 [McpChat] Réponse webhook reçue:', {
      status: webhookResponse.status,
      statusText: webhookResponse.statusText,
      headers: Object.fromEntries(webhookResponse.headers.entries())
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      logger.error('❌ [McpChat] Erreur webhook n8n:', {
        status: webhookResponse.status,
        error: errorText
      });

      return res.status(webhookResponse.status).json({
        success: false,
        error: 'Erreur lors de l\'envoi au workflow',
        details: errorText
      });
    }

    // Récupérer la réponse du workflow
    // D'abord lire le texte brut, puis essayer de parser en JSON
    const textResponse = await webhookResponse.text();
    let responseData;
    let responseText = '';
    
    try {
      responseData = JSON.parse(textResponse);
      // Extraire la réponse de différentes structures possibles
      responseText = responseData.response || 
                     responseData.message || 
                     responseData.output || 
                     responseData.text ||
                     responseData.data?.response ||
                     responseData.data?.message ||
                     responseData.data?.output ||
                     (typeof responseData === 'string' ? responseData : '');
    } catch (parseError) {
      // Si la réponse n'est pas du JSON valide, utiliser le texte brut
      responseText = textResponse || 'Message envoyé avec succès';
      responseData = { response: responseText };
    }
    
    // Si aucune réponse n'a été trouvée, essayer d'extraire depuis le body
    if (!responseText && responseData.body) {
      if (typeof responseData.body === 'string') {
        try {
          const bodyParsed = JSON.parse(responseData.body);
          responseText = bodyParsed.response || bodyParsed.message || bodyParsed.output || '';
        } catch (e) {
          responseText = responseData.body;
        }
      } else {
        responseText = responseData.body.response || responseData.body.message || responseData.body.output || '';
      }
    }
    
    // Si toujours aucune réponse, utiliser un message par défaut
    if (!responseText || responseText.trim() === '') {
      responseText = 'Message traité avec succès';
    }

    logger.info('✅ [McpChat] Message envoyé avec succès', {
      workflowId,
      hasResponse: !!responseText,
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 100)
    });

    res.json({
      success: true,
      response: responseText,
      message: responseText, // Alias pour compatibilité
      data: responseData
    });

  } catch (error) {
    logger.error('❌ [McpChat] Erreur:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du message',
      details: error.message
    });
  }
});

module.exports = router;

