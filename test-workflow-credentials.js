import fetch from 'node-fetch';

async function testWorkflowCredentials() {
  try {
    console.log('🔧 Test de l\'injection automatique des credentials...');
    
    // Se connecter en tant qu'utilisateur
    console.log('1️⃣ Connexion utilisateur...');
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
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Test création credentials email...');
    
    // Créer des credentials email pour l'utilisateur
    const emailCredResponse = await fetch('http://localhost:3004/api/email-credentials', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Email Credentials',
        imapHost: 'imap.heleam.com',
        imapPort: 993,
        imapUser: 'user@heleam.com',
        imapPassword: 'MonNouveauMotDePasse123',
        smtpHost: 'smtp.heleam.com',
        smtpPort: 587,
        smtpUser: 'user@heleam.com',
        smtpPassword: 'MonNouveauMotDePasse123'
      })
    });
    
    const emailCredData = await emailCredResponse.json();
    console.log('   Status:', emailCredResponse.status);
    console.log('   Email Credentials:', emailCredData.id ? 'Créées' : 'Erreur');
    
    if (emailCredResponse.status !== 201) {
      console.log('❌ Erreur création credentials email:', emailCredData);
      return;
    }
    
    console.log('');
    console.log('3️⃣ Test déploiement workflow...');
    
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
    
    // Déployer le workflow
    const deployResponse = await fetch('http://localhost:3004/api/user-workflows', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: loginData.user.id,
        templateId: template.id,
        name: `Test Workflow - ${new Date().toISOString()}`,
        description: 'Test avec injection automatique des credentials',
        schedule: 'every 60 minutes',
        isActive: true
      })
    });
    
    const deployData = await deployResponse.json();
    console.log('   Status:', deployResponse.status);
    console.log('   Workflow déployé:', deployData.id ? 'Oui' : 'Non');
    
    if (deployResponse.status === 201) {
      console.log('✅ Workflow déployé avec succès !');
      console.log('   ID:', deployData.id);
      console.log('   N8N ID:', deployData.n8n_workflow_id);
    } else {
      console.log('❌ Erreur déploiement:', deployData);
    }
    
    console.log('');
    console.log('🎉 Test terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testWorkflowCredentials();
