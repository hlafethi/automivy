import fetch from 'node-fetch';

// Vérifier l'état du backend
async function checkBackendStatus() {
  console.log('🔍 [Check] Vérification de l\'état du backend...');
  
  try {
    // Test de connexion au backend
    const response = await fetch('http://localhost:3004/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('📋 [Check] Réponse backend:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Check] Backend opérationnel:', data);
    } else {
      console.log('⚠️ [Check] Backend répond mais avec erreur');
    }
    
  } catch (error) {
    console.log('❌ [Check] Backend non accessible:', error.message);
    console.log('💡 [Check] Vérifiez que le backend est démarré sur le port 3004');
  }
  
  // Test des routes smart-deploy
  console.log('🔍 [Check] Test des routes smart-deploy...');
  
  try {
    const routesResponse = await fetch('http://localhost:3004/api/smart-deploy/workflows', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('📋 [Check] Réponse routes:', routesResponse.status, routesResponse.statusText);
    
    if (routesResponse.status === 401 || routesResponse.status === 403) {
      console.log('✅ [Check] Routes smart-deploy accessibles (erreur auth normale)');
    } else if (routesResponse.status === 404) {
      console.log('❌ [Check] Routes smart-deploy non trouvées');
    } else {
      console.log('✅ [Check] Routes smart-deploy fonctionnelles');
    }
    
  } catch (error) {
    console.log('❌ [Check] Erreur test routes:', error.message);
  }
  
  console.log('🎉 [Check] Vérification terminée !');
}

// Exécution de la vérification
async function runCheck() {
  try {
    await checkBackendStatus();
  } catch (error) {
    console.error('❌ [Check] Échec de la vérification:', error);
    process.exit(1);
  }
}

runCheck();
