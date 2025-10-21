// API pour déployer un template et générer un lien personnalisé
const express = require('express');
const app = express();

app.use(express.json());

// Endpoint pour déployer un template
app.post('/api/deploy-template', async (req, res) => {
  try {
    const { userId, templateId, userEmail } = req.body;
    
    // Validation des données
    if (!userId || !templateId || !userEmail) {
      return res.status(400).json({
        error: 'Données manquantes',
        required: ['userId', 'templateId', 'userEmail']
      });
    }
    
    // Envoyer au webhook n8n pour générer le lien
    const n8nResponse = await fetch('https://n8n.globalsaas.eu/webhook-test/deploy-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        templateId,
        userEmail
      })
    });
    
    if (!n8nResponse.ok) {
      throw new Error('Erreur lors de la génération du lien');
    }
    
    const result = await n8nResponse.json();
    
    res.json({
      success: true,
      message: 'Template déployé avec succès',
      data: {
        userId,
        templateId,
        userEmail,
        formUrl: result.formUrl,
        expiresAt: result.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Erreur déploiement template:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      message: error.message
    });
  }
});

// Endpoint pour servir le formulaire personnalisé
app.get('/upload-form', (req, res) => {
  const { token, template } = req.query;
  
  if (!token || !template) {
    return res.status(400).send('Paramètres manquants');
  }
  
  // Servir le formulaire HTML avec les paramètres
  res.sendFile(__dirname + '/upload-form-personalized.html');
});

// Endpoint pour tester le déploiement
app.get('/test-deploy', (req, res) => {
  res.json({
    message: 'API de déploiement de templates opérationnelle',
    endpoints: {
      deploy: 'POST /api/deploy-template',
      form: 'GET /upload-form?token=xxx&template=xxx'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API de déploiement démarrée sur le port ${PORT}`);
  console.log(`📋 Test: http://localhost:${PORT}/test-deploy`);
});

module.exports = app;
