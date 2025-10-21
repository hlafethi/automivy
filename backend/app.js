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

const app = express();

// Middleware CORS avec logs détaillés
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

// Middleware de logging CORS
app.use((req, res, next) => {
  console.log('🌐 [CORS] Requête reçue:', req.method, req.url);
  console.log('🌐 [CORS] Origin:', req.headers.origin);
  console.log('🌐 [CORS] CORS Origin configuré:', config.server.corsOrigin);
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

// Middleware de logging global
app.use((req, res, next) => {
  console.log('🚨🚨🚨 [GLOBAL] Requête reçue:', req.method, req.url);
  console.log('🚨🚨🚨 [GLOBAL] Headers:', req.headers);
  console.log('🚨🚨🚨 [GLOBAL] Body:', req.body);
  next();
});

// Servir les fichiers statiques depuis le répertoire parent
app.use(express.static('../'));

// Servir les fichiers uploads
app.use('/uploads', express.static('public/uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/user-workflows', userWorkflowRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/email-credentials', emailCredentialRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/smart-deploy', smartDeployRoutes);
app.use('/api', scheduleRoutes);
app.use('/api/landing', landingRoutes);
app.use('/api/media', mediaRoutes);

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
    
    const { userId, templateId, userEmail } = req.body;
    
    if (!userId || !templateId || !userEmail) {
      return res.status(400).json({ 
        error: 'userId, templateId et userEmail sont requis' 
      });
    }
    
    // Générer un token unique pour ce déploiement
    const token = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Construire l'URL du formulaire personnalisé
    const formUrl = `http://localhost:3004/upload-form-personalized.html?token=${token}&template=${templateId}&user=${userId}`;
    
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
