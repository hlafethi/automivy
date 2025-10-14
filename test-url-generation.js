import fetch from 'node-fetch';

async function testURLGeneration() {
  try {
    console.log('🔗 Test de génération d\'URL...');
    
    // Test de l'API
    const response = await fetch('http://localhost:3004/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@heleam.com'
      })
    });
    
    const data = await response.json();
    console.log('📊 Status:', response.status);
    
    if (data.success) {
      console.log('✅ Email envoyé avec succès !');
      console.log('📧 Vérifiez votre boîte email pour le lien de réinitialisation.');
      console.log('');
      console.log('🔗 Le lien généré devrait maintenant pointer vers :');
      console.log('   - Si local : http://localhost:5173/reset-password?token=...');
      console.log('   - Si réseau : http://VOTRE-IP:5173/reset-password?token=...');
      console.log('');
      console.log('💡 Si le lien ne fonctionne toujours pas :');
      console.log('   1. Vérifiez que votre frontend est accessible sur le bon port');
      console.log('   2. Créez un fichier .env dans backend/ avec :');
      console.log('      FRONTEND_URL=http://VOTRE-IP:5173');
      console.log('   3. Redémarrez le backend');
    } else {
      console.log('❌ Erreur:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testURLGeneration();
