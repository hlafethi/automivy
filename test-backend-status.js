async function testBackend() {
  try {
    console.log('🔍 Test de connexion au backend...');
    
    const response = await fetch('http://localhost:3004/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@heleam.com'
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('📊 Response:', data);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testBackend();
