import fetch from 'node-fetch';

async function testResetLink() {
  try {
    console.log('🔗 Test du lien de réinitialisation...');
    
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
    console.log('📊 Response:', data);
    
    if (data.success) {
      console.log('✅ Email de réinitialisation envoyé avec succès !');
      console.log('📧 Vérifiez votre boîte email pour le lien de réinitialisation.');
      console.log('🔗 Le lien devrait pointer vers: http://localhost:5173/reset-password?token=...');
    } else {
      console.log('❌ Erreur:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testResetLink();
