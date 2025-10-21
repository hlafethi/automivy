// Serveur mock pour simuler le webhook n8n
import express from 'express';

const app = express();
const PORT = 5679; // Port différent pour éviter les conflits

app.use(express.json());

// Webhook mock pour tester le formulaire
app.post('/webhook/pdf-upload-analysis', async (req, res) => {
  try {
    console.log('📋 Webhook reçu:', {
      clientName: req.body.clientName,
      clientEmail: req.body.clientEmail,
      filesCount: req.body.files?.length || 0,
      token: req.body.token,
      template: req.body.template
    });
    
    // Simuler le traitement
    console.log('🔄 Simulation du traitement PDF...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🤖 Simulation de l\'analyse IA...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📧 Simulation de l\'envoi d\'email...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Réponse de succès
    res.json({
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
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement'
    });
  }
});

// Route de test
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Webhook mock actif',
    timestamp: new Date().toISOString(),
    webhook: `http://localhost:${PORT}/webhook/pdf-upload-analysis`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur webhook mock démarré sur http://localhost:${PORT}`);
  console.log(`📋 Webhook: http://localhost:${PORT}/webhook/pdf-upload-analysis`);
  console.log(`🧪 Test: http://localhost:${PORT}/test`);
});
