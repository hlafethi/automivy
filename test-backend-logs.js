import fetch from 'node-fetch';

// Test simple pour vérifier les logs backend
async function testBackendLogs() {
  console.log('🧪 [Test] Test logs backend...');
  
  try {
    // Appel simple à l'API
    const response = await fetch('http://localhost:3004/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('📋 [Test] Réponse health:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Test] Backend répond:', data.message);
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error.message);
  }
  
  console.log('🎉 [Test] Test logs terminé !');
}

// Exécution du test
async function runTest() {
  try {
    await testBackendLogs();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
