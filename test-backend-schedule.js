/**
 * Test du backend de planification
 * Vérifie si le système backend fonctionne
 */

import fetch from 'node-fetch';

async function testBackendSchedule() {
  try {
    console.log('🔧 Test du backend de planification');
    
    // 1. Connexion admin
    console.log('\n1. Connexion admin...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
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
    const scheduleResponse = await fetch('http://localhost:3004/api/schedule-workflow', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: 'test-user-1442',
        n8nWorkflowId: '3UywacWvzJaTPSRU',
        schedule: '14:44'
      })
    });
    
    console.log(`📊 Status: ${scheduleResponse.status}`);
    
    if (!scheduleResponse.ok) {
      const error = await scheduleResponse.text();
      console.log(`❌ Erreur planification: ${error}`);
    } else {
      const result = await scheduleResponse.json();
      console.log(`✅ Planification réussie: ${JSON.stringify(result)}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test backend:', error);
  }
}

testBackendSchedule();
