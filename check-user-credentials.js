import fetch from 'node-fetch';

async function checkUserCredentials() {
  console.log('🧪 [Test] Vérification des credentials utilisateur...');
  
  try {
    // Test avec différents mots de passe
    const passwords = ['user_password', 'password', 'heleam', 'admin'];
    
    for (const password of passwords) {
      console.log(`🔧 [Test] Test avec mot de passe: ${password}`);
      
      const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@heleam.com',
          password: password
        })
      });
      
      console.log(`📋 [Test] Réponse pour ${password}:`, loginResponse.status, loginResponse.statusText);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log(`✅ [Test] Connexion réussie avec ${password}:`, loginData.token ? 'Token obtenu' : 'Pas de token');
        break;
      } else {
        const error = await loginResponse.text();
        console.log(`❌ [Test] Erreur avec ${password}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

checkUserCredentials();
