/**
 * Test du système de planification avec webhook
 * Vérifie que le scheduler fonctionne correctement
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3004';

async function testWebhookScheduler() {
  try {
    console.log('🧪 Test du système de planification avec webhook');
    
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
    
    // 2. Test de planification
    console.log('\n2. Test de planification...');
    const scheduleResponse = await fetch(`${BASE_URL}/api/scheduler/schedule`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: 'test-user-123',
        n8nWorkflowId: '3UywacWvzJaTPSRU', // ID du workflow v11
        schedule: '14:30'
      })
    });
    
    if (!scheduleResponse.ok) {
      const error = await scheduleResponse.text();
      throw new Error(`Schedule failed: ${scheduleResponse.status} - ${error}`);
    }
    
    const scheduleResult = await scheduleResponse.json();
    console.log('✅ Planification réussie:', scheduleResult);
    
    // 3. Test de déclenchement manuel
    console.log('\n3. Test de déclenchement manuel...');
    const triggerResponse = await fetch(`${BASE_URL}/api/scheduler/trigger/3UywacWvzJaTPSRU`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!triggerResponse.ok) {
      const error = await triggerResponse.text();
      console.log('⚠️ Déclenchement manuel échoué:', error);
    } else {
      const triggerResult = await triggerResponse.json();
      console.log('✅ Déclenchement manuel réussi:', triggerResult);
    }
    
    // 4. Test de mise à jour
    console.log('\n4. Test de mise à jour du schedule...');
    const updateResponse = await fetch(`${BASE_URL}/api/scheduler/schedule/test-user-123`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        n8nWorkflowId: '3UywacWvzJaTPSRU',
        schedule: '16:45'
      })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.log('⚠️ Mise à jour échouée:', error);
    } else {
      const updateResult = await updateResponse.json();
      console.log('✅ Mise à jour réussie:', updateResult);
    }
    
    // 5. Test d'annulation
    console.log('\n5. Test d\'annulation du schedule...');
    const cancelResponse = await fetch(`${BASE_URL}/api/scheduler/schedule/test-user-123`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!cancelResponse.ok) {
      const error = await cancelResponse.text();
      console.log('⚠️ Annulation échouée:', error);
    } else {
      const cancelResult = await cancelResponse.json();
      console.log('✅ Annulation réussie:', cancelResult);
    }
    
    console.log('\n🎉 Test du système de planification terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testWebhookScheduler();
