// Script pour déployer le workflow n8n via API
import fetch from 'node-fetch';
import fs from 'fs';

async function deployWorkflow() {
  try {
    console.log('🚀 Déploiement du workflow n8n...');
    
    // Lire le workflow JSON
    const workflowData = JSON.parse(fs.readFileSync('workflow-test-simple.json', 'utf8'));
    
    console.log('📋 Workflow chargé:', workflowData.name);
    
    // Déployer via l'API n8n
    const response = await fetch('http://localhost:5678/api/v1/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': 'n8n-api-key' // Clé API n8n (à configurer)
      },
      body: JSON.stringify(workflowData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Workflow déployé avec succès !');
      console.log('🆔 ID du workflow:', result.id);
      console.log('🔗 Webhook URL:', `http://localhost:5678/webhook/pdf-upload-analysis`);
      
      // Activer le workflow
      const activateResponse = await fetch(`http://localhost:5678/api/v1/workflows/${result.id}/activate`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': 'n8n-api-key'
        }
      });
      
      if (activateResponse.ok) {
        console.log('✅ Workflow activé !');
      } else {
        console.log('⚠️ Impossible d\'activer le workflow automatiquement');
        console.log('🔧 Activez-le manuellement dans l\'interface n8n');
      }
      
    } else {
      const error = await response.text();
      console.log('❌ Erreur lors du déploiement:', error);
      console.log('🔧 Déployez manuellement le workflow via l\'interface n8n');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('🔧 Solution manuelle:');
    console.log('1. Ouvrez http://localhost:5678');
    console.log('2. Importez le fichier workflow-test-simple.json');
    console.log('3. Activez le workflow');
    console.log('4. Testez le webhook: http://localhost:5678/webhook/pdf-upload-analysis');
  }
}

// Exécuter le déploiement
deployWorkflow();
