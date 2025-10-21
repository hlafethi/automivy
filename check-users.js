import fetch from 'node-fetch';

// Vérifier les utilisateurs en base
async function checkUsers() {
  console.log('🔍 [Check] Vérification des utilisateurs...');
  
  try {
    // Test de connexion avec différents credentials
    const testCredentials = [
      { email: 'admin@heleam.com', password: 'admin123' },
      { email: 'admin@heleam.com', password: 'Fethi@2025!' },
      { email: 'fethi@heleam.com', password: 'Fethi@2025!' },
      { email: 'user@heleam.com', password: 'user123' }
    ];
    
    for (const cred of testCredentials) {
      console.log(`🔧 [Check] Test connexion: ${cred.email}`);
      
      try {
        const response = await fetch('http://localhost:3004/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cred)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ [Check] Connexion réussie avec ${cred.email}`);
          console.log(`📋 [Check] Token: ${result.token.substring(0, 20)}...`);
          console.log(`📋 [Check] User: ${result.user.email}, Role: ${result.user.role}`);
          return result.token;
        } else {
          const errorText = await response.text();
          console.log(`❌ [Check] Échec connexion ${cred.email}: ${errorText}`);
        }
      } catch (error) {
        console.log(`❌ [Check] Erreur connexion ${cred.email}: ${error.message}`);
      }
    }
    
    console.log('⚠️ [Check] Aucune connexion réussie');
    return null;
    
  } catch (error) {
    console.error('❌ [Check] Erreur vérification utilisateurs:', error);
    return null;
  }
}

// Exécution de la vérification
async function runCheck() {
  try {
    const token = await checkUsers();
    if (token) {
      console.log('🎉 [Check] Token valide obtenu !');
    } else {
      console.log('❌ [Check] Aucun token valide trouvé');
    }
  } catch (error) {
    console.error('❌ [Check] Échec de la vérification:', error);
    process.exit(1);
  }
}

runCheck();
