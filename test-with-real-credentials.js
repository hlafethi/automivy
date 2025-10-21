import fetch from 'node-fetch';

async function testWithRealCredentials() {
  console.log('🧪 [Test] Test avec les vrais credentials...');
  
  try {
    // Connexion avec les vrais credentials
    console.log('🔧 [Test] Connexion avec user@heleam.com...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@heleam.com',
        password: 'user123'
      })
    });
    
    console.log('📋 [Test] Réponse login:', loginResponse.status, loginResponse.statusText);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('❌ [Test] Erreur login:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ [Test] Connexion réussie !');
    console.log('✅ [Test] Token obtenu:', loginData.token ? 'Présent' : 'Absent');
    
    // Test déploiement avec les vrais credentials
    console.log('🔧 [Test] Test déploiement...');
    console.log('🔧 [Test] ATTENTION: Regarde les logs backend maintenant !');
    
    const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        workflowId: '765e36b3-a363-47f9-94a8-8939519df8f3',
        credentials: {
          email: 'user@heleam.com',
          smtpEmail: 'user@heleam.com',
          smtpPassword: 'user123',
          smtpServer: 'smtp.gmail.com',
          smtpPort: '465',
          imapPassword: 'user123',
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

testWithRealCredentials();
