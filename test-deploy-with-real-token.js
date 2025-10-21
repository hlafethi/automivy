import fetch from 'node-fetch';

async function testDeployWithRealToken() {
  console.log('🧪 [Test] Test déploiement avec token réel...');
  
  try {
    // D'abord, testons si nous pouvons obtenir un token
    console.log('🔧 [Test] Test connexion...');
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
    
    console.log('📋 [Test] Réponse login:', loginResponse.status, loginResponse.statusText);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('❌ [Test] Erreur login:', error);
      
      // Test avec d'autres mots de passe
      const passwords = ['password', 'heleam', 'admin', 'test'];
      for (const password of passwords) {
        console.log(`🔧 [Test] Test avec mot de passe: ${password}`);
        const testLogin = await fetch('http://localhost:3004/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'user@heleam.com',
            password: password
          })
        });
        
        console.log(`📋 [Test] Réponse ${password}:`, testLogin.status, testLogin.statusText);
        
        if (testLogin.ok) {
          const loginData = await testLogin.json();
          console.log(`✅ [Test] Connexion réussie avec ${password}`);
          
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
          
          break;
        } else {
          const error = await testLogin.text();
          console.log(`❌ [Test] Erreur ${password}:`, error);
        }
      }
      
    } else {
      const loginData = await loginResponse.json();
      console.log('✅ [Test] Connexion réussie');
      
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
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

testDeployWithRealToken();
