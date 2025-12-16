// Injecteur spécifique pour le template "Production Vidéo IA"
// Ce template nécessite :
// - Google Drive OAuth2 pour l'upload des vidéos
// - OpenRouter (admin) pour l'IA

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials } = require('../n8nService');
const db = require('../../database');
const logger = require('../../utils/logger');

/**
 * Injecte les credentials utilisateur pour le template Production Vidéo IA
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  logger.info('🎬 [VideoProductionInjector] Injection spécifique pour Production Vidéo IA...');
  logger.debug('🎬 [VideoProductionInjector] Template ID:', templateId);
  logger.debug('🎬 [VideoProductionInjector] Template Name:', templateName);
  
  // Générer un webhook unique
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    const templateIdShort = templateId.replace(/-/g, '').substring(0, 8);
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);
    uniqueWebhookPath = `video-prod-${templateIdShort}-${userIdShort}`;
    logger.debug('🔧 [VideoProductionInjector] Webhook unique généré:', uniqueWebhookPath);
  }
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow, templateId);
  logger.debug('🔧 [VideoProductionInjector] Credentials requis:', requiredCredentials.length);
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  const createdCredentials = {};
  
  // Récupérer les credentials admin (OpenRouter, SMTP)
  logger.info('🔍 [VideoProductionInjector] Récupération des credentials admin...');
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    logger.info('✅ [VideoProductionInjector] Credentials admin récupérés:', {
      hasOpenRouter: !!adminCreds.OPENROUTER_ID,
      openRouterId: adminCreds.OPENROUTER_ID || 'NON TROUVÉ',
      openRouterName: adminCreds.OPENROUTER_NAME || 'NON TROUVÉ',
      hasSmtp: !!adminCreds.SMTP_ID,
      smtpId: adminCreds.SMTP_ID || 'NON TROUVÉ',
      smtpName: adminCreds.SMTP_NAME || 'NON TROUVÉ'
    });
  } catch (error) {
    logger.error('❌ [VideoProductionInjector] Erreur credentials admin:', error.message);
  }
  
  // Récupérer le credential Google Drive OAuth2 de l'utilisateur
  for (const credConfig of requiredCredentials) {
    if (credConfig.type === 'googleDriveOAuth2') {
      logger.debug('🔍 [VideoProductionInjector] Recherche credential Google Drive OAuth2...');
      const oauthCreds = await db.getOAuthCredentials(userId, 'google_drive');
      
      if (oauthCreds && oauthCreds.length > 0 && oauthCreds[0].n8n_credential_id) {
        createdCredentials.googleDriveOAuth2 = {
          id: oauthCreds[0].n8n_credential_id,
          name: `Google Drive - ${oauthCreds[0].email || 'user'}`
        };
        logger.info('✅ [VideoProductionInjector] Credential Google Drive OAuth2 récupéré:', createdCredentials.googleDriveOAuth2.id);
      } else if (userCredentials.googleDriveOAuth2 === 'connected') {
        // Attendre un peu si l'utilisateur vient de se connecter
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryOauthCreds = await db.getOAuthCredentials(userId, 'google_drive');
        if (retryOauthCreds && retryOauthCreds.length > 0 && retryOauthCreds[0].n8n_credential_id) {
          createdCredentials.googleDriveOAuth2 = {
            id: retryOauthCreds[0].n8n_credential_id,
            name: `Google Drive - ${retryOauthCreds[0].email || 'user'}`
          };
          logger.info('✅ [VideoProductionInjector] Credential Google Drive OAuth2 récupéré après connexion');
        }
      } else {
        logger.error('❌ [VideoProductionInjector] Aucun credential Google Drive OAuth2 trouvé');
      }
    }
  }
  
  // Remplacer les placeholders OpenRouter (plusieurs formats possibles)
  if (adminCreds.OPENROUTER_ID) {
    // Format 1: Placeholders standard
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_ID"/g,
      `"${adminCreds.OPENROUTER_ID}"`
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_NAME"/g,
      `"${adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'}"`
    );
    
    // Format 2: Placeholder OPENAI_API_KEY (utilisé par LangChain)
    workflowString = workflowString.replace(
      /"OPENAI_API_KEY"/g,
      `"${adminCreds.OPENROUTER_ID}"`
    );
    
    // Format 3: Supprimer COMPLÈTEMENT le bloc openai_api_key des options
    // Ce placeholder cause des erreurs car n8n essaie de l'utiliser
    // Regex pour matcher tout le bloc openai_api_key avec sa structure LangChain
    workflowString = workflowString.replace(
      /"openai_api_key"\s*:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*,?/g,
      ''
    );
    
    // Nettoyer les virgules doubles ou trailing
    workflowString = workflowString.replace(/,\s*,/g, ',');
    workflowString = workflowString.replace(/,\s*\}/g, '}');
    workflowString = workflowString.replace(/\{\s*,/g, '{');
    
    logger.info('✅ [VideoProductionInjector] Placeholders OpenRouter et openai_api_key supprimés');
  }
  
  // Remplacer les placeholders Google Drive
  if (createdCredentials.googleDriveOAuth2) {
    workflowString = workflowString.replace(
      /"USER_GOOGLE_DRIVE_CREDENTIAL_ID"/g,
      `"${createdCredentials.googleDriveOAuth2.id}"`
    );
    workflowString = workflowString.replace(
      /"USER_GOOGLE_DRIVE_CREDENTIAL_NAME"/g,
      `"${createdCredentials.googleDriveOAuth2.name}"`
    );
    
    // Remplacer le folder ID si fourni
    if (userCredentials.googleDriveFolderId) {
      workflowString = workflowString.replace(
        /"USER_GOOGLE_DRIVE_FOLDER_ID"/g,
        `"${userCredentials.googleDriveFolderId}"`
      );
    }
    logger.debug('✅ [VideoProductionInjector] Placeholders Google Drive remplacés');
  }
  
  // Parser le workflow
  const injectedWorkflow = JSON.parse(workflowString);
  
  // Injecter les credentials dans les nœuds et nettoyer les propriétés non autorisées
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      // ⚠️ IMPORTANT: Ne garder que les propriétés autorisées par n8n
      const allowedProperties = [
        'id', 'name', 'type', 'typeVersion', 'position', 'parameters', 
        'credentials', 'disabled', 'notes', 'notesInFlow', 'webhookId',
        'alwaysOutputData', 'continueOnFail', 'executeOnce', 'retryOnFail',
        'maxTries', 'waitBetweenTries', 'onError'
      ];
      
      const cleanedNode = {};
      for (const key of allowedProperties) {
        if (node[key] !== undefined) {
          cleanedNode[key] = node[key];
        }
      }
      
      // S'assurer que les propriétés essentielles existent
      if (!cleanedNode.id) cleanedNode.id = node.id || `node-${Date.now()}`;
      if (!cleanedNode.name) cleanedNode.name = node.name || 'Node';
      if (!cleanedNode.type) cleanedNode.type = node.type;
      if (!cleanedNode.position) cleanedNode.position = node.position || [0, 0];
      if (!cleanedNode.parameters) cleanedNode.parameters = node.parameters || {};
      if (cleanedNode.typeVersion === undefined) cleanedNode.typeVersion = node.typeVersion || 1;
      
      // Nœuds Google Drive - assigner le credential utilisateur (API type correct)
      if (node.type === 'n8n-nodes-base.googleDrive') {
        if (createdCredentials.googleDriveOAuth2) {
          cleanedNode.credentials = {
            ...cleanedNode.credentials,
            googleDriveOAuth2Api: {  // ⚠️ n8n utilise googleDriveOAuth2Api, pas googleDriveOAuth2
              id: createdCredentials.googleDriveOAuth2.id,
              name: createdCredentials.googleDriveOAuth2.name
            }
          };
          logger.info(`✅ [VideoProductionInjector] Credential Google Drive OAuth2 API assigné à ${node.name}`);
        } else {
          logger.warn(`⚠️ [VideoProductionInjector] Pas de credential Google Drive pour ${node.name}`);
        }
      }
      
      // Nœuds AI/LLM - assigner SEULEMENT le credential OpenRouter admin (ne pas toucher aux paramètres)
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
          node.type === '@n8n/n8n-nodes-langchain.agent' ||
          node.name?.toLowerCase().includes('openrouter') ||
          node.name?.toLowerCase().includes('llm')) {
        if (adminCreds.OPENROUTER_ID) {
          // SEULEMENT assigner le credential, ne pas modifier les paramètres
          cleanedNode.credentials = {
            ...cleanedNode.credentials,
            openRouterApi: {
              id: adminCreds.OPENROUTER_ID,
              name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
            }
          };
          logger.info(`✅ [VideoProductionInjector] Credential OpenRouter assigné à ${node.name}`);
        }
      }
      
      // Nœuds HTTP Request vers OpenRouter
      if (node.type === 'n8n-nodes-base.httpRequest' && 
          (node.parameters?.url?.includes('openrouter.ai') || 
           node.name?.toLowerCase().includes('openrouter'))) {
        if (adminCreds.OPENROUTER_ID) {
          cleanedNode.credentials = {
            ...cleanedNode.credentials,
            httpHeaderAuth: {
              id: adminCreds.OPENROUTER_ID,
              name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
            }
          };
          logger.info(`✅ [VideoProductionInjector] Credential HTTP OpenRouter assigné à ${node.name}`);
        }
      }
      
      // Nœuds Email Send - assigner le credential SMTP admin
      if (node.type === 'n8n-nodes-base.emailSend' || 
          node.type === 'n8n-nodes-base.smtp' ||
          node.name?.toLowerCase().includes('email') ||
          node.name?.toLowerCase().includes('notification')) {
        if (adminCreds.SMTP_ID) {
          cleanedNode.credentials = {
            ...cleanedNode.credentials,
            smtp: {
              id: adminCreds.SMTP_ID,
              name: adminCreds.SMTP_NAME || 'SMTP Admin'
            }
          };
          logger.info(`✅ [VideoProductionInjector] Credential SMTP Admin assigné à ${node.name}`);
        }
      }
      
      // Nœuds TTS (Synthèse Vocale) - configurer avec OpenAI TTS (clé directe, pas de credential)
      if (node.name?.toLowerCase().includes('tts') || 
          node.name?.toLowerCase().includes('synthèse') ||
          node.name?.toLowerCase().includes('vocale')) {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey && node.type === 'n8n-nodes-base.httpRequest') {
          // Supprimer tout credential existant (on utilise le header directement)
          delete cleanedNode.credentials;
          
          // Configurer pour OpenAI TTS API avec clé directe dans le header
          cleanedNode.parameters = {
            ...cleanedNode.parameters,
            method: 'POST',
            url: 'https://api.openai.com/v1/audio/speech',
            authentication: 'none',
            sendHeaders: true,
            specifyHeaders: 'keypair',
            headerParameters: {
              parameters: [
                { name: 'Authorization', value: `Bearer ${openaiApiKey}` },
                { name: 'Content-Type', value: 'application/json' }
              ]
            },
            sendBody: true,
            specifyBody: 'json',
            jsonBody: JSON.stringify({
              model: 'tts-1',
              input: '={{ $json.output || $json.script || $json.text }}',
              voice: 'alloy',
              response_format: 'mp3'
            }),
            options: {
              response: {
                response: {
                  responseFormat: 'file'
                }
              }
            }
          };
          logger.info(`✅ [VideoProductionInjector] Nœud TTS configuré avec OpenAI API (clé directe)`);
        }
      }
      
      // Nœuds Médias/Images - configurer avec API de génération d'images
      // Ce nœud utilise DALL-E pour générer des images, il nécessite une clé OpenAI (pas OpenRouter)
      if (node.name?.toLowerCase().includes('média') || 
          node.name?.toLowerCase().includes('media') ||
          node.name?.toLowerCase().includes('image') ||
          node.name?.toLowerCase().includes('récupération') ||
          node.name?.toLowerCase().includes('téléchargement')) {
        
        // Priorité: OPENAI_API_KEY > OPENROUTER_API_KEY (via Together AI) > Pexels
        const openaiApiKey = process.env.OPENAI_API_KEY;
        const openrouterApiKey = process.env.OPENROUTER_API_KEY;
        const pexelsApiKey = process.env.PEXELS_API_KEY;
        
        logger.debug(`🖼️ [VideoProductionInjector] Nœud image détecté: "${node.name}" (type: ${node.type})`);
        logger.debug(`🖼️ [VideoProductionInjector] Clés disponibles - OpenAI: ${openaiApiKey ? 'OUI (sk-proj-...)' : 'NON'}, OpenRouter: ${openrouterApiKey ? 'OUI' : 'NON'}, Pexels: ${pexelsApiKey ? 'OUI' : 'NON'}`);
        
        if (node.type === 'n8n-nodes-base.httpRequest' || node.type === 'n8n-nodes-base.executeWorkflow') {
          // Si c'est un Execute Workflow, le convertir en HTTP Request
          if (node.type === 'n8n-nodes-base.executeWorkflow') {
            cleanedNode.type = 'n8n-nodes-base.httpRequest';
            cleanedNode.typeVersion = 4.2;
          }
          
          // Supprimer tout credential existant
          delete cleanedNode.credentials;
          
          if (openaiApiKey) {
            // Option 1: Utiliser DALL-E (OpenAI direct)
            cleanedNode.parameters = {
              method: 'POST',
              url: 'https://api.openai.com/v1/images/generations',
              authentication: 'none',
              sendHeaders: true,
              specifyHeaders: 'keypair',
              headerParameters: {
                parameters: [
                  { name: 'Authorization', value: `Bearer ${openaiApiKey}` },
                  { name: 'Content-Type', value: 'application/json' }
                ]
              },
              sendBody: true,
              specifyBody: 'json',
              jsonBody: JSON.stringify({
                model: 'dall-e-3',
                prompt: '={{ $json.prompt || $json.visual_description || $json.description || "A beautiful scene" }}',
                n: 1,
                size: '1024x1024',
                response_format: 'url'
              }),
              options: {}
            };
            logger.info(`✅ [VideoProductionInjector] Nœud Médias configuré avec DALL-E API (clé OpenAI directe)`);
          } else if (openrouterApiKey) {
            // Option 2: Utiliser Flux via OpenRouter (Together AI)
            cleanedNode.parameters = {
              method: 'POST',
              url: 'https://openrouter.ai/api/v1/images/generations',
              authentication: 'none',
              sendHeaders: true,
              specifyHeaders: 'keypair',
              headerParameters: {
                parameters: [
                  { name: 'Authorization', value: `Bearer ${openrouterApiKey}` },
                  { name: 'Content-Type', value: 'application/json' },
                  { name: 'HTTP-Referer', value: 'https://automivy.com' },
                  { name: 'X-Title', value: 'Automivy Video Production' }
                ]
              },
              sendBody: true,
              specifyBody: 'json',
              jsonBody: JSON.stringify({
                model: 'black-forest-labs/flux-schnell',
                prompt: '={{ $json.prompt || $json.visual_description || $json.description || "A beautiful scene" }}',
                n: 1,
                size: '1024x1024'
              }),
              options: {}
            };
            logger.info(`✅ [VideoProductionInjector] Nœud Médias configuré avec Flux via OpenRouter`);
          } else if (pexelsApiKey) {
            // Option 3: Utiliser Pexels pour des images de stock
            cleanedNode.parameters = {
              method: 'GET',
              url: '={{ "https://api.pexels.com/v1/search?query=" + encodeURIComponent($json.prompt || $json.visual_description || $json.description || "nature") + "&per_page=1" }}',
              authentication: 'none',
              sendHeaders: true,
              specifyHeaders: 'keypair',
              headerParameters: {
                parameters: [
                  { name: 'Authorization', value: pexelsApiKey }
                ]
              },
              options: {}
            };
            logger.info(`✅ [VideoProductionInjector] Nœud Médias configuré avec Pexels (images stock)`);
          } else {
            logger.warn(`⚠️ [VideoProductionInjector] Aucune clé API d'image disponible (OPENAI_API_KEY, OPENROUTER_API_KEY ou PEXELS_API_KEY). Nœud ${node.name} non configuré.`);
          }
        }
      }
      
      // Nœuds Execute Command avec FFmpeg - corriger la syntaxe invalide
      // Le problème: {{$file("audio.mp3")}} n'est pas une syntaxe valide n8n
      // Solution: Convertir en nœud Code qui appelle l'API FFmpeg du backend
      // (Le nœud Code n8n bloque les modules natifs comme child_process, fs, etc.)
      if (node.type === 'n8n-nodes-base.executeCommand' && 
          (node.name?.toLowerCase().includes('ffmpeg') || 
           node.name?.toLowerCase().includes('montage') ||
           node.parameters?.command?.includes('ffmpeg'))) {
        
        logger.info(`🎬 [VideoProductionInjector] Correction du nœud FFmpeg: "${node.name}"`);
        
        // URL de l'API FFmpeg du backend
        const backendUrl = process.env.BACKEND_URL || 'https://automivy.globalsaas.eu';
        const ffmpegApiUrl = `${backendUrl}/api/ffmpeg/merge`;
        
        // Convertir en nœud Code qui appelle l'API FFmpeg via HTTP
        cleanedNode.type = 'n8n-nodes-base.code';
        cleanedNode.typeVersion = 2;
        
        // Code JavaScript qui appelle l'API FFmpeg du backend
        const ffmpegCode = `// Montage vidéo via API FFmpeg Automivy
// Ce code envoie les fichiers audio/média à l'API backend pour le montage

const items = $input.all();

// Chercher les données binaires
let audioData = null;
let mediaData = null;

for (const item of items) {
  if (item.binary) {
    for (const [key, binaryItem] of Object.entries(item.binary)) {
      if (binaryItem.mimeType?.includes('audio') || key.includes('audio') || key.includes('speech') || key === 'data') {
        audioData = binaryItem;
      }
      if (binaryItem.mimeType?.includes('video') || binaryItem.mimeType?.includes('image') || key.includes('media') || key.includes('video')) {
        mediaData = binaryItem;
      }
    }
  }
}

if (!audioData) {
  throw new Error('Fichier audio non trouvé dans les données d\\'entrée');
}

// Préparer le body pour l'API
const requestBody = {
  audio: {
    data: audioData.data,
    mimeType: audioData.mimeType,
    fileName: audioData.fileName || 'audio.mp3'
  }
};

if (mediaData) {
  requestBody.media = {
    data: mediaData.data,
    mimeType: mediaData.mimeType,
    fileName: mediaData.fileName || 'media.mp4'
  };
}

// Appeler l'API FFmpeg via fetch
const response = await fetch('${ffmpegApiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});

const responseData = await response.json();

if (!responseData.success) {
  throw new Error(\`Erreur FFmpeg: \${responseData.error}\`);
}

// Retourner le fichier vidéo
return [{
  json: {
    success: true,
    message: 'Montage vidéo réussi',
    fileSize: responseData.video.fileSize,
    processingTime: responseData.processingTime
  },
  binary: {
    data: {
      data: responseData.video.data,
      mimeType: responseData.video.mimeType,
      fileName: responseData.video.fileName,
      fileExtension: responseData.video.fileExtension
    }
  }
}];`;
        
        cleanedNode.parameters = {
          jsCode: ffmpegCode,
          mode: 'runOnceForAllItems'
        };
        
        // Supprimer les credentials (pas nécessaire pour le nœud Code)
        delete cleanedNode.credentials;
        
        logger.info(`✅ [VideoProductionInjector] Nœud FFmpeg converti pour utiliser l'API backend`);
      }
      
      return cleanedNode;
    });
  }
  
  // Gérer les webhooks
  if (uniqueWebhookPath) {
    const webhookNodes = injectedWorkflow.nodes?.filter(n => 
      n.type === 'n8n-nodes-base.webhook' || n.type === 'n8n-nodes-base.webhookTrigger'
    );
    if (webhookNodes && webhookNodes.length > 0) {
      webhookNodes.forEach(node => {
        if (node.parameters) {
          node.parameters.path = uniqueWebhookPath;
          logger.debug(`✅ [VideoProductionInjector] Webhook path mis à jour pour ${node.name}`);
        }
      });
    }
  }
  
  // Log récapitulatif des credentials assignés
  const credentialsSummary = {
    nodesTotal: injectedWorkflow.nodes?.length || 0,
    nodesWithCredentials: injectedWorkflow.nodes?.filter(n => n.credentials && Object.keys(n.credentials).length > 0).length || 0,
    googleDrive: createdCredentials.googleDriveOAuth2 ? createdCredentials.googleDriveOAuth2.id : 'NON ASSIGNÉ',
    openRouter: adminCreds.OPENROUTER_ID || 'NON ASSIGNÉ',
    smtp: adminCreds.SMTP_ID || 'NON ASSIGNÉ',
    webhookPath: uniqueWebhookPath
  };
  
  logger.info('✅ [VideoProductionInjector] Injection terminée avec succès', credentialsSummary);
  
  // Log détaillé de chaque nœud avec credentials
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes.forEach(node => {
      if (node.credentials && Object.keys(node.credentials).length > 0) {
        logger.debug(`📍 [VideoProductionInjector] Nœud "${node.name}" (${node.type}):`, node.credentials);
      }
    });
  }
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: createdCredentials
  };
}

module.exports = {
  injectUserCredentials
};

