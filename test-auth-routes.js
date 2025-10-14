import fetch from 'node-fetch';

async function testAuthRoutes() {
  try {
    console.log('🔐 Test des routes d\'authentification...');
    console.log('');
    
    // Test de connexion
    console.log('1️⃣ Test de connexion...');
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
    console.log('   Response:', loginData);
    
    if (loginResponse.ok) {
      console.log('✅ Connexion réussie !');
      console.log('   User:', loginData.user);
      console.log('   Token:', loginData.token ? 'Présent' : 'Absent');
    } else {
      console.log('❌ Erreur de connexion:', loginData.error);
    }
    
    console.log('');
    
    // Test de vérification du token
    if (loginData.token) {
      console.log('2️⃣ Test de vérification du token...');
      const verifyResponse = await fetch('http://localhost:3004/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      const verifyData = await verifyResponse.json();
      console.log('   Status:', verifyResponse.status);
      console.log('   Response:', verifyData);
      
      if (verifyResponse.ok) {
        console.log('✅ Token valide !');
      } else {
        console.log('❌ Token invalide');
      }
    }
    
    console.log('');
    console.log('🎉 Tests terminés !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testAuthRoutes();
