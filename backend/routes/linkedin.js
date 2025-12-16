const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const config = require('../config');
const logger = require('../utils/logger');
const fetch = require('node-fetch');

/**
 * Déclencher la génération d'un post LinkedIn
 * POST /api/linkedin/generate-post
 */
router.post('/generate-post', authenticateToken, async (req, res) => {
  try {
    const { workflowId, theme } = req.body;
    const userId = req.user.id;
    
    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId requis'
      });
    }
    
    if (!theme || !theme.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Le thème du post est requis'
      });
    }
    
    logger.info('🚀 [LinkedIn] Déclenchement génération post', { 
      workflowId, 
      theme: theme.substring(0, 50),
      userId 
    });
    
    // Récupérer le workflow de l'utilisateur
    const userWorkflow = await db.query(
      'SELECT n8n_workflow_id, webhook_path, name, is_active FROM user_workflows WHERE id = $1 AND user_id = $2',
      [workflowId, userId]
    );
    
    if (userWorkflow.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow non trouvé'
      });
    }
    
    const workflow = userWorkflow.rows[0];
    
    // Vérifier que c'est bien un workflow LinkedIn
    if (!workflow.name || !workflow.name.toLowerCase().includes('linkedin')) {
      return res.status(400).json({
        success: false,
        error: 'Ce workflow n\'est pas un workflow LinkedIn'
      });
    }
    
    // Vérifier que le workflow est actif
    if (!workflow.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Le workflow n\'est pas actif. Veuillez l\'activer avant de générer un post.'
      });
    }
    
    // Récupérer le webhook path du workflow
    const webhookPath = workflow.webhook_path;
    
    if (!webhookPath) {
      return res.status(400).json({
        success: false,
        error: 'Webhook non configuré pour ce workflow'
      });
    }
    
    // Vérifier que le workflow est actif dans n8n
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    if (workflow.n8n_workflow_id) {
      try {
        const workflowCheckResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflow.n8n_workflow_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': n8nApiKey
          }
        });
        
        if (workflowCheckResponse.ok) {
          const workflowData = await workflowCheckResponse.json();
          if (!workflowData.active) {
            logger.warn('⚠️ [LinkedIn] Workflow n8n non actif, tentative d\'activation...', {
              n8nWorkflowId: workflow.n8n_workflow_id
            });
            
            // Essayer d'activer le workflow
            const activateResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflow.n8n_workflow_id}/activate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': n8nApiKey
              }
            });
            
            if (!activateResponse.ok) {
              logger.error('❌ [LinkedIn] Impossible d\'activer le workflow n8n');
              return res.status(400).json({
                success: false,
                error: 'Le workflow n\'est pas actif dans n8n et n\'a pas pu être activé automatiquement'
              });
            }
          }
        }
      } catch (checkError) {
        logger.warn('⚠️ [LinkedIn] Erreur vérification workflow n8n:', checkError.message);
        // Continuer quand même, peut-être que le workflow fonctionne
      }
    }
    
    // Déclencher le workflow via le webhook
    const webhookUrl = `${n8nUrl}/webhook/${webhookPath}`;
    
    logger.info('📡 [LinkedIn] Appel webhook pour génération post', { 
      webhookUrl,
      webhookPath,
      n8nWorkflowId: workflow.n8n_workflow_id,
      theme: theme.substring(0, 50)
    });
    
    // n8n webhook attend le body directement en JSON
    // Le body sera accessible via $json dans le workflow n8n
    const webhookPayload = {
      theme: theme.trim(),
      userId: userId,
      userEmail: req.user.email,
      triggeredBy: req.user.email,
      timestamp: new Date().toISOString()
    };
    
    logger.debug('📤 [LinkedIn] Payload webhook:', JSON.stringify(webhookPayload, null, 2));
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      logger.error('❌ [LinkedIn] Erreur webhook:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        error: errorText,
        webhookUrl
      });
      
      // Si c'est une erreur 500, essayer de récupérer plus d'infos depuis n8n
      if (webhookResponse.status === 500 && workflow.n8n_workflow_id) {
        try {
          const workflowInfoResponse = await fetch(`${n8nUrl}/api/v1/workflows/${workflow.n8n_workflow_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey
            }
          });
          
          if (workflowInfoResponse.ok) {
            const workflowInfo = await workflowInfoResponse.json();
            logger.error('❌ [LinkedIn] État du workflow n8n:', {
              active: workflowInfo.active,
              nodesCount: workflowInfo.nodes?.length,
              hasWebhook: workflowInfo.nodes?.some(n => n.type === 'n8n-nodes-base.webhook')
            });
          }
        } catch (infoError) {
          logger.warn('⚠️ [LinkedIn] Impossible de récupérer les infos du workflow:', infoError.message);
        }
      }
      
      throw new Error(`Erreur webhook: ${webhookResponse.status} - ${errorText}`);
    }
    
    const webhookResult = await webhookResponse.json().catch(() => ({}));
    
    logger.info('✅ [LinkedIn] Génération post déclenchée avec succès', { 
      workflowId,
      theme: theme.substring(0, 50)
    });
    
    res.json({
      success: true,
      message: 'Génération du post LinkedIn déclenchée avec succès',
      data: webhookResult
    });
    
  } catch (error) {
    logger.error('❌ [LinkedIn] Erreur déclenchement génération post:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déclenchement de la génération',
      message: error.message
    });
  }
});

/**
 * Récupérer les posts LinkedIn de l'utilisateur depuis NocoDB
 * GET /api/linkedin/posts
 */
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.info('📋 [LinkedIn] Récupération des posts', { userId });
    
    // Récupérer le token NocoDB depuis admin_api_keys ou .env
    let nocoDbApiToken = null;
    let nocoDbBaseUrl = process.env.NOCODB_BASE_URL || 'https://noco.example.com';
    
    try {
      const nocoDbCreds = await db.query(
        'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
        ['nocodb_api_token']
      );
      
      if (nocoDbCreds.rows.length > 0) {
        nocoDbApiToken = nocoDbCreds.rows[0].api_key;
      }
    } catch (dbError) {
      logger.warn('⚠️ [LinkedIn] Erreur récupération NocoDB token depuis BDD:', dbError.message);
    }
    
    // Fallback vers .env
    if (!nocoDbApiToken) {
      nocoDbApiToken = process.env.NOCODB_API_TOKEN;
    }
    
    if (!nocoDbApiToken) {
      return res.status(500).json({
        success: false,
        error: 'NocoDB non configuré. L\'administrateur doit configurer NOCODB_API_TOKEN.'
      });
    }
    
    // Récupérer les informations de table de l'utilisateur
    // Chaque utilisateur a ses propres tables : posts_user_{userIdShort}
    const userIdShort = userId.substring(0, 8).replace(/-/g, '');
    const postsTableName = `posts_user_${userIdShort}`;
    
    // Récupérer l'ID de la base NocoDB depuis l'environnement ou utiliser la base par défaut
    const nocoDbBaseId = process.env.NOCODB_BASE_ID || 'base_id';
    
    // Construire l'URL de l'API NocoDB pour récupérer les tables
    // Format: https://noco.example.com/api/v2/meta/bases/{baseId}/tables
    const nocoDbApiUrl = `${nocoDbBaseUrl}/api/v2/meta/bases/${nocoDbBaseId}/tables`;
    
    logger.info('🔍 [LinkedIn] Recherche de la table NocoDB', { 
      tableName: postsTableName,
      baseUrl: nocoDbBaseUrl,
      baseId: nocoDbBaseId,
      userId: userIdShort
    });
    
    // Récupérer toutes les tables de la base pour trouver celle de l'utilisateur
    const tablesResponse = await fetch(nocoDbApiUrl, {
      method: 'GET',
      headers: {
        'xc-token': nocoDbApiToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!tablesResponse.ok) {
      const errorText = await tablesResponse.text();
      logger.error('❌ [LinkedIn] Erreur récupération tables NocoDB:', errorText);
      
      // Si la base n'existe pas ou erreur, retourner une liste vide
      if (tablesResponse.status === 404 || tablesResponse.status === 403) {
        logger.info('ℹ️ [LinkedIn] Base ou tables NocoDB non trouvées (première utilisation)', { 
          tableName: postsTableName,
          userId 
        });
        return res.json({
          success: true,
          data: [],
          message: 'Aucun post généré pour le moment. La table sera créée automatiquement lors de la première génération.'
        });
      }
      
      throw new Error(`Erreur NocoDB: ${tablesResponse.status} - ${errorText}`);
    }
    
    // Trouver la table de l'utilisateur
    const tables = await tablesResponse.json();
    const userTable = Array.isArray(tables) 
      ? tables.find(t => 
          t.table_name === postsTableName || 
          t.title === postsTableName ||
          (t.table_name && t.table_name.toLowerCase().includes(postsTableName.toLowerCase()))
        )
      : null;
    
    if (!userTable) {
      // Si la table n'existe pas encore, retourner une liste vide
      logger.info('ℹ️ [LinkedIn] Table NocoDB non trouvée pour l\'utilisateur (première utilisation)', { 
        tableName: postsTableName,
        userId,
        availableTables: Array.isArray(tables) ? tables.map(t => t.table_name || t.title) : []
      });
      return res.json({
        success: true,
        data: [],
        message: 'Aucun post généré pour le moment. La table sera créée automatiquement lors de la première génération.'
      });
    }
    
    // Récupérer les posts depuis la table de l'utilisateur
    // Format: https://noco.example.com/api/v2/tables/{tableId}/records
    const recordsUrl = `${nocoDbBaseUrl}/api/v2/tables/${userTable.id}/records`;
    
    // Filtrer par userId pour s'assurer de l'isolation (même si la table est déjà isolée)
    const recordsResponse = await fetch(`${recordsUrl}?where=(userId,eq,${userId})`, {
      method: 'GET',
      headers: {
        'xc-token': nocoDbApiToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!recordsResponse.ok) {
      const errorText = await recordsResponse.text();
      logger.error('❌ [LinkedIn] Erreur récupération posts NocoDB:', errorText);
      
      // Si pas de posts ou erreur, retourner une liste vide
      if (recordsResponse.status === 404) {
        return res.json({
          success: true,
          data: [],
          message: 'Aucun post généré pour le moment'
        });
      }
      
      throw new Error(`Erreur récupération posts: ${recordsResponse.status} - ${errorText}`);
    }
    
    const recordsData = await recordsResponse.json();
    const posts = Array.isArray(recordsData.list) 
      ? recordsData.list.map(record => ({
          id: record.Id || record.id,
          theme: record.theme || record.Theme || '',
          content: record.content || record.Content || '',
          status: record.status || record.Status || 'pending',
          createdAt: record.CreatedAt || record.created_at || record.createdAt,
          publishedAt: record.PublishedAt || record.published_at || record.publishedAt,
          linkedinPostId: record.linkedinPostId || record.LinkedInPostId || null
        }))
      : [];
    
    // Trier par date de création (plus récent en premier)
    posts.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    logger.info('✅ [LinkedIn] Posts récupérés avec succès', { 
      count: posts.length,
      userId 
    });
    
    res.json({
      success: true,
      data: posts,
      count: posts.length
    });
    
  } catch (error) {
    logger.error('❌ [LinkedIn] Erreur récupération posts:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des posts',
      message: error.message
    });
  }
});

module.exports = router;

