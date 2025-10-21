import fetch from 'node-fetch';

async function createTestUser() {
  console.log('🧪 [Test] Création d\'un utilisateur de test...');
  
  try {
    // Créer un utilisateur de test
    console.log('🔧 [Test] Création utilisateur test...');
    const registerResponse = await fetch('http://localhost:3004/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test_password',
        role: 'user'
      })
    });
    
    console.log('📋 [Test] Réponse register:', registerResponse.status, registerResponse.statusText);
    
    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ [Test] Utilisateur créé:', registerData);
      
      // Test connexion avec le nouvel utilisateur
      console.log('🔧 [Test] Test connexion...');
      const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test_password'
        })
      });
      
      console.log('📋 [Test] Réponse login:', loginResponse.status, loginResponse.statusText);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ [Test] Connexion réussie avec token:', loginData.token ? 'Présent' : 'Absent');
        
        // Test déploiement
        console.log('🔧 [Test] Test déploiement...');
        const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            workflowId: '765e36b3-a363-47f9-94a8-8939519df8f3',
            credentials: {
              email: 'test@example.com',
              smtpEmail: 'test@example.com',
              smtpPassword: 'test_password',
              smtpServer: 'smtp.gmail.com',
              smtpPort: '465',
              imapPassword: 'test_password',
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
        
      } else {
        const error = await loginResponse.text();
        console.log('❌ [Test] Erreur login:', error);
      }
      
    } else {
      const error = await registerResponse.text();
      console.log('❌ [Test] Erreur register:', error);
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

createTestUser();
