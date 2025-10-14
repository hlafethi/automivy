/**
 * Test de diagnostic du système de planification
 * Vérifie si le cron job fonctionne
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3004';

async function testScheduleDebug() {
  try {
    console.log('🔍 Diagnostic du système de planification');
    
    // 1. Connexion admin
    console.log('\n1. Connexion admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@automivy.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const { token } = await loginResponse.json();
    console.log('✅ Connexion admin réussie');
    
    // 2. Test de planification avec heure proche (dans 2 minutes)
    const now = new Date();
    const testTime = new Date(now.getTime() + 2 * 60000); // +2 minutes
    const schedule = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`\n2. Test de planification à ${schedule} (dans 2 minutes)...`);
    
    const scheduleResponse = await fetch(`${BASE_URL}/api/schedule-workflow`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: 'test-user-debug',
        n8nWorkflowId: '3UywacWvzJaTPSRU', // ID du workflow v11
        schedule: schedule
      })
    });
    
    if (!scheduleResponse.ok) {
      const error = await scheduleResponse.text();
      throw new Error(`Schedule failed: ${scheduleResponse.status} - ${error}`);
    }
    
    const scheduleResult = await scheduleResponse.json();
    console.log('✅ Planification réussie:', scheduleResult);
    
    // 3. Test de déclenchement manuel immédiat
    console.log('\n3. Test de déclenchement manuel...');
    
    // Récupérer l'URL webhook
    const webhookUrl = 'http://localhost:5678/webhook/email-summary-webhook';
    console.log(`🔗 URL webhook: ${webhookUrl}`);
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        triggeredBy: 'manual-test',
        timestamp: new Date().toISOString()
      })
    });
    
    if (!webhookResponse.ok) {
      console.log(`⚠️ Webhook échoué: ${webhookResponse.status}`);
      const error = await webhookResponse.text();
      console.log(`   Erreur: ${error}`);
    } else {
      console.log('✅ Webhook déclenché avec succès');
    }
    
    // 4. Vérifier les logs du backend
    console.log('\n4. Vérifiez les logs du backend pour voir si le cron job est actif');
    console.log('   - Le cron job devrait s\'afficher dans les logs');
    console.log('   - Attendez 2 minutes pour voir le déclenchement automatique');
    
    console.log('\n🎯 Prochaines étapes:');
    console.log('   1. Vérifiez que n8n est démarré sur le port 5678');
    console.log('   2. Vérifiez que le workflow est actif dans n8n');
    console.log('   3. Vérifiez les logs du backend pour le cron job');
    console.log('   4. Testez le webhook manuellement dans n8n');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

testScheduleDebug();
