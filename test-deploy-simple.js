import fetch from 'node-fetch';

async function testDeploySimple() {
  console.log('🧪 [Test] Test déploiement simple...');
  
  try {
    // Connexion
    console.log('🔧 [Test] Connexion...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@heleam.com',
        password: 'user_password'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Erreur connexion');
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ [Test] Token obtenu');
    
    // Déploiement direct
    console.log('🔧 [Test] Déploiement direct...');
    const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        workflowId: '765e36b3-a363-47f9-94a8-8939519df8f3',
        credentials: {
          email: 'user@heleam.com',
          smtpEmail: 'user@heleam.com',
          smtpPassword: 'user_password',
          smtpServer: 'smtp.gmail.com',
          smtpPort: '465',
          imapPassword: 'user_password',
          imapServer: 'imap.gmail.com',
          imapPort: '993'
        }
      })
    });
    
    console.log('📋 [Test] Réponse déploiement:', deployResponse.status, deployResponse.statusText);
    
    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      console.log('❌ [Test] Erreur déploiement:', error);
    } else {
      const result = await deployResponse.json();
      console.log('✅ [Test] Déploiement réussi:', result);
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

testDeploySimple();
