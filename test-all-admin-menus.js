import fetch from 'node-fetch';

async function testAllAdminMenus() {
  try {
    console.log('🔍 Test complet de tous les menus admin...');
    
    // Se connecter en tant qu'admin
    console.log('1️⃣ Connexion admin...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@automivy.com',
        password: 'admin123'
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
    console.log('2️⃣ Test All Templates...');
    const templatesResponse = await fetch('http://localhost:3004/api/templates', {
      method: 'GET',
      headers
    });
    const templatesData = await templatesResponse.json();
    console.log('   Status:', templatesResponse.status);
    console.log('   Templates:', Array.isArray(templatesData) ? templatesData.length : 'Erreur');
    console.log('   ✅ All Templates:', templatesResponse.status === 200 ? 'OK' : 'ERREUR');
    
    console.log('');
    console.log('3️⃣ Test API Keys...');
    const apiKeysResponse = await fetch('http://localhost:3004/api/api-keys', {
      method: 'GET',
      headers
    });
    const apiKeysData = await apiKeysResponse.json();
    console.log('   Status:', apiKeysResponse.status);
    console.log('   API Keys:', Array.isArray(apiKeysData) ? apiKeysData.length : 'Erreur');
    console.log('   ✅ API Keys:', apiKeysResponse.status === 200 ? 'OK' : 'ERREUR');
    
    console.log('');
    console.log('4️⃣ Test All Workflows...');
    const workflowsResponse = await fetch('http://localhost:3004/api/workflows', {
      method: 'GET',
      headers
    });
    const workflowsData = await workflowsResponse.json();
    console.log('   Status:', workflowsResponse.status);
    console.log('   Workflows:', Array.isArray(workflowsData) ? workflowsData.length : 'Erreur');
    console.log('   ✅ All Workflows:', workflowsResponse.status === 200 ? 'OK' : 'ERREUR');
    
    console.log('');
    console.log('5️⃣ Test OAuth Credentials...');
    const oauthResponse = await fetch('http://localhost:3004/api/oauth', {
      method: 'GET',
      headers
    });
    const oauthData = await oauthResponse.json();
    console.log('   Status:', oauthResponse.status);
    console.log('   OAuth Credentials:', Array.isArray(oauthData) ? oauthData.length : 'Erreur');
    console.log('   ✅ OAuth Credentials:', oauthResponse.status === 200 ? 'OK' : 'ERREUR');
    
    console.log('');
    console.log('6️⃣ Test Email Credentials...');
    const emailResponse = await fetch('http://localhost:3004/api/email-credentials', {
      method: 'GET',
      headers
    });
    const emailData = await emailResponse.json();
    console.log('   Status:', emailResponse.status);
    console.log('   Email Credentials:', Array.isArray(emailData) ? emailData.length : 'Erreur');
    console.log('   ✅ Email Credentials:', emailResponse.status === 200 ? 'OK' : 'ERREUR');
    
    console.log('');
    console.log('7️⃣ Test User Workflows...');
    const userWorkflowsResponse = await fetch('http://localhost:3004/api/user-workflows', {
      method: 'GET',
      headers
    });
    const userWorkflowsData = await userWorkflowsResponse.json();
    console.log('   Status:', userWorkflowsResponse.status);
    console.log('   User Workflows:', Array.isArray(userWorkflowsData) ? userWorkflowsData.length : 'Erreur');
    console.log('   ✅ User Workflows:', userWorkflowsResponse.status === 200 ? 'OK' : 'ERREUR');
    
    console.log('');
    console.log('🎉 Résumé des tests:');
    console.log('   ✅ All Templates:', templatesResponse.status === 200 ? 'FONCTIONNE' : 'ERREUR');
    console.log('   ✅ API Keys:', apiKeysResponse.status === 200 ? 'FONCTIONNE' : 'ERREUR');
    console.log('   ✅ All Workflows:', workflowsResponse.status === 200 ? 'FONCTIONNE' : 'ERREUR');
    console.log('   ✅ OAuth Credentials:', oauthResponse.status === 200 ? 'FONCTIONNE' : 'ERREUR');
    console.log('   ✅ Email Credentials:', emailResponse.status === 200 ? 'FONCTIONNE' : 'ERREUR');
    console.log('   ✅ User Workflows:', userWorkflowsResponse.status === 200 ? 'FONCTIONNE' : 'ERREUR');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testAllAdminMenus();
