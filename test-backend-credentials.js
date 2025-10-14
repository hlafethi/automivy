import fetch from 'node-fetch';

async function testBackendCredentials() {
  try {
    console.log('🔍 Test des credentials via le backend...');
    
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
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Récupération des credentials via backend...');
    
    const credentialsResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'GET',
      headers
    });
    
    console.log('   Status:', credentialsResponse.status);
    
    if (credentialsResponse.ok) {
      const credentials = await credentialsResponse.json();
      console.log('✅ Credentials récupérés !');
      console.log('   Nombre:', credentials.length);
      credentials.forEach(cred => {
        console.log(`   - ${cred.name} (${cred.type}) [ID: ${cred.id}]`);
      });
    } else {
      const error = await credentialsResponse.text();
      console.log('❌ Erreur:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testBackendCredentials();
