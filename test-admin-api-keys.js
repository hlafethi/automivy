import fetch from 'node-fetch';

async function testAdminApiKeys() {
  try {
    console.log('🔑 Test des clés API pour admin...');
    
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
    
    // Tester l'API clés API pour admin
    console.log('');
    console.log('2️⃣ Test API clés API admin...');
    const apiKeysResponse = await fetch('http://localhost:3004/api/api-keys', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const apiKeysData = await apiKeysResponse.json();
    console.log('   Status:', apiKeysResponse.status);
    console.log('   Clés API trouvées:', Array.isArray(apiKeysData) ? apiKeysData.length : 'Non-array');
    
    if (Array.isArray(apiKeysData)) {
      console.log('✅ Clés API récupérées avec succès !');
      apiKeysData.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.service_name} (${key.service})`);
        console.log(`      - ID: ${key.id}`);
        console.log(`      - Active: ${key.is_active}`);
        console.log(`      - Created by: ${key.created_by}`);
        console.log(`      - Key: ${key.api_key.substring(0, 20)}...`);
      });
    } else {
      console.log('❌ Erreur clés API:', apiKeysData);
    }
    
    console.log('');
    console.log('🎉 Test terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testAdminApiKeys();
