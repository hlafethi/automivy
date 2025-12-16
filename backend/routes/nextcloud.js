const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const logger = require('../utils/logger');
const { sendSuccess, sendError, sendValidationError } = require('../utils/apiResponse');

/**
 * Lister les dossiers Nextcloud d'un utilisateur
 * POST /api/nextcloud/list-folders
 */
router.post('/list-folders', authenticateToken, async (req, res) => {
  try {
    const { workflowId, path = '/' } = req.body;
    
    if (!workflowId) {
      return sendValidationError(res, 'workflowId requis');
    }
    
    logger.info('📁 [Nextcloud] Listing dossiers', { workflowId, path, userId: req.user.id });
    
    // Récupérer le workflow de l'utilisateur pour obtenir les credentials
    const userWorkflow = await db.getUserWorkflowById(workflowId, req.user.id);
    
    if (!userWorkflow) {
      return sendError(res, 'Workflow non trouvé', null, { workflowId }, 404);
    }
    
    // Récupérer les credentials Nextcloud depuis la table dédiée
    const nextcloudCredentials = await db.getNextcloudCredentials(workflowId);
    
    if (!nextcloudCredentials || !nextcloudCredentials.nextcloud_url) {
      logger.warn('⚠️ [Nextcloud] Credentials non trouvés pour ce workflow');
      return sendError(res, 'Credentials Nextcloud non configurés. Veuillez redéployer le workflow.', null, { workflowId }, 400);
    }
    
    logger.debug('📁 [Nextcloud] Credentials récupérés', { 
      url: nextcloudCredentials.nextcloud_url,
      username: nextcloudCredentials.nextcloud_username
    });
    
    // Construire l'URL WebDAV
    const baseUrl = nextcloudCredentials.nextcloud_url.replace(/\/$/, '');
    const webdavUrl = `${baseUrl}/remote.php/dav/files/${nextcloudCredentials.nextcloud_username}${path}`;
    
    logger.debug('📁 [Nextcloud] Appel WebDAV', { webdavUrl });
    
    // Appeler l'API WebDAV pour lister les dossiers
    const response = await fetch(webdavUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          nextcloudCredentials.nextcloud_username + ':' + nextcloudCredentials.nextcloud_password
        ).toString('base64'),
        'Depth': '1',
        'Content-Type': 'application/xml'
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:resourcetype/>
            <d:displayname/>
          </d:prop>
        </d:propfind>`
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ [Nextcloud] Erreur WebDAV', { 
        status: response.status, 
        statusText: response.statusText,
        body: errorText.substring(0, 500)
      });
      throw new Error(`Erreur de connexion Nextcloud: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Parser le XML pour extraire les dossiers
    const folders = parseWebDAVResponse(xmlText, path, nextcloudCredentials.nextcloud_username);
    
    logger.info('✅ [Nextcloud] Dossiers listés', { count: folders.length, path });
    
    return sendSuccess(res, {
      folders,
      currentPath: path,
      sourceFolder: nextcloudCredentials.source_folder,
      destinationFolder: nextcloudCredentials.destination_folder
    });
    
  } catch (error) {
    logger.error('❌ [Nextcloud] Erreur listing dossiers', { 
      error: error.message,
      stack: error.stack 
    });
    return sendError(res, 'Erreur lors du listing des dossiers', error.message);
  }
});

/**
 * Sauvegarder les credentials Nextcloud pour un workflow existant
 * POST /api/nextcloud/save-credentials
 */
router.post('/save-credentials', authenticateToken, async (req, res) => {
  try {
    const { workflowId, nextcloudUrl, nextcloudUsername, nextcloudPassword } = req.body;
    
    if (!workflowId) {
      return sendValidationError(res, 'workflowId requis');
    }
    
    if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword) {
      return sendValidationError(res, 'URL, nom d\'utilisateur et mot de passe Nextcloud requis');
    }
    
    logger.info('💾 [Nextcloud] Sauvegarde credentials', { 
      workflowId, 
      url: nextcloudUrl,
      username: nextcloudUsername,
      userId: req.user.id 
    });
    
    // Vérifier que le workflow appartient à l'utilisateur
    const userWorkflow = await db.getUserWorkflowById(workflowId, req.user.id);
    
    if (!userWorkflow) {
      return sendError(res, 'Workflow non trouvé', null, { workflowId }, 404);
    }
    
    // Tester la connexion avant de sauvegarder
    const baseUrl = nextcloudUrl.replace(/\/$/, '');
    const testUrl = `${baseUrl}/remote.php/dav/files/${nextcloudUsername}/`;
    
    logger.debug('🔍 [Nextcloud] Test connexion', { testUrl });
    
    try {
      const testResponse = await fetch(testUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(nextcloudUsername + ':' + nextcloudPassword).toString('base64'),
          'Depth': '0'
        }
      });
      
      if (!testResponse.ok) {
        logger.error('❌ [Nextcloud] Échec test connexion', { 
          status: testResponse.status, 
          statusText: testResponse.statusText 
        });
        return sendError(res, 'Impossible de se connecter à Nextcloud. Vérifiez vos identifiants.', 
          `Code: ${testResponse.status}`, null, 401);
      }
    } catch (connError) {
      logger.error('❌ [Nextcloud] Erreur connexion', { error: connError.message });
      return sendError(res, 'Impossible de se connecter au serveur Nextcloud. Vérifiez l\'URL.', 
        connError.message, null, 400);
    }
    
    // Sauvegarder les credentials
    await db.saveNextcloudCredentials(workflowId, {
      nextcloudUrl,
      nextcloudUsername,
      nextcloudPassword
    });
    
    logger.info('✅ [Nextcloud] Credentials sauvegardés', { workflowId });
    
    return sendSuccess(res, {
      message: 'Credentials Nextcloud sauvegardés avec succès'
    });
    
  } catch (error) {
    logger.error('❌ [Nextcloud] Erreur sauvegarde credentials', { 
      error: error.message,
      stack: error.stack 
    });
    return sendError(res, 'Erreur lors de la sauvegarde des credentials', error.message);
  }
});

/**
 * Déclencher le tri des dossiers sélectionnés
 * POST /api/nextcloud/trigger-sort
 */
router.post('/trigger-sort', authenticateToken, async (req, res) => {
  try {
    const { workflowId, folders, userId } = req.body;
    
    if (!workflowId) {
      return sendValidationError(res, 'workflowId requis');
    }
    
    if (!folders || folders.length === 0) {
      return sendValidationError(res, 'Au moins un dossier doit être sélectionné');
    }
    
    logger.info('🚀 [Nextcloud] Déclenchement du tri', { 
      workflowId, 
      folders, 
      userId: req.user.id 
    });
    
    // Récupérer le workflow de l'utilisateur
    const userWorkflow = await db.getUserWorkflowById(workflowId, req.user.id);
    
    if (!userWorkflow) {
      return sendError(res, 'Workflow non trouvé', null, { workflowId }, 404);
    }
    
    // Récupérer le webhook path du workflow
    const webhookPath = userWorkflow.webhook_path;
    
    if (!webhookPath) {
      return sendError(res, 'Webhook non configuré pour ce workflow', null, { workflowId }, 400);
    }
    
    // Déclencher le workflow via le webhook
    const n8nUrl = process.env.N8N_URL || 'https://n8n.heleam.com';
    const webhookUrl = `${n8nUrl}/webhook/${webhookPath}`;
    
    logger.info('📡 [Nextcloud] Appel webhook', { webhookUrl, folders });
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'sort',
        folders: folders,
        triggeredBy: req.user.email,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      throw new Error(`Erreur webhook: ${webhookResponse.status} - ${errorText}`);
    }
    
    const webhookResult = await webhookResponse.json().catch(() => ({}));
    
    logger.info('✅ [Nextcloud] Tri déclenché avec succès', { 
      workflowId, 
      foldersCount: folders.length 
    });
    
    return sendSuccess(res, {
      message: 'Tri déclenché avec succès',
      folders: folders,
      webhookResult
    });
    
  } catch (error) {
    logger.error('❌ [Nextcloud] Erreur déclenchement tri', { 
      error: error.message,
      stack: error.stack 
    });
    return sendError(res, 'Erreur lors du déclenchement du tri', error.message);
  }
});

/**
 * Parser la réponse WebDAV pour extraire les dossiers
 * Supporte les namespaces d: et D: utilisés par différents serveurs Nextcloud
 */
function parseWebDAVResponse(xmlText, basePath, username) {
  const folders = [];
  
  // Log pour debug
  console.log('🔍 [Nextcloud] Parsing WebDAV response, length:', xmlText.length);
  
  // Regex pour supporter les deux formats de namespace (d: et D:)
  // Format 1: <d:response>...</d:response>
  // Format 2: <D:response>...</D:response>
  const responseRegex = /<[dD]:response>([\s\S]*?)<\/[dD]:response>/gi;
  const hrefRegex = /<[dD]:href>(.*?)<\/[dD]:href>/i;
  const collectionRegex = /<[dD]:collection\s*\/?>/i;
  const displayNameRegex = /<[dD]:displayname>(.*?)<\/[dD]:displayname>/i;
  
  // Aussi supporter le format sans namespace (certains serveurs)
  const responseRegexNoNs = /<response>([\s\S]*?)<\/response>/gi;
  const hrefRegexNoNs = /<href>(.*?)<\/href>/i;
  const collectionRegexNoNs = /<collection\s*\/?>/i;
  const displayNameRegexNoNs = /<displayname>(.*?)<\/displayname>/i;
  
  // Fonction pour extraire les dossiers d'un response XML
  const extractFolder = (responseXml, hrefRx, collRx, dispRx) => {
    // Vérifier si c'est un dossier (collection)
    if (collRx.test(responseXml)) {
      const hrefMatch = hrefRx.exec(responseXml);
      if (hrefMatch) {
        const href = decodeURIComponent(hrefMatch[1]);
        
        // Extraire le chemin relatif
        const baseDavPath = `/remote.php/dav/files/${username}`;
        let relativePath = href.replace(baseDavPath, '').replace(/\/$/, '');
        
        // Si le chemin est vide, c'est la racine
        if (!relativePath) relativePath = '/';
        
        // Ignorer le dossier courant (basePath)
        const normalizedBasePath = basePath === '/' ? '' : basePath.replace(/\/$/, '');
        if (relativePath !== normalizedBasePath && relativePath !== '/') {
          const dispMatch = dispRx.exec(responseXml);
          const name = dispMatch ? dispMatch[1] : relativePath.split('/').filter(Boolean).pop();
          
          return {
            path: relativePath,
            name: name || relativePath.split('/').filter(Boolean).pop() || 'root',
            isDirectory: true
          };
        }
      }
    }
    return null;
  };
  
  // Essayer avec namespace d:/D:
  let match;
  while ((match = responseRegex.exec(xmlText)) !== null) {
    const folder = extractFolder(match[1], hrefRegex, collectionRegex, displayNameRegex);
    if (folder) folders.push(folder);
  }
  
  // Si rien trouvé, essayer sans namespace
  if (folders.length === 0) {
    while ((match = responseRegexNoNs.exec(xmlText)) !== null) {
      const folder = extractFolder(match[1], hrefRegexNoNs, collectionRegexNoNs, displayNameRegexNoNs);
      if (folder) folders.push(folder);
    }
  }
  
  console.log('✅ [Nextcloud] Parsed folders:', folders.length, folders.slice(0, 3).map(f => f.name));
  
  return folders;
}

module.exports = router;


