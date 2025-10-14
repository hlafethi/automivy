import fetch from 'node-fetch';

async function testUserRestrictions() {
  try {
    console.log('🔍 Test des restrictions pour utilisateur normal...');
    
    // Se connecter en tant qu'utilisateur normal
    console.log('1️⃣ Connexion utilisateur normal...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@heleam.com',
        password: 'MonNouveauMotDePasse123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('   Status:', loginResponse.status);
    console.log('   User:', loginData.user?.email);
    console.log('   Role:', loginData.user?.role);
    console.log('   Token:', loginData.token ? 'Présent' : 'Absent');
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Test accès aux ressources admin...');
    
    // Test API Keys (doit être refusé)
    const apiKeysResponse = await fetch('http://localhost:3004/api/api-keys', {
      method: 'GET',
      headers
    });
    console.log('   API Keys Status:', apiKeysResponse.status, apiKeysResponse.status === 403 ? '✅ REFUSÉ' : '❌ AUTORISÉ');
    
    // Test Templates (doit être autorisé - templates visibles)
    const templatesResponse = await fetch('http://localhost:3004/api/templates', {
      method: 'GET',
      headers
    });
    console.log('   Templates Status:', templatesResponse.status, templatesResponse.status === 200 ? '✅ AUTORISÉ' : '❌ REFUSÉ');
    
    // Test Workflows (doit être autorisé - ses propres workflows)
    const workflowsResponse = await fetch('http://localhost:3004/api/workflows', {
      method: 'GET',
      headers
    });
    console.log('   Workflows Status:', workflowsResponse.status, workflowsResponse.status === 200 ? '✅ AUTORISÉ' : '❌ REFUSÉ');
    
    // Test OAuth (doit être autorisé)
    const oauthResponse = await fetch('http://localhost:3004/api/oauth', {
      method: 'GET',
      headers
    });
    console.log('   OAuth Status:', oauthResponse.status, oauthResponse.status === 200 ? '✅ AUTORISÉ' : '❌ REFUSÉ');
    
    // Test Email Credentials (doit être autorisé)
    const emailResponse = await fetch('http://localhost:3004/api/email-credentials', {
      method: 'GET',
      headers
    });
    console.log('   Email Credentials Status:', emailResponse.status, emailResponse.status === 200 ? '✅ AUTORISÉ' : '❌ REFUSÉ');
    
    // Test User Workflows (doit être autorisé)
    const userWorkflowsResponse = await fetch('http://localhost:3004/api/user-workflows', {
      method: 'GET',
      headers
    });
    console.log('   User Workflows Status:', userWorkflowsResponse.status, userWorkflowsResponse.status === 200 ? '✅ AUTORISÉ' : '❌ REFUSÉ');
    
    console.log('');
    console.log('🎉 Résumé des restrictions:');
    console.log('   🔒 API Keys:', apiKeysResponse.status === 403 ? 'CORRECTEMENT REFUSÉ' : 'ERREUR - AUTORISÉ');
    console.log('   ✅ Templates:', templatesResponse.status === 200 ? 'CORRECTEMENT AUTORISÉ' : 'ERREUR - REFUSÉ');
    console.log('   ✅ Workflows:', workflowsResponse.status === 200 ? 'CORRECTEMENT AUTORISÉ' : 'ERREUR - REFUSÉ');
    console.log('   ✅ OAuth:', oauthResponse.status === 200 ? 'CORRECTEMENT AUTORISÉ' : 'ERREUR - REFUSÉ');
    console.log('   ✅ Email Credentials:', emailResponse.status === 200 ? 'CORRECTEMENT AUTORISÉ' : 'ERREUR - REFUSÉ');
    console.log('   ✅ User Workflows:', userWorkflowsResponse.status === 200 ? 'CORRECTEMENT AUTORISÉ' : 'ERREUR - REFUSÉ');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testUserRestrictions();
