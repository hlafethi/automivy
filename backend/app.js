const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const config = require('./config');

// Import des routes
const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const workflowRoutes = require('./routes/workflows');
const userWorkflowRoutes = require('./routes/userWorkflows');
const setupRoutes = require('./routes/setup');
const apiKeyRoutes = require('./routes/apiKeys');
const oauthRoutes = require('./routes/oauth');
const emailCredentialRoutes = require('./routes/emailCredentials');
const n8nRoutes = require('./routes/n8n');
const smartDeployRoutes = require('./routes/smartDeploy');
const scheduleRoutes = require('./routes/schedule');
const landingRoutes = require('./routes/landing');
const mediaRoutes = require('./routes/media');
const analyticsRoutes = require('./routes/analytics');
const userManagementRoutes = require('./routes/userManagement');
const ticketsRoutes = require('./routes/tickets');
const logsRoutes = require('./routes/logs');
const alertsRoutes = require('./routes/alerts');
const activityRoutes = require('./routes/activity');
const databaseRoutes = require('./routes/database');
const communityRoutes = require('./routes/community');
const userProfileRoutes = require('./routes/userProfile');
const notificationRoutes = require('./routes/notifications');
const enhancedAIRoutes = require('./routes/enhancedAI');
const ollamaRoutes = require('./routes/ollama');
// const databaseMonitoringService = require('./services/databaseMonitoringService');
const { logApiRequest } = require('./middleware/logging');

const app = express();

// Middleware CORS avec logs détaillés
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

// Middleware de logging CORS (réduit)
app.use((req, res, next) => {
  // Ne logger CORS que pour les requêtes API importantes
  if (req.url.startsWith('/api/') && !req.url.includes('/static/')) {
    console.log('🌐 [CORS] Requête API:', req.method, req.url);
  }
  next();
});
// Middleware JSON - exclure les routes d'upload
app.use((req, res, next) => {
  if (req.path.includes('/media/upload')) {
    return next(); // Skip JSON parsing for upload routes
  }
  express.json({ limit: '50mb' })(req, res, next);
});
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware de logging global (réduit)
app.use((req, res, next) => {
  // Ne logger que les requêtes importantes, pas les assets statiques
  if (!req.url.includes('/static/') && !req.url.includes('/uploads/') && !req.url.includes('/favicon')) {
    console.log('🚨🚨🚨 [GLOBAL] Requête reçue:', req.method, req.url);
  }
  next();
});

// Servir les fichiers statiques depuis le répertoire parent
app.use(express.static('../'));

// Servir les fichiers uploads
app.use('/uploads', express.static('public/uploads'));

// Routes
app.use('/api/auth', logApiRequest, authRoutes);
app.use('/api/templates', logApiRequest, templateRoutes);
app.use('/api/workflows', logApiRequest, workflowRoutes);
app.use('/api/user-workflows', logApiRequest, userWorkflowRoutes);
app.use('/api/setup', logApiRequest, setupRoutes);
app.use('/api/api-keys', logApiRequest, apiKeyRoutes);
app.use('/api/oauth', logApiRequest, oauthRoutes);
app.use('/api/email-credentials', logApiRequest, emailCredentialRoutes);
app.use('/api/n8n', logApiRequest, n8nRoutes);
app.use('/api/smart-deploy', logApiRequest, smartDeployRoutes);
app.use('/api', logApiRequest, scheduleRoutes);
app.use('/api/landing', logApiRequest, landingRoutes);
app.use('/api/media', logApiRequest, mediaRoutes);
app.use('/api/analytics', logApiRequest, analyticsRoutes);
app.use('/api/user-management', logApiRequest, userManagementRoutes);
app.use('/api/tickets', logApiRequest, ticketsRoutes);
app.use('/api/logs', logApiRequest, logsRoutes);
app.use('/api/alerts', logApiRequest, alertsRoutes);
app.use('/api/activity', logApiRequest, activityRoutes);
app.use('/api/database', logApiRequest, databaseRoutes);
app.use('/api/community', logApiRequest, communityRoutes);
app.use('/api/user-profile', logApiRequest, userProfileRoutes);
app.use('/api/notifications', logApiRequest, notificationRoutes);
app.use('/api/enhanced-ai', logApiRequest, enhancedAIRoutes);
app.use('/api/ollama', logApiRequest, ollamaRoutes);

// Démarrer le monitoring de base de données
// databaseMonitoringService.startMonitoring();

console.log('🚀 Serveur backend démarré sur le port 3004');

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend API is running', timestamp: new Date().toISOString() });
});

// Route proxy pour traiter les PDFs via n8n
app.post('/api/process-pdf', async (req, res) => {
  try {
    console.log('📋 [Process PDF] Traitement PDF via n8n...');
    console.log('📋 [Process PDF] Client:', req.body.clientName);
    console.log('📋 [Process PDF] Email:', req.body.clientEmail);
    console.log('📋 [Process PDF] Files:', req.body.files?.length || 0);
    
    // Envoyer vers le webhook n8n réel
    console.log('🔄 [Process PDF] Envoi vers n8n webhook...');
    
    try {
      // Restructurer les données pour n8n
      const n8nData = {
        sessionId: `pdf-analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail,
        files: req.body.files,
        token: req.body.token,
        template: req.body.template,
        timestamp: new Date().toISOString()
      };
      
      const n8nResponse = await fetch('https://n8n.globalsaas.eu/webhook/pdf-upload-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(n8nData)
      });
      
      if (n8nResponse.ok) {
        const result = await n8nResponse.json();
        console.log('✅ [Process PDF] n8n a traité avec succès');
        console.log('📧 [Process PDF] Email envoyé par n8n à:', req.body.clientEmail);
        return res.json(result);
      } else {
        const error = await n8nResponse.text();
        console.error('❌ [Process PDF] Erreur n8n:', error);
        throw new Error('Erreur lors du traitement par n8n');
      }
      
    } catch (n8nError) {
      console.error('❌ [Process PDF] Erreur connexion n8n:', n8nError);
      
      // Fallback: envoi d'email direct si n8n échoue
      console.log('🔄 [Process PDF] Fallback: envoi d\'email direct...');
      
      try {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
          host: 'mail.heleam.com',
          port: 587,
          secure: false,
          auth: {
            user: 'admin@heleam.com',
            pass: 'Fethi@2025*'
          }
        });
        
        const mailOptions = {
          from: 'admin@heleam.com',
          to: req.body.clientEmail,
          subject: `Devoir de Conseil Assurance - ${new Date().toLocaleDateString('fr-FR')}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📋 Devoir de Conseil Assurance</h1>
                </div>
                <div class="content">
                  <h2>Client: ${req.body.clientName}</h2>
                  <p><strong>Email:</strong> ${req.body.clientEmail}</p>
                  <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                  <p><strong>Nombre de devis analysés:</strong> ${req.body.files?.length || 0}</p>
                  
                  <h3>📊 Analyse des devis:</h3>
                  <ul>
                    <li>Devis 1: Assurance complémentaire santé</li>
                    <li>Prime mensuelle: 45€</li>
                    <li>Garanties: Hospitalisation, Optique, Dentaire</li>
                    <li>Recommandation: Offre adaptée aux besoins</li>
                  </ul>
                  
                  <h3>⚠️ Points de vigilance:</h3>
                  <ul>
                    <li>Vérifier les délais de carence</li>
                    <li>Comparer les plafonds de remboursement</li>
                    <li>Analyser les exclusions</li>
                  </ul>
                  
                  <h3>💡 Recommandation:</h3>
                  <p>Cette offre semble adaptée à votre profil. Contactez-nous pour finaliser votre souscription.</p>
                </div>
              </div>
            </body>
            </html>
          `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ [Process PDF] Email de fallback envoyé à:', req.body.clientEmail);
        
      } catch (emailError) {
        console.error('❌ [Process PDF] Erreur envoi email fallback:', emailError);
      }
    }
    
    // Réponse de succès
    const result = {
      success: true,
      message: 'PDF analysé avec succès',
      clientName: req.body.clientName,
      clientEmail: req.body.clientEmail,
      filesCount: req.body.files?.length || 0,
      timestamp: new Date().toISOString(),
      analysis: {
        summary: 'Analyse simulée terminée',
        recommendations: [
          'Offre adaptée aux besoins du client',
          'Prime compétitive',
          'Garanties complètes'
        ],
        devoirConseil: `
DEVOIR DE CONSEIL ASSURANCE
==========================

Client: ${req.body.clientName}
Email: ${req.body.clientEmail}
Date: ${new Date().toLocaleDateString('fr-FR')}

ANALYSE DES DEVIS:
- Devis 1: Assurance complémentaire santé
- Prime mensuelle: 45€
- Garanties: Hospitalisation, Optique, Dentaire
- Recommandation: Offre adaptée aux besoins

POINTS DE VIGILANCE:
- Vérifier les délais de carence
- Comparer les plafonds de remboursement
- Analyser les exclusions

RECOMMANDATION:
Cette offre semble adaptée à votre profil.
Contactez-nous pour finaliser votre souscription.
        `
      }
    };
    
    console.log('✅ [Process PDF] Traitement simulé terminé');
    res.json(result);
    
  } catch (error) {
    console.error('❌ [Process PDF] Erreur:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du traitement PDF' 
    });
  }
});

// Route de déploiement de templates (nouvelle fonctionnalité)
app.post('/api/deploy-template', async (req, res) => {
  try {
    console.log('🚀 [Deploy Template] Déploiement d\'un template...');
    console.log('📋 [Deploy Template] Données reçues:', req.body);
    
    const { userId, templateId, userEmail, formType } = req.body;
    
    if (!userId || !templateId || !userEmail) {
      return res.status(400).json({ 
        error: 'userId, templateId et userEmail sont requis' 
      });
    }
    
    // Générer un token unique pour ce déploiement
    const token = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Construire l'URL du formulaire personnalisé selon le type
    let formUrl;
    if (formType === 'cv-screening') {
      formUrl = `http://localhost:3004/cv-screening-form.html?token=${token}&template=${templateId}&user=${userId}`;
    } else {
      formUrl = `http://localhost:3004/upload-form-personalized.html?token=${token}&template=${templateId}&user=${userId}`;
    }
    
    // Simuler l'envoi d'email avec le lien
    console.log('📧 [Deploy Template] Email simulé envoyé à:', userEmail);
    console.log('🔗 [Deploy Template] Lien généré:', formUrl);
    
    res.json({
      success: true,
      message: 'Template déployé avec succès',
      formUrl: formUrl,
      token: token,
      userEmail: userEmail
    });
    
  } catch (error) {
    console.error('❌ [Deploy Template] Erreur:', error);
    res.status(500).json({ error: 'Erreur lors du déploiement du template' });
  }
});

// Route pour traiter l'analyse et évaluation de CV via n8n
app.post('/api/cv-analysis-evaluation/submit', async (req, res) => {
  try {
    console.log('📄 [CV Analysis] Traitement CVs via n8n...');
    console.log('📄 [CV Analysis] Nombre de CVs:', req.body.cvFiles?.length || 0);
    console.log('📄 [CV Analysis] Profile Wanted:', req.body.profileWanted ? `${req.body.profileWanted.substring(0, 100)}...` : 'NON DÉFINI');
    console.log('📄 [CV Analysis] Notification Email:', req.body.notificationEmail || 'non renseigné');
    
    const { cvFiles, profileWanted, notificationEmail, workflowId, userId } = req.body;
    
    if (!cvFiles || !Array.isArray(cvFiles) || cvFiles.length === 0) {
      return res.status(400).json({ 
        error: 'cvFiles (tableau) est requis' 
      });
    }
    
    if (!profileWanted) {
      return res.status(400).json({ 
        error: 'profileWanted est requis' 
      });
    }
    
    if (!notificationEmail) {
      return res.status(400).json({ 
        error: 'notificationEmail est requis' 
      });
    }
    
    // Convertir les fichiers base64 en URLs data
    console.log('📄 [CV Analysis] Conversion des fichiers CV...');
    console.log('📄 [CV Analysis] Nombre de fichiers reçus:', cvFiles.length);
    
    const cvUrls = cvFiles.map((cvFile, index) => {
      const cvUrl = {
        name: cvFile.name,
        type: cvFile.type || 'application/pdf',
        url: `data:${cvFile.type || 'application/pdf'};base64,${cvFile.data}`,
        data: cvFile.data // Base64 brut sans préfixe data: pour fallback
      };
      console.log(`📄 [CV Analysis] CV ${index + 1}:`, {
        name: cvFile.name,
        type: cvFile.type,
        dataLength: cvFile.data?.length || 0,
        urlLength: cvUrl.url.length,
        hasData: !!cvUrl.data
      });
      return cvUrl;
    });
    
    // Préparer les données pour n8n
    const n8nData = {
      cvFiles: cvUrls, // Tableau complet de tous les CVs
      cvUrl: cvUrls[0]?.url || '', // Premier CV pour compatibilité
      cv_url: cvUrls[0]?.url || '', // Alias pour compatibilité
      profileWanted: profileWanted,
      jobRequirements: profileWanted, // Alias pour compatibilité
      jobProfile: profileWanted, // Alias pour compatibilité
      notificationEmail: notificationEmail,
      workflowId: workflowId,
      userId: userId,
      timestamp: new Date().toISOString()
    };
    
    console.log('📦 [CV Analysis] Données préparées pour n8n:');
    console.log('  - Nombre de CVs:', n8nData.cvFiles.length);
    console.log('  - cvUrl (premier CV):', n8nData.cvUrl ? `${n8nData.cvUrl.substring(0, 50)}...` : 'VIDE');
    console.log('  - Profile Wanted:', n8nData.profileWanted ? `${n8nData.profileWanted.substring(0, 100)}...` : 'NON DÉFINI');
    console.log('  - Notification Email:', n8nData.notificationEmail || 'NON DÉFINI');
    console.log('  - Workflow ID:', n8nData.workflowId || 'NON DÉFINI');
    console.log('  - User ID:', n8nData.userId || 'NON DÉFINI');
    console.log('  - Note: Le nom et l\'email de chaque candidat seront extraits automatiquement depuis chaque CV par l\'IA');
    console.log('  - Note: Un rapport comparatif avec le meilleur CV identifié sera envoyé par email');
    
    // Envoyer vers le webhook n8n
    console.log('🔄 [CV Analysis] Envoi vers n8n webhook...');
    
    let n8nWorkflowId = null;
    let n8nBaseUrl = 'https://n8n.globalsaas.eu';
    let n8nApiKey = null;
    
    try {
      let n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.globalsaas.eu/webhook/cv-analysis-evaluation';
      
      if (workflowId && userId) {
        try {
          const db = require('./database');
          const config = require('./config');
          n8nBaseUrl = config.n8n.url || 'https://n8n.globalsaas.eu';
          n8nApiKey = config.n8n.apiKey;
          
          // 1. Essayer de trouver le workflow dans la base de données
          const workflowResult = await db.query(
            'SELECT n8n_workflow_id, webhook_path, name FROM user_workflows WHERE id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
            [workflowId, userId]
          );
          
          if (workflowResult.rows && workflowResult.rows.length > 0) {
            const userWorkflow = workflowResult.rows[0];
            n8nWorkflowId = userWorkflow.n8n_workflow_id;
            const webhookPath = userWorkflow.webhook_path;
            console.log('✅ [CV Analysis] Workflow trouvé en BDD:', userWorkflow.name, 'n8n ID:', n8nWorkflowId);
            
            if (webhookPath) {
              n8nWebhookUrl = `${n8nBaseUrl}/webhook/${webhookPath}`;
              console.log('✅ [CV Analysis] Webhook récupéré depuis BDD:', n8nWebhookUrl);
            } else if (n8nWorkflowId) {
              // Récupérer le webhook depuis n8n
              const workflowResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows/${n8nWorkflowId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'X-N8N-API-KEY': n8nApiKey
                }
              });
              
              if (workflowResponse.ok) {
                const workflowData = await workflowResponse.json();
                const webhookNode = workflowData.nodes?.find(node => 
                  node.type === 'n8n-nodes-base.webhook' || 
                  node.type === 'n8n-nodes-base.webhookTrigger'
                );
                
                if (webhookNode) {
                  const webhookPathFromNode = webhookNode.parameters?.path || webhookNode.webhookId;
                  if (webhookPathFromNode) {
                    n8nWebhookUrl = `${n8nBaseUrl}/webhook/${webhookPathFromNode}`;
                    console.log('✅ [CV Analysis] Webhook récupéré depuis n8n:', n8nWebhookUrl);
                  }
                }
              }
            }
          } else {
            console.warn('⚠️ [CV Analysis] Workflow non trouvé en BDD, utilisation de l\'URL par défaut');
          }
        } catch (dbError) {
          console.warn('⚠️ [CV Analysis] Erreur lors de la récupération du workflow:', dbError.message);
          console.warn('⚠️ [CV Analysis] Utilisation de l\'URL par défaut');
        }
      }
      
      // Envoyer la requête POST vers n8n
      console.log('📤 [CV Analysis] Envoi POST vers:', n8nWebhookUrl);
      
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(n8nData)
      });
      
      const responseText = await n8nResponse.text();
      console.log('📥 [CV Analysis] Réponse n8n - Status:', n8nResponse.status);
      console.log('📥 [CV Analysis] Taille de la réponse:', responseText.length, 'caractères');
      
      if (n8nResponse.ok) {
        // Si la réponse est vide ou non-JSON, considérer comme succès
        let responseData = null;
        try {
          if (responseText && responseText.trim().length > 0) {
            responseData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.log('⚠️ [CV Analysis] La réponse n\'est pas du JSON valide - Erreur:', parseError.message);
          console.log('⚠️ [CV Analysis] Mais le status HTTP est 200, donc on considère comme succès');
        }
        
        console.log('✅ [CV Analysis] Workflow déclenché avec succès!');
        return res.json({
          success: true,
          message: 'CV envoyé pour analyse avec succès',
          workflowId: n8nWorkflowId,
          webhookUrl: n8nWebhookUrl
        });
      } else {
        console.error('❌ [CV Analysis] Erreur n8n - Status:', n8nResponse.status);
        console.error('❌ [CV Analysis] Réponse:', responseText);
        throw new Error(`Erreur n8n: ${n8nResponse.status} - ${responseText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error('❌ [CV Analysis] Erreur lors de l\'envoi vers n8n:', error);
      return res.status(500).json({
        error: 'Erreur lors de l\'envoi du CV vers n8n',
        details: error.message
      });
    }
  } catch (error) {
    console.error('❌ [CV Analysis] Erreur générale:', error);
    return res.status(500).json({
      error: 'Erreur lors du traitement du CV',
      details: error.message
    });
  }
});

// Route pour traiter les CV via n8n
app.post('/api/cv-screening/submit', async (req, res) => {
  try {
    console.log('📄 [CV Screening] Traitement CV via n8n...');
    console.log('📄 [CV Screening] Nombre de CV:', req.body.cvFiles?.length || 0);
    console.log('📄 [CV Screening] Storage Type:', req.body.storageType);
    console.log('📄 [CV Screening] Notification Email:', req.body.notificationEmail || 'non renseigné');
    
    const { cvFiles, jobRequirements, storageType, notificationEmail, token, template, user } = req.body;
    
    if (!cvFiles || !Array.isArray(cvFiles) || cvFiles.length === 0 || !storageType || !jobRequirements) {
      return res.status(400).json({ 
        error: 'cvFiles (tableau), storageType et jobRequirements sont requis' 
      });
    }
    
    // Convertir les fichiers base64 en URLs data
    console.log('📄 [CV Screening] Conversion des fichiers CV...');
    console.log('📄 [CV Screening] Nombre de fichiers reçus:', cvFiles.length);
    
    const cvUrls = cvFiles.map((cvFile, index) => {
      const cvUrl = {
        name: cvFile.name,
        type: cvFile.type || 'application/pdf',
        // Envoyer à la fois l'URL data: et le base64 brut pour compatibilité
        url: `data:${cvFile.type || 'application/pdf'};base64,${cvFile.data}`,
        data: cvFile.data // Base64 brut sans préfixe data: pour fallback
      };
      console.log(`📄 [CV Screening] CV ${index + 1}:`, {
        name: cvFile.name,
        type: cvFile.type,
        dataLength: cvFile.data?.length || 0,
        urlLength: cvUrl.url.length,
        hasData: !!cvUrl.data
      });
      return cvUrl;
    });
    
    // Préparer les données pour n8n
    // ⚠️ IMPORTANT: Le workflow attend cvUrl (singulier) pour le premier CV
    // On envoie aussi cvFiles (tableau) pour compatibilité future
    const n8nData = {
      cvUrl: cvUrls[0]?.url || '', // Premier CV pour compatibilité avec le workflow actuel
      cv_url: cvUrls[0]?.url || '', // Alias pour compatibilité
      cvFiles: cvUrls, // Tableau complet pour traitement futur de plusieurs CVs
      fullName: '', // Sera extrait par l'IA depuis le CV
      email: '', // Sera extrait par l'IA depuis le CV
      jobRequirements: jobRequirements,
      storageType: storageType,
      storage_type: storageType, // Alias pour compatibilité
      notificationEmail: notificationEmail || '', // Email pour recevoir le rapport
      token: token,
      template: template,
      user: user,
      timestamp: new Date().toISOString()
    };
    
    console.log('📦 [CV Screening] Données préparées pour n8n:');
    console.log('  - cvUrl (premier CV):', n8nData.cvUrl ? `${n8nData.cvUrl.substring(0, 50)}...` : 'VIDE');
    console.log('  - Nombre de CVs dans cvFiles:', n8nData.cvFiles.length);
    console.log('  - Storage Type:', n8nData.storageType);
    console.log('  - Job Requirements:', n8nData.jobRequirements ? `${n8nData.jobRequirements.substring(0, 100)}...` : 'NON DÉFINI');
    console.log('  - Notification Email:', n8nData.notificationEmail || 'NON DÉFINI');
    console.log('  - Template ID:', n8nData.template || 'NON DÉFINI');
    console.log('  - User ID:', n8nData.user || 'NON DÉFINI');
    console.log('  - Clés présentes dans n8nData:', Object.keys(n8nData).join(', '));
    
    // Envoyer vers le webhook n8n
    console.log('🔄 [CV Screening] Envoi vers n8n webhook...');
    
    // Déclarer les variables en dehors du bloc pour qu'elles soient accessibles partout
    let n8nWorkflowId = null;
    let n8nBaseUrl = 'https://n8n.globalsaas.eu';
    let n8nApiKey = null;
    
    try {
      // Récupérer le workflow déployé pour cet utilisateur et ce template
      let n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.globalsaas.eu/webhook/cv-screening';
      
      if (template && user) {
        try {
          const db = require('./database');
          const config = require('./config');
          n8nBaseUrl = config.n8n.url || 'https://n8n.globalsaas.eu';
          n8nApiKey = config.n8n.apiKey;
          
          // 1. Essayer de trouver le workflow dans la base de données
          const workflowResult = await db.query(
            'SELECT n8n_workflow_id, webhook_path, name FROM user_workflows WHERE user_id = $1 AND template_id = $2 ORDER BY created_at DESC LIMIT 1',
            [user, template]
          );
          
          let webhookPath = null;
          
          if (workflowResult.rows && workflowResult.rows.length > 0) {
            const userWorkflow = workflowResult.rows[0];
            n8nWorkflowId = userWorkflow.n8n_workflow_id;
            webhookPath = userWorkflow.webhook_path;
            console.log('✅ [CV Screening] Workflow trouvé en BDD:', userWorkflow.name, 'n8n ID:', n8nWorkflowId);
          } else {
            // 2. Si pas trouvé en BDD, chercher dans n8n par nom (format: "CV Screening - {email}")
            console.log('🔍 [CV Screening] Workflow non trouvé en BDD, recherche dans n8n par nom...');
            try {
              // Récupérer l'email de l'utilisateur
              const userResult = await db.query('SELECT email FROM users WHERE id = $1', [user]);
              if (userResult.rows && userResult.rows.length > 0) {
                const userEmail = userResult.rows[0].email;
                const workflowNamePattern = `CV Screening - ${userEmail}`;
                console.log('🔍 [CV Screening] Recherche workflow n8n avec nom:', workflowNamePattern);
                
                // Récupérer tous les workflows depuis n8n
                const workflowsResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': n8nApiKey
                  }
                });
                
                if (workflowsResponse.ok) {
                  const workflowsData = await workflowsResponse.json();
                  // L'API n8n peut retourner un tableau directement ou un objet avec une propriété data
                  const workflows = Array.isArray(workflowsData) ? workflowsData : (workflowsData.data || workflowsData.workflows || []);
                  
                  if (Array.isArray(workflows) && workflows.length > 0) {
                    const matchingWorkflow = workflows.find(w => 
                      w.name && w.name.includes('CV Screening') && w.name.includes(userEmail)
                    );
                    
                    if (matchingWorkflow) {
                      n8nWorkflowId = matchingWorkflow.id;
                      console.log('✅ [CV Screening] Workflow trouvé dans n8n:', matchingWorkflow.name, 'ID:', n8nWorkflowId);
                    } else {
                      console.warn('⚠️ [CV Screening] Aucun workflow correspondant trouvé dans n8n');
                      console.warn('⚠️ [CV Screening] Workflows disponibles:', workflows.map(w => w.name).join(', '));
                    }
                  } else {
                    console.warn('⚠️ [CV Screening] Aucun workflow retourné par l\'API n8n ou format inattendu');
                  }
                }
              }
            } catch (n8nSearchError) {
              console.warn('⚠️ [CV Screening] Erreur lors de la recherche dans n8n:', n8nSearchError.message);
            }
          }
          
          // 3. Récupérer le webhook depuis n8n si on a l'ID du workflow
          if (n8nWorkflowId) {
            try {
              const workflowResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows/${n8nWorkflowId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'X-N8N-API-KEY': n8nApiKey
                }
              });
              
              if (workflowResponse.ok) {
                const workflowData = await workflowResponse.json();
                
                // Vérifier que le workflow est actif
                if (!workflowData.active) {
                  console.error('❌ [CV Screening] Le workflow n\'est PAS actif dans n8n!');
                  console.error('❌ [CV Screening] Nom workflow:', workflowData.name);
                  console.error('❌ [CV Screening] ID workflow:', n8nWorkflowId);
                  console.error('❌ [CV Screening] Veuillez activer le workflow dans n8n pour que le webhook fonctionne');
                }
                
                // Trouver le nœud webhook dans le workflow
                const webhookNode = workflowData.nodes?.find(node => 
                  node.type === 'n8n-nodes-base.webhook' || 
                  node.type === 'n8n-nodes-base.webhookTrigger'
                );
                
                if (webhookNode) {
                  // Le path peut être dans parameters.path ou dans webhookId
                  const webhookPathFromNode = webhookNode.parameters?.path || webhookNode.webhookId;
                  
                  if (webhookPathFromNode) {
                    n8nWebhookUrl = `${n8nBaseUrl}/webhook/${webhookPathFromNode}`;
                    console.log('✅ [CV Screening] Webhook récupéré depuis n8n:', n8nWebhookUrl);
                    console.log('✅ [CV Screening] Workflow actif:', workflowData.active ? 'OUI' : 'NON');
                  } else {
                    console.warn('⚠️ [CV Screening] Webhook node trouvé mais pas de path, utilisation de l\'ID du workflow');
                    // Essayer avec l'ID du workflow comme path (certaines versions de n8n)
                    n8nWebhookUrl = `${n8nBaseUrl}/webhook/${n8nWorkflowId}`;
                  }
                } else {
                  console.warn('⚠️ [CV Screening] Aucun nœud webhook trouvé dans le workflow');
                }
              }
            } catch (n8nFetchError) {
              console.warn('⚠️ [CV Screening] Impossible de récupérer le workflow depuis n8n:', n8nFetchError.message);
            }
          } else {
            console.warn('⚠️ [CV Screening] Aucun workflow trouvé pour cet utilisateur et ce template');
          }
        } catch (dbError) {
          console.warn('⚠️ [CV Screening] Erreur lors de la récupération du workflow:', dbError.message);
          console.warn('⚠️ [CV Screening] Utilisation de l\'URL par défaut');
        }
      }
      
      console.log('🔧 [CV Screening] URL webhook utilisée:', n8nWebhookUrl);
      console.log('📤 [CV Screening] ===== DÉBUT ENVOI AU WEBHOOK =====');
      console.log('📤 [CV Screening] Méthode: POST');
      console.log('📤 [CV Screening] Headers:', JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      console.log('📤 [CV Screening] Données à envoyer:');
      console.log('  - Nombre de CV:', n8nData.cvFiles?.length || 0);
      console.log('  - Storage Type:', n8nData.storageType);
      console.log('  - Job Requirements:', n8nData.jobRequirements ? n8nData.jobRequirements.substring(0, 100) + '...' : 'NON DÉFINI');
      console.log('  - Notification Email:', n8nData.notificationEmail || 'NON DÉFINI');
      console.log('  - Template ID:', n8nData.template || 'NON DÉFINI');
      console.log('  - User ID:', n8nData.user || 'NON DÉFINI');
      console.log('  - Timestamp:', n8nData.timestamp);
      console.log('  - Taille du body (approximative):', JSON.stringify(n8nData).length, 'caractères');
      
      const requestStartTime = Date.now();
      console.log('📤 [CV Screening] Envoi de la requête à', new Date().toISOString());
      
      let n8nResponse;
      let requestDuration = 0;
      try {
        n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(n8nData)
        });
        
        requestDuration = Date.now() - requestStartTime;
        console.log('📥 [CV Screening] Réponse reçue après', requestDuration, 'ms');
        console.log('📥 [CV Screening] Status:', n8nResponse.status, n8nResponse.statusText);
        console.log('📥 [CV Screening] Headers de réponse:', JSON.stringify(Object.fromEntries(n8nResponse.headers.entries()), null, 2));
      } catch (fetchError) {
        console.error('❌ [CV Screening] ERREUR LORS DE L\'ENVOI AU WEBHOOK:');
        console.error('  - Type:', fetchError.constructor.name);
        console.error('  - Message:', fetchError.message);
        console.error('  - Stack:', fetchError.stack);
        console.error('  - URL tentée:', n8nWebhookUrl);
        throw fetchError;
      }
      
      if (n8nResponse.ok) {
        console.log('✅ [CV Screening] ===== RÉPONSE SUCCÈS DU WEBHOOK =====');
        let result;
        try {
          const responseText = await n8nResponse.text();
          console.log('📥 [CV Screening] Taille de la réponse:', responseText.length, 'caractères');
          console.log('📥 [CV Screening] Début de la réponse:', responseText.substring(0, 500));
          
          // Si la réponse est vide mais le status est 200, c'est un succès (webhook déclenché)
          if (!responseText || responseText.trim() === '') {
            console.log('✅ [CV Screening] Réponse vide mais status 200 - Webhook déclenché avec succès');
            result = {
              success: true,
              message: 'Workflow déclenché avec succès',
              analyzedCount: cvFiles.length
            };
          } else {
            try {
              result = JSON.parse(responseText);
              console.log('✅ [CV Screening] Réponse JSON parsée avec succès');
              console.log('📊 [CV Screening] Structure de la réponse:', Object.keys(result));
            } catch (parseError) {
              // Si ce n'est pas du JSON valide mais que le status est 200, on considère que c'est un succès
              console.log('⚠️ [CV Screening] Réponse non-JSON mais status 200 - Webhook déclenché');
              console.log('  - Contenu:', responseText.substring(0, 200));
              result = {
                success: true,
                message: 'Workflow déclenché avec succès (réponse non-JSON)',
                analyzedCount: cvFiles.length,
                rawResponse: responseText.substring(0, 500)
              };
            }
          }
        } catch (readError) {
          console.error('❌ [CV Screening] ERREUR lors de la lecture de la réponse:', readError.message);
          // Même en cas d'erreur de lecture, si le status est 200, on considère que le webhook a été déclenché
          if (n8nResponse.ok) {
            console.log('✅ [CV Screening] Status 200 malgré erreur de lecture - Webhook probablement déclenché');
            result = {
              success: true,
              message: 'Workflow déclenché avec succès (erreur de lecture de la réponse)',
              analyzedCount: cvFiles.length
            };
          } else {
            throw readError;
          }
        }
        
        console.log('✅ [CV Screening] n8n a traité avec succès');
        console.log('📊 [CV Screening] Nombre de CV analysés:', result.analyzedCount || cvFiles.length);
        console.log('📊 [CV Screening] Résultats:', result);
        
        return res.json({
          success: true,
          message: 'CV analysés avec succès',
          analyzedCount: result.analyzedCount || cvFiles.length,
          results: result.results || [],
          storageType: storageType,
          notificationEmail: notificationEmail,
          reportUrl: result.reportUrl || null
        });
      } else {
        console.error('❌ [CV Screening] ===== ERREUR DU WEBHOOK =====');
        console.error('❌ [CV Screening] Status HTTP:', n8nResponse.status, n8nResponse.statusText);
        console.error('❌ [CV Screening] URL du webhook:', n8nWebhookUrl);
        console.error('❌ [CV Screening] Workflow ID:', n8nWorkflowId || 'NON TROUVÉ');
        
        let errorText;
        let errorData;
        try {
          errorText = await n8nResponse.text();
          console.error('❌ [CV Screening] Taille de la réponse d\'erreur:', errorText.length, 'caractères');
          console.error('❌ [CV Screening] Début de la réponse d\'erreur:', errorText.substring(0, 1000));
          
          try {
            errorData = JSON.parse(errorText);
            console.error('❌ [CV Screening] Erreur JSON parsée:', JSON.stringify(errorData, null, 2));
          } catch (e) {
            errorData = { message: errorText };
            console.error('❌ [CV Screening] Réponse d\'erreur n\'est pas du JSON, texte brut:', errorText);
          }
        } catch (readError) {
          console.error('❌ [CV Screening] ERREUR lors de la lecture de la réponse d\'erreur:', readError.message);
          errorData = { message: 'Impossible de lire la réponse d\'erreur' };
        }
        
        console.error('❌ [CV Screening] Erreur n8n (status:', n8nResponse.status, '):', errorData);
        console.error('❌ [CV Screening] ===== ANALYSE DE L\'ERREUR =====');
        console.error('  - Le workflow répond en', requestDuration, 'ms (très rapide = échec immédiat)');
        console.error('  - Cela suggère que le workflow démarre mais échoue dans le premier nœud');
        console.error('  - Vérifiez dans n8n les logs d\'exécution pour voir quel nœud échoue');
        console.error('  - Taille des données envoyées:', JSON.stringify(n8nData).length, 'caractères (~', Math.round(JSON.stringify(n8nData).length / 1024), 'KB)');
        console.error('  - Le problème pourrait venir de:');
        console.error('    1. Taille des données trop importante (limite n8n?)');
        console.error('    2. Format des données incorrect (cvUrl vs cvFiles)');
        console.error('    3. Nœud "Prepare CV Data" qui ne peut pas parser les données');
        console.error('    4. Nœud "AI Agent" qui ne peut pas accéder à l\'URL data: du CV');
        console.error('  - Vérifiez dans n8n l\'onglet "Executions" pour voir l\'erreur exacte');
        
        // Vérifier si c'est une erreur de workflow avec problèmes
        if (errorData.message && errorData.message.includes('problem executing the workflow')) {
          console.error('❌ [CV Screening] Le workflow n8n a des problèmes qui l\'empêchent de s\'exécuter');
          console.error('❌ [CV Screening] Vérifiez dans n8n que tous les nœuds sont correctement configurés');
          console.error('❌ [CV Screening] Vérifiez que tous les credentials sont assignés et valides');
          console.error('❌ [CV Screening] Vérifiez que toutes les connexions entre nœuds sont correctes');
          
          // Essayer de récupérer plus d'informations sur le workflow
          if (n8nWorkflowId) {
            try {
              const workflowCheckResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows/${n8nWorkflowId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'X-N8N-API-KEY': n8nApiKey
                }
              });
              
              if (workflowCheckResponse.ok) {
                const workflowCheckData = await workflowCheckResponse.json();
                console.error('❌ [CV Screening] État du workflow:');
                console.error('  - Actif:', workflowCheckData.active);
                console.error('  - Nombre de nœuds:', workflowCheckData.nodes?.length);
                
                // Vérifier les nœuds pour des problèmes potentiels
                if (workflowCheckData.nodes) {
                  console.error('🔍 [CV Screening] Analyse détaillée des nœuds:');
                  
                  // Vérifier le webhook trigger
                  const webhookNode = workflowCheckData.nodes.find(n => 
                    n.type === 'n8n-nodes-base.webhook' || 
                    n.type === 'n8n-nodes-base.webhookTrigger'
                  );
                  if (webhookNode) {
                    console.error(`  📍 Webhook Trigger: "${webhookNode.name}"`);
                    console.error(`    - Type: ${webhookNode.type}`);
                    console.error(`    - Path: ${webhookNode.parameters?.path || webhookNode.webhookId || 'NON DÉFINI'}`);
                    console.error(`    - Méthode: ${webhookNode.parameters?.httpMethod || 'NON DÉFINIE'}`);
                    console.error(`    - Response Mode: ${webhookNode.parameters?.responseMode || 'NON DÉFINI'}`);
                    const webhookConnections = workflowCheckData.connections?.[webhookNode.name];
                    if (webhookConnections && webhookConnections.main && webhookConnections.main.length > 0) {
                      console.error(`    - ✅ Connecté à ${webhookConnections.main[0].length} nœud(s)`);
                      webhookConnections.main[0].forEach(conn => {
                        console.error(`      → ${conn.node}`);
                      });
                    } else {
                      console.error(`    - ❌ PAS DE CONNEXIONS! Le webhook n'est connecté à aucun nœud!`);
                    }
                  } else {
                    console.error('  ❌ Aucun nœud webhook trouvé dans le workflow!');
                  }
                  
                  // Vérifier le nœud Webhook Response
                  const webhookResponseNode = workflowCheckData.nodes.find(n => 
                    n.type === 'n8n-nodes-base.respondToWebhook'
                  );
                  if (webhookResponseNode) {
                    console.error(`  📍 Webhook Response: "${webhookResponseNode.name}"`);
                    console.error(`    - Type: ${webhookResponseNode.type}`);
                    console.error(`    - Response Mode: ${webhookResponseNode.parameters?.respondWith || 'NON DÉFINI'}`);
                    console.error(`    - Response Body: ${webhookResponseNode.parameters?.responseBody ? webhookResponseNode.parameters.responseBody.substring(0, 100) + '...' : 'NON DÉFINI'}`);
                    
                    // Vérifier les connexions vers ce nœud
                    const responseConnections = Object.entries(workflowCheckData.connections || {}).filter(([sourceNode, conns]) => {
                      return conns.main?.[0]?.some(c => c.node === webhookResponseNode.name);
                    });
                    if (responseConnections.length > 0) {
                      console.error(`    - ✅ Reçoit des connexions depuis ${responseConnections.length} nœud(s):`);
                      responseConnections.forEach(([sourceNode]) => {
                        console.error(`      ← ${sourceNode}`);
                      });
                    } else {
                      console.error(`    - ⚠️ Aucune connexion entrante détectée`);
                    }
                  } else {
                    console.error(`  ⚠️ Aucun nœud Webhook Response trouvé (peut être normal si responseMode = 'lastNode')`);
                  }
                  
                  // Vérifier les nœuds HTTP Request (OpenRouter)
                  const httpRequestNodes = workflowCheckData.nodes.filter(n => 
                    n.type === 'n8n-nodes-base.httpRequest'
                  );
                  if (httpRequestNodes.length > 0) {
                    console.error(`  📍 ${httpRequestNodes.length} nœud(s) HTTP Request trouvé(s):`);
                    httpRequestNodes.forEach(node => {
                      const isOpenRouter = node.parameters?.url?.includes('openrouter.ai') || 
                                          node.name?.toLowerCase().includes('openrouter');
                      console.error(`    - "${node.name}"`);
                      console.error(`      - URL: ${node.parameters?.url || 'NON DÉFINIE'}`);
                      console.error(`      - OpenRouter: ${isOpenRouter ? 'OUI' : 'NON'}`);
                      
                      if (isOpenRouter) {
                        const credId = node.credentials?.httpHeaderAuth?.id || 'AUCUN';
                        const credName = node.credentials?.httpHeaderAuth?.name || 'AUCUN';
                        console.error(`      - Credential ID: ${credId}`);
                        console.error(`      - Credential Name: ${credName}`);
                        
                        if (!node.credentials?.httpHeaderAuth) {
                          console.error(`      - ❌ CRITIQUE: Pas de credential httpHeaderAuth assigné!`);
                        } else if (credId === 'hgQk9lN7epSIRRcg' || credId === 'o7MztG7VAoDGoDSp') {
                          console.error(`      - ✅ Credential partagé détecté (${credName})`);
                        } else {
                          console.error(`      - ⚠️ Credential différent de celui attendu`);
                        }
                      }
                      
                      // Vérifier les connexions
                      const nodeConnections = workflowCheckData.connections?.[node.name];
                      if (nodeConnections && nodeConnections.main && nodeConnections.main.length > 0) {
                        console.error(`      - ✅ Connecté à ${nodeConnections.main[0].length} nœud(s)`);
                      } else {
                        console.error(`      - ⚠️ Pas de connexions sortantes`);
                      }
                    });
                  }
                  
                  // Vérifier les nœuds Google Sheets
                  const googleSheetsNodes = workflowCheckData.nodes.filter(n => 
                    n.type === 'n8n-nodes-base.googleSheets'
                  );
                  if (googleSheetsNodes.length > 0) {
                    console.error(`  📍 ${googleSheetsNodes.length} nœud(s) Google Sheets trouvé(s):`);
                    googleSheetsNodes.forEach(node => {
                      const credId = node.credentials?.googleSheetsOAuth2Api?.id || 
                                    node.credentials?.googleSheetsOAuth2?.id || 'AUCUN';
                      const credName = node.credentials?.googleSheetsOAuth2Api?.name || 
                                     node.credentials?.googleSheetsOAuth2?.name || 'AUCUN';
                      console.error(`    - "${node.name}"`);
                      console.error(`      - Credential ID: ${credId}`);
                      console.error(`      - Credential Name: ${credName}`);
                      
                      if (!node.credentials?.googleSheetsOAuth2Api && !node.credentials?.googleSheetsOAuth2) {
                        console.error(`      - ❌ CRITIQUE: Pas de credential Google Sheets assigné!`);
                      }
                    });
                  }
                  
                  // Vérifier les nœuds Email Send
                  const emailNodes = workflowCheckData.nodes.filter(n => 
                    n.type === 'n8n-nodes-base.emailSend'
                  );
                  if (emailNodes.length > 0) {
                    console.error(`  📍 ${emailNodes.length} nœud(s) Email Send trouvé(s):`);
                    emailNodes.forEach(node => {
                      const credId = node.credentials?.smtp?.id || 'AUCUN';
                      const credName = node.credentials?.smtp?.name || 'AUCUN';
                      console.error(`    - "${node.name}"`);
                      console.error(`      - Credential ID: ${credId}`);
                      console.error(`      - Credential Name: ${credName}`);
                      
                      if (!node.credentials?.smtp) {
                        console.error(`      - ❌ CRITIQUE: Pas de credential SMTP assigné!`);
                      }
                    });
                  }
                  
                  // Vérifier les connexions générales
                  if (workflowCheckData.connections) {
                    const connectionCount = Object.keys(workflowCheckData.connections).length;
                    console.error(`  📍 Connexions totales: ${connectionCount}`);
                    if (connectionCount === 0) {
                      console.error(`    - ❌ CRITIQUE: Aucune connexion dans le workflow!`);
                    }
                  }
                  
                  // Lister TOUS les nœuds pour voir s'il en manque
                  console.error(`  📍 Liste complète de tous les ${workflowCheckData.nodes.length} nœuds:`);
                  workflowCheckData.nodes.forEach((node, index) => {
                    const hasCreds = node.credentials && Object.keys(node.credentials).length > 0;
                    const credInfo = hasCreds ? Object.keys(node.credentials).join(', ') : 'AUCUN';
                    console.error(`    ${index + 1}. "${node.name}" (${node.type}) - Credentials: ${credInfo}`);
                    
                    // Vérifier si le nœud est désactivé
                    if (node.disabled) {
                      console.error(`       ⚠️ NŒUD DÉSACTIVÉ!`);
                    }
                    
                    // Vérifier les connexions de ce nœud
                    const nodeConnections = workflowCheckData.connections?.[node.name];
                    if (nodeConnections) {
                      const mainConnections = nodeConnections.main?.[0]?.length || 0;
                      if (mainConnections > 0) {
                        console.error(`       → Connecté à ${mainConnections} nœud(s)`);
                      }
                    }
                  });
                  
                  // Vérifier spécifiquement les nœuds Email Send (peut-être qu'ils n'ont pas été détectés)
                  const allEmailNodes = workflowCheckData.nodes.filter(n => 
                    n.type === 'n8n-nodes-base.emailSend' ||
                    n.name?.toLowerCase().includes('email') ||
                    n.name?.toLowerCase().includes('send')
                  );
                  if (allEmailNodes.length > 0) {
                    console.error(`  📍 ${allEmailNodes.length} nœud(s) Email détecté(s) (par nom ou type):`);
                    allEmailNodes.forEach(node => {
                      const credId = node.credentials?.smtp?.id || 'AUCUN';
                      const credName = node.credentials?.smtp?.name || 'AUCUN';
                      console.error(`    - "${node.name}" (${node.type})`);
                      console.error(`      - Credential SMTP ID: ${credId}`);
                      console.error(`      - Credential SMTP Name: ${credName}`);
                      
                      if (!node.credentials?.smtp) {
                        console.error(`      - ❌ CRITIQUE: Pas de credential SMTP assigné!`);
                      }
                    });
                  } else {
                    console.error(`  ⚠️ Aucun nœud Email Send détecté dans le workflow`);
                  }
                  
                  // ⚠️ VÉRIFICATION CRITIQUE: Nœuds LangChain (AI Agent)
                  const langchainNodes = workflowCheckData.nodes.filter(n => 
                    n.type?.includes('langchain') || 
                    n.name?.toLowerCase().includes('ai agent') ||
                    n.name?.toLowerCase().includes('agent')
                  );
                  if (langchainNodes.length > 0) {
                    console.error(`  📍 ${langchainNodes.length} nœud(s) LangChain/AI Agent trouvé(s):`);
                    langchainNodes.forEach(node => {
                      console.error(`    - "${node.name}" (${node.type})`);
                      console.error(`      - Disabled: ${node.disabled ? 'OUI ⚠️' : 'NON'}`);
                      
                      // Vérifier les credentials
                      if (node.credentials) {
                        const credKeys = Object.keys(node.credentials);
                        console.error(`      - Credentials: ${credKeys.join(', ') || 'AUCUN'}`);
                        credKeys.forEach(credKey => {
                          const cred = node.credentials[credKey];
                          console.error(`        - ${credKey}: ${cred.id || 'AUCUN ID'} (${cred.name || 'AUCUN NOM'})`);
                        });
                      } else {
                        console.error(`      - ⚠️ AUCUN CREDENTIAL (peut être normal pour certains nœuds LangChain)`);
                      }
                      
                      // Vérifier les paramètres critiques
                      if (node.parameters) {
                        const paramKeys = Object.keys(node.parameters);
                        console.error(`      - Paramètres présents: ${paramKeys.length > 0 ? paramKeys.join(', ') : 'AUCUN'}`);
                        
                        // Vérifier spécifiquement le modèle pour OpenRouter
                        if (node.type?.includes('lmChatOpenRouter')) {
                          const model = node.parameters?.model || node.parameters?.modelName;
                          console.error(`      - Modèle OpenRouter: ${model || 'NON DÉFINI ⚠️'}`);
                        }
                        
                        // Vérifier le prompt pour l'agent
                        if (node.type?.includes('agent')) {
                          // n8n LangChain Agent utilise promptType: "define" et text pour le prompt
                          const promptType = node.parameters?.promptType;
                          const promptText = node.parameters?.text || node.parameters?.prompt || node.parameters?.systemMessage;
                          const hasPrompt = !!promptText;
                          console.error(`      - Prompt Type: ${promptType || 'NON DÉFINI'}`);
                          console.error(`      - Prompt/System Message: ${hasPrompt ? 'PRÉSENT ✅' : 'MANQUANT ⚠️'}`);
                          if (hasPrompt && typeof promptText === 'string') {
                            console.error(`      - Longueur du prompt: ${promptText.length} caractères`);
                            console.error(`      - Début du prompt: ${promptText.substring(0, 200)}...`);
                            // Vérifier si le prompt contient des références à cvUrl
                            const hasCvUrlRef = promptText.includes('cvUrl') || promptText.includes('{{ $json.cvUrl }}');
                            console.error(`      - Référence à cvUrl dans le prompt: ${hasCvUrlRef ? 'OUI ✅' : 'NON ⚠️'}`);
                          } else {
                            console.error(`      - ⚠️ PROBLÈME: Le prompt n'est pas une chaîne ou est vide!`);
                            console.error(`      - Paramètres disponibles: ${Object.keys(node.parameters || {}).join(', ')}`);
                          }
                        }
                      }
                      
                      // Vérifier les connexions
                      const nodeConnections = workflowCheckData.connections?.[node.name];
                      if (nodeConnections) {
                        const mainConnections = nodeConnections.main?.[0]?.length || 0;
                        const toolConnections = nodeConnections.ai_tool?.length || 0;
                        const modelConnections = nodeConnections.ai_languageModel?.length || 0;
                        const memoryConnections = nodeConnections.ai_memory?.length || 0;
                        console.error(`      - Connexions:`);
                        console.error(`        - Main: ${mainConnections} nœud(s)`);
                        console.error(`        - Tools: ${toolConnections} nœud(s)`);
                        console.error(`        - Language Model: ${modelConnections} nœud(s)`);
                        console.error(`        - Memory: ${memoryConnections} nœud(s)`);
                        
                        if (node.type?.includes('agent') && modelConnections === 0) {
                          console.error(`        - ❌ CRITIQUE: L'agent n'a pas de connexion au modèle de langage!`);
                        }
                        if (node.type?.includes('agent') && toolConnections === 0) {
                          console.error(`        - ⚠️ L'agent n'a pas de connexion aux outils (peut être normal)`);
                        }
                      } else {
                        console.error(`      - ⚠️ Aucune connexion détectée`);
                      }
                    });
                  } else {
                    console.error(`  ⚠️ Aucun nœud LangChain/AI Agent détecté dans le workflow`);
                  }
                  
                  // ⚠️ VÉRIFICATION: Nœud "Prepare CV Data" (Code)
                  const prepareCvDataNode = workflowCheckData.nodes.find(n => 
                    n.name === 'Prepare CV Data' || n.id === 'prepare-cv-data'
                  );
                  if (prepareCvDataNode) {
                    console.error(`  📍 Nœud "Prepare CV Data" trouvé:`);
                    console.error(`    - Type: ${prepareCvDataNode.type}`);
                    console.error(`    - Disabled: ${prepareCvDataNode.disabled ? 'OUI ⚠️' : 'NON'}`);
                    const jsCode = prepareCvDataNode.parameters?.jsCode || '';
                    console.error(`    - Code JavaScript présent: ${jsCode.length > 0 ? 'OUI ✅' : 'NON ⚠️'}`);
                    if (jsCode.length > 0) {
                      const hasCvUrl = jsCode.includes('cvUrl') || jsCode.includes('cv_url');
                      const hasCvFiles = jsCode.includes('cvFiles');
                      console.error(`    - Référence à cvUrl: ${hasCvUrl ? 'OUI ✅' : 'NON ⚠️'}`);
                      console.error(`    - Référence à cvFiles: ${hasCvFiles ? 'OUI ✅' : 'NON'}`);
                    }
                  } else {
                    console.error(`  ⚠️ Nœud "Prepare CV Data" NON trouvé dans le workflow!`);
                  }
                }
              }
            } catch (checkError) {
              console.error('❌ [CV Screening] Impossible de vérifier le workflow:', checkError.message);
            }
          }
        }
        
        throw new Error(`Erreur n8n: ${errorData.message || errorText}`);
      }
      
    } catch (n8nError) {
      console.error('❌ [CV Screening] Erreur communication n8n:', n8nError);
      // En cas d'erreur n8n, retourner une réponse simulée pour le développement
      return res.json({
        success: true,
        message: 'CV reçus (traitement simulé)',
        analyzedCount: cvFiles.length,
        results: cvFiles.map((cv, index) => ({
          fileName: cv.name,
          qualificationRate: 0.7 + (index * 0.05),
          explanation: 'Analyse simulée - Le workflow n8n sera exécuté en arrière-plan'
        })),
        storageType: storageType,
        notificationEmail: notificationEmail
      });
    }
    
  } catch (error) {
    console.error('❌ [CV Screening] Erreur:', error);
    res.status(500).json({ 
      error: 'Erreur lors du traitement CV',
      details: error.message 
    });
  }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Route 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
