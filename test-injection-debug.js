import fetch from 'node-fetch';

async function testInjectionDebug() {
  try {
    console.log('🔍 Test de debug de l\'injection des credentials...');
    
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
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Test direct de l\'API deploy-email-summary...');
    
    const deployResponse = await fetch('http://localhost:3004/api/n8n/deploy-email-summary', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: 'test-user-123',
        userEmail: 'test@example.com',
        userPassword: 'testpassword',
        userImapServer: 'imap.example.com'
      })
    });
    
    console.log('   Status:', deployResponse.status);
    
    if (deployResponse.ok) {
      const result = await deployResponse.json();
      console.log('✅ Déploiement réussi !');
      console.log('   Workflow ID:', result.workflowId);
      console.log('   Message:', result.message);
    } else {
      const error = await deployResponse.text();
      console.log('❌ Erreur déploiement:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testInjectionDebug();
