/**
 * Test immédiat du webhook
 * Vérifie si le workflow n8n fonctionne maintenant
 */

import fetch from 'node-fetch';

async function testWebhookNow() {
  try {
    console.log('🔗 Test immédiat du webhook n8n');
    
    const webhookUrl = 'https://n8n.globalsaas.eu/webhook/email-summary-trigger';
    console.log(`🔗 URL webhook: ${webhookUrl}`);
    
    console.log('\n1. Test de déclenchement immédiat...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        triggeredBy: 'manual-test-now',
        timestamp: new Date().toISOString(),
        test: 'immediate'
      })
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Status Text: ${response.statusText}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Erreur webhook: ${error}`);
    } else {
      const result = await response.text();
      console.log(`✅ Webhook réussi: ${result}`);
      
      console.log('\n🎯 Vérifications:');
      console.log('   1. Allez sur n8n.globalsaas.eu');
      console.log('   2. Vérifiez les exécutions du workflow');
      console.log('   3. Regardez si le workflow s\'est exécuté');
      console.log('   4. Vérifiez les logs d\'exécution');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test webhook:', error);
  }
}

testWebhookNow();
