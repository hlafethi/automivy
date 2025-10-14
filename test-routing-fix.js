import fetch from 'node-fetch';

async function testRoutingFix() {
  try {
    console.log('🔧 Test de correction du routing...');
    
    // Test de l'API forgot-password
    console.log('1️⃣ Test API forgot-password...');
    const forgotResponse = await fetch('http://localhost:3004/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@heleam.com'
      })
    });
    
    const forgotData = await forgotResponse.json();
    console.log('   Status:', forgotResponse.status);
    console.log('   Success:', forgotData.success);
    
    if (forgotData.success) {
      console.log('✅ API forgot-password fonctionne');
    } else {
      console.log('❌ Erreur API:', forgotData.error);
    }
    
    // Test de l'interface frontend
    console.log('2️⃣ Test interface frontend...');
    const frontendResponse = await fetch('http://localhost:5173');
    console.log('   Frontend Status:', frontendResponse.status);
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend accessible');
    } else {
      console.log('❌ Frontend non accessible');
    }
    
    console.log('');
    console.log('🎉 Tests terminés !');
    console.log('');
    console.log('📋 Instructions pour tester :');
    console.log('1. Ouvrir http://localhost:5173 dans votre navigateur');
    console.log('2. Cliquer sur "Mot de passe oublié ?" sous le champ mot de passe');
    console.log('3. Saisir un email et cliquer sur "Envoyer le lien"');
    console.log('4. Vérifier l\'email reçu');
    console.log('5. Cliquer sur le lien dans l\'email');
    console.log('6. Vérifier que la page de réinitialisation se charge sans erreur');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testRoutingFix();
