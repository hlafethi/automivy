const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ollamaService = require('../services/ollamaService');

// Tester la connexion LocalAI
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const result = await ollamaService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('❌ [LocalAI] Erreur test:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du test de connexion LocalAI' 
    });
  }
});

// Lister les modèles disponibles
router.get('/models', authenticateToken, async (req, res) => {
  try {
    console.log('📋 [LocalAI] Récupération des modèles disponibles...');
    const models = await ollamaService.getAvailableModels();
    console.log(`✅ [LocalAI] ${models.length} modèles trouvés`);
    
    // Formater les modèles pour le frontend
    const formattedModels = models.map(m => ({
      id: m.id || m.name,
      name: m.name || m.id,
      size: m.size,
      modified_at: m.modified_at || m.created,
      object: m.object || 'model'
    }));
    
    res.json({ 
      success: true, 
      models: formattedModels,
      count: formattedModels.length
    });
  } catch (error) {
    console.error('❌ [LocalAI] Erreur modèles:', error);
    console.error('❌ [LocalAI] Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des modèles',
      message: error.message 
    });
  }
});

// Générer un workflow avec LocalAI
router.post('/generate-workflow', authenticateToken, async (req, res) => {
  try {
    const { description, model, context } = req.body;
    
    if (!description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Description requise' 
      });
    }

    // Utiliser le modèle demandé ou null pour utiliser le défaut du service
    const modelToUse = model || null;

    const result = await ollamaService.generateWorkflow(
      description, 
      modelToUse,
      context || {}
    );

    res.json({
      success: true,
      workflow: result.workflow,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('❌ [LocalAI] Erreur génération workflow:', error);
    console.error('❌ [LocalAI] Stack:', error.stack);
    console.error('❌ [LocalAI] Message:', error.message);
    
    // Message d'erreur plus utile
    let errorMessage = error.message || 'Erreur lors de la génération du workflow';
    if (errorMessage.includes('could not load model')) {
      errorMessage = 'Le modèle demandé n\'est pas disponible ou ne peut pas être chargé sur LocalAI. Vérifiez les modèles installés.';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Générer du contenu libre
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { prompt, model, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt requis' 
      });
    }

    const result = await ollamaService.generateContent(
      prompt, 
      model || 'llama3.1:8b',
      options || {}
    );

    res.json({
      success: true,
      content: result.content,
      metadata: {
        model: result.model,
        generationTime: result.total_duration,
        tokens: result.eval_count
      }
    });
  } catch (error) {
    console.error('❌ [LocalAI] Erreur génération:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la génération' 
    });
  }
});

module.exports = router;
