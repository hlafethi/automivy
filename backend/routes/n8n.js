const express = require('express');
const router = express.Router();
const config = require('../config');
const { deployEmailSummaryWorkflow } = require('../services/n8nService');

// Routes spécifiques pour n8n

// Récupérer tous les credentials
router.get('/credentials', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    const fullUrl = `${n8nUrl}/api/v1/credentials`;
    console.log(`Proxying GET ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

router.get('/workflows', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    const fullUrl = `${n8nUrl}/api/v1/workflows`;
    console.log(`Proxying GET ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

// Récupérer un workflow spécifique par ID
router.get('/workflows/:id', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const workflowId = req.params.id;
    
    const fullUrl = `${n8nUrl}/api/v1/workflows/${workflowId}`;
    console.log(`Proxying GET ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

router.post('/workflows', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    const fullUrl = `${n8nUrl}/api/v1/workflows`;
    console.log(`Proxying POST ${fullUrl}`);
    console.log('Workflow data:', JSON.stringify(req.body, null, 2));
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

router.put('/workflows/:id', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const workflowId = req.params.id;
    
    const fullUrl = `${n8nUrl}/api/v1/workflows/${workflowId}`;
    console.log(`Proxying PUT ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

router.patch('/workflows/:id', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const workflowId = req.params.id;
    
    const fullUrl = `${n8nUrl}/api/v1/workflows/${workflowId}`;
    console.log(`Proxying PATCH ${fullUrl}`);
    console.log('PATCH body:', JSON.stringify(req.body, null, 2));
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

router.delete('/workflows/:id', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const workflowId = req.params.id;
    
    const fullUrl = `${n8nUrl}/api/v1/workflows/${workflowId}`;
    console.log(`Proxying DELETE ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

// Route PATCH pour activer/désactiver un workflow via l'API REST n8n
router.patch('/rest/workflows/:id', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const workflowId = req.params.id;
    
    const fullUrl = `${n8nUrl}/rest/workflows/${workflowId}`;
    console.log(`Proxying PATCH ${fullUrl}`);
    console.log('PATCH body:', JSON.stringify(req.body, null, 2));
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${n8nApiKey}`,
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n REST API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n REST API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n REST proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n REST API',
      details: error.message 
    });
  }
});

// Route pour supprimer un workflow archivé via l'endpoint REST
router.delete('/rest/workflows/:id', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const workflowId = req.params.id;
    
    const fullUrl = `${n8nUrl}/rest/workflows/${workflowId}`;
    console.log(`Proxying DELETE ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${n8nApiKey}`,
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      console.error(`n8n REST API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n REST API success: ${response.status}`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('n8n REST proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n REST API',
      details: error.message 
    });
  }
});

// Route pour les credentials n8n
router.post('/credentials', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    const fullUrl = `${n8nUrl}/api/v1/credentials`;
    console.log(`Proxying POST ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      const data = await response.json();
      console.error(`n8n credentials API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    const data = await response.json();
    console.log(`n8n credentials API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n credentials proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n credentials API',
      details: error.message 
    });
  }
});

router.delete('/credentials/:id', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    const fullUrl = `${n8nUrl}/api/v1/credentials/${req.params.id}`;
    console.log(`Proxying DELETE ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      console.error(`n8n credentials delete API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n credentials delete API success: ${response.status}`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('n8n credentials delete proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n credentials API',
      details: error.message 
    });
  }
});

// Route pour activer un workflow
router.post('/workflows/:id/activate', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const workflowId = req.params.id;
    
    const fullUrl = `${n8nUrl}/api/v1/workflows/${workflowId}/activate`;
    console.log(`Proxying POST ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

// Route pour désactiver un workflow
router.post('/workflows/:id/deactivate', async (req, res) => {
  try {
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const workflowId = req.params.id;
    
    const fullUrl = `${n8nUrl}/api/v1/workflows/${workflowId}/deactivate`;
    console.log(`Proxying POST ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`n8n API error: ${response.status}`, data);
      return res.status(response.status).json(data);
    }
    
    console.log(`n8n API success: ${response.status}`);
    res.json(data);
    
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to communicate with n8n',
      details: error.message 
    });
  }
});

// 🚀 Déployer un workflow Email Summary avec credentials automatiques
router.post('/deploy-email-summary', async (req, res) => {
  try {
    const { userId, userEmail, userPassword, userImapServer } = req.body;
    
    console.log('🚀 [API] Déploiement workflow Email Summary pour:', userEmail);
    
    // Validation des paramètres
    if (!userId || !userEmail || !userPassword || !userImapServer) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: userId, userEmail, userPassword, userImapServer requis'
      });
    }
    
    // Déployer le workflow avec credentials automatiques
    const result = await deployEmailSummaryWorkflow(
      userId,
      userEmail,
      userPassword,
      userImapServer
    );
    
    console.log('✅ [API] Workflow déployé avec succès:', result.id);
    
    res.json({
      success: true,
      workflowId: result.id,
      message: 'Workflow Email Summary déployé avec succès'
    });
    
  } catch (error) {
    console.error('❌ [API] Erreur déploiement workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déploiement du workflow',
      details: error.message
    });
  }
});

module.exports = router;
