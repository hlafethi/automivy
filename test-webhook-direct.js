/**
 * Test direct du webhook n8n
 * Teste le webhook pour voir s'il fonctionne
 */

import fetch from 'node-fetch';

async function testWebhookDirect() {
  try {
    console.log('🔧 Test direct du webhook n8n');
    
    const webhookUrl = 'https://n8n.globalsaas.eu/webhook-test/email-summary-trigger';
    console.log(`🔗 URL webhook: ${webhookUrl}`);
    
    // Test avec des données de test
    const testData = {
      triggeredBy: 'direct-test',
      timestamp: new Date().toISOString(),
      test: true,
      message: 'Test direct du webhook'
    };
    
    console.log('🚀 Envoi de la requête POST...');
    console.log('📊 Données envoyées:', testData);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Webhook-Direct'
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Status Text: ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.text();
      console.log(`✅ Webhook test réussi: ${result}`);
    } else {
      const error = await response.text();
      console.log(`❌ Webhook test échoué: ${error}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testWebhookDirect();