import fetch from 'node-fetch';

async function testCredentialInjection() {
  try {
    console.log('🔧 Test de l\'injection des credentials dans n8n...');
    
    // Se connecter en tant qu'admin
    console.log('1️⃣ Connexion admin...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@automivy.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('   Status:', loginResponse.status);
    console.log('   User:', loginData.user?.email);
    console.log('   Token:', loginData.token ? 'Présent' : 'Absent');
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Test déploiement workflow avec injection...');
    
    // Récupérer un template
    const templatesResponse = await fetch('http://localhost:3004/api/templates', {
      method: 'GET',
      headers
    });
    
    const templatesData = await templatesResponse.json();
    console.log('   Templates disponibles:', templatesData.length);
    
    if (templatesData.length === 0) {
      console.log('❌ Aucun template disponible');
      return;
    }
    
    const template = templatesData[0];
    console.log('   Template sélectionné:', template.name);
    
    // Déployer le workflow avec injection automatique
    const deployResponse = await fetch('http://localhost:3004/api/n8n/deploy-email-summary', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: loginData.user.id,
        userEmail: 'user@heleam.com',
        userPassword: 'MonNouveauMotDePasse123',
        userImapServer: 'imap.heleam.com'
      })
    });
    
    const deployData = await deployResponse.json();
    console.log('   Status:', deployResponse.status);
    console.log('   Réponse complète:', deployData);
    
    if (deployResponse.status === 200) {
      console.log('✅ Workflow déployé avec injection automatique !');
      console.log('   Workflow ID:', deployData.workflowId);
      console.log('   Message:', deployData.message);
    } else {
      console.log('❌ Erreur déploiement:', deployData);
    }
    
    console.log('');
    console.log('🎉 Test terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testCredentialInjection();
