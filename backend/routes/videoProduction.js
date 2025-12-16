const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const logger = require('../utils/logger');
const fetch = require('node-fetch');
const config = require('../config');

// Limite quotidienne par utilisateur
// TODO: Remettre à 1 après validation du template
const DAILY_LIMIT = 999; // Illimité temporairement pour tests

/**
 * Vérifier la limite quotidienne de l'utilisateur
 * GET /api/video-production/check-limit/:workflowId
 */
router.get('/check-limit/:workflowId', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const userId = req.user.id;
    
    logger.debug('🎬 Vérification limite quotidienne', { userId, workflowId });
    
    // Compter les exécutions d'aujourd'hui pour cet utilisateur et ce workflow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM video_production_logs 
      WHERE user_id = $1 
        AND workflow_id = $2 
        AND created_at >= $3
    `, [userId, workflowId, today]);
    
    const usedToday = parseInt(result.rows[0]?.count || '0');
    const canCreate = usedToday < DAILY_LIMIT;
    
    // Calculer le prochain reset (minuit)
    const nextReset = new Date(today);
    nextReset.setDate(nextReset.getDate() + 1);
    
    logger.info('🎬 Limite quotidienne vérifiée', { userId, usedToday, limit: DAILY_LIMIT, canCreate });
    
    res.json({
      success: true,
      data: {
        canCreate,
        usedToday,
        limit: DAILY_LIMIT,
        nextResetAt: nextReset.toISOString()
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur vérification limite', { error: error.message });
    
    // Si la table n'existe pas, la créer et retourner canCreate: true
    if (error.message.includes('does not exist')) {
      await createVideoProductionLogsTable();
      return res.json({
        success: true,
        data: {
          canCreate: true,
          usedToday: 0,
          limit: DAILY_LIMIT,
          nextResetAt: new Date(Date.now() + 86400000).toISOString()
        }
      });
    }
    
    res.status(500).json({ error: 'Erreur lors de la vérification de la limite' });
  }
});

/**
 * Déclencher la production d'une vidéo
 * POST /api/video-production/trigger
 */
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const { workflowId, webhookPath, theme } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    logger.info('🎬 Demande de production vidéo', { userId, workflowId, theme });
    
    if (!theme || !theme.trim()) {
      return res.status(400).json({ error: 'Le thème est requis' });
    }
    
    // Vérifier la limite quotidienne
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      const limitResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM video_production_logs 
        WHERE user_id = $1 
          AND workflow_id = $2 
          AND created_at >= $3
      `, [userId, workflowId, today]);
      
      const usedToday = parseInt(limitResult.rows[0]?.count || '0');
      
      if (usedToday >= DAILY_LIMIT) {
        return res.status(429).json({ 
          error: 'Limite quotidienne atteinte',
          message: `Vous avez déjà créé ${usedToday} vidéo(s) aujourd'hui. Limite: ${DAILY_LIMIT} par jour.`
        });
      }
    } catch (dbError) {
      // Si la table n'existe pas, la créer
      if (dbError.message.includes('does not exist')) {
        await createVideoProductionLogsTable();
      }
    }
    
    // Récupérer le webhook du workflow
    let webhookUrl;
    
    if (webhookPath) {
      // Utiliser le webhook path fourni
      webhookUrl = `${config.n8n.webhookUrl || config.n8n.url}/webhook/${webhookPath}`;
    } else {
      // Récupérer depuis la base de données
      const workflowResult = await db.query(`
        SELECT webhook_path, n8n_workflow_id 
        FROM user_workflows 
        WHERE id = $1 OR template_id = $1
      `, [workflowId]);
      
      if (workflowResult.rows.length > 0 && workflowResult.rows[0].webhook_path) {
        webhookUrl = `${config.n8n.webhookUrl || config.n8n.url}/webhook/${workflowResult.rows[0].webhook_path}`;
      } else {
        return res.status(404).json({ error: 'Webhook non trouvé pour ce workflow' });
      }
    }
    
    logger.debug('🎬 Déclenchement webhook', { webhookUrl, theme });
    
    // Déclencher le webhook n8n avec le thème
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: theme.trim(),
        userId,
        userEmail,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      logger.error('❌ Erreur webhook n8n', { status: webhookResponse.status, error: errorText });
      throw new Error(`Erreur déclenchement workflow: ${webhookResponse.status}`);
    }
    
    // Enregistrer l'exécution
    await db.query(`
      INSERT INTO video_production_logs (user_id, workflow_id, theme, status)
      VALUES ($1, $2, $3, 'triggered')
    `, [userId, workflowId, theme.trim()]);
    
    logger.info('✅ Production vidéo lancée', { userId, workflowId, theme });
    
    res.json({
      success: true,
      message: 'Production vidéo lancée avec succès',
      data: {
        theme: theme.trim(),
        status: 'triggered',
        webhookUrl
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur production vidéo', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'Erreur lors du lancement de la production' });
  }
});

/**
 * Créer la table de logs si elle n'existe pas
 */
async function createVideoProductionLogsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS video_production_logs (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        workflow_id TEXT NOT NULL,
        theme TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_video_logs_user_workflow 
      ON video_production_logs(user_id, workflow_id)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_video_logs_created 
      ON video_production_logs(created_at)
    `);
    
    logger.info('✅ Table video_production_logs créée');
  } catch (error) {
    logger.error('❌ Erreur création table video_production_logs', { error: error.message });
  }
}

module.exports = router;

