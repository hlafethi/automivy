import fetch from 'node-fetch';

async function testTemplatesAPI() {
  try {
    console.log('🔍 Test de l\'API templates...');
    
    // D'abord se connecter pour obtenir un token
    console.log('1️⃣ Connexion...');
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
    console.log('   User:', loginData.user?.email);
    console.log('   Token:', loginData.token ? 'Présent' : 'Absent');
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester les templates');
      return;
    }
    
    // Tester l'API templates
    console.log('');
    console.log('2️⃣ Test API templates...');
    const templatesResponse = await fetch('http://localhost:3004/api/templates', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const templatesData = await templatesResponse.json();
    console.log('   Status:', templatesResponse.status);
    console.log('   Templates trouvés:', Array.isArray(templatesData) ? templatesData.length : 'Non-array');
    
    if (Array.isArray(templatesData)) {
      console.log('✅ Templates récupérés avec succès !');
      templatesData.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.id})`);
      });
    } else {
      console.log('❌ Erreur templates:', templatesData);
    }
    
    console.log('');
    console.log('🎉 Test terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testTemplatesAPI();
